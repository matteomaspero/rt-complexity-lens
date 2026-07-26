/**
 * Metric utilities for cohort and batch analysis
 * Defines metric groups and provides extraction helpers
 */

import type { PlanMetrics } from '@/lib/dicom/types';
import type { CohortPlan } from '@/contexts/CohortContext';

// Metric group definitions
// Grouping is a UI concern for the cohort/batch charts. Keys must exist as
// metrics in `PlanMetrics` or as computed keys handled below.
export const METRIC_GROUPS = {
  geometric: ['MFA', 'EFS', 'PA', 'JA', 'psmall', 'BJAR'] as const,
  beam: [
    'totalMU',
    'PMU',
    'totalDeliveryTime',
    'GT',
    'MUCA',
    'MUperGy',
    'MUcGy',
    'beamCount',
    'controlPointCount',
  ] as const,
  complexity: [
    'MCS',
    'MCSv',
    'LSV',
    'AAV',
    'LT',
    'LTNL',
    'LTMCS',
    'SAS2',
    'SAS5',
    'SAS10',
    'SAS20',
    'EM',
    'PI',
    'LG',
    'MAD',
    'TG',
    'PM',
  ] as const,
} as const;

export type MetricGroup = keyof typeof METRIC_GROUPS;
export type MetricKey =
  | typeof METRIC_GROUPS.geometric[number]
  | typeof METRIC_GROUPS.beam[number]
  | typeof METRIC_GROUPS.complexity[number];

// Metric display information
export interface MetricInfo {
  key: string;
  name: string;
  shortName: string;
  unit: string;
  decimals: number;
  group: MetricGroup;
  description: string;
}

const DECIMALS_OVERRIDES: Record<string, number> = {
  totalMU: 0,
  PMU: 0,
  totalDeliveryTime: 0,
  GT: 0,
  MFA: 1,
  EFS: 1,
  PA: 1,
  JA: 1,
  psmall: 1,
  LG: 1,
  MAD: 1,
  LT: 0,
  LTNL: 1,
  LTMCS: 1,
  MUCA: 2,
  MUperGy: 1,
  MUcGy: 2,
};

// Short human-readable name for a metric key. Falls back to the key itself.
function shortNameFor(key: string): string {
  return key;
}

function makeMetricInfo(key: string, group: MetricGroup, name: string, unit: string, description: string): MetricInfo {
  return {
    key,
    name,
    shortName: shortNameFor(key),
    unit,
    decimals: DECIMALS_OVERRIDES[key] ?? 3,
    group,
    description,
  };
}

// Registry — kept in sync with src/lib/metrics-definitions.ts by including
// every metric that plots meaningfully in cohort/batch views.
export const METRIC_DEFINITIONS: Record<string, MetricInfo> = {
  // Geometric
  MFA: makeMetricInfo('MFA', 'geometric', 'Mean Field Area', 'cm²', 'Average aperture area across control points'),
  EFS: makeMetricInfo('EFS', 'geometric', 'Equivalent Field Size', 'mm', 'Equivalent square field dimension'),
  PA: makeMetricInfo('PA', 'geometric', 'Plan Area', 'cm²', "Total beam's eye view area"),
  JA: makeMetricInfo('JA', 'geometric', 'Jaw Area', 'cm²', 'Average jaw-defined field area'),
  psmall: makeMetricInfo('psmall', 'geometric', '% Small Fields', '%', 'Percentage of apertures below threshold'),
  BJAR: makeMetricInfo('BJAR', 'geometric', 'Beam Jaw Area Ratio', '', 'MU-weighted aperture / jaw area ratio'),

  // Beam / delivery
  totalMU: makeMetricInfo('totalMU', 'beam', 'Total MU', 'MU', 'Total monitor units for plan'),
  PMU: makeMetricInfo('PMU', 'beam', 'Plan MU per Fraction', 'MU/fx', 'Monitor units delivered per fraction'),
  totalDeliveryTime: makeMetricInfo('totalDeliveryTime', 'beam', 'Delivery Time', 's', 'Estimated total delivery time'),
  GT: makeMetricInfo('GT', 'beam', 'Gantry Travel', '°', 'Total gantry rotation'),
  MUCA: makeMetricInfo('MUCA', 'beam', 'MU per CP', 'MU/CP', 'Average MU per control point'),
  MUperGy: makeMetricInfo('MUperGy', 'beam', 'MU per Gy', 'MU/Gy', 'Monitor units per prescribed Gy'),
  MUcGy: makeMetricInfo('MUcGy', 'beam', 'MU per cGy', 'MU/cGy', 'Monitor units per prescribed cGy'),
  beamCount: makeMetricInfo('beamCount', 'beam', 'Beam Count', '', 'Number of treatment beams'),
  controlPointCount: makeMetricInfo('controlPointCount', 'beam', 'Control Points', '', 'Total control points across all beams'),

  // Complexity
  MCS: makeMetricInfo('MCS', 'complexity', 'Modulation Complexity Score', '', 'Combined LSV and AAV metric (0-1)'),
  MCSv: makeMetricInfo('MCSv', 'complexity', 'MCS (VMAT)', '', 'McNiven 2010 VMAT variant of MCS'),
  LSV: makeMetricInfo('LSV', 'complexity', 'Leaf Sequence Variability', '', 'Leaf position variation between CPs (0-1)'),
  AAV: makeMetricInfo('AAV', 'complexity', 'Aperture Area Variability', '', 'Aperture area variation between CPs (0-1)'),
  LT: makeMetricInfo('LT', 'complexity', 'Leaf Travel', 'mm', 'Total leaf movement distance'),
  LTNL: makeMetricInfo('LTNL', 'complexity', 'Leaf Travel per Leaf', 'mm/leaf', 'Leaf travel normalized by leaf count'),
  LTMCS: makeMetricInfo('LTMCS', 'complexity', 'LT × MCS', '', 'Combined leaf travel and complexity'),
  SAS2: makeMetricInfo('SAS2', 'complexity', 'Small Aperture Score (2mm)', '', 'Fraction with gaps < 2mm'),
  SAS5: makeMetricInfo('SAS5', 'complexity', 'Small Aperture Score (5mm)', '', 'Fraction with gaps < 5mm'),
  SAS10: makeMetricInfo('SAS10', 'complexity', 'Small Aperture Score (10mm)', '', 'Fraction with gaps < 10mm'),
  SAS20: makeMetricInfo('SAS20', 'complexity', 'Small Aperture Score (20mm)', '', 'Fraction with gaps < 20mm'),
  EM: makeMetricInfo('EM', 'complexity', 'Edge Metric', 'mm⁻¹', 'Aperture edge complexity'),
  PI: makeMetricInfo('PI', 'complexity', 'Plan Irregularity', '', 'Plan shape irregularity index'),
  LG: makeMetricInfo('LG', 'complexity', 'Leaf Gap', 'mm', 'Average gap between leaf pairs'),
  MAD: makeMetricInfo('MAD', 'complexity', 'Mean Asymmetry Distance', 'mm', 'Average asymmetry of leaf positions'),
  TG: makeMetricInfo('TG', 'complexity', 'Tongue-and-Groove', '', 'Tongue-and-groove index (0-1)'),
  PM: makeMetricInfo('PM', 'complexity', 'Plan Modulation', '', 'Overall modulation level (1 - MCS)'),
};

