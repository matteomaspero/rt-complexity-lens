#!/usr/bin/env python3
"""
Custom Visualization Example

Demonstrates advanced visualization customization options.
"""

import sys
from pathlib import Path

# Add parent directory to path for development
sys.path.insert(0, str(Path(__file__).parent.parent))

import glob
from rtplan_complexity import parse_rtplan, calculate_plan_metrics
from rtplan_complexity.clustering import generate_clusters, ClusterDimension

try:
    from rtplan_complexity.visualization import (
        create_box_plots,
        create_correlation_heatmap,
        create_scatter_matrix,
        create_violin_plot,
    )
    from rtplan_complexity.visualization.box_plots import create_grouped_box_plots
    from rtplan_complexity.visualization.scatter_matrix import create_scatter_plot
    from rtplan_complexity.visualization.heatmap import create_correlation_table
    from rtplan_complexity.visualization.violin import create_multi_violin_plot
    HAS_VIZ = True
except ImportError:
    HAS_VIZ = False
    print("This example requires matplotlib and seaborn:")
    print("  pip install matplotlib seaborn")
    sys.exit(1)


def main():
    """Demonstrate custom visualizations."""
    
    if len(sys.argv) < 2:
        print("Usage: python custom_visualization.py <directory_or_pattern>")
        return
    
    pattern = sys.argv[1]
    
    # Find and process files
    if Path(pattern).is_dir():
        dcm_files = list(Path(pattern).glob("*.dcm"))
    else:
        dcm_files = [Path(f) for f in glob.glob(pattern)]
    
    if len(dcm_files) < 3:
        print("Need at least 3 plans for meaningful visualizations")
        return
    
    print(f"Processing {len(dcm_files)} files...")
    
    plans_and_metrics = []
    for file_path in dcm_files:
        try:
            plan = parse_rtplan(str(file_path))
            metrics = calculate_plan_metrics(plan)
            plans_and_metrics.append((plan, metrics))
        except Exception as e:
            print(f"Skipping {file_path.name}: {e}")
    
    all_metrics = [m for _, m in plans_and_metrics]
    
    output_dir = Path("output/custom")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # =========================================================================
    # CUSTOM BOX PLOTS
    # =========================================================================
    print("\n1. Custom Box Plots")
    
    # Standard box plots with custom settings
    create_box_plots(
        all_metrics,
        metrics=["MCS", "LSV", "AAV"],
        title="Primary Complexity Metrics",
        figsize=(10, 6),
        show_mean=True,
        show_outliers=True,
        save_path=str(output_dir / "custom_boxplot_1.png"),
    )
    
    # Grouped box plots by cluster
    clusters = generate_clusters(plans_and_metrics, ClusterDimension.COMPLEXITY)
    
    cluster_data = {}
    for cluster in clusters:
        cluster_metrics = [
            plans_and_metrics[i][1] 
            for i in cluster.plan_indices
        ]
        cluster_data[cluster.name] = cluster_metrics
    
    create_grouped_box_plots(
        cluster_data,
        metric="LT",
        title="Leaf Travel by Complexity Group",
        save_path=str(output_dir / "grouped_boxplot.png"),
    )
    
    # =========================================================================
    # CUSTOM SCATTER PLOTS
    # =========================================================================
    print("2. Custom Scatter Plots")
    
    # Single scatter plot with regression
    create_scatter_plot(
        all_metrics,
        x_metric="MCS",
        y_metric="LT",
        title="MCS vs Leaf Travel",
        show_regression=True,
        save_path=str(output_dir / "scatter_mcs_lt.png"),
    )
    
    # Scatter colored by another metric
    create_scatter_plot(
        all_metrics,
        x_metric="MCS",
        y_metric="total_mu",
        color_by="MFA",
        title="MCS vs Total MU (colored by MFA)",
        save_path=str(output_dir / "scatter_colored.png"),
    )
    
    # Custom scatter matrix
    create_scatter_matrix(
        all_metrics,
        metrics=["MCS", "LSV", "AAV", "MFA", "LT"],
        title="Full Metric Relationships",
        figsize=(14, 14),
        alpha=0.5,
        save_path=str(output_dir / "scatter_matrix_full.png"),
    )
    
    # =========================================================================
    # CUSTOM CORRELATION HEATMAPS
    # =========================================================================
    print("3. Custom Correlation Heatmaps")
    
    # Heatmap with custom colormap
    create_correlation_heatmap(
        all_metrics,
        title="Metric Correlations",
        annotate=True,
        cmap="coolwarm",
        save_path=str(output_dir / "correlation_coolwarm.png"),
    )
    
    # Get correlation table
    corr_table = create_correlation_table(all_metrics, threshold=0.3)
    
    print("\nCorrelation Table (|r| >= 0.3):")
    for row in corr_table[:10]:  # Top 10
        print(f"  {row['metric1']} ↔ {row['metric2']}: "
              f"{row['correlation']:.3f} ({row['direction']} {row['strength']})")
    
    # =========================================================================
    # CUSTOM VIOLIN PLOTS
    # =========================================================================
    print("\n4. Custom Violin Plots")
    
    # Single violin
    create_violin_plot(
        all_metrics,
        metric="MCS",
        title="MCS Distribution",
        show_box=True,
        show_points=True,
        save_path=str(output_dir / "violin_mcs.png"),
    )
    
    # Grouped violin by cluster
    cluster_values = {}
    for cluster in clusters:
        values = [
            plans_and_metrics[i][1].MCS 
            for i in cluster.plan_indices
        ]
        cluster_values[cluster.name] = values
    
    create_violin_plot(
        cluster_values,
        title="MCS by Complexity Group",
        save_path=str(output_dir / "violin_grouped.png"),
    )
    
    # Multi-violin
    create_multi_violin_plot(
        all_metrics,
        metrics=["MCS", "LSV", "AAV"],
        title="Primary Metrics Distributions",
        save_path=str(output_dir / "violin_multi.png"),
    )
    
    print(f"\nAll visualizations saved to {output_dir}/")
    print("\nCustom visualization example complete!")


if __name__ == "__main__":
    main()
