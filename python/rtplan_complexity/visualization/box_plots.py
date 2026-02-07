"""
Box plot visualization for metric distributions.

Matches the BoxPlotChart component from the web application.
"""

from typing import Dict, List, Optional, Union

from ..types import PlanMetrics, ExtendedStatistics
from ..statistics import calculate_extended_statistics, get_box_plot_data

try:
    import matplotlib.pyplot as plt
    import matplotlib.patches as mpatches
    import numpy as np
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False


def create_box_plots(
    data: Union[Dict[str, ExtendedStatistics], List[PlanMetrics]],
    metrics: Optional[List[str]] = None,
    title: str = "Metric Distributions",
    figsize: tuple = (12, 6),
    save_path: Optional[str] = None,
    show_mean: bool = True,
    show_outliers: bool = True,
) -> Optional[object]:
    """
    Create box plots for metric distributions.
    
    Args:
        data: Either a dict of {metric_name: ExtendedStatistics} or
              a list of PlanMetrics to calculate stats from
        metrics: List of metric names to plot (if data is PlanMetrics list)
        title: Plot title
        figsize: Figure size tuple (width, height)
        save_path: Optional path to save the figure
        show_mean: Whether to show mean marker
        show_outliers: Whether to show outlier points
        
    Returns:
        matplotlib Figure object (or None if matplotlib not available)
    """
    if not HAS_MATPLOTLIB:
        print("Warning: matplotlib not installed. Install with: pip install matplotlib")
        return None
    
    # Convert PlanMetrics list to statistics dict if needed
    if isinstance(data, list):
        if metrics is None:
            metrics = ["MCS", "LSV", "AAV", "MFA", "LT"]
        
        stats_dict: Dict[str, ExtendedStatistics] = {}
        for metric in metrics:
            values = []
            for pm in data:
                value = getattr(pm, metric, None)
                if value is not None:
                    values.append(float(value))
            if values:
                stats_dict[metric] = calculate_extended_statistics(values)
        data = stats_dict
    
    if not data:
        print("No data to plot")
        return None
    
    fig, ax = plt.subplots(figsize=figsize)
    
    positions = list(range(len(data)))
    labels = list(data.keys())
    
    # Prepare box plot data
    box_data = []
    for metric, stats in data.items():
        bp_data = get_box_plot_data(stats, metric)
        box_data.append({
            "whislo": bp_data.whisker_low,
            "q1": bp_data.q1,
            "med": bp_data.median,
            "q3": bp_data.q3,
            "whishi": bp_data.whisker_high,
            "mean": bp_data.mean,
            "fliers": bp_data.outliers,
        })
    
    # Create box plots manually using bxp
    bp = ax.bxp(
        [
            {
                "whislo": bd["whislo"],
                "q1": bd["q1"],
                "med": bd["med"],
                "q3": bd["q3"],
                "whishi": bd["whishi"],
                "fliers": bd["fliers"] if show_outliers else [],
            }
            for bd in box_data
        ],
        positions=positions,
        showfliers=show_outliers,
        patch_artist=True,
    )
    
    # Style the boxes
    colors = plt.cm.Set3(np.linspace(0, 1, len(data)))
    for patch, color in zip(bp["boxes"], colors):
        patch.set_facecolor(color)
        patch.set_alpha(0.7)
    
    # Add mean markers
    if show_mean:
        for i, bd in enumerate(box_data):
            ax.scatter(
                i, bd["mean"], 
                marker="D", 
                color="red", 
                s=50, 
                zorder=3,
                label="Mean" if i == 0 else None
            )
    
    ax.set_xticks(positions)
    ax.set_xticklabels(labels, rotation=45, ha="right")
    ax.set_title(title)
    ax.set_ylabel("Value")
    ax.grid(True, alpha=0.3)
    
    if show_mean:
        ax.legend(loc="upper right")
    
    plt.tight_layout()
    
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches="tight")
        print(f"Saved box plot to {save_path}")
    
    return fig


def create_grouped_box_plots(
    data: Dict[str, List[PlanMetrics]],
    metric: str,
    title: Optional[str] = None,
    figsize: tuple = (12, 6),
    save_path: Optional[str] = None,
) -> Optional[object]:
    """
    Create grouped box plots comparing a metric across clusters.
    
    Args:
        data: Dict of {cluster_name: [PlanMetrics]}
        metric: The metric to compare
        title: Plot title (defaults to metric name)
        figsize: Figure size tuple
        save_path: Optional path to save the figure
        
    Returns:
        matplotlib Figure object
    """
    if not HAS_MATPLOTLIB:
        print("Warning: matplotlib not installed")
        return None
    
    fig, ax = plt.subplots(figsize=figsize)
    
    # Extract values for each cluster
    cluster_data = []
    labels = []
    for cluster_name, metrics_list in data.items():
        values = [
            getattr(pm, metric, None) 
            for pm in metrics_list 
            if getattr(pm, metric, None) is not None
        ]
        if values:
            cluster_data.append(values)
            labels.append(cluster_name)
    
    if not cluster_data:
        print(f"No data found for metric: {metric}")
        return None
    
    bp = ax.boxplot(cluster_data, labels=labels, patch_artist=True)
    
    # Style boxes
    colors = plt.cm.Set2(np.linspace(0, 1, len(cluster_data)))
    for patch, color in zip(bp["boxes"], colors):
        patch.set_facecolor(color)
        patch.set_alpha(0.7)
    
    ax.set_title(title or f"{metric} by Cluster")
    ax.set_ylabel(metric)
    ax.set_xlabel("Cluster")
    plt.xticks(rotation=45, ha="right")
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches="tight")
    
    return fig