// Get all metrics for a group
export function getMetricsForGroup(group: MetricGroup): MetricInfo[] {
  return METRIC_GROUPS[group].map(key => METRIC_DEFINITIONS[key]).filter(Boolean);
}

// Get all available metrics
export function getAllMetrics(): MetricInfo[] {
  return Object.values(METRIC_DEFINITIONS);
}

// Extract metric value from plan metrics with computed values
export function extractMetricValue(
  plan: CohortPlan,
  metricKey: string
): number | undefined {
  if (metricKey === 'beamCount') {
    return plan.plan.beams?.length ?? 0;
  }

  if (metricKey === 'controlPointCount') {
    return plan.plan.beams?.reduce(
      (sum, b) => sum + (b.numberOfControlPoints || b.controlPoints?.length || 0),
      0
    ) ?? 0;
  }

  const value = plan.metrics[metricKey as keyof PlanMetrics];
  return typeof value === 'number' ? value : undefined;
}

// Extract values for a metric from multiple plans
export function extractMetricValues(
  plans: CohortPlan[],
  metricKey: string
): number[] {
  return plans
    .map(p => extractMetricValue(p, metricKey))
    .filter((v): v is number => typeof v === 'number' && !isNaN(v));
}

// Get metric info by key
export function getMetricInfo(key: string): MetricInfo | undefined {
  return METRIC_DEFINITIONS[key];
}

// Format a metric value for display
export function formatMetricValue(value: number | undefined, metricKey: string): string {
  if (value === undefined || isNaN(value)) return 'N/A';

  const info = METRIC_DEFINITIONS[metricKey];
  const decimals = info?.decimals ?? 2;

  // `psmall` is stored as a fraction (0-1) but shown as %
  if (metricKey === 'psmall') {
    return `${(value * 100).toFixed(1)}%`;
  }

  return value.toFixed(decimals);
}

// Metric colors for charts — all series use themed chart tokens so dark mode
// contrast stays correct.
export const METRIC_COLORS: Record<string, string> = {
  MCS: 'hsl(var(--chart-1))',
  MCSv: 'hsl(var(--chart-1))',
  LSV: 'hsl(var(--chart-2))',
  AAV: 'hsl(var(--chart-3))',
  MFA: 'hsl(var(--chart-4))',
  LT: 'hsl(var(--chart-5))',
  LTNL: 'hsl(var(--chart-5))',
  LTMCS: 'hsl(var(--chart-5))',
  totalMU: 'hsl(var(--chart-1))',
  PMU: 'hsl(var(--chart-1))',
  totalDeliveryTime: 'hsl(var(--chart-2))',
  EFS: 'hsl(var(--chart-3))',
  PA: 'hsl(var(--chart-4))',
  JA: 'hsl(var(--chart-5))',
  BJAR: 'hsl(var(--chart-2))',
  psmall: 'hsl(var(--chart-3))',
  GT: 'hsl(var(--chart-4))',
  MUCA: 'hsl(var(--chart-5))',
  MUperGy: 'hsl(var(--chart-2))',
  MUcGy: 'hsl(var(--chart-2))',
  SAS2: 'hsl(var(--chart-1))',
  SAS5: 'hsl(var(--chart-2))',
  SAS10: 'hsl(var(--chart-3))',
  SAS20: 'hsl(var(--chart-4))',
  EM: 'hsl(var(--chart-5))',
  PI: 'hsl(var(--chart-1))',
  LG: 'hsl(var(--chart-2))',
  MAD: 'hsl(var(--chart-3))',
  TG: 'hsl(var(--chart-4))',
  PM: 'hsl(var(--chart-5))',
};

export function getMetricColor(metricKey: string): string {
  return METRIC_COLORS[metricKey] || 'hsl(var(--chart-1))';
}
