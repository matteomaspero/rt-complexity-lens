#!/usr/bin/env python3
"""
Batch Analysis Example

Demonstrates how to process multiple DICOM RT Plan files
and generate aggregate statistics.
"""

import glob
import sys
from pathlib import Path

# Add parent directory to path for development
sys.path.insert(0, str(Path(__file__).parent.parent))

from rtplan_complexity import parse_rtplan, calculate_plan_metrics
from rtplan_complexity.statistics import calculate_extended_statistics, format_extended_stat
from rtplan_complexity.export import batch_to_csv, batch_to_json


def main():
    """Process multiple DICOM RT Plan files."""
    
    # Check command line arguments
    if len(sys.argv) < 2:
        print("Usage: python batch_analysis.py <directory_or_pattern>")
        print("\nExamples:")
        print("  python batch_analysis.py /path/to/plans/")
        print("  python batch_analysis.py '/path/to/plans/*.dcm'")
        return
    
    pattern = sys.argv[1]
    
    # Find DICOM files
    if Path(pattern).is_dir():
        dcm_files = list(Path(pattern).glob("*.dcm"))
    else:
        dcm_files = [Path(f) for f in glob.glob(pattern)]
    
    if not dcm_files:
        print(f"No DICOM files found matching: {pattern}")
        return
    
    print(f"Found {len(dcm_files)} DICOM files")
    print("-" * 50)
    
    # Process all files
    all_metrics = []
    failed = []
    
    for i, file_path in enumerate(dcm_files):
        print(f"[{i+1}/{len(dcm_files)}] Processing: {file_path.name}... ", end="")
        
        try:
            plan = parse_rtplan(str(file_path))
            metrics = calculate_plan_metrics(plan)
            all_metrics.append(metrics)
            print(f"OK (MCS={metrics.MCS:.4f})")
        except Exception as e:
            print(f"FAILED: {e}")
            failed.append((file_path, str(e)))
    
    print("-" * 50)
    print(f"Successfully processed: {len(all_metrics)}/{len(dcm_files)}")
    
    if failed:
        print(f"\nFailed files:")
        for path, error in failed:
            print(f"  {path.name}: {error}")
    
    if not all_metrics:
        print("No metrics to analyze.")
        return
    
    # Calculate aggregate statistics
    print("\n" + "=" * 50)
    print("AGGREGATE STATISTICS")
    print("=" * 50)
    
    metrics_to_analyze = ["MCS", "LSV", "AAV", "MFA", "LT", "total_mu"]
    
    for metric_name in metrics_to_analyze:
        values = [
            getattr(m, metric_name, None) 
            for m in all_metrics 
            if getattr(m, metric_name, None) is not None
        ]
        
        if not values:
            continue
        
        stats = calculate_extended_statistics(values)
        formatted = format_extended_stat(stats)
        
        print(f"\n{metric_name}:")
        print(f"  Count:   {stats.count}")
        print(f"  Range:   {formatted['range']}")
        print(f"  Mean:    {formatted['mean']}")
        print(f"  Median:  {formatted['median']}")
        print(f"  IQR:     {formatted['iqr']}")
        print(f"  Outliers: {formatted['outliers']}")
    
    # Technique breakdown
    print("\n" + "=" * 50)
    print("TECHNIQUE BREAKDOWN")
    print("=" * 50)
    
    technique_counts = {}
    for m in all_metrics:
        for bm in m.beam_metrics:
            # Infer technique from arc/CP count
            if len(m.beam_metrics) == 1 and m.beam_metrics[0].arc_length:
                technique = "VMAT"
            elif sum(bm.number_of_control_points for bm in m.beam_metrics) > 20:
                technique = "IMRT"
            else:
                technique = "Conformal"
            
            if technique not in technique_counts:
                technique_counts[technique] = 0
            technique_counts[technique] += 1
            break  # Count once per plan
    
    for technique, count in sorted(technique_counts.items()):
        percentage = count / len(all_metrics) * 100
        print(f"  {technique}: {count} ({percentage:.1f}%)")
    
    # Export results
    print("\n" + "=" * 50)
    print("EXPORT")
    print("=" * 50)
    
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)
    
    # Export to CSV
    csv_path = output_dir / "batch_metrics.csv"
    batch_to_csv(all_metrics, str(csv_path))
    print(f"Saved CSV: {csv_path}")
    
    # Export to JSON
    json_path = output_dir / "batch_metrics.json"
    batch_to_json(all_metrics, str(json_path))
    print(f"Saved JSON: {json_path}")
    
    print("\nBatch analysis complete!")


if __name__ == "__main__":
    main()
