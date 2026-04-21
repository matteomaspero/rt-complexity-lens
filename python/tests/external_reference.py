"""
Independent reference implementation of UCoMx-family complexity metrics.

This module is INTENTIONALLY SELF-CONTAINED — it shares no code with
`rtplan_complexity` and reads DICOM directly via pydicom. It serves as a
third independent source of truth for cross-validation, alongside the
TypeScript and Python implementations.

Implements the canonical formulas from:
    - McNiven, Sharpe, Purdie (2010), Med. Phys. 37(2): MCS, AAV, LSV
    - Masi et al. (2013), Med. Phys. 40(7): VMAT MCS / per-bank LSV

Definitions used here are the verbatim paper equations, with no CA
midpoint smoothing, no jaw-active filtering, and no plan-min-gap rules.
This keeps the reference simple and makes any algorithmic divergence
from our implementation explicit and traceable.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

import pydicom


# ----------------------------------------------------------------------
# Lightweight CP / beam containers
# ----------------------------------------------------------------------

@dataclass
class _CP:
    mu_cum: float
    bank_a: List[float]   # mm
    bank_b: List[float]   # mm
    jaw_x1: float
    jaw_x2: float
    jaw_y1: float
    jaw_y2: float


@dataclass
class _BeamRef:
    name: str
    mu: float
    leaf_widths: List[float]   # mm, per-leaf-pair effective width
    cps: List[_CP]


@dataclass
class ExternalMetrics:
    """Plan-level reference metrics."""
    MCS: float
    LSV: float
    AAV: float
    total_mu: float
    n_beams: int


# ----------------------------------------------------------------------
# DICOM extraction
# ----------------------------------------------------------------------

_MLC_TYPES = ("MLCX", "MLCY", "MLCX1", "MLCX2", "MLCY1", "MLCY2", "MLC")
_JAW_X_TYPES = ("ASYMX", "X")
_JAW_Y_TYPES = ("ASYMY", "Y")


def _extract_leaf_widths(beam_ds) -> List[float]:
    """Per-leaf-pair effective width from BeamLimitingDeviceSequence."""
    widths: List[float] = []
    if not hasattr(beam_ds, "BeamLimitingDeviceSequence"):
        return widths
    for d in beam_ds.BeamLimitingDeviceSequence:
        rt_type = getattr(d, "RTBeamLimitingDeviceType", "")
        if rt_type in _MLC_TYPES:
            boundaries = list(getattr(d, "LeafPositionBoundaries", []) or [])
            if len(boundaries) >= 2:
                widths = [
                    float(boundaries[i + 1]) - float(boundaries[i])
                    for i in range(len(boundaries) - 1)
                ]
                break
    return widths


def _extract_cp(cp_ds, prev_cp: Optional[_CP], n_leaves: int) -> _CP:
    """Extract a control point, falling back to previous values when absent."""
    bank_a: List[float] = prev_cp.bank_a if prev_cp else [0.0] * n_leaves
    bank_b: List[float] = prev_cp.bank_b if prev_cp else [0.0] * n_leaves
    jx1 = prev_cp.jaw_x1 if prev_cp else -100.0
    jx2 = prev_cp.jaw_x2 if prev_cp else 100.0
    jy1 = prev_cp.jaw_y1 if prev_cp else -100.0
    jy2 = prev_cp.jaw_y2 if prev_cp else 100.0

    if hasattr(cp_ds, "BeamLimitingDevicePositionSequence"):
        for dev in cp_ds.BeamLimitingDevicePositionSequence:
            rt_type = getattr(dev, "RTBeamLimitingDeviceType", "")
            positions = [float(p) for p in getattr(dev, "LeafJawPositions", [])]
            if rt_type in ("MLCX", "MLCY", "MLC") and len(positions) >= 2 * n_leaves:
                bank_a = positions[:n_leaves]
                bank_b = positions[n_leaves:2 * n_leaves]
            elif rt_type in ("MLCX1", "MLCY1") and len(positions) >= n_leaves:
                bank_a = positions[:n_leaves]
            elif rt_type in ("MLCX2", "MLCY2") and len(positions) >= n_leaves:
                bank_b = positions[:n_leaves]
            elif rt_type in _JAW_X_TYPES and len(positions) == 2:
                jx1, jx2 = positions[0], positions[1]
            elif rt_type in _JAW_Y_TYPES and len(positions) == 2:
                jy1, jy2 = positions[0], positions[1]

    mu_cum = float(getattr(cp_ds, "CumulativeMetersetWeight", 0.0))
    return _CP(mu_cum=mu_cum, bank_a=bank_a, bank_b=bank_b,
               jaw_x1=jx1, jaw_x2=jx2, jaw_y1=jy1, jaw_y2=jy2)


def _extract_beam(beam_ds, beam_mu: float) -> Optional[_BeamRef]:
    widths = _extract_leaf_widths(beam_ds)
    if not widths:
        return None
    n_leaves = len(widths)

    cps: List[_CP] = []
    prev: Optional[_CP] = None
    for cp_ds in getattr(beam_ds, "ControlPointSequence", []):
        cp = _extract_cp(cp_ds, prev, n_leaves)
        cps.append(cp)
        prev = cp

    if len(cps) < 2:
        return None

    name = getattr(beam_ds, "BeamName", "") or f"Beam{getattr(beam_ds, 'BeamNumber', '?')}"
    return _BeamRef(name=str(name), mu=beam_mu, leaf_widths=widths, cps=cps)


def _read_plan(dcm_path: str) -> List[_BeamRef]:
    ds = pydicom.dcmread(dcm_path, force=True)

    # Map BeamNumber -> beam MU
    mu_map: dict = {}
    for fg in getattr(ds, "FractionGroupSequence", []) or []:
        for rb in getattr(fg, "ReferencedBeamSequence", []) or []:
            num = int(getattr(rb, "ReferencedBeamNumber", -1))
            mu = float(getattr(rb, "BeamMeterset", 0.0) or 0.0)
            if num >= 0:
                mu_map[num] = mu

    beams: List[_BeamRef] = []
    for beam_ds in getattr(ds, "BeamSequence", []) or []:
        if getattr(beam_ds, "TreatmentDeliveryType", "TREATMENT") == "SETUP":
            continue
        bn = int(getattr(beam_ds, "BeamNumber", -1))
        beam = _extract_beam(beam_ds, mu_map.get(bn, 0.0))
        if beam is not None:
            beams.append(beam)
    return beams


# ----------------------------------------------------------------------
# Canonical metric formulas
# ----------------------------------------------------------------------

def _aperture_area(cp: _CP, widths: List[float]) -> float:
    """Sum over leaf pairs of (gap × leaf_width), clipped to Y-jaws. mm²."""
    area = 0.0
    n = min(len(cp.bank_a), len(cp.bank_b), len(widths))
    # Reconstruct leaf row Y centers from cumulative widths centered on 0
    total = sum(widths[:n])
    y = -total / 2.0
    for i in range(n):
        w = widths[i]
        y_lo = y
        y_hi = y + w
        y += w
        # Clip to Y-jaws (only count rows inside)
        if y_hi <= cp.jaw_y1 or y_lo >= cp.jaw_y2:
            continue
        gap = max(0.0, cp.bank_b[i] - cp.bank_a[i])
        area += gap * w
    return area


def _lsv_cp(cp: _CP) -> float:
    """McNiven LSV at a single CP: per-bank product of (1 − |Δ|/Δmax)."""
    def bank_score(bank: List[float]) -> float:
        if len(bank) < 2:
            return 1.0
        diffs = [abs(bank[i + 1] - bank[i]) for i in range(len(bank) - 1)]
        max_d = max(diffs) if diffs else 0.0
        if max_d == 0.0:
            return 1.0
        terms = [(max_d - d) / max_d for d in diffs]
        # McNiven uses the product across adjacent pairs
        prod = 1.0
        for t in terms:
            prod *= max(0.0, t)
        return prod
    return bank_score(cp.bank_a) * bank_score(cp.bank_b)


def _beam_mcs(beam: _BeamRef) -> tuple[float, float, float]:
    """Returns (MCS, LSV, AAV) for one beam.

    Uses raw CP positions (no midpoint), MU-weighted across CP intervals.
    A_max is the per-CP maximum aperture area (paper default).
    """
    cps = beam.cps
    widths = beam.leaf_widths

    areas = [_aperture_area(cp, widths) for cp in cps]
    a_max = max(areas) if areas else 0.0
    if a_max == 0.0:
        return 0.0, 0.0, 0.0

    aav_per_cp = [a / a_max for a in areas]
    lsv_per_cp = [_lsv_cp(cp) for cp in cps]

    # MU weight for each interval i→i+1 = ΔCumulativeMeterset
    total_mu = beam.mu
    if total_mu <= 0:
        return 0.0, 0.0, 0.0

    mcs = 0.0
    lsv_w = 0.0
    aav_w = 0.0
    for i in range(len(cps) - 1):
        d_mu_norm = cps[i + 1].mu_cum - cps[i].mu_cum
        if d_mu_norm <= 0:
            continue
        # average over the segment
        lsv_seg = 0.5 * (lsv_per_cp[i] + lsv_per_cp[i + 1])
        aav_seg = 0.5 * (aav_per_cp[i] + aav_per_cp[i + 1])
        mcs += lsv_seg * aav_seg * d_mu_norm
        lsv_w += lsv_seg * d_mu_norm
        aav_w += aav_seg * d_mu_norm
    return mcs, lsv_w, aav_w


def compute_external_metrics(dcm_path: str) -> ExternalMetrics:
    beams = _read_plan(dcm_path)
    if not beams:
        return ExternalMetrics(MCS=0.0, LSV=0.0, AAV=0.0, total_mu=0.0, n_beams=0)

    total_mu = sum(b.mu for b in beams)
    if total_mu <= 0:
        return ExternalMetrics(MCS=0.0, LSV=0.0, AAV=0.0, total_mu=0.0, n_beams=len(beams))

    mcs_w = lsv_w = aav_w = 0.0
    for beam in beams:
        b_mcs, b_lsv, b_aav = _beam_mcs(beam)
        w = beam.mu / total_mu
        mcs_w += b_mcs * w
        lsv_w += b_lsv * w
        aav_w += b_aav * w

    return ExternalMetrics(
        MCS=mcs_w, LSV=lsv_w, AAV=aav_w,
        total_mu=total_mu, n_beams=len(beams),
    )


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python external_reference.py <plan.dcm>")
        sys.exit(1)
    m = compute_external_metrics(sys.argv[1])
    print(f"MCS={m.MCS:.4f}  LSV={m.LSV:.4f}  AAV={m.AAV:.4f}  MU={m.total_mu:.1f}  beams={m.n_beams}")
