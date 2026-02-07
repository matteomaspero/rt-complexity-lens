"""
Correlation heatmap visualization.

Matches the CorrelationHeatmap component from the web application.
"""

from typing import List, Optional

from ..types import PlanMetrics
from ..correlation import calculate_correlation_matrix, METRIC_DISPLAY_NAMES

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


def create_correlation_heatmap(
    metrics_list: List[PlanMetrics],
    metrics: Optional[List[str]] = None,
    title: str = "Correlation Matrix",
    figsize: tuple = (10, 8),
    save_path: Optional[str] = None,
    annotate: bool = True,
    cmap: str = "RdBu_r",
) -> Optional[object]:
    """
    Create a correlation heatmap for metrics.
    
    Args:
        metrics_list: List of PlanMetrics objects
        metrics: Optional list of metric names to include
        title: Plot title
        figsize: Figure size tuple
        save_path: Optional path to save the figure
        annotate: Whether to annotate cells with values
        cmap: Colormap name
        
    Returns:
        matplotlib Figure object (or None if dependencies not available)
    """
    if not HAS_MATPLOTLIB:
        print("Warning: matplotlib not installed. Install with: pip install matplotlib")
        return None
    
    # Calculate correlation matrix
    corr_matrix = calculate_correlation_matrix(metrics_list)
    
    if not corr_matrix.metrics:
        print("No valid metrics for correlation")
        return None
    
    # Convert to numpy array
    values = np.array(corr_matrix.values)
    labels = [METRIC_DISPLAY_NAMES.get(m, m) for m in corr_matrix.metrics]
    
    fig, ax = plt.subplots(figsize=figsize)
    
    if HAS_SEABORN:
        # Use seaborn for nicer heatmap
        sns.heatmap(
            values,
            annot=annotate,
            fmt=".2f",
            cmap=cmap,
            center=0,
            vmin=-1,
            vmax=1,
            xticklabels=labels,
            yticklabels=labels,
            square=True,
            ax=ax,
            cbar_kws={"shrink": 0.8},
        )
    else:
        # Fallback to matplotlib
        im = ax.imshow(values, cmap=cmap, vmin=-1, vmax=1)
        
        # Add colorbar
        cbar = plt.colorbar(im, ax=ax, shrink=0.8)
        cbar.set_label("Correlation")
        
        # Set ticks
        ax.set_xticks(np.arange(len(labels)))
        ax.set_yticks(np.arange(len(labels)))
        ax.set_xticklabels(labels)
        ax.set_yticklabels(labels)
        
        # Rotate x labels
        plt.setp(ax.get_xticklabels(), rotation=45, ha="right", rotation_mode="anchor")
        
        # Add annotations
        if annotate:
            for i in range(len(labels)):
                for j in range(len(labels)):
                    text = ax.text(
                        j, i, f"{values[i, j]:.2f}",
                        ha="center", va="center",
                        color="white" if abs(values[i, j]) > 0.5 else "black",
                        fontsize=8,
                    )
    
    ax.set_title(title)
    plt.tight_layout()
    
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches="tight")
        print(f"Saved correlation heatmap to {save_path}")
    
    return fig


def create_correlation_table(
    metrics_list: List[PlanMetrics],
    threshold: float = 0.5,
) -> List[dict]:
    """
    Get significant correlations as a table.
    
    Args:
        metrics_list: List of PlanMetrics objects
        threshold: Minimum absolute correlation to include
        
    Returns:
        List of dicts with metric1, metric2, correlation, strength
    """
    corr_matrix = calculate_correlation_matrix(metrics_list)
    
    results = []
    for result in corr_matrix.results:
        if abs(result.correlation) >= threshold:
            # Determine strength
            abs_val = abs(result.correlation)
            if abs_val >= 0.9:
                strength = "Very strong"
            elif abs_val >= 0.7:
                strength = "Strong"
            elif abs_val >= 0.5:
                strength = "Moderate"
            else:
                strength = "Weak"
            
            results.append({
                "metric1": METRIC_DISPLAY_NAMES.get(result.metric1, result.metric1),
                "metric2": METRIC_DISPLAY_NAMES.get(result.metric2, result.metric2),
                "correlation": round(result.correlation, 3),
                "strength": strength,
                "direction": "Positive" if result.correlation > 0 else "Negative",
            })
    
    # Sort by absolute correlation
    results.sort(key=lambda x: abs(x["correlation"]), reverse=True)
    
    return results
