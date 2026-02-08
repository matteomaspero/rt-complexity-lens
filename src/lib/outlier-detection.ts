import type { PlanMetricsResult } from './dicom/types';
import { METRIC_DEFINITIONS } from './metrics-definitions';

export interface OutlierDetectionResult {
  planId: string;
  fileName: string;
  outlierMetrics: Array<{
    metricKey: string;
    metricName: string;
    value: number;
    zScore: number;
    percentile: number;
    severity: 'warning' | 'critical';
  }>;
  overallComplexityScore: number; // 0-100, higher = more complex
  recommendation: string;
}

export interface CohortStatistics {
  metricKey: string;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  q25: number;
  q75: number;
}

/**
 * Calculate statistics for a metric across the cohort
 */
export function calculateMetricStatistics(
  values: number[]
): Omit<CohortStatistics, 'metricKey'> {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const median = n % 2 === 0 
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 
    : sorted[Math.floor(n / 2)];

  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const std = Math.sqrt(variance);

  const q25Index = Math.floor(n * 0.25);
  const q75Index = Math.floor(n * 0.75);

  return {
    mean,
    median,
    std,
    min: sorted[0],
    max: sorted[n - 1],
    q25: sorted[q25Index],
    q75: sorted[q75Index],
  };
}

/**
 * Calculate z-score for a value
 */
function calculateZScore(value: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return (value - mean) / std;
}

/**
 * Calculate percentile rank (0-100)
 */
function calculatePercentile(value: number, sortedValues: number[]): number {
  const index = sortedValues.findIndex(v => v >= value);
  if (index === -1) return 100;
  if (index === 0) return 0;
  return (index / sortedValues.length) * 100;
}

/**
 * Detect outliers in a batch of plans
 * Returns plans that have metrics significantly outside the normal range
 */
export function detectOutliers(
  plans: PlanMetricsResult[],
  options: {
    zScoreThreshold?: number; // Default: 2.0 (95% confidence)
    criticalZScoreThreshold?: number; // Default: 3.0 (99.7% confidence)
    minPlans?: number; // Minimum number of plans to perform analysis
  } = {}
): OutlierDetectionResult[] {
  const {
    zScoreThreshold = 2.0,
    criticalZScoreThreshold = 3.0,
    minPlans = 5,
  } = options;

  if (plans.length < minPlans) {
    return []; // Not enough data for statistical analysis
  }

  // Key metrics to check for outliers (prioritize clinically relevant ones)
  const keyMetrics = [
    'MCS', 'LSV', 'AAV', 'MFA', 'LT', 'LTMCS',
    'MAD', 'LG', 'EFS', 'SAS5', 'SAS10',
    'MUCA', 'LTMU', 'LS', 'mDRV',
  ];

  // Calculate statistics for each metric
  const metricStats = new Map<string, CohortStatistics>();
  
  for (const metricKey of keyMetrics) {
    const values = plans
      .map(p => p.planMetrics?.[metricKey])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));

    if (values.length < minPlans) continue;

    const stats = calculateMetricStatistics(values);
    metricStats.set(metricKey, { metricKey, ...stats });
  }

  // Detect outliers for each plan
  const results: OutlierDetectionResult[] = [];

  for (const plan of plans) {
    const outlierMetrics: OutlierDetectionResult['outlierMetrics'] = [];
    let complexitySum = 0;
    let complexityCount = 0;

    for (const [metricKey, stats] of metricStats.entries()) {
      const value = plan.planMetrics?.[metricKey];
      if (typeof value !== 'number' || isNaN(value)) continue;

      const zScore = calculateZScore(value, stats.mean, stats.std);
      const absZScore = Math.abs(zScore);

      // Check if this is an outlier
      if (absZScore >= zScoreThreshold) {
        const sortedValues = plans
          .map(p => p.planMetrics?.[metricKey])
          .filter((v): v is number => typeof v === 'number' && !isNaN(v))
          .sort((a, b) => a - b);

        const percentile = calculatePercentile(value, sortedValues);
        const severity: 'warning' | 'critical' = 
          absZScore >= criticalZScoreThreshold ? 'critical' : 'warning';

        const metricDef = METRIC_DEFINITIONS[metricKey];

        outlierMetrics.push({
          metricKey,
          metricName: metricDef?.name || metricKey,
          value,
          zScore,
          percentile,
          severity,
        });

        complexitySum += absZScore;
        complexityCount++;
      }
    }

    // Only include plans with at least one outlier metric
    if (outlierMetrics.length > 0) {
      // Calculate overall complexity score (0-100)
      const avgZScore = complexitySum / complexityCount;
      const overallComplexityScore = Math.min(100, (avgZScore / criticalZScoreThreshold) * 100);

      // Generate recommendation
      const criticalCount = outlierMetrics.filter(m => m.severity === 'critical').length;
      const warningCount = outlierMetrics.length - criticalCount;

      let recommendation = '';
      if (criticalCount > 0) {
        recommendation = `${criticalCount} critical outlier(s) detected. Requires comprehensive QA verification before delivery.`;
      } else if (warningCount >= 3) {
        recommendation = `${warningCount} warning outliers detected. Additional QA verification recommended.`;
      } else {
        recommendation = `${warningCount} outlier(s) detected. Standard QA protocols apply.`;
      }

      results.push({
        planId: plan.planLabel || plan.fileName,
        fileName: plan.fileName,
        outlierMetrics: outlierMetrics.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore)),
        overallComplexityScore,
        recommendation,
      });
    }
  }

  // Sort by overall complexity score (most complex first)
  return results.sort((a, b) => b.overallComplexityScore - a.overallComplexityScore);
}

