import { describe, it, expect } from 'vitest';
import { 
  calculateCorrelationMatrix, 
  getCorrelationColor,
  interpretCorrelation,
  getMetricDisplayName 
} from '@/lib/cohort/correlation';
import type { PlanMetrics } from '@/lib/dicom/types';

// Helper to create mock plan metrics
function createMockMetrics(overrides: Partial<PlanMetrics> = {}): PlanMetrics {
  return {
    MCS: 0.5,
    LSV: 0.6,
    AAV: 0.7,
    MFA: 25,
    LT: 500,
    totalMU: 1000,
    totalDeliveryTime: 300,
    EFS: 100,
    PA: 200,
    SAS5: 0.1,
    SAS10: 0.2,
    EM: 0.3,
    PI: 0.4,
    ...overrides,
  } as PlanMetrics;
}

describe('Correlation Matrix Calculation', () => {
  describe('calculateCorrelationMatrix', () => {
    it('should return correct structure', () => {
      const metrics = [
        createMockMetrics({ MCS: 0.2, LSV: 0.3, totalMU: 500 }),
        createMockMetrics({ MCS: 0.4, LSV: 0.5, totalMU: 700 }),
        createMockMetrics({ MCS: 0.6, LSV: 0.7, totalMU: 900 }),
      ];

      const result = calculateCorrelationMatrix(metrics);

      expect(result.metrics).toBeInstanceOf(Array);
      expect(result.values).toBeInstanceOf(Array);
      expect(result.results).toBeInstanceOf(Array);
      expect(result.metrics.length).toBeGreaterThan(0);
    });

    it('should have diagonal values of 1 (self-correlation)', () => {
      const metrics = [
        createMockMetrics({ MCS: 0.2 }),
        createMockMetrics({ MCS: 0.4 }),
        createMockMetrics({ MCS: 0.6 }),
      ];

      const result = calculateCorrelationMatrix(metrics);

      // All diagonal values should be 1
      for (let i = 0; i < result.values.length; i++) {
        expect(result.values[i][i]).toBe(1);
      }
    });

    it('should be symmetric', () => {
      const metrics = [
        createMockMetrics({ MCS: 0.2, LSV: 0.8 }),
        createMockMetrics({ MCS: 0.5, LSV: 0.5 }),
        createMockMetrics({ MCS: 0.8, LSV: 0.2 }),
      ];

      const result = calculateCorrelationMatrix(metrics);

      // Matrix should be symmetric
      for (let i = 0; i < result.values.length; i++) {
        for (let j = 0; j < result.values[i].length; j++) {
          expect(result.values[i][j]).toBeCloseTo(result.values[j][i], 10);
        }
      }
    });

    it('should detect perfect positive correlation', () => {
      const metrics = [
        createMockMetrics({ MCS: 0.1, LSV: 0.1 }),
        createMockMetrics({ MCS: 0.2, LSV: 0.2 }),
        createMockMetrics({ MCS: 0.3, LSV: 0.3 }),
        createMockMetrics({ MCS: 0.4, LSV: 0.4 }),
      ];

      const result = calculateCorrelationMatrix(metrics);
      
      // Find correlation between MCS and LSV
      const mcsIdx = result.metrics.indexOf('MCS');
      const lsvIdx = result.metrics.indexOf('LSV');
      
      if (mcsIdx >= 0 && lsvIdx >= 0) {
        expect(result.values[mcsIdx][lsvIdx]).toBeCloseTo(1, 5);
      }
    });

    it('should detect perfect negative correlation', () => {
      const metrics = [
        createMockMetrics({ MCS: 0.1, LSV: 0.9 }),
        createMockMetrics({ MCS: 0.2, LSV: 0.8 }),
        createMockMetrics({ MCS: 0.3, LSV: 0.7 }),
        createMockMetrics({ MCS: 0.4, LSV: 0.6 }),
      ];

      const result = calculateCorrelationMatrix(metrics);
      
      const mcsIdx = result.metrics.indexOf('MCS');
      const lsvIdx = result.metrics.indexOf('LSV');
      
      if (mcsIdx >= 0 && lsvIdx >= 0) {
        expect(result.values[mcsIdx][lsvIdx]).toBeCloseTo(-1, 5);
      }
    });

    it('should return 0 for uncorrelated data', () => {
      // Perfectly uncorrelated pattern
      const metrics = [
        createMockMetrics({ MCS: 0.1, LSV: 0.5 }),
        createMockMetrics({ MCS: 0.2, LSV: 0.5 }),
        createMockMetrics({ MCS: 0.3, LSV: 0.5 }),
      ];

      const result = calculateCorrelationMatrix(metrics);
      
      const mcsIdx = result.metrics.indexOf('MCS');
      const lsvIdx = result.metrics.indexOf('LSV');
      
      if (mcsIdx >= 0 && lsvIdx >= 0) {
        // When LSV is constant, correlation should be 0
        expect(result.values[mcsIdx][lsvIdx]).toBe(0);
      }
    });

    it('should only include upper triangle in results (no duplicates)', () => {
      const metrics = [
        createMockMetrics(),
        createMockMetrics(),
      ];

      const result = calculateCorrelationMatrix(metrics);
      
      // Check for duplicates
      const seen = new Set<string>();
      for (const r of result.results) {
        const key = `${r.metric1}-${r.metric2}`;
        const reverseKey = `${r.metric2}-${r.metric1}`;
        
        expect(seen.has(key)).toBe(false);
        expect(seen.has(reverseKey)).toBe(false);
        seen.add(key);
      }
    });

    it('should handle empty metrics array', () => {
      const result = calculateCorrelationMatrix([]);

      expect(result.metrics).toBeInstanceOf(Array);
      expect(result.values).toBeInstanceOf(Array);
    });

    it('should handle single plan', () => {
      const result = calculateCorrelationMatrix([createMockMetrics()]);

      // With single plan, correlations can't be computed meaningfully
      // but function should not crash
      expect(result.metrics).toBeInstanceOf(Array);
    });
  });

  describe('getCorrelationColor', () => {
    it('should return reddish color for strong positive correlation', () => {
      const color = getCorrelationColor(0.9);
      expect(color).toMatch(/hsl\(0,/); // Red hue
    });

    it('should return bluish color for strong negative correlation', () => {
      const color = getCorrelationColor(-0.9);
      expect(color).toMatch(/hsl\(220,/); // Blue hue
    });

    it('should return near-white for zero correlation', () => {
      const color = getCorrelationColor(0);
      expect(color).toMatch(/hsl\(0, 0%, 95%\)/);
    });

    it('should clamp values outside -1 to 1 range', () => {
      const colorHigh = getCorrelationColor(2);
      const colorLow = getCorrelationColor(-2);
      
      // Should not crash and return valid HSL
      expect(colorHigh).toMatch(/hsl\(/);
      expect(colorLow).toMatch(/hsl\(/);
    });
  });

  describe('interpretCorrelation', () => {
    it('should return "Very strong" for |r| >= 0.9', () => {
      expect(interpretCorrelation(0.95)).toBe('Very strong');
      expect(interpretCorrelation(-0.92)).toBe('Very strong');
    });

    it('should return "Strong" for |r| >= 0.7', () => {
      expect(interpretCorrelation(0.75)).toBe('Strong');
      expect(interpretCorrelation(-0.8)).toBe('Strong');
    });

    it('should return "Moderate" for |r| >= 0.5', () => {
      expect(interpretCorrelation(0.55)).toBe('Moderate');
      expect(interpretCorrelation(-0.65)).toBe('Moderate');
    });

    it('should return "Weak" for |r| >= 0.3', () => {
      expect(interpretCorrelation(0.35)).toBe('Weak');
      expect(interpretCorrelation(-0.45)).toBe('Weak');
    });

    it('should return "Very weak" for |r| < 0.3', () => {
      expect(interpretCorrelation(0.1)).toBe('Very weak');
      expect(interpretCorrelation(-0.2)).toBe('Very weak');
      expect(interpretCorrelation(0)).toBe('Very weak');
    });
  });

  describe('getMetricDisplayName', () => {
    it('should return display name for known metrics', () => {
      expect(getMetricDisplayName('MCS')).toBe('MCS');
      expect(getMetricDisplayName('LT')).toBe('Leaf Travel');
      expect(getMetricDisplayName('totalMU')).toBe('Total MU');
      expect(getMetricDisplayName('totalDeliveryTime')).toBe('Delivery');
    });

    it('should return key for unknown metrics', () => {
      expect(getMetricDisplayName('unknownMetric')).toBe('unknownMetric');
    });
  });
});
