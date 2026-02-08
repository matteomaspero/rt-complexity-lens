import { describe, it, expect } from 'vitest';
import { 
  calculateExtendedStatistics, 
  getBoxPlotData,
  formatExtendedStat,
  type ExtendedStatistics 
} from '@/lib/cohort/extended-statistics';

describe('Extended Statistics', () => {
  describe('calculateExtendedStatistics', () => {
    it('should return zeros for empty array', () => {
      const stats = calculateExtendedStatistics([]);
      
      expect(stats.count).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.mean).toBe(0);
      expect(stats.std).toBe(0);
      expect(stats.median).toBe(0);
      expect(stats.q1).toBe(0);
      expect(stats.q3).toBe(0);
      expect(stats.iqr).toBe(0);
      expect(stats.outliers).toEqual([]);
    });

    it('should handle single value', () => {
      const stats = calculateExtendedStatistics([5]);
      
      expect(stats.count).toBe(1);
      expect(stats.min).toBe(5);
      expect(stats.max).toBe(5);
      expect(stats.mean).toBe(5);
      expect(stats.std).toBe(0);
      expect(stats.median).toBe(5);
    });

    it('should calculate correct basic statistics', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const stats = calculateExtendedStatistics(values);
      
      expect(stats.count).toBe(10);
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(10);
      expect(stats.mean).toBe(5.5);
    });

    it('should calculate correct standard deviation', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const stats = calculateExtendedStatistics(values);
      
      // Population std dev = 2
      expect(stats.std).toBeCloseTo(2, 5);
    });

    it('should calculate correct quartiles', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const stats = calculateExtendedStatistics(values);
      
      // Q1 = 25th percentile, Q3 = 75th percentile
      expect(stats.q1).toBeCloseTo(3.25, 1);
      expect(stats.median).toBeCloseTo(5.5, 1);
      expect(stats.q3).toBeCloseTo(7.75, 1);
    });

    it('should calculate correct IQR', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const stats = calculateExtendedStatistics(values);
      
      expect(stats.iqr).toBeCloseTo(stats.q3 - stats.q1, 5);
    });

    it('should calculate percentiles correctly', () => {
      // 0-100 range for easy percentile checking
      const values = Array.from({ length: 101 }, (_, i) => i);
      const stats = calculateExtendedStatistics(values);
      
      expect(stats.p5).toBeCloseTo(5, 0);
      expect(stats.p95).toBeCloseTo(95, 0);
    });

    it('should detect outliers using 1.5xIQR rule', () => {
      // Normal values: 1-5, Outlier: 100
      const values = [1, 2, 3, 4, 5, 100];
      const stats = calculateExtendedStatistics(values);
      
      expect(stats.outliers).toContain(100);
      expect(stats.outliers).not.toContain(1);
      expect(stats.outliers).not.toContain(5);
    });

    it('should detect low outliers', () => {
      // Most values around 100, one outlier at 1
      const values = [1, 98, 99, 100, 101, 102];
      const stats = calculateExtendedStatistics(values);
      
      expect(stats.outliers).toContain(1);
    });

    it('should calculate skewness', () => {
      // Right-skewed distribution
      const rightSkewed = [1, 1, 1, 2, 2, 3, 10];
      const stats = calculateExtendedStatistics(rightSkewed);
      
      expect(stats.skewness).toBeGreaterThan(0);
    });

    it('should handle negative values', () => {
      const values = [-5, -3, -1, 0, 1, 3, 5];
      const stats = calculateExtendedStatistics(values);
      
      expect(stats.min).toBe(-5);
      expect(stats.max).toBe(5);
      expect(stats.mean).toBe(0);
    });

    it('should handle all identical values', () => {
      const values = [5, 5, 5, 5, 5];
      const stats = calculateExtendedStatistics(values);
      
      expect(stats.min).toBe(5);
      expect(stats.max).toBe(5);
      expect(stats.std).toBe(0);
      expect(stats.iqr).toBe(0);
      expect(stats.outliers).toEqual([]);
    });
  });

  describe('getBoxPlotData', () => {
    it('should create box plot data from statistics', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const stats = calculateExtendedStatistics(values);
      const boxData = getBoxPlotData(stats, 'testMetric');
      
      expect(boxData.metric).toBe('testMetric');
      expect(boxData.min).toBe(stats.min);
      expect(boxData.max).toBe(stats.max);
      expect(boxData.q1).toBe(stats.q1);
      expect(boxData.median).toBe(stats.median);
      expect(boxData.q3).toBe(stats.q3);
      expect(boxData.mean).toBe(stats.mean);
    });

    it('should calculate whiskers within 1.5xIQR bounds', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 50]; // 50 is outlier
      const stats = calculateExtendedStatistics(values);
      const boxData = getBoxPlotData(stats, 'test');
      
      // Whisker high should be capped at 1.5xIQR from Q3, not at max
      expect(boxData.whiskerHigh).toBeLessThanOrEqual(stats.max);
      expect(boxData.whiskerLow).toBeGreaterThanOrEqual(stats.min);
    });
  });

  describe('formatExtendedStat', () => {
    it('should format empty stats as N/A', () => {
      const emptyStats = calculateExtendedStatistics([]);
      const formatted = formatExtendedStat(emptyStats);
      
      expect(formatted.range).toBe('N/A');
      expect(formatted.mean).toBe('N/A');
      expect(formatted.median).toBe('N/A');
    });

    it('should format statistics with specified decimals', () => {
      const values = [1.123456, 2.234567, 3.345678];
      const stats = calculateExtendedStatistics(values);
      const formatted = formatExtendedStat(stats, 2);
      
      // Should contain formatted numbers
      expect(formatted.range).toMatch(/\d+\.\d{2}/);
      expect(formatted.mean).toMatch(/\d+\.\d{2}/);
    });

    it('should show outlier count', () => {
      const values = [1, 2, 3, 4, 5, 100];
      const stats = calculateExtendedStatistics(values);
      const formatted = formatExtendedStat(stats);
      
      expect(formatted.outliers).toContain('outlier');
    });

    it('should show "None" when no outliers', () => {
      const values = [1, 2, 3, 4, 5];
      const stats = calculateExtendedStatistics(values);
      const formatted = formatExtendedStat(stats);
      
      expect(formatted.outliers).toBe('None');
    });
  });
});
