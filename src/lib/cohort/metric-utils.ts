/**
 * Metric utilities for cohort and batch analysis
 * Defines metric groups and provides extraction helpers
 */

import type { PlanMetrics } from '@/lib/dicom/types';
import type { CohortPlan } from '@/contexts/CohortContext';

// Metric group definitions
export const METRIC_GROUPS = {
  geometric: ['MFA', 'EFS', 'PA', 'JA', 'psmall'] as const,
  beam: ['totalMU', 'totalDeliveryTime', 'GT', 'MUCA', 'beamCount', 'controlPointCount'] as const,
  complexity: ['MCS', 'LSV', 'AAV', 'LT', 'LTMCS', 'SAS5', 'SAS10', 'EM', 'PI', 'LG', 'MAD', 'TG', 'PM'] as const,
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

export const METRIC_DEFINITIONS: Record<string, MetricInfo> = {
  // Geometric metrics
  MFA: { key: 'MFA', name: 'Mean Field Area', shortName: 'MFA', unit: 'cm²', decimals: 1, group: 'geometric', description: 'Average aperture area across control points' },
  EFS: { key: 'EFS', name: 'Equivalent Field Size', shortName: 'EFS', unit: 'mm', decimals: 1, group: 'geometric', description: 'Equivalent square field dimension' },
  PA: { key: 'PA', name: 'Plan Area', shortName: 'PA', unit: 'cm²', decimals: 1, group: 'geometric', description: 'Total beam\'s eye view area' },
  JA: { key: 'JA', name: 'Jaw Area', shortName: 'JA', unit: 'cm²', decimals: 1, group: 'geometric', description: 'Average jaw-defined field area' },
  psmall: { key: 'psmall', name: '% Small Fields', shortName: 'psmall', unit: '%', decimals: 1, group: 'geometric', description: 'Percentage of apertures below threshold' },
  
  // Beam metrics
  totalMU: { key: 'totalMU', name: 'Total MU', shortName: 'MU', unit: 'MU', decimals: 0, group: 'beam', description: 'Total monitor units for plan' },
  totalDeliveryTime: { key: 'totalDeliveryTime', name: 'Delivery Time', shortName: 'Time', unit: 's', decimals: 0, group: 'beam', description: 'Estimated total delivery time' },
  GT: { key: 'GT', name: 'Gantry Travel', shortName: 'GT', unit: '°', decimals: 0, group: 'beam', description: 'Total gantry rotation' },
  MUCA: { key: 'MUCA', name: 'MU per CP', shortName: 'MUCA', unit: 'MU/CP', decimals: 2, group: 'beam', description: 'Average MU per control point' },
  beamCount: { key: 'beamCount', name: 'Beam Count', shortName: 'Beams', unit: '', decimals: 0, group: 'beam', description: 'Number of treatment beams' },
  controlPointCount: { key: 'controlPointCount', name: 'Control Points', shortName: 'CPs', unit: '', decimals: 0, group: 'beam', description: 'Total control points across all beams' },
  
  // Complexity metrics
  MCS: { key: 'MCS', name: 'Modulation Complexity Score', shortName: 'MCS', unit: '', decimals: 3, group: 'complexity', description: 'Combined LSV and AAV metric (0-1)' },
  LSV: { key: 'LSV', name: 'Leaf Sequence Variability', shortName: 'LSV', unit: '', decimals: 3, group: 'complexity', description: 'Leaf position variation between CPs (0-1)' },
  AAV: { key: 'AAV', name: 'Aperture Area Variability', shortName: 'AAV', unit: '', decimals: 3, group: 'complexity', description: 'Aperture area variation between CPs (0-1)' },
  LT: { key: 'LT', name: 'Leaf Travel', shortName: 'LT', unit: 'mm', decimals: 0, group: 'complexity', description: 'Total leaf movement distance' },
  LTMCS: { key: 'LTMCS', name: 'LT × MCS', shortName: 'LTMCS', unit: '', decimals: 1, group: 'complexity', description: 'Combined leaf travel and complexity' },
  SAS5: { key: 'SAS5', name: 'Small Aperture Score (5mm)', shortName: 'SAS5', unit: '', decimals: 3, group: 'complexity', description: 'Fraction with gaps < 5mm' },
  SAS10: { key: 'SAS10', name: 'Small Aperture Score (10mm)', shortName: 'SAS10', unit: '', decimals: 3, group: 'complexity', description: 'Fraction with gaps < 10mm' },
  EM: { key: 'EM', name: 'Edge Metric', shortName: 'EM', unit: '', decimals: 3, group: 'complexity', description: 'Aperture edge complexity' },
  PI: { key: 'PI', name: 'Plan Irregularity', shortName: 'PI', unit: '', decimals: 3, group: 'complexity', description: 'Plan shape irregularity index' },
  LG: { key: 'LG', name: 'Leaf Gap', shortName: 'LG', unit: 'mm', decimals: 1, group: 'complexity', description: 'Average gap between leaf pairs' },
  MAD: { key: 'MAD', name: 'Mean Asymmetry Distance', shortName: 'MAD', unit: 'mm', decimals: 1, group: 'complexity', description: 'Average asymmetry of leaf positions' },
  TG: { key: 'TG', name: 'Tongue-and-Groove', shortName: 'TG', unit: '', decimals: 3, group: 'complexity', description: 'Tongue-and-groove index (0-1)' },
  PM: { key: 'PM', name: 'Plan Modulation', shortName: 'PM', unit: '', decimals: 3, group: 'complexity', description: 'Overall modulation level (1 - MCS)' },
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
  // Handle computed metrics that aren't directly on PlanMetrics
  if (metricKey === 'beamCount') {
    return plan.plan.beams?.length ?? 0;
  }
  
  if (metricKey === 'controlPointCount') {
    return plan.plan.beams?.reduce(
      (sum, b) => sum + (b.numberOfControlPoints || b.controlPoints?.length || 0),
      0
    ) ?? 0;
  }
  
  // For standard metrics, look them up on the metrics object
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
  
  // Handle percentage display for psmall
  if (metricKey === 'psmall') {
    return `${(value * 100).toFixed(1)}%`;
  }
  
  return value.toFixed(decimals);
}

// Metric colors for charts
export const METRIC_COLORS: Record<string, string> = {
  MCS: 'hsl(var(--chart-1))',
  LSV: 'hsl(var(--chart-2))',
  AAV: 'hsl(var(--chart-3))',
  MFA: 'hsl(var(--chart-4))',
  LT: 'hsl(var(--chart-5))',
  totalMU: 'hsl(220, 70%, 55%)',
  totalDeliveryTime: 'hsl(280, 65%, 60%)',
  EFS: 'hsl(45, 85%, 55%)',
  PA: 'hsl(160, 60%, 50%)',
  JA: 'hsl(30, 80%, 55%)',
  psmall: 'hsl(340, 70%, 55%)',
  GT: 'hsl(200, 70%, 50%)',
  MUCA: 'hsl(90, 60%, 45%)',
  SAS5: 'hsl(260, 55%, 55%)',
  SAS10: 'hsl(300, 50%, 55%)',
  EM: 'hsl(15, 75%, 55%)',
  PI: 'hsl(180, 65%, 45%)',
  LG: 'hsl(50, 70%, 50%)',
  MAD: 'hsl(330, 60%, 55%)',
  TG: 'hsl(120, 50%, 50%)',
  PM: 'hsl(240, 60%, 55%)',
};

export function getMetricColor(metricKey: string): string {
  return METRIC_COLORS[metricKey] || 'hsl(var(--chart-1))';
}
