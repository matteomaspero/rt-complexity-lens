"""
Scatter matrix visualization for metric relationships.

Matches the ScatterMatrix component from the web application.
"""

from typing import List, Optional

from ..types import PlanMetrics

try:
    import matplotlib.pyplot as plt
    import numpy as np
    import pandas as pd
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False


def create_scatter_matrix(
    metrics_list: List[PlanMetrics],
    metrics: Optional[List[str]] = None,
    title: str = "Scatter Matrix",
    figsize: tuple = (12, 12),
    save_path: Optional[str] = None,
    alpha: float = 0.6,
    color: str = "#8884d8",
) -> Optional[object]:
    """
    Create a scatter matrix (pair plot) for metrics.
    
    Args:
        metrics_list: List of PlanMetrics objects
        metrics: List of metric names to include
        title: Plot title
        figsize: Figure size tuple
        save_path: Optional path to save the figure
        alpha: Point transparency
        color: Point color
        
    Returns:
        matplotlib Figure object (or None if dependencies not available)
    """
    if not HAS_MATPLOTLIB:
        print("Warning: matplotlib not installed. Install with: pip install matplotlib")
        return None
    
    if metrics is None:
        metrics = ["MCS", "LSV", "AAV", "MFA", "LT", "total_mu"]
    
    # Build DataFrame
    data = []
    for pm in metrics_list:
        row = {}
        for metric in metrics:
            value = getattr(pm, metric, None)
            row[metric] = float(value) if value is not None else np.nan
        data.append(row)
    
    df = pd.DataFrame(data)
    
    # Remove columns with all NaN
    df = df.dropna(axis=1, how="all")
    valid_metrics = df.columns.tolist()
    
    if len(valid_metrics) < 2:
        print("Not enough valid metrics for scatter matrix")
        return None
    
    n = len(valid_metrics)
    fig, axes = plt.subplots(n, n, figsize=figsize)
    
    for i, metric_y in enumerate(valid_metrics):
        for j, metric_x in enumerate(valid_metrics):
            ax = axes[i, j] if n > 1 else axes
            
            if i == j:
                # Diagonal: histogram
                values = df[metric_x].dropna()
                ax.hist(values, bins=20, color=color, alpha=0.7, edgecolor="white")
            else:
                # Off-diagonal: scatter plot
                mask = df[[metric_x, metric_y]].notna().all(axis=1)
                ax.scatter(
                    df.loc[mask, metric_x],
                    df.loc[mask, metric_y],
                    alpha=alpha,
                    color=color,
                    s=20,
                )
            
            # Labels
            if i == n - 1:
                ax.set_xlabel(metric_x, fontsize=8)
            if j == 0:
                ax.set_ylabel(metric_y, fontsize=8)
            
            ax.tick_params(labelsize=6)
    
    fig.suptitle(title, fontsize=14)
    plt.tight_layout()
    
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches="tight")
        print(f"Saved scatter matrix to {save_path}")
    
    return fig


def create_scatter_plot(
    metrics_list: List[PlanMetrics],
    x_metric: str,
    y_metric: str,
    title: Optional[str] = None,
    figsize: tuple = (10, 8),
    save_path: Optional[str] = None,
    color_by: Optional[str] = None,
    show_regression: bool = True,
) -> Optional[object]:
    """
    Create a single scatter plot comparing two metrics.
    
    Args:
        metrics_list: List of PlanMetrics objects
        x_metric: Metric for x-axis
        y_metric: Metric for y-axis
        title: Plot title
        figsize: Figure size tuple
        save_path: Optional path to save the figure
        color_by: Optional metric name to color points by
        show_regression: Whether to show regression line
        
    Returns:
        matplotlib Figure object
    """
    if not HAS_MATPLOTLIB:
        print("Warning: matplotlib not installed")
        return None
    
    # Extract data
    x_values = []
    y_values = []
    color_values = []
    
    for pm in metrics_list:
        x = getattr(pm, x_metric, None)
        y = getattr(pm, y_metric, None)
        
        if x is not None and y is not None:
            x_values.append(float(x))
            y_values.append(float(y))
            
            if color_by:
                c = getattr(pm, color_by, None)
                color_values.append(float(c) if c is not None else 0)
    
    if not x_values:
        print(f"No valid data for {x_metric} vs {y_metric}")
        return None
    
    fig, ax = plt.subplots(figsize=figsize)
    
    if color_by and color_values:
        scatter = ax.scatter(
            x_values, y_values, 
            c=color_values, 
            cmap="viridis", 
            alpha=0.7,
            s=50,
        )
        plt.colorbar(scatter, label=color_by)
    else:
        ax.scatter(x_values, y_values, alpha=0.7, s=50, color="#8884d8")
    
    # Regression line
    if show_regression and len(x_values) > 2:
        z = np.polyfit(x_values, y_values, 1)
        p = np.poly1d(z)
        x_line = np.linspace(min(x_values), max(x_values), 100)
        ax.plot(x_line, p(x_line), "r--", alpha=0.8, label=f"y = {z[0]:.3f}x + {z[1]:.3f}")
        ax.legend()
    
    ax.set_xlabel(x_metric)
    ax.set_ylabel(y_metric)
    ax.set_title(title or f"{y_metric} vs {x_metric}")
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches="tight")
    
    return fig
