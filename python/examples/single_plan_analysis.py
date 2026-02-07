#!/usr/bin/env python3
"""
Single Plan Analysis Example

Demonstrates how to analyze a single DICOM RT Plan file
and export the results.
"""

import sys
from pathlib import Path

# Add parent directory to path for development
sys.path.insert(0, str(Path(__file__).parent.parent))

from rtplan_complexity import parse_rtplan, calculate_plan_metrics
from rtplan_complexity.export import metrics_to_csv, metrics_to_json


def main():
    """Analyze a single DICOM RT Plan file."""
    
    # Check command line arguments
    if len(sys.argv) < 2:
        print("Usage: python single_plan_analysis.py <path_to_rtplan.dcm>")
        print("\nExample:")
        print("  python single_plan_analysis.py /path/to/RTPLAN.dcm")
        return
    
    file_path = sys.argv[1]
    
    if not Path(file_path).exists():
        print(f"Error: File not found: {file_path}")
        return
    
    print(f"Parsing: {file_path}")
    print("-" * 50)
    
    # Parse the plan
    try:
        plan = parse_rtplan(file_path)
    except Exception as e:
        print(f"Error parsing file: {e}")
        return
    
    # Display plan info
    print(f"Plan Label: {plan.plan_label}")
    print(f"Patient ID: {plan.patient_id}")
    print(f"Technique: {plan.technique.value}")
    print(f"Number of Beams: {len(plan.beams)}")
    print(f"Total MU: {plan.total_mu:.1f}")
    
    if plan.treatment_machine_name:
        print(f"Machine: {plan.treatment_machine_name}")
    
    print()
    
    # Calculate metrics
    print("Calculating metrics...")
    metrics = calculate_plan_metrics(plan)
    
    # Display plan-level metrics
    print("\n" + "=" * 50)
    print("PLAN-LEVEL METRICS")
    print("=" * 50)
    
    print(f"\n--- Primary UCoMX Metrics ---")
    print(f"MCS (Modulation Complexity Score): {metrics.MCS:.4f}")
    print(f"LSV (Leaf Sequence Variability):   {metrics.LSV:.4f}")
    print(f"AAV (Aperture Area Variability):   {metrics.AAV:.4f}")
    print(f"MFA (Mean Field Area):             {metrics.MFA:.2f} cm²")
    print(f"LT (Leaf Travel):                  {metrics.LT:.1f} mm")
    print(f"LTMCS (Combined):                  {metrics.LTMCS:.4f}")
    
    print(f"\n--- Accuracy Metrics ---")
    if metrics.LG is not None:
        print(f"LG (Leaf Gap):                     {metrics.LG:.2f} mm")
    if metrics.MAD is not None:
        print(f"MAD (Mean Asymmetry Distance):     {metrics.MAD:.2f} mm")
    if metrics.EFS is not None:
        print(f"EFS (Equivalent Field Size):       {metrics.EFS:.2f} mm")
    if metrics.psmall is not None:
        print(f"psmall (Small Field Fraction):     {metrics.psmall:.3f}")
    
    print(f"\n--- Deliverability Metrics ---")
    if metrics.total_delivery_time is not None:
        mins = metrics.total_delivery_time / 60
        print(f"Estimated Delivery Time:           {mins:.2f} min")
    if metrics.MUCA is not None:
        print(f"MUCA (MU per Control Arc):         {metrics.MUCA:.2f}")
    if metrics.GS is not None:
        print(f"GS (Gantry Speed):                 {metrics.GS:.2f} deg/s")
    if metrics.LS is not None:
        print(f"LS (Leaf Speed):                   {metrics.LS:.2f} mm/s")
    
    # Per-beam breakdown
    print("\n" + "=" * 50)
    print("PER-BEAM BREAKDOWN")
    print("=" * 50)
    
    for bm in metrics.beam_metrics:
        print(f"\n--- {bm.beam_name} ---")
        print(f"  MCS: {bm.MCS:.4f}  LSV: {bm.LSV:.4f}  AAV: {bm.AAV:.4f}")
        print(f"  MU: {bm.beam_mu:.1f}  CPs: {bm.number_of_control_points}")
        if bm.arc_length:
            print(f"  Arc Length: {bm.arc_length:.1f}°")
        if bm.estimated_delivery_time:
            print(f"  Delivery Time: {bm.estimated_delivery_time:.1f}s")
    
    # Export options
    print("\n" + "=" * 50)
    print("EXPORT")
    print("=" * 50)
    
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)
    
    base_name = Path(file_path).stem
    
    # Export to CSV
    csv_path = output_dir / f"{base_name}_metrics.csv"
    metrics_to_csv(metrics, str(csv_path))
    print(f"Saved CSV: {csv_path}")
    
    # Export to JSON
    json_path = output_dir / f"{base_name}_metrics.json"
    metrics_to_json(metrics, str(json_path))
    print(f"Saved JSON: {json_path}")
    
    print("\nAnalysis complete!")


if __name__ == "__main__":
    main()
