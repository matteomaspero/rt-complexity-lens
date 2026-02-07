"""
Violin plot visualization for metric distributions.

Matches the ViolinPlot component from the web application.
"""

from typing import Dict, List, Optional, Union

from ..types import PlanMetrics

try:
    import matplotlib.pyplot as plt
    import numpy as np
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False

try:
    import seaborn as sns
    HAS_SEABORN = True
except ImportError:
    HAS_SEABORN = False


def create_violin_plot(
    data: Union[List[PlanMetrics], Dict[str, List[float]]],
    metric: Optional[str] = None,
    title: Optional[str] = None,
    figsize: tuple = (10, 6),
    save_path: Optional[str] = None,
    show_box: bool = True,
    show_points: bool = False,
) -> Optional[object]:
    """
    Create a violin plot for metric distribution.
    
    Args:
        data: Either a list of PlanMetrics or a dict of {group: values}
        metric: Metric name (required if data is PlanMetrics list)
        title: Plot title
        figsize: Figure size tuple
        save_path: Optional path to save the figure
        show_box: Whether to show box plot inside violin
        show_points: Whether to show individual data points
        
    Returns:
        matplotlib Figure object (or None if dependencies not available)
    """
    if not HAS_MATPLOTLIB:
        print("Warning: matplotlib not installed. Install with: pip install matplotlib")
        return None
    
    # Convert PlanMetrics list to values dict if needed
    if isinstance(data, list) and len(data) > 0 and isinstance(data[0], PlanMetrics):
        if metric is None:
            print("Error: metric parameter required when data is PlanMetrics list")
            return None
        
        values = [
            getattr(pm, metric, None) 
            for pm in data 
            if getattr(pm, metric, None) is not None
        ]
        data = {"All Plans": values}
    
    if not data:
        print("No data to plot")
        return None
    
    fig, ax = plt.subplots(figsize=figsize)
    
    if HAS_SEABORN:
        # Prepare data for seaborn
        import pandas as pd
        
        all_data = []
        for group, values in data.items():
            for v in values:
                all_data.append({"Group": group, "Value": v})
        
        df = pd.DataFrame(all_data)
        
        if len(df) > 0:
            sns.violinplot(
                data=df,
                x="Group",
                y="Value",
                inner="box" if show_box else None,
                ax=ax,
                palette="Set2",
            )
            
            if show_points:
                sns.stripplot(
                    data=df,
                    x="Group",
                    y="Value",
                    color="black",
                    alpha=0.3,
                    size=3,
                    ax=ax,
                )
    else:
        # Fallback to matplotlib violinplot
        labels = list(data.keys())
        values_list = [list(v) for v in data.values()]
        
        parts = ax.violinplot(
            values_list,
            positions=range(len(labels)),
            showmeans=True,
            showmedians=True,
        )
        
        # Style the violin plots
        colors = plt.cm.Set2(np.linspace(0, 1, len(labels)))
        for i, pc in enumerate(parts.get("bodies", [])):
            pc.set_facecolor(colors[i])
            pc.set_alpha(0.7)
        
        ax.set_xticks(range(len(labels)))
        ax.set_xticklabels(labels)
    
    ax.set_title(title or (f"{metric} Distribution" if metric else "Distribution"))
    ax.set_ylabel(metric or "Value")
    ax.grid(True, alpha=0.3, axis="y")
    
    if len(data) > 4:
        plt.xticks(rotation=45, ha="right")
    
    plt.tight_layout()
    
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches="tight")
        print(f"Saved violin plot to {save_path}")
    
    return fig


def create_multi_violin_plot(
    metrics_list: List[PlanMetrics],
    metrics: List[str],
    title: str = "Metric Distributions",
    figsize: tuple = (14, 6),
    save_path: Optional[str] = None,
) -> Optional[object]:
    """
    Create violin plots for multiple metrics side by side.
    
    Args:
        metrics_list: List of PlanMetrics objects
        metrics: List of metric names to plot
        title: Plot title
        figsize: Figure size tuple
        save_path: Optional path to save the figure
        
    Returns:
        matplotlib Figure object
    """
    if not HAS_MATPLOTLIB:
        print("Warning: matplotlib not installed")
        return None
    
    fig, axes = plt.subplots(1, len(metrics), figsize=figsize, sharey=False)
    if len(metrics) == 1:
        axes = [axes]
    
    for ax, metric in zip(axes, metrics):
        values = [
            getattr(pm, metric, None) 
            for pm in metrics_list 
            if getattr(pm, metric, None) is not None
        ]
        
        if values:
            if HAS_SEABORN:
                sns.violinplot(y=values, ax=ax, color="#8884d8")
            else:
                ax.violinplot([values], showmeans=True, showmedians=True)
        
        ax.set_title(metric)
        ax.grid(True, alpha=0.3, axis="y")
    
    fig.suptitle(title, fontsize=14)
    plt.tight_layout()
    
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches="tight")
    
    return fig
