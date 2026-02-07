/**
 * Extended statistics calculations for cohort analysis
 * Includes quartiles, IQR, percentiles, skewness, and outlier detection
 */

export interface ExtendedStatistics {
  min: number;
  max: number;
  mean: number;
  std: number;
  median: number;
  q1: number;           // 25th percentile
  q3: number;           // 75th percentile
  iqr: number;          // Interquartile range
  p5: number;           // 5th percentile
  p95: number;          // 95th percentile
  skewness: number;     // Distribution skewness
  count: number;
  outliers: number[];   // Values outside 1.5×IQR
}

/**
 * Calculate percentile using linear interpolation (exclusive method)
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const fraction = index - lower;
  
  if (lower === upper) return sorted[lower];
  return sorted[lower] + fraction * (sorted[upper] - sorted[lower]);
}

/**
 * Calculate extended statistics for an array of values
 */
export function calculateExtendedStatistics(values: number[]): ExtendedStatistics {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      std: 0,
      median: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      p5: 0,
      p95: 0,
      skewness: 0,
      count: 0,
      outliers: [],
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  // Basic statistics
  const min = sorted[0];
  const max = sorted[n - 1];
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  // Standard deviation
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((acc, v) => acc + v, 0) / n;
  const std = Math.sqrt(variance);

  // Quartiles and percentiles
  const q1 = percentile(sorted, 25);
  const median = percentile(sorted, 50);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  const p5 = percentile(sorted, 5);
  const p95 = percentile(sorted, 95);

  // Outliers using 1.5×IQR rule
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outliers = sorted.filter(v => v < lowerFence || v > upperFence);

  // Skewness (Fisher-Pearson coefficient)
  let skewness = 0;
  if (n > 2 && std > 0) {
    const m3 = values.reduce((acc, v) => acc + Math.pow(v - mean, 3), 0) / n;
    skewness = m3 / Math.pow(std, 3);
  }

  return {
    min,
    max,
    mean,
    std,
    median,
    q1,
    q3,
    iqr,
    p5,
    p95,
    skewness,
    count: n,
    outliers,
  };
}

/**
 * Calculate box plot data from extended statistics
 */
export interface BoxPlotData {
  metric: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  whiskerLow: number;
  whiskerHigh: number;
  outliers: number[];
}

export function getBoxPlotData(stats: ExtendedStatistics, metricName: string): BoxPlotData {
  const lowerFence = stats.q1 - 1.5 * stats.iqr;
  const upperFence = stats.q3 + 1.5 * stats.iqr;
  
  // Whiskers extend to the most extreme data point within the fences
  const whiskerLow = Math.max(stats.min, lowerFence);
  const whiskerHigh = Math.min(stats.max, upperFence);

  return {
    metric: metricName,
    min: stats.min,
    q1: stats.q1,
    median: stats.median,
    q3: stats.q3,
    max: stats.max,
    mean: stats.mean,
    whiskerLow,
    whiskerHigh,
    outliers: stats.outliers,
  };
}

/**
 * Format extended statistics for display
 */
export function formatExtendedStat(stat: ExtendedStatistics, decimals = 3): Record<string, string> {
  if (stat.count === 0) {
    return {
      range: 'N/A',
      mean: 'N/A',
      median: 'N/A',
      quartiles: 'N/A',
      iqr: 'N/A',
      percentiles: 'N/A',
      outliers: 'N/A',
    };
  }

  return {
    range: `${stat.min.toFixed(decimals)} – ${stat.max.toFixed(decimals)}`,
    mean: `${stat.mean.toFixed(decimals)} ± ${stat.std.toFixed(decimals)}`,
    median: stat.median.toFixed(decimals),
    quartiles: `Q1: ${stat.q1.toFixed(decimals)}, Q3: ${stat.q3.toFixed(decimals)}`,
    iqr: stat.iqr.toFixed(decimals),
    percentiles: `P5: ${stat.p5.toFixed(decimals)}, P95: ${stat.p95.toFixed(decimals)}`,
    outliers: stat.outliers.length > 0 ? `${stat.outliers.length} outlier(s)` : 'None',
  };
}
