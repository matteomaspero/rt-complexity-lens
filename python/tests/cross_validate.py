#!/usr/bin/env python3
"""
Cross-validate TypeScript vs Python UCoMX metric implementations.

Both implementations now use the UCoMx v1.1 CA midpoint approach:
- CA midpoint interpolation (average adjacent CP MLC/jaw positions)
- Active leaf filtering (gap > plan_min_gap AND within Y-jaw)
- Union aperture A_max = Σ(per-leaf max (gap × eff_width))
- Masi per-bank LSV: mean(1 - |diff|/max_diff) for active adjacent leaves
- AAV = area_ca / A_max_union
- MCS = LSV × AAV, MU-weighted (Eq. 2)
- Plan LSV/AAV: unweighted average (Eq. 1)

Reads the TS-generated reference_metrics_ts.json, computes the same metrics
from the DICOM files using the Python implementation, and reports deltas.

Usage:
    cd rt-complexity-lens/python
    python tests/cross_validate.py
"""

import json
import os
import sys
from pathlib import Path

# Add parent to path so we can import rtplan_complexity
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from rtplan_complexity.parser import parse_rtplan
from rtplan_complexity.metrics import calculate_plan_metrics


# Metrics to compare and their acceptable absolute tolerance
# Core UCoMx metrics should match very tightly; secondary metrics looser
METRIC_TOLERANCES = {
    # --- Core UCoMx (CA midpoint) ---
    "MCS":   0.0001,     # Should match exactly (same algorithm)
    "LSV":   0.0001,
    "AAV":   0.0001,
    "LT":    0.1,        # mm total leaf travel
    "totalMU": 0.5,      # MU (from DICOM, should be identical)

    # --- Derived from core ---
    "LTMCS": 0.001,
    "MFA":   0.5,        # cm² — uses per-CP area, secondary
    "PM":    0.0001,      # 1 - MCS

    # --- QA / accuracy (per-CP based, secondary) ---
    "MAD":   0.5,        # mm
    "LG":    0.5,        # mm
    "EFS":   0.5,        # mm
    "psmall": 0.02,
    "SAS5":  0.02,
    "SAS10": 0.02,
    "PI":    0.1,
    "EM":    0.01,
    "TG":    0.01,

    # --- Deliverability ---
    "MUCA":  0.5,
    "LTMU":  0.1,        # mm/MU
    "LS":    0.5,         # mm/s
    "PA":    1.0,         # cm²
    "JA":    1.0,         # cm²
}

# Beam-level metrics to compare
BEAM_METRIC_KEYS = ["MCS", "LSV", "AAV", "LT", "LTMCS"]


def load_ts_reference(ref_path: Path) -> dict:
    with open(ref_path) as f:
        return json.load(f)


def compute_python_metrics(dcm_path: str) -> dict:
    """Parse a DICOM file and compute metrics with the Python implementation."""
    plan = parse_rtplan(dcm_path)
    metrics = calculate_plan_metrics(plan)

    flat: dict = {
        "MCS":     metrics.MCS,
        "LSV":     metrics.LSV,
        "AAV":     metrics.AAV,
        "MFA":     metrics.MFA,
        "LT":      metrics.LT,
        "LTMCS":   metrics.LTMCS,
        "totalMU": metrics.total_mu,
        "beamCount": len(metrics.beam_metrics),
    }

    # Optional plan-level
    optional_map = {
        "SAS5": metrics.SAS5,
        "SAS10": metrics.SAS10,
        "MAD": metrics.MAD,
        "LG": metrics.LG,
        "EFS": metrics.EFS,
        "psmall": metrics.psmall,
        "PI": metrics.PI,
        "EM": metrics.EM,
        "TG": metrics.TG,
        "MUCA": metrics.MUCA,
        "LTMU": metrics.LTMU,
        "LS": metrics.LS,
        "mDRV": metrics.mDRV,
        "GT": metrics.GT,
        "GS": metrics.GS,
        "PM": metrics.PM,
        "PA": metrics.PA,
        "JA": metrics.JA,
    }
    for k, v in optional_map.items():
        if v is not None:
            flat[k] = v

    # Per-beam
    flat["beamMetrics"] = [
        {
            "beamName": bm.beam_name,
            "beamNumber": bm.beam_number,
            "MCS": bm.MCS,
            "LSV": bm.LSV,
            "AAV": bm.AAV,
            "MFA": bm.MFA,
            "LT": bm.LT,
            "LTMCS": bm.LTMCS,
            "beamMU": bm.beam_mu,
        }
        for bm in metrics.beam_metrics
    ]

    return flat


