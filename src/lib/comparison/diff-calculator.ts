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
  category: string;
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
  category: string,
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
    category,
    lowerIsBetter,
  };
}

// ---------------------------------------------------------------------------
// Full metric comparison definitions — ordered to match export columns
// ---------------------------------------------------------------------------

interface ComparisonMetricDef {
  key: string;
  label: string;
  category: string;
  unit?: string;
  lowerIsBetter: boolean;
}

const ALL_COMPARISON_METRICS: ComparisonMetricDef[] = [
  // Prescription
  { key: 'prescribedDose', label: 'Prescribed Dose', category: 'Prescription', unit: 'Gy', lowerIsBetter: false },
  { key: 'dosePerFraction', label: 'Dose per Fraction', category: 'Prescription', unit: 'Gy', lowerIsBetter: false },
  { key: 'numberOfFractions', label: 'Fractions', category: 'Prescription', lowerIsBetter: false },
  { key: 'MUperGy', label: 'MU per Gy', category: 'Prescription', unit: 'MU/Gy', lowerIsBetter: true },

  // Delivery
  { key: 'totalMU', label: 'Total MU', category: 'Delivery', unit: 'MU', lowerIsBetter: true },
  { key: 'totalDeliveryTime', label: 'Delivery Time', category: 'Delivery', unit: 's', lowerIsBetter: true },
  { key: 'GT', label: 'Gantry Travel', category: 'Delivery', unit: '°', lowerIsBetter: false },
  { key: 'psmall', label: '% Small Fields', category: 'Delivery', lowerIsBetter: true },

  // Geometric
  { key: 'MFA', label: 'Mean Field Area', category: 'Geometric', unit: 'cm²', lowerIsBetter: false },
  { key: 'EFS', label: 'Equiv. Field Size', category: 'Geometric', unit: 'mm', lowerIsBetter: false },
  { key: 'PA', label: 'Plan Area', category: 'Geometric', unit: 'cm²', lowerIsBetter: false },
  { key: 'JA', label: 'Jaw Area', category: 'Geometric', unit: 'cm²', lowerIsBetter: false },

  // Complexity (Primary)
  { key: 'MCS', label: 'Modulation Complexity', category: 'Complexity (Primary)', lowerIsBetter: false },
  { key: 'LSV', label: 'Leaf Sequence Variability', category: 'Complexity (Primary)', lowerIsBetter: false },
  { key: 'AAV', label: 'Aperture Area Variability', category: 'Complexity (Primary)', lowerIsBetter: true },

  // Complexity (Secondary)
  { key: 'LT', label: 'Leaf Travel', category: 'Complexity (Secondary)', unit: 'mm', lowerIsBetter: true },
  { key: 'LTMCS', label: 'LT-weighted MCS', category: 'Complexity (Secondary)', lowerIsBetter: false },
  { key: 'SAS5', label: 'Small Aperture (5mm)', category: 'Complexity (Secondary)', lowerIsBetter: true },
  { key: 'SAS10', label: 'Small Aperture (10mm)', category: 'Complexity (Secondary)', lowerIsBetter: true },
  { key: 'EM', label: 'Edge Metric', category: 'Complexity (Secondary)', unit: 'mm⁻¹', lowerIsBetter: true },
  { key: 'PI', label: 'Plan Irregularity', category: 'Complexity (Secondary)', lowerIsBetter: true },
  { key: 'LG', label: 'Leaf Gap', category: 'Complexity (Secondary)', unit: 'mm', lowerIsBetter: false },
  { key: 'MAD', label: 'Mean Asymmetry Distance', category: 'Complexity (Secondary)', unit: 'mm', lowerIsBetter: true },
  { key: 'TG', label: 'Tongue-and-Groove', category: 'Complexity (Secondary)', lowerIsBetter: true },
  { key: 'PM', label: 'Plan Modulation', category: 'Complexity (Secondary)', lowerIsBetter: true },
  { key: 'MD', label: 'Modulation Degree', category: 'Complexity (Secondary)', lowerIsBetter: true },
  { key: 'MI', label: 'Modulation Index', category: 'Complexity (Secondary)', lowerIsBetter: true },

  // Deliverability
  { key: 'MUCA', label: 'MU per Control Arc', category: 'Deliverability', unit: 'MU/CP', lowerIsBetter: false },
  { key: 'LTMU', label: 'Leaf Travel per MU', category: 'Deliverability', unit: 'mm/MU', lowerIsBetter: true },
  { key: 'LTNLMU', label: 'LT per Leaf and MU', category: 'Deliverability', lowerIsBetter: true },
  { key: 'LNA', label: 'LT per Leaf and CA', category: 'Deliverability', lowerIsBetter: true },
  { key: 'LTAL', label: 'LT per Arc Length', category: 'Deliverability', unit: 'mm/°', lowerIsBetter: true },
  { key: 'GS', label: 'Gantry Speed', category: 'Deliverability', unit: '°/s', lowerIsBetter: false },
  { key: 'mGSV', label: 'Gantry Speed Variation', category: 'Deliverability', unit: '°/s', lowerIsBetter: true },
  { key: 'LS', label: 'Leaf Speed', category: 'Deliverability', unit: 'mm/s', lowerIsBetter: false },
  { key: 'mDRV', label: 'Dose Rate Variation', category: 'Deliverability', unit: 'MU/min', lowerIsBetter: true },
];

function metricVal(m: PlanMetrics, key: string): number | undefined {
  const v = (m as unknown as Record<string, unknown>)[key];
  return typeof v === 'number' ? v : undefined;
}

export function calculatePlanComparison(
  metricsA: PlanMetrics,
  metricsB: PlanMetrics
): PlanComparison {
  const metricsComparison: MetricDiff[] = [];

  for (const def of ALL_COMPARISON_METRICS) {
    const valA = metricVal(metricsA, def.key);
    const valB = metricVal(metricsB, def.key);
    // Skip metrics where both plans have no value
    if (valA === undefined && valB === undefined) continue;
    metricsComparison.push(
      createMetricDiff(def.key, def.label, valA, valB, def.category, def.unit, def.lowerIsBetter)
    );
  }

  const totalCPsA = metricsA.beamMetrics.reduce((sum, b) => sum + b.numberOfControlPoints, 0);
  const totalCPsB = metricsB.beamMetrics.reduce((sum, b) => sum + b.numberOfControlPoints, 0);

  return {
    metricsComparison,
    structuralChanges: {
      beamCountDiff: metricsB.beamMetrics.length - metricsA.beamMetrics.length,
      totalCPDiff: totalCPsB - totalCPsA,
      techniqueSame: true,
    },
  };
}

/** Get unique category names in order from the comparison */
export function getComparisonCategories(diffs: MetricDiff[]): string[] {
  const seen = new Set<string>();
  const cats: string[] = [];
  for (const d of diffs) {
    if (!seen.has(d.category)) {
      seen.add(d.category);
      cats.push(d.category);
    }
  }
  return cats;
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
