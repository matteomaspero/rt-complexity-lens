import type { PlanMetrics, BeamMetrics } from '@/lib/dicom/types';

export type DiffDirection = 'increase' | 'decrease' | 'same';
export type DiffSignificance = 'minor' | 'moderate' | 'major';

export interface MetricDiff {
  metric: string;
  label: string;
  planA: number | undefined;
  planB: number | undefined;
  absoluteDiff: number;
  percentDiff: number;
  direction: DiffDirection;
  significance: DiffSignificance;
  unit?: string;
  // For complexity metrics, lower is generally better
  lowerIsBetter?: boolean;
}

export interface PlanComparison {
  metricsComparison: MetricDiff[];
  structuralChanges: {
    beamCountDiff: number;
    totalCPDiff: number;
    techniqueSame: boolean;
  };
}

function getDirection(diff: number): DiffDirection {
  if (Math.abs(diff) < 0.001) return 'same';
  return diff > 0 ? 'increase' : 'decrease';
}

function getSignificance(percentDiff: number): DiffSignificance {
  const absDiff = Math.abs(percentDiff);
  if (absDiff < 1) return 'minor';
  if (absDiff < 10) return 'moderate';
  return 'major';
}

function createMetricDiff(
  metric: string,
  label: string,
  valueA: number | undefined,
  valueB: number | undefined,
  unit?: string,
  lowerIsBetter = false
): MetricDiff {
  const a = valueA ?? 0;
  const b = valueB ?? 0;
  const absoluteDiff = b - a;
  const percentDiff = a !== 0 ? ((b - a) / a) * 100 : (b !== 0 ? 100 : 0);

  return {
    metric,
    label,
    planA: valueA,
    planB: valueB,
    absoluteDiff,
    percentDiff,
    direction: getDirection(absoluteDiff),
    significance: getSignificance(percentDiff),
    unit,
    lowerIsBetter,
  };
}

export function calculatePlanComparison(
  metricsA: PlanMetrics,
  metricsB: PlanMetrics
): PlanComparison {
  const metricsComparison: MetricDiff[] = [
    createMetricDiff('MCS', 'Modulation Complexity', metricsA.MCS, metricsB.MCS, undefined, false),
    createMetricDiff('LSV', 'Leaf Sequence Variability', metricsA.LSV, metricsB.LSV, undefined, false),
    createMetricDiff('AAV', 'Aperture Area Variability', metricsA.AAV, metricsB.AAV, undefined, true),
    createMetricDiff('MFA', 'Mean Field Area', metricsA.MFA, metricsB.MFA, 'cm²', false),
    createMetricDiff('LT', 'Leaf Travel', metricsA.LT, metricsB.LT, 'mm', true),
    createMetricDiff('LTMCS', 'LT-weighted MCS', metricsA.LTMCS, metricsB.LTMCS, undefined, false),
    createMetricDiff('totalMU', 'Total MU', metricsA.totalMU, metricsB.totalMU, 'MU', true),
    createMetricDiff('totalDeliveryTime', 'Est. Delivery Time', metricsA.totalDeliveryTime, metricsB.totalDeliveryTime, 's', true),
    createMetricDiff('SAS5', 'Small Aperture (5mm)', metricsA.SAS5, metricsB.SAS5, undefined, true),
    createMetricDiff('SAS10', 'Small Aperture (10mm)', metricsA.SAS10, metricsB.SAS10, undefined, true),
    createMetricDiff('EM', 'Edge Metric', metricsA.EM, metricsB.EM, 'mm⁻¹', true),
    createMetricDiff('PI', 'Plan Irregularity', metricsA.PI, metricsB.PI, undefined, true),
  ];

  const totalCPsA = metricsA.beamMetrics.reduce((sum, b) => sum + b.numberOfControlPoints, 0);
  const totalCPsB = metricsB.beamMetrics.reduce((sum, b) => sum + b.numberOfControlPoints, 0);

  return {
    metricsComparison,
    structuralChanges: {
      beamCountDiff: metricsB.beamMetrics.length - metricsA.beamMetrics.length,
      totalCPDiff: totalCPsB - totalCPsA,
      techniqueSame: true, // Will be set by caller
    },
  };
}

export interface BeamDiff {
  beamNameA?: string;
  beamNameB?: string;
  matchType: 'exact' | 'gantry' | 'index' | 'unmatched';
  controlPointsA: number;
  controlPointsB: number;
  muA: number;
  muB: number;
  muDiffPercent: number;
  mcsA?: number;
  mcsB?: number;
  mcsDiffPercent: number;
  arcLengthA?: number;
  arcLengthB?: number;
}

export function calculateBeamDiffs(
  beamsA: BeamMetrics[],
  beamsB: BeamMetrics[],
  matchedPairs: Array<{ indexA: number; indexB: number; matchType: string }>
): BeamDiff[] {
  const diffs: BeamDiff[] = [];

  for (const match of matchedPairs) {
    const a = beamsA[match.indexA];
    const b = beamsB[match.indexB];

    if (!a && !b) continue;

    const muA = a?.beamMU ?? 0;
    const muB = b?.beamMU ?? 0;
    const mcsA = a?.MCS ?? 0;
    const mcsB = b?.MCS ?? 0;

    diffs.push({
      beamNameA: a?.beamName,
      beamNameB: b?.beamName,
      matchType: match.matchType as BeamDiff['matchType'],
      controlPointsA: a?.numberOfControlPoints ?? 0,
      controlPointsB: b?.numberOfControlPoints ?? 0,
      muA,
      muB,
      muDiffPercent: muA !== 0 ? ((muB - muA) / muA) * 100 : 0,
      mcsA: a?.MCS,
      mcsB: b?.MCS,
      mcsDiffPercent: mcsA !== 0 ? ((mcsB - mcsA) / mcsA) * 100 : 0,
      arcLengthA: a?.arcLength,
      arcLengthB: b?.arcLength,
    });
  }

  return diffs;
}

export function formatDiffValue(value: number, decimals = 2): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}`;
}

export function formatDiffPercent(percent: number): string {
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(1)}%`;
}

export function getDiffColorClass(
  diff: MetricDiff
): 'text-[hsl(var(--status-success))]' | 'text-destructive' | 'text-muted-foreground' | 'text-amber-500' {
  if (diff.significance === 'minor') return 'text-muted-foreground';
  
  // For metrics where lower is better, a decrease is good
  const isImprovement = diff.lowerIsBetter 
    ? diff.direction === 'decrease'
    : diff.direction === 'increase';

  if (diff.significance === 'major') {
    return isImprovement ? 'text-[hsl(var(--status-success))]' : 'text-destructive';
  }

  return 'text-amber-500';
}
