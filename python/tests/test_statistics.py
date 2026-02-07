"""
Statistics calculation tests for rtplan_complexity.
"""

import pytest
from pathlib import Path
import sys

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from rtplan_complexity.statistics import (
    calculate_extended_statistics,
    get_box_plot_data,
    percentile,
)
from rtplan_complexity.types import ExtendedStatistics


class TestPercentile:
    """Test percentile calculation."""
    
    def test_percentile_median(self):
        """Test 50th percentile (median)."""
        values = [1.0, 2.0, 3.0, 4.0, 5.0]
        assert percentile(values, 50) == pytest.approx(3.0)
    
    def test_percentile_quartiles(self):
        """Test quartile calculation."""
        values = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]
        
        q1 = percentile(values, 25)
        q3 = percentile(values, 75)
        
        assert q1 == pytest.approx(3.25)
        assert q3 == pytest.approx(7.75)
    
    def test_percentile_empty(self):
        """Test percentile with empty list."""
        assert percentile([], 50) == 0.0
    
    def test_percentile_single(self):
        """Test percentile with single value."""
        assert percentile([5.0], 50) == 5.0
        assert percentile([5.0], 25) == 5.0
        assert percentile([5.0], 75) == 5.0


class TestExtendedStatistics:
    """Test extended statistics calculation."""
    
    def test_basic_statistics(self):
        """Test basic statistics calculation."""
        values = [1.0, 2.0, 3.0, 4.0, 5.0]
        stats = calculate_extended_statistics(values)
        
        assert stats.count == 5
        assert stats.min == 1.0
        assert stats.max == 5.0
        assert stats.mean == pytest.approx(3.0)
        assert stats.median == pytest.approx(3.0)
    
    def test_empty_values(self):
        """Test with empty list."""
        stats = calculate_extended_statistics([])
        
        assert stats.count == 0
        assert stats.min == 0.0
        assert stats.max == 0.0
        assert stats.mean == 0.0
        assert stats.outliers == []
    
    def test_quartiles(self):
        """Test quartile calculation."""
        values = list(range(1, 101))  # 1 to 100
        stats = calculate_extended_statistics(values)
        
        assert stats.q1 == pytest.approx(25.75, rel=0.01)
        assert stats.median == pytest.approx(50.5, rel=0.01)
        assert stats.q3 == pytest.approx(75.25, rel=0.01)
    
    def test_iqr(self):
        """Test IQR calculation."""
        values = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]
        stats = calculate_extended_statistics(values)
        
        expected_iqr = stats.q3 - stats.q1
        assert stats.iqr == pytest.approx(expected_iqr)
    
    def test_outlier_detection(self):
        """Test outlier detection using 1.5×IQR rule."""
        # Normal values with one outlier
        values = [1.0, 2.0, 3.0, 4.0, 5.0, 100.0]  # 100 is an outlier
        stats = calculate_extended_statistics(values)
        
        assert len(stats.outliers) > 0
        assert 100.0 in stats.outliers
    
    def test_no_outliers(self):
        """Test data without outliers."""
        values = [1.0, 2.0, 3.0, 4.0, 5.0]
        stats = calculate_extended_statistics(values)
        
        assert len(stats.outliers) == 0
    
    def test_skewness_symmetric(self):
        """Test skewness for symmetric distribution."""
        values = [1.0, 2.0, 3.0, 4.0, 5.0]
        stats = calculate_extended_statistics(values)
        
        # Symmetric distribution should have skewness close to 0
        assert abs(stats.skewness) < 0.1
    
    def test_skewness_right(self):
        """Test skewness for right-skewed distribution."""
        values = [1.0, 1.0, 1.0, 2.0, 2.0, 3.0, 10.0, 20.0]
        stats = calculate_extended_statistics(values)
        
        # Right-skewed distribution should have positive skewness
        assert stats.skewness > 0
    
    def test_percentiles_5_95(self):
        """Test 5th and 95th percentiles."""
        values = list(range(1, 101))  # 1 to 100
        stats = calculate_extended_statistics(values)
        
        assert stats.p5 == pytest.approx(5.95, rel=0.05)
        assert stats.p95 == pytest.approx(95.05, rel=0.05)


class TestBoxPlotData:
    """Test box plot data generation."""
    
    def test_box_plot_data(self):
        """Test box plot data generation."""
        values = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]
        stats = calculate_extended_statistics(values)
        bp_data = get_box_plot_data(stats, "test_metric")
        
        assert bp_data.metric == "test_metric"
        assert bp_data.min == 1.0
        assert bp_data.max == 10.0
        assert bp_data.median == stats.median
        assert bp_data.q1 == stats.q1
        assert bp_data.q3 == stats.q3
    
    def test_whisker_limits(self):
        """Test whisker calculation."""
        # Data with outlier
        values = [1.0, 2.0, 3.0, 4.0, 5.0, 100.0]
        stats = calculate_extended_statistics(values)
        bp_data = get_box_plot_data(stats, "test")
        
        # Whiskers should be within 1.5×IQR
        lower_fence = stats.q1 - 1.5 * stats.iqr
        upper_fence = stats.q3 + 1.5 * stats.iqr
        
        assert bp_data.whisker_low >= lower_fence
        assert bp_data.whisker_high <= upper_fence


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
