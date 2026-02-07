/**
 * Correlation matrix calculation for cohort analysis
 * Calculates Pearson correlation coefficients between metrics
 */

import type { PlanMetrics } from '@/lib/dicom/types';

export interface CorrelationResult {
  metric1: string;
  metric2: string;
  correlation: number;
}

export interface CorrelationMatrix {
  metrics: string[];
  values: number[][]; // 2D matrix of correlation values
  results: CorrelationResult[]; // Flat list for easier iteration
}

/**
 * Calculate Pearson correlation coefficient between two arrays
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
}

// Metrics to include in correlation analysis
const CORRELATION_METRICS = [
  'MCS',
  'LSV',
  'AAV',
  'MFA',
  'LT',
  'totalMU',
  'totalDeliveryTime',
] as const;

type MetricKey = typeof CORRELATION_METRICS[number];

/**
 * Extract metric values from an array of plan metrics
 */
function extractMetricValues(
  metricsArray: PlanMetrics[], 
  key: MetricKey
): number[] {
  return metricsArray
    .map(m => {
      const value = m[key as keyof PlanMetrics];
      return typeof value === 'number' ? value : NaN;
    })
    .filter(v => !isNaN(v));
}

/**
 * Get display name for a metric
 */
export function getMetricDisplayName(key: string): string {
  const displayNames: Record<string, string> = {
    MCS: 'MCS',
    LSV: 'LSV',
    AAV: 'AAV',
    MFA: 'MFA',
    LT: 'Leaf Travel',
    totalMU: 'Total MU',
    totalDeliveryTime: 'Delivery Time',
  };
  return displayNames[key] || key;
}

/**
 * Calculate correlation matrix for all metrics
 */
export function calculateCorrelationMatrix(
  metricsArray: PlanMetrics[]
): CorrelationMatrix {
  const metrics = [...CORRELATION_METRICS];
  const n = metrics.length;
  const values: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  const results: CorrelationResult[] = [];

  // Extract all metric values once
  const metricValues: Map<MetricKey, number[]> = new Map();
  for (const metric of metrics) {
    metricValues.set(metric, extractMetricValues(metricsArray, metric));
  }

  // Calculate correlations
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        values[i][j] = 1; // Perfect correlation with self
      } else {
        const x = metricValues.get(metrics[i]) || [];
        const y = metricValues.get(metrics[j]) || [];
        
        // Need paired values - only include where both metrics have valid values
        const pairs = metricsArray
          .map((m, idx) => ({
            x: x[idx],
            y: y[idx],
          }))
          .filter(p => !isNaN(p.x) && !isNaN(p.y));
        
        const pairedX = pairs.map(p => p.x);
        const pairedY = pairs.map(p => p.y);
        
        values[i][j] = pearsonCorrelation(pairedX, pairedY);
      }

      // Only add upper triangle to results (avoid duplicates)
      if (j > i) {
        results.push({
          metric1: metrics[i],
          metric2: metrics[j],
          correlation: values[i][j],
        });
      }
    }
  }

  return {
    metrics,
    values,
    results,
  };
}

/**
 * Get color for correlation value
 * Returns HSL color string from blue (-1) through white (0) to red (+1)
 */
export function getCorrelationColor(value: number): string {
  // Clamp value between -1 and 1
  const v = Math.max(-1, Math.min(1, value));
  
  if (v >= 0) {
    // Positive: white to red
    const hue = 0; // Red
    const saturation = Math.round(v * 70);
    const lightness = 95 - Math.round(v * 40);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  } else {
    // Negative: white to blue
    const hue = 220; // Blue
    const saturation = Math.round(Math.abs(v) * 70);
    const lightness = 95 - Math.round(Math.abs(v) * 40);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
}

/**
 * Interpret correlation strength
 */
export function interpretCorrelation(value: number): string {
  const absValue = Math.abs(value);
  
  if (absValue >= 0.9) return 'Very strong';
  if (absValue >= 0.7) return 'Strong';
  if (absValue >= 0.5) return 'Moderate';
  if (absValue >= 0.3) return 'Weak';
  return 'Very weak';
}
