import type { PlanMetrics } from '@/lib/dicom/types';

export interface MetricStatistics {
  min: number;
  max: number;
  mean: number;
  std: number;
  median: number;
  count: number;
}

export interface BatchStatistics {
  planCount: number;
  MCS: MetricStatistics;
  LSV: MetricStatistics;
  AAV: MetricStatistics;
  MFA: MetricStatistics;
  LT: MetricStatistics;
  totalMU: MetricStatistics;
  deliveryTime: MetricStatistics;
  SAS5?: MetricStatistics;
  SAS10?: MetricStatistics;
  EM?: MetricStatistics;
  PI?: MetricStatistics;
}

function calculateStatistics(values: number[]): MetricStatistics {
  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, std: 0, median: 0, count: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / values.length;
  
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((acc, v) => acc + v, 0) / values.length;
  const std = Math.sqrt(variance);

  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    std,
    median,
    count: values.length,
  };
}

export function calculateBatchStatistics(metricsArray: PlanMetrics[]): BatchStatistics {
  const extractMetric = (key: keyof PlanMetrics): number[] => {
    return metricsArray
      .map(m => m[key])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));
  };

  return {
    planCount: metricsArray.length,
    MCS: calculateStatistics(extractMetric('MCS')),
    LSV: calculateStatistics(extractMetric('LSV')),
    AAV: calculateStatistics(extractMetric('AAV')),
    MFA: calculateStatistics(extractMetric('MFA')),
    LT: calculateStatistics(extractMetric('LT')),
    totalMU: calculateStatistics(extractMetric('totalMU')),
    deliveryTime: calculateStatistics(
      metricsArray
        .map(m => m.totalDeliveryTime)
        .filter((v): v is number => typeof v === 'number' && !isNaN(v))
    ),
    SAS5: calculateStatistics(extractMetric('SAS5')),
    SAS10: calculateStatistics(extractMetric('SAS10')),
    EM: calculateStatistics(extractMetric('EM')),
    PI: calculateStatistics(extractMetric('PI')),
  };
}

export function formatStatRange(stat: MetricStatistics, decimals = 2): string {
  if (stat.count === 0) return 'N/A';
  return `${stat.min.toFixed(decimals)} – ${stat.max.toFixed(decimals)}`;
}

export function formatStatMean(stat: MetricStatistics, decimals = 2): string {
  if (stat.count === 0) return 'N/A';
  return `${stat.mean.toFixed(decimals)} ± ${stat.std.toFixed(decimals)}`;
}
