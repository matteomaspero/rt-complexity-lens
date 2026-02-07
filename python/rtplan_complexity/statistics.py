"""
Extended statistics calculations for cohort analysis.

Direct translation of src/lib/cohort/extended-statistics.ts
Includes quartiles, IQR, percentiles, skewness, and outlier detection.
"""

from typing import List

import numpy as np
from scipy import stats as scipy_stats

from .types import ExtendedStatistics, BoxPlotData


def percentile(sorted_values: List[float], p: float) -> float:
    """
    Calculate percentile using linear interpolation (exclusive method).
    Matches the TypeScript implementation.
    """
    if len(sorted_values) == 0:
        return 0.0
    if len(sorted_values) == 1:
        return sorted_values[0]
    
    index = (p / 100) * (len(sorted_values) - 1)
    lower = int(np.floor(index))
    upper = int(np.ceil(index))
    fraction = index - lower
    
    if lower == upper:
        return sorted_values[lower]
    return sorted_values[lower] + fraction * (sorted_values[upper] - sorted_values[lower])


def calculate_extended_statistics(values: List[float]) -> ExtendedStatistics:
    """
    Calculate extended statistics for an array of values.
    Matches the TypeScript implementation exactly.
    """
    if len(values) == 0:
        return ExtendedStatistics(
            min=0.0,
            max=0.0,
            mean=0.0,
            std=0.0,
            median=0.0,
            q1=0.0,
            q3=0.0,
            iqr=0.0,
            p5=0.0,
            p95=0.0,
            skewness=0.0,
            count=0,
            outliers=[],
        )
    
    arr = np.array(values)
    sorted_arr = np.sort(arr)
    n = len(sorted_arr)
    
    # Basic statistics
    min_val = float(sorted_arr[0])
    max_val = float(sorted_arr[-1])
    mean_val = float(np.mean(arr))
    
    # Standard deviation (population, not sample)
    std_val = float(np.std(arr, ddof=0))
    
    # Quartiles and percentiles using our custom function to match TypeScript
    q1 = percentile(sorted_arr.tolist(), 25)
    median_val = percentile(sorted_arr.tolist(), 50)
    q3 = percentile(sorted_arr.tolist(), 75)
    iqr = q3 - q1
    p5 = percentile(sorted_arr.tolist(), 5)
    p95 = percentile(sorted_arr.tolist(), 95)
    
    # Outliers using 1.5×IQR rule
    lower_fence = q1 - 1.5 * iqr
    upper_fence = q3 + 1.5 * iqr
    outliers = [float(v) for v in sorted_arr if v < lower_fence or v > upper_fence]
    
    # Skewness (Fisher-Pearson coefficient)
    skewness = 0.0
    if n > 2 and std_val > 0:
        m3 = np.mean((arr - mean_val) ** 3)
        skewness = float(m3 / (std_val ** 3))
    
    return ExtendedStatistics(
        min=min_val,
        max=max_val,
        mean=mean_val,
        std=std_val,
        median=median_val,
        q1=q1,
        q3=q3,
        iqr=iqr,
        p5=p5,
        p95=p95,
        skewness=skewness,
        count=n,
        outliers=outliers,
    )


def get_box_plot_data(stats: ExtendedStatistics, metric_name: str) -> BoxPlotData:
    """
    Calculate box plot data from extended statistics.
    Matches the TypeScript getBoxPlotData function.
    """
    lower_fence = stats.q1 - 1.5 * stats.iqr
    upper_fence = stats.q3 + 1.5 * stats.iqr
    
    # Whiskers extend to the most extreme data point within the fences
    whisker_low = max(stats.min, lower_fence)
    whisker_high = min(stats.max, upper_fence)
    
    return BoxPlotData(
        metric=metric_name,
        min=stats.min,
        q1=stats.q1,
        median=stats.median,
        q3=stats.q3,
        max=stats.max,
        mean=stats.mean,
        whisker_low=whisker_low,
        whisker_high=whisker_high,
        outliers=stats.outliers,
    )


def format_extended_stat(stat: ExtendedStatistics, decimals: int = 3) -> dict:
    """
    Format extended statistics for display.
    Returns a dictionary of formatted strings.
    """
    if stat.count == 0:
        return {
            "range": "N/A",
            "mean": "N/A",
            "median": "N/A",
            "quartiles": "N/A",
            "iqr": "N/A",
            "percentiles": "N/A",
            "outliers": "N/A",
        }
    
    fmt = f".{decimals}f"
    return {
        "range": f"{stat.min:{fmt}} – {stat.max:{fmt}}",
        "mean": f"{stat.mean:{fmt}} ± {stat.std:{fmt}}",
        "median": f"{stat.median:{fmt}}",
        "quartiles": f"Q1: {stat.q1:{fmt}}, Q3: {stat.q3:{fmt}}",
        "iqr": f"{stat.iqr:{fmt}}",
        "percentiles": f"P5: {stat.p5:{fmt}}, P95: {stat.p95:{fmt}}",
        "outliers": f"{len(stat.outliers)} outlier(s)" if stat.outliers else "None",
    }
