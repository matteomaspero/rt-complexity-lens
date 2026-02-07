import type { PlanMetrics } from '@/lib/dicom/types';
import type { RTPlan } from '@/lib/dicom/types';

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
  
  // Geometric metrics
  MFA: MetricStatistics;
  EFS: MetricStatistics;
  PA: MetricStatistics;
  JA: MetricStatistics;
  psmall: MetricStatistics;
  
  // Beam metrics
  totalMU: MetricStatistics;
  deliveryTime: MetricStatistics;
  GT: MetricStatistics;
  MUCA: MetricStatistics;
  beamCount: MetricStatistics;
  controlPointCount: MetricStatistics;
  
  // Complexity metrics
  MCS: MetricStatistics;
  LSV: MetricStatistics;
  AAV: MetricStatistics;
  LT: MetricStatistics;
  LTMCS: MetricStatistics;
  SAS5: MetricStatistics;
  SAS10: MetricStatistics;
  EM: MetricStatistics;
  PI: MetricStatistics;
  LG: MetricStatistics;
  MAD: MetricStatistics;
  TG: MetricStatistics;
  PM: MetricStatistics;
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

export interface BatchPlanInput {
  metrics: PlanMetrics;
  plan: RTPlan;
}

export function calculateBatchStatistics(inputs: BatchPlanInput[]): BatchStatistics {
  const extractMetric = (key: keyof PlanMetrics): number[] => {
    return inputs
      .map(i => i.metrics[key])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));
  };

  // Compute beam-level aggregates
  const beamCounts = inputs.map(i => i.plan.beams?.length ?? 0);
  const controlPointCounts = inputs.map(i => 
    i.plan.beams?.reduce((sum, b) => sum + (b.numberOfControlPoints || 0), 0) ?? 0
  );

  return {
    planCount: inputs.length,
    
    // Geometric metrics
    MFA: calculateStatistics(extractMetric('MFA')),
    EFS: calculateStatistics(extractMetric('EFS')),
    PA: calculateStatistics(extractMetric('PA')),
    JA: calculateStatistics(extractMetric('JA')),
    psmall: calculateStatistics(extractMetric('psmall')),
    
    // Beam metrics
    totalMU: calculateStatistics(extractMetric('totalMU')),
    deliveryTime: calculateStatistics(
      inputs.map(i => i.metrics.totalDeliveryTime).filter((v): v is number => typeof v === 'number' && !isNaN(v))
    ),
    GT: calculateStatistics(extractMetric('GT')),
    MUCA: calculateStatistics(extractMetric('MUCA')),
    beamCount: calculateStatistics(beamCounts),
    controlPointCount: calculateStatistics(controlPointCounts),
    
    // Complexity metrics
    MCS: calculateStatistics(extractMetric('MCS')),
    LSV: calculateStatistics(extractMetric('LSV')),
    AAV: calculateStatistics(extractMetric('AAV')),
    LT: calculateStatistics(extractMetric('LT')),
    LTMCS: calculateStatistics(extractMetric('LTMCS')),
    SAS5: calculateStatistics(extractMetric('SAS5')),
    SAS10: calculateStatistics(extractMetric('SAS10')),
    EM: calculateStatistics(extractMetric('EM')),
    PI: calculateStatistics(extractMetric('PI')),
    LG: calculateStatistics(extractMetric('LG')),
    MAD: calculateStatistics(extractMetric('MAD')),
    TG: calculateStatistics(extractMetric('TG')),
    PM: calculateStatistics(extractMetric('PM')),
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
