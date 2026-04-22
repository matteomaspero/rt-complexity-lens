#!/usr/bin/env python3
"""
Third-party benchmark: ApertureComplexity (victorgabr/ApertureComplexity).

This is the publicly-available reference implementation of the Younge edge-metric
("PyComplexityMetric", units mm^-1). It is *complementary* to UCoMx MCS — it
quantifies aperture irregularity (perimeter/area) rather than the MCS product
LSV × AAV. We run it across all 25 TG-119 plans to provide an independent,
publicly verifiable benchmark of our DICOM parsing + MU weighting.

Install (one-time, outside this project tree):
    git clone https://github.com/victorgabr/ApertureComplexity /tmp/ApertureComplexity
    sed -i 's/dicom.read_file/dicom.dcmread/g' /tmp/ApertureComplexity/complexity/dicomrt.py
    pip install -e /tmp/ApertureComplexity pydicom

Usage:
    cd rt-complexity-lens/python
    python tests/benchmark_pycomplexity.py
"""

import json
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")  # silence pydicom keyword-tag warnings

try:
    from complexity.PyComplexityMetric import PyComplexityMetric
    from complexity.dicomrt import RTPlan
except ImportError:
    print("ERROR: ApertureComplexity not installed. See header for install steps.")
    sys.exit(1)


def benchmark_plan(dcm_path: Path) -> dict:
    p = RTPlan(filename=str(dcm_path))
    plan = p.get_plan()
    metric = PyComplexityMetric()
    plan_ci = metric.CalculateForPlan(None, plan)

    beams = []
    for beam_key, beam in plan["beams"].items():
        if beam.get("MU", 0) <= 0:
            continue
        try:
            beam_ci = metric.CalculateForBeam(None, plan, beam)
            beams.append({
                "beam_key": str(beam_key),
                "beam_mu": float(beam.get("MU", 0)),
                "edge_metric_mm_inv": float(beam_ci),
            })
        except Exception as e:
            beams.append({"beam_key": str(beam_key), "error": str(e)})

    return {
        "plan_edge_metric_mm_inv": float(plan_ci),
        "beam_count": len(beams),
        "beams": beams,
    }


def main():
    project_root = Path(__file__).resolve().parent.parent.parent
    test_data_dir = project_root / "public" / "test-data"
    output_path = Path(__file__).resolve().parent / "reference_data" / "benchmark_pycomplexity.json"

    plans = sorted(test_data_dir.glob("*.dcm"))
    print(f"Benchmarking {len(plans)} plans with ApertureComplexity (Younge edge metric)...")

    results: dict = {}
    plan_values = []
    for dcm in plans:
        try:
            r = benchmark_plan(dcm)
            results[dcm.name] = r
            plan_values.append(r["plan_edge_metric_mm_inv"])
            print(f"  ✓ {dcm.name:<45} CI = {r['plan_edge_metric_mm_inv']:.6f} mm^-1")
        except Exception as e:
            results[dcm.name] = {"error": str(e)}
            print(f"  ✗ {dcm.name}: {e}")

    summary = {
        "tool": "ApertureComplexity (PyComplexityMetric)",
        "tool_url": "https://github.com/victorgabr/ApertureComplexity",
        "metric": "Younge edge metric (perimeter / area, MU-weighted)",
        "units": "mm^-1",
        "plan_count": len(plans),
        "successful": len(plan_values),
        "min": min(plan_values) if plan_values else None,
        "max": max(plan_values) if plan_values else None,
        "mean": sum(plan_values) / len(plan_values) if plan_values else None,
        "plans": results,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(summary, f, indent=2)
    print(f"\nWrote {output_path}")
    print(f"Summary: {summary['successful']}/{summary['plan_count']} plans benchmarked")
    if plan_values:
        print(f"Edge metric range: {summary['min']:.4f} – {summary['max']:.4f} mm^-1 (mean {summary['mean']:.4f})")


if __name__ == "__main__":
    main()
