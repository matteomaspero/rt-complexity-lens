#!/usr/bin/env python3
"""
Cohort Analysis Example

Demonstrates full cohort analysis workflow including:
- Plan clustering
- Extended statistics
- Correlation analysis
- Visualization generation
"""

import glob
import sys
from pathlib import Path

# Add parent directory to path for development
sys.path.insert(0, str(Path(__file__).parent.parent))

from rtplan_complexity import parse_rtplan, calculate_plan_metrics
from rtplan_complexity.clustering import (
    generate_clusters, 
    ClusterDimension, 
    CLUSTER_DIMENSIONS,
    get_cluster_plans,
)
from rtplan_complexity.statistics import calculate_extended_statistics
from rtplan_complexity.correlation import calculate_correlation_matrix, interpret_correlation

# Optional visualization imports
try:
    from rtplan_complexity.visualization import (
        create_box_plots,
        create_correlation_heatmap,
        create_scatter_matrix,
        create_violin_plot,
    )
    HAS_VIZ = True
except ImportError:
    HAS_VIZ = False
    print("Note: Visualization requires matplotlib. Install with: pip install matplotlib seaborn")


def main():
    """Run full cohort analysis."""
    
    # Check command line arguments
    if len(sys.argv) < 2:
        print("Usage: python cohort_analysis.py <directory_or_pattern>")
        print("\nExamples:")
        print("  python cohort_analysis.py /path/to/plans/")
        print("  python cohort_analysis.py '/path/to/plans/*.dcm'")
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
    plans_and_metrics = []
    
    for i, file_path in enumerate(dcm_files):
        print(f"[{i+1}/{len(dcm_files)}] Processing: {file_path.name}... ", end="")
        
        try:
            plan = parse_rtplan(str(file_path))
            metrics = calculate_plan_metrics(plan)
            plans_and_metrics.append((plan, metrics))
            print("OK")
        except Exception as e:
            print(f"FAILED: {e}")
    
    print("-" * 50)
    print(f"Successfully processed: {len(plans_and_metrics)}/{len(dcm_files)}")
    
    if len(plans_and_metrics) < 2:
        print("Need at least 2 plans for cohort analysis.")
        return
    
    all_metrics = [m for _, m in plans_and_metrics]
    
    # =========================================================================
    # CLUSTERING ANALYSIS
    # =========================================================================
    print("\n" + "=" * 50)
    print("CLUSTERING ANALYSIS")
    print("=" * 50)
    
    print("\nAvailable clustering dimensions:")
    for dim_info in CLUSTER_DIMENSIONS:
        print(f"  - {dim_info.name}: {dim_info.description}")
    
    # Cluster by different dimensions
    for dimension in [
        ClusterDimension.TECHNIQUE,
        ClusterDimension.COMPLEXITY,
        ClusterDimension.BEAM_COUNT,
    ]:
        print(f"\n--- Clustering by {dimension.value} ---")
        
        clusters = generate_clusters(plans_and_metrics, dimension)
        
        for cluster in clusters:
            print(f"  {cluster.name}: {cluster.description}")
            
            # Get plans in this cluster
            cluster_plans = get_cluster_plans(plans_and_metrics, cluster)
            
            if cluster_plans:
                mcs_values = [m.MCS for _, m in cluster_plans]
                stats = calculate_extended_statistics(mcs_values)
                print(f"    MCS: {stats.mean:.4f} ± {stats.std:.4f} (median: {stats.median:.4f})")
    
    # =========================================================================
    # EXTENDED STATISTICS
    # =========================================================================
    print("\n" + "=" * 50)
    print("EXTENDED STATISTICS")
    print("=" * 50)
    
    metrics_to_analyze = ["MCS", "LSV", "AAV", "MFA", "LT", "total_mu"]
    
    stats_dict = {}
    for metric_name in metrics_to_analyze:
        values = [
            getattr(m, metric_name, None) 
            for m in all_metrics 
            if getattr(m, metric_name, None) is not None
        ]
        
        if values:
            stats = calculate_extended_statistics(values)
            stats_dict[metric_name] = stats
            
            print(f"\n{metric_name} (n={stats.count}):")
            print(f"  Range:      {stats.min:.4f} - {stats.max:.4f}")
            print(f"  Mean ± SD:  {stats.mean:.4f} ± {stats.std:.4f}")
            print(f"  Median:     {stats.median:.4f}")
            print(f"  Q1 - Q3:    {stats.q1:.4f} - {stats.q3:.4f}")
            print(f"  IQR:        {stats.iqr:.4f}")
            print(f"  P5 - P95:   {stats.p5:.4f} - {stats.p95:.4f}")
            print(f"  Skewness:   {stats.skewness:.4f}")
            print(f"  Outliers:   {len(stats.outliers)}")
    
    # =========================================================================
    # CORRELATION ANALYSIS
    # =========================================================================
    print("\n" + "=" * 50)
    print("CORRELATION ANALYSIS")
    print("=" * 50)
    
    corr_matrix = calculate_correlation_matrix(all_metrics)
    
    print("\nSignificant correlations (|r| >= 0.5):")
    for result in sorted(corr_matrix.results, key=lambda x: abs(x.correlation), reverse=True):
        if abs(result.correlation) >= 0.5:
            strength = interpret_correlation(result.correlation)
            direction = "+" if result.correlation > 0 else "-"
            print(f"  {result.metric1} ↔ {result.metric2}: "
                  f"{direction}{abs(result.correlation):.3f} ({strength})")
    
    # =========================================================================
    # VISUALIZATIONS
    # =========================================================================
    if HAS_VIZ:
        print("\n" + "=" * 50)
        print("GENERATING VISUALIZATIONS")
        print("=" * 50)
        
        output_dir = Path("output")
        output_dir.mkdir(exist_ok=True)
        
        # Box plots
        print("\nCreating box plots...")
        create_box_plots(
            stats_dict,
            title="Metric Distributions",
            save_path=str(output_dir / "box_plots.png"),
        )
        
        # Correlation heatmap
        print("Creating correlation heatmap...")
        create_correlation_heatmap(
            all_metrics,
            title="Metric Correlations",
            save_path=str(output_dir / "correlation_heatmap.png"),
        )
        
        # Scatter matrix
        print("Creating scatter matrix...")
        create_scatter_matrix(
            all_metrics,
            metrics=["MCS", "LSV", "AAV", "MFA"],
            title="Metric Relationships",
            save_path=str(output_dir / "scatter_matrix.png"),
        )
        
        # Violin plot for MCS
        print("Creating violin plot...")
        create_violin_plot(
            all_metrics,
            metric="MCS",
            title="MCS Distribution",
            save_path=str(output_dir / "violin_mcs.png"),
        )
        
        print(f"\nVisualizations saved to {output_dir}/")
    
    print("\n" + "=" * 50)
    print("Cohort analysis complete!")


if __name__ == "__main__":
    main()