/**
 * Suggest clustering dimensions based on metric variability
 */
export function suggestClusteringDimensions(
  plans: PlanMetricsResult[],
  topN: number = 3
): Array<{
  metricKey: string;
  metricName: string;
  variabilityScore: number; // Higher = more useful for clustering
  coefficientOfVariation: number;
  reason: string;
}> {
  if (plans.length < 5) return [];

  const keyMetrics = [
    'MCS', 'LSV', 'AAV', 'MFA', 'LT', 'LTMCS',
    'MAD', 'LG', 'EFS', 
    'MUCA', 'LTMU', 'LS',
  ];

  const suggestions: Array<{
    metricKey: string;
    metricName: string;
    variabilityScore: number;
    coefficientOfVariation: number;
    reason: string;
  }> = [];

  for (const metricKey of keyMetrics) {
    const values = plans
      .map(p => p.planMetrics?.[metricKey])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));

    if (values.length < 5) continue;

    const stats = calculateMetricStatistics(values);
    
    // Coefficient of variation (CV) = std / mean
    // Higher CV indicates more variability, making it useful for clustering
    const cv = stats.mean !== 0 ? Math.abs(stats.std / stats.mean) : 0;

    // Variability score combines CV with clinical relevance
    // Primary metrics (MCS, LSV, AAV) get bonus points
    const isPrimaryMetric = ['MCS', 'LSV', 'AAV', 'MFA'].includes(metricKey);
    const variabilityScore = cv * (isPrimaryMetric ? 1.5 : 1.0);

    const metricDef = METRIC_DEFINITIONS[metricKey];
    let reason = '';

    if (cv > 0.5) {
      reason = 'High variability across cohort - excellent separator';
    } else if (cv > 0.3) {
      reason = 'Moderate variability - useful for distinguishing subgroups';
    } else if (cv > 0.15) {
      reason = 'Some variability present - may reveal patterns';
    } else {
      reason = 'Low variability - limited clustering utility';
    }

    suggestions.push({
      metricKey,
      metricName: metricDef?.name || metricKey,
      variabilityScore,
      coefficientOfVariation: cv,
      reason,
    });
  }

  // Sort by variability score and return top N
  return suggestions
    .sort((a, b) => b.variabilityScore - a.variabilityScore)
    .slice(0, topN);
}
