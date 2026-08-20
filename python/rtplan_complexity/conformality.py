"""
RTSTRUCT-based conformality geometry (Python mirror of src/lib/dicom/conformality.ts).

Projects a target structure into the Beam's Eye View (BEV) at the isocentre
plane following IEC 61217 (couch -> gantry -> collimator rotations, including
beam divergence), builds the true MLC + jaw aperture polygon, and derives
conformality quantities from polygon boolean operations via shapely.

Educational tool: the target silhouette is a documented approximation (the
per-control-point convex hull of the projected contour cloud) and the output
is not clinically validated.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import List, Optional, Sequence, Tuple

from shapely.geometry import MultiPoint, MultiPolygon, Point, Polygon
from shapely.ops import unary_union

from .types import Beam, ControlPoint, RTPlan, Structure

Point2D = Tuple[float, float]

#: Default source-to-axis distance (mm) when the plan does not declare one.
DEFAULT_SAD = 1000.0


@dataclass
class ConformalityResult:
    """Per-control-point conformality quantities."""
    blocked_fraction: float  # fraction of the projected target blocked [0,1]
    coverage: float          # fraction of the projected target inside the aperture [0,1]
    aperture_target_ratio: float  # aperture area / projected target area
    margin_mean: float       # mean aperture-edge to target-outline distance (mm)
    margin_min: float        # minimum aperture-edge to target-outline distance (mm)
    aperture_area: float     # mm^2
    target_area: float       # mm^2


@dataclass
class BeamConformality:
    """MU-weighted beam-level conformality."""
    BAM: float
    TCOV: float
    ATR: float
    MARG: float
    MARGMIN: float
    per_control_point: List[Optional[ConformalityResult]] = field(default_factory=list)


@dataclass
class PlanConformality:
    """MU-weighted plan-level conformality."""
    PAM: float
    TCOV: float
    ATR: float
    MARG: float
    MARGMIN: float


# ---------------------------------------------------------------------------
# BEV projection (IEC 61217)
# ---------------------------------------------------------------------------

def project_patient_point_to_bev(
    point: Sequence[float],
    gantry_angle: float,
    collimator_angle: float = 0.0,
    patient_support_angle: float = 0.0,
    isocenter: Optional[Sequence[float]] = None,
    sad: float = DEFAULT_SAD,
) -> Point2D:
    """
    Project a patient-coordinate point (DICOM patient LPS, mm) to the BEV plane
    at the isocentre, expressed in MLC coordinates (x along leaf travel,
    y along the leaf-boundary axis).
    """
    iso = isocenter or (0.0, 0.0, 0.0)

    # DICOM patient (x=left, y=posterior, z=superior) -> IEC fixed (X=left, Y=cranial, Z=anterior)
    dx = point[0] - iso[0]
    dy = point[1] - iso[1]
    dz = point[2] - iso[2]
    X = dx
    Y = dz
    Z = -dy

    # Couch rotation about the vertical (Y) axis
    psi = math.radians(patient_support_angle or 0.0)
    if psi != 0.0:
        cos_p = math.cos(-psi)
        sin_p = math.sin(-psi)
        X, Z = X * cos_p - Z * sin_p, X * sin_p + Z * cos_p

    # Gantry rotation about Y: gantry 0 = source at +Z (anterior)
    g = math.radians(gantry_angle)
    cos_g = math.cos(g)
    sin_g = math.sin(g)
    x_bev = X * cos_g - Z * sin_g
    y_bev = Y
    depth = -(X * sin_g + Z * cos_g)  # positive downstream of isocentre

    # Beam divergence: scale back to the isocentre plane
    denom = sad + depth
    scale = 1.0 if abs(denom) < 1e-6 else sad / denom
    x_iso = x_bev * scale
    y_iso = y_bev * scale

    # Collimator rotation (MLC frame)
    theta = math.radians(collimator_angle or 0.0)
    if theta != 0.0:
        cos_t = math.cos(-theta)
        sin_t = math.sin(-theta)
        x_iso, y_iso = x_iso * cos_t - y_iso * sin_t, x_iso * sin_t + y_iso * cos_t

    return (x_iso, y_iso)


def project_target_to_bev(
    structure: Structure,
    cp: ControlPoint,
    sad: float = DEFAULT_SAD,
) -> Optional[Polygon]:
    """
    Target silhouette in the BEV/MLC frame for one control point.
    Approximation: convex hull of all projected contour points.
    """
    projected: List[Point2D] = []
    for contour in structure.contours:
        for pt in contour.points:
            projected.append(
                project_patient_point_to_bev(
                    pt,
                    gantry_angle=cp.gantry_angle,
                    collimator_angle=cp.beam_limiting_device_angle,
                    patient_support_angle=cp.patient_support_angle or 0.0,
                    isocenter=cp.isocenter_position,
                    sad=sad,
                )
            )
    if len(projected) < 3:
        return None
    try:
        hull = MultiPoint(projected).convex_hull
    except Exception:
        return None
    if isinstance(hull, Polygon) and hull.area > 1e-9:
        return hull
    return None


def build_aperture_polygon(
    cp: ControlPoint,
    leaf_boundaries: Optional[List[float]],
    leaf_widths: Optional[List[float]],
):
    """
    Aperture polygon (MLC frame) for one control point: the union of open leaf
    pair rectangles clipped by the X and Y jaws. When both X jaws read 0 (e.g.
    Monaco without ASYMX) no X clipping is applied, matching the area metrics.
    """
    bank_a = cp.mlc_positions.bank_a
    bank_b = cp.mlc_positions.bank_b
    n = min(len(bank_a), len(bank_b))
    if n == 0:
        return None

    bounds = list(leaf_boundaries or [])
    if len(bounds) != n + 1:
        widths = list(leaf_widths) if leaf_widths and len(leaf_widths) == n else [5.0] * n
        total = sum(w or 5.0 for w in widths)
        bounds = []
        y = -total / 2.0
        for i in range(n + 1):
            bounds.append(y)
            if i < n:
                y += widths[i] or 5.0

    jaws = cp.jaw_positions
    has_x_jaw = jaws.x1 != 0.0 or jaws.x2 != 0.0
    has_y_jaw = jaws.y1 != 0.0 or jaws.y2 != 0.0

    rects: List[Polygon] = []
    for i in range(n):
        top = max(bounds[i], jaws.y1) if has_y_jaw else bounds[i]
        bottom = min(bounds[i + 1], jaws.y2) if has_y_jaw else bounds[i + 1]
        if bottom - top <= 0:
            continue
        a = max(bank_a[i], jaws.x1) if has_x_jaw else bank_a[i]
        b = min(bank_b[i], jaws.x2) if has_x_jaw else bank_b[i]
        if b - a <= 0:
            continue
        rects.append(Polygon([(a, top), (b, top), (b, bottom), (a, bottom)]))

    if not rects:
        return None
    if len(rects) == 1:
        return rects[0]
    try:
        return unary_union(rects)
    except Exception:
        return rects[0]


# ---------------------------------------------------------------------------
# Conformality quantities
# ---------------------------------------------------------------------------

def _sample_edges(geom, spacing: float = 3.0) -> List[Point2D]:
    """Sample points along polygon boundaries at a fixed spacing (mm)."""
    if geom is None or geom.is_empty:
        return []
    polys = list(geom.geoms) if isinstance(geom, MultiPolygon) else [geom]
    samples: List[Point2D] = []
    for poly in polys:
        if not isinstance(poly, Polygon):
            continue
        rings = [list(poly.exterior.coords)[:-1]] + [
            list(r.coords)[:-1] for r in poly.interiors
        ]
        for ring in rings:
            n = len(ring)
            for i in range(n):
                ax, ay = ring[i]
                bx, by = ring[(i + 1) % n]
                length = math.hypot(bx - ax, by - ay)
                steps = max(1, math.ceil(length / spacing))
                for s in range(steps):
                    t = s / steps
                    samples.append((ax + (bx - ax) * t, ay + (by - ay) * t))
    return samples


def compute_conformality(aperture, target) -> Optional[ConformalityResult]:
    """Conformality quantities for one control point (aperture vs projected target)."""
    if target is None or target.is_empty:
        return None
    target_area = target.area
    if target_area <= 0:
        return None

    aperture_area = 0.0 if aperture is None or aperture.is_empty else aperture.area

    inside = 0.0
    if aperture is not None and not aperture.is_empty:
        try:
            inside = aperture.intersection(target).area
        except Exception:
            inside = 0.0
    coverage = min(1.0, max(0.0, inside / target_area))

    samples = _sample_edges(aperture, 3.0)
    boundary = target.boundary
    margin_sum = 0.0
    margin_min = math.inf
    for sx, sy in samples:
        d = boundary.distance(Point(sx, sy))
        margin_sum += d
        if d < margin_min:
            margin_min = d

    return ConformalityResult(
        blocked_fraction=1.0 - coverage,
        coverage=coverage,
        aperture_target_ratio=aperture_area / target_area,
        margin_mean=(margin_sum / len(samples)) if samples else 0.0,
        margin_min=margin_min if math.isfinite(margin_min) else 0.0,
        aperture_area=aperture_area,
        target_area=target_area,
    )


def calculate_beam_conformality(
    beam: Beam,
    structure: Optional[Structure] = None,
    sad: float = DEFAULT_SAD,
    leaf_boundaries: Optional[List[float]] = None,
) -> Optional[BeamConformality]:
    """MU-weighted beam-level conformality for a target structure."""
    if structure is None or not structure.contours or not beam.control_points:
        return None

    bounds = leaf_boundaries if leaf_boundaries is not None else beam.mlc_leaf_boundaries

    per_cp: List[Optional[ConformalityResult]] = []
    weight = 0.0
    w_blocked = w_cov = w_ratio = w_margin = 0.0
    min_margin = math.inf
    n_cps = len(beam.control_points)

    for i, cp in enumerate(beam.control_points):
        target = project_target_to_bev(structure, cp, sad)
        aperture = build_aperture_polygon(cp, bounds, beam.mlc_leaf_widths)
        result = compute_conformality(aperture, target)
        per_cp.append(result)
        if result is None:
            continue

        prev = 0.0 if i == 0 else beam.control_points[i - 1].cumulative_meterset_weight
        d_mu = max(0.0, cp.cumulative_meterset_weight - prev)
        # Static beams carry all weight on the last CP; fall back to uniform weighting
        w = d_mu if d_mu > 1e-9 else 1.0 / n_cps

        weight += w
        w_blocked += result.blocked_fraction * w
        w_cov += result.coverage * w
        w_ratio += result.aperture_target_ratio * w
        w_margin += result.margin_mean * w
        if result.margin_min < min_margin:
            min_margin = result.margin_min

    if weight <= 0:
        return None

    return BeamConformality(
        BAM=w_blocked / weight,
        TCOV=w_cov / weight,
        ATR=w_ratio / weight,
        MARG=w_margin / weight,
        MARGMIN=min_margin if math.isfinite(min_margin) else 0.0,
        per_control_point=per_cp,
    )


def calculate_plan_conformality(
    plan: RTPlan,
    beam_results: Sequence[Tuple[float, Optional[BeamConformality]]],
) -> Optional[PlanConformality]:
    """MU-weighted plan-level conformality across beams (beam_results: (beam_mu, conformality))."""
    weight = 0.0
    pam = tcov = atr = marg = 0.0
    margin_min = math.inf

    for beam_mu, conf in beam_results:
        if conf is None:
            continue
        w = beam_mu if beam_mu > 0 else 1.0
        weight += w
        pam += conf.BAM * w
        tcov += conf.TCOV * w
        atr += conf.ATR * w
        marg += conf.MARG * w
        if conf.MARGMIN < margin_min:
            margin_min = conf.MARGMIN

    if weight <= 0 or not plan.beams:
        return None

    return PlanConformality(
        PAM=pam / weight,
        TCOV=tcov / weight,
        ATR=atr / weight,
        MARG=marg / weight,
        MARGMIN=margin_min if math.isfinite(margin_min) else 0.0,
    )


def pick_default_target(structures) -> Optional[Structure]:
    """
    Heuristic pick of the most likely target ROI (PTV > CTV > GTV > most contours).
    Mirrors pickDefaultTargetIndex() in the TypeScript implementation.

    Args:
        structures: dict of name -> Structure (from parse_rtstruct) or a list of Structure.
    """
    items: List[Structure] = (
        list(structures.values()) if isinstance(structures, dict) else list(structures or [])
    )
    if not items:
        return None

    def score(name: str) -> int:
        n = (name or "").upper()
        if "PTV" in n:
            return 3
        if "CTV" in n:
            return 2
        if "GTV" in n:
            return 1
        return 0

    best = items[0]
    best_score = -1
    for s in items:
        sc = score(s.name) * 1000 + len(s.contours)
        if sc > best_score:
            best_score = sc
            best = s
    return best
