"""
Correlation matrix calculation for cohort analysis.

Direct translation of src/lib/cohort/correlation.ts
Calculates Pearson correlation coefficients between metrics.
"""

from dataclasses import dataclass, field
from typing import List, Optional

import numpy as np

from .types import PlanMetrics


@dataclass
class CorrelationResult:
    """Single correlation between two metrics."""
    metric1: str
    metric2: str
    correlation: float


@dataclass
class CorrelationMatrix:
    """Complete correlation matrix."""
    metrics: List[str] = field(default_factory=list)
    values: List[List[float]] = field(default_factory=list)  # 2D matrix
    results: List[CorrelationResult] = field(default_factory=list)  # Flat list


# Metrics to include in correlation analysis
CORRELATION_METRICS = [
    "MCS",
    "LSV",
    "AAV",
    "MFA",
    "LT",
    "total_mu",
    "total_delivery_time",
]

# Display names for metrics
METRIC_DISPLAY_NAMES = {
    "MCS": "MCS",
    "LSV": "LSV",
    "AAV": "AAV",
    "MFA": "MFA",
    "LT": "Leaf Travel",
    "total_mu": "Total MU",
    "total_delivery_time": "Delivery Time",
}


def pearson_correlation(x: List[float], y: List[float]) -> float:
    """
    Calculate Pearson correlation coefficient between two arrays.
    Matches the TypeScript implementation.
    """
    if len(x) != len(y) or len(x) < 2:
        return 0.0
    
    n = len(x)
    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_x2 = sum(xi * xi for xi in x)
    sum_y2 = sum(yi * yi for yi in y)
    
    numerator = n * sum_xy - sum_x * sum_y
    denominator = np.sqrt(
        (n * sum_x2 - sum_x * sum_x) * (n * sum_y2 - sum_y * sum_y)
    )
    
    if denominator == 0:
        return 0.0
    return float(numerator / denominator)


def get_metric_display_name(key: str) -> str:
    """Get display name for a metric."""
    return METRIC_DISPLAY_NAMES.get(key, key)


def _extract_metric_value(metrics: PlanMetrics, key: str) -> Optional[float]:
    """Extract a metric value from PlanMetrics."""
    # Handle snake_case vs camelCase
    if hasattr(metrics, key):
        value = getattr(metrics, key)
        return float(value) if value is not None and not np.isnan(value) else None
    return None


def calculate_correlation_matrix(
    metrics_array: List[PlanMetrics]
) -> CorrelationMatrix:
    """
    Calculate correlation matrix for all metrics.
    Matches the TypeScript calculateCorrelationMatrix function.
    """
    metrics = CORRELATION_METRICS.copy()
    n = len(metrics)
    values: List[List[float]] = [[0.0] * n for _ in range(n)]
    results: List[CorrelationResult] = []
    
    # Extract all metric values once
    metric_values: dict = {}
    for metric in metrics:
        extracted = []
        for m in metrics_array:
            value = _extract_metric_value(m, metric)
            extracted.append(value)
        metric_values[metric] = extracted
    
    # Calculate correlations
    for i in range(n):
        for j in range(n):
            if i == j:
                values[i][j] = 1.0  # Perfect correlation with self
            else:
                x_values = metric_values[metrics[i]]
                y_values = metric_values[metrics[j]]
                
                # Need paired values - only include where both metrics have valid values
                paired_x = []
                paired_y = []
                for xi, yi in zip(x_values, y_values):
                    if xi is not None and yi is not None:
                        paired_x.append(xi)
                        paired_y.append(yi)
                
                values[i][j] = pearson_correlation(paired_x, paired_y)
            
            # Only add upper triangle to results (avoid duplicates)
            if j > i:
                results.append(CorrelationResult(
                    metric1=metrics[i],
                    metric2=metrics[j],
                    correlation=values[i][j],
                ))
    
    return CorrelationMatrix(
        metrics=metrics,
        values=values,
        results=results,
    )


def get_correlation_color(value: float) -> str:
    """
    Get color for correlation value.
    Returns RGB color string from blue (-1) through white (0) to red (+1).
    """
    # Clamp value between -1 and 1
    v = max(-1.0, min(1.0, value))
    
    if v >= 0:
        # Positive: white to red
        r = 255
        g = int(255 - v * 100)
        b = int(255 - v * 100)
    else:
        # Negative: white to blue
        r = int(255 + v * 100)
        g = int(255 + v * 100)
        b = 255
    
    return f"rgb({r}, {g}, {b})"


def interpret_correlation(value: float) -> str:
    """Interpret correlation strength."""
    abs_value = abs(value)
    
    if abs_value >= 0.9:
        return "Very strong"
    if abs_value >= 0.7:
        return "Strong"
    if abs_value >= 0.5:
        return "Moderate"
    if abs_value >= 0.3:
        return "Weak"
    return "Very weak"