def compare_value(key: str, ts_val, py_val, tol: float):
    """Compare two numeric values. Returns (passed, delta, message)."""
    if ts_val is None and py_val is None:
        return True, 0.0, ""
    # Treat 0 ↔ None as equivalent for optional metrics
    if (ts_val is None or ts_val == 0) and (py_val is None or py_val == 0):
        return True, 0.0, ""
    if ts_val is None or py_val is None:
        return False, None, f"  {key}: TS={ts_val}  PY={py_val}  (one is None)"
    try:
        delta = abs(float(ts_val) - float(py_val))
        passed = delta <= tol
        msg = "" if passed else f"  {key}: TS={ts_val:.6f}  PY={py_val:.6f}  Δ={delta:.6f} (tol={tol})"
        return passed, delta, msg
    except (TypeError, ValueError):
        return False, None, f"  {key}: TS={ts_val}  PY={py_val}  (non-numeric)"


def main():
    project_root = Path(__file__).resolve().parent.parent.parent
    test_data_dir = project_root / "public" / "test-data"
    ref_path = Path(__file__).resolve().parent / "reference_data" / "reference_metrics_ts.json"

    if not ref_path.exists():
        print(f"ERROR: TS reference not found at {ref_path}")
        print("Run: npm test -- export-metrics-json  first.")
        sys.exit(1)

    ts_data = load_ts_reference(ref_path)
    ts_plans = ts_data["plans"]

    total_files = len(ts_plans)
    files_passed = 0
    files_failed = 0
    files_skipped = 0
    all_deltas: dict = {}

    print("=" * 72)
    print(f"Cross-validation: TypeScript ↔ Python  ({total_files} plans)")
    print("=" * 72)

    for filename, ts_metrics in ts_plans.items():
        dcm_path = test_data_dir / filename
        if not dcm_path.exists():
            print(f"\n⚠  SKIP  {filename}  (file not found)")
            files_skipped += 1
            continue

        try:
            py_metrics = compute_python_metrics(str(dcm_path))
        except Exception as e:
            print(f"\n✗  FAIL  {filename}  Python parse/compute error: {e}")
            files_failed += 1
            continue

        # --- Plan-level comparison ---
        plan_failures = []
        plan_deltas = {}

        for key, tol in METRIC_TOLERANCES.items():
            ts_val = ts_metrics.get(key)
            py_val = py_metrics.get(key)
            passed, delta, msg = compare_value(key, ts_val, py_val, tol)
            if delta is not None:
                plan_deltas[key] = delta
            if not passed:
                plan_failures.append(msg)

        # --- Beam-level comparison ---
        ts_beams = ts_metrics.get("beamMetrics", [])
        py_beams = py_metrics.get("beamMetrics", [])

        beam_failures = []
        if len(ts_beams) != len(py_beams):
            beam_failures.append(
                f"  beamCount: TS={len(ts_beams)} PY={len(py_beams)}"
            )
        else:
            for bi, (ts_b, py_b) in enumerate(zip(ts_beams, py_beams)):
                for key in BEAM_METRIC_KEYS:
                    ts_val = ts_b.get(key)
                    py_val = py_b.get(key)
                    tol = METRIC_TOLERANCES.get(key, 0.01)
                    passed, delta, msg = compare_value(
                        f"beam[{bi}].{key}", ts_val, py_val, tol
                    )
                    if not passed:
                        beam_failures.append(msg)

        all_failures = plan_failures + beam_failures
        if all_failures:
            print(f"\n✗  FAIL  {filename}")
            for msg in all_failures:
                print(msg)
            files_failed += 1
        else:
            # Compute max delta for summary
            max_delta = max(plan_deltas.values()) if plan_deltas else 0
            print(f"✓  PASS  {filename}  (max Δ = {max_delta:.6f})")
            files_passed += 1

        all_deltas[filename] = plan_deltas

    # --- Summary ---
    print("\n" + "=" * 72)
    print(f"RESULTS:  {files_passed} passed,  {files_failed} failed,  {files_skipped} skipped  /  {total_files} total")
    print("=" * 72)

    # Aggregate delta summary per metric
    if all_deltas:
        print("\nMetric delta summary (across all plans):")
        print(f"  {'Metric':<12} {'Mean Δ':>10} {'Max Δ':>10} {'Tol':>8}")
        print("  " + "-" * 44)
        metric_keys = sorted({k for d in all_deltas.values() for k in d})
        for key in metric_keys:
            vals = [d[key] for d in all_deltas.values() if key in d]
            if vals:
                mean_d = sum(vals) / len(vals)
                max_d = max(vals)
                tol = METRIC_TOLERANCES.get(key, "—")
                status = "✓" if max_d <= (tol if isinstance(tol, float) else 999) else "✗"
                print(f"  {status} {key:<10} {mean_d:10.6f} {max_d:10.6f} {tol!s:>8}")

    sys.exit(1 if files_failed > 0 else 0)


if __name__ == "__main__":
    main()
