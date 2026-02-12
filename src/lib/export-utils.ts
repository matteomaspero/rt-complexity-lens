/**
 * Unified export utilities for RTp-lens
 * 
 * Provides a single, consistent CSV/JSON export format across all modes
 * (single plan, batch, cohort). CSV format: one row per plan, one column
 * per metric — no comment lines, no vertical layouts.
 */

import type { RTPlan, PlanMetrics, BeamMetrics } from '@/lib/dicom/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportablePlan {
  fileName: string;
  plan: RTPlan;
  metrics: PlanMetrics;
}

interface ColumnDef {
  key: string;
  header: string;
  decimals: number;
  extract: (p: ExportablePlan) => number | string | undefined;
}

export type ExportType = 'single' | 'batch' | 'cohort';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeCSV(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function fmtNum(value: number | undefined | null, decimals: number): string {
  if (value === undefined || value === null || isNaN(value)) return '';
  return value.toFixed(decimals);
}

/** Dominant radiation type across beams */
function getDominantRadiationType(plan: RTPlan): string {
  if (!plan.beams?.length) return '';
  const types = new Set(plan.beams.map(b => b.radiationType).filter(Boolean));
  if (types.size === 0) return '';
  if (types.size === 1) return [...types][0];
  return 'Mixed';
}

/** Dominant energy label across beams */
function getDominantEnergy(plan: RTPlan): string {
  if (!plan.beams?.length) return '';
  const labels = new Set(
    plan.beams.map(b => b.energyLabel).filter(Boolean) as string[]
  );
  if (labels.size === 0) {
    // Fallback to nominalBeamEnergy
    const energies = new Set(
      plan.beams.map(b => b.nominalBeamEnergy).filter(e => e !== undefined) as number[]
    );
    if (energies.size === 1) return `${[...energies][0]} MeV`;
    if (energies.size > 1) return 'Mixed';
    return '';
  }
  if (labels.size === 1) return [...labels][0];
  return 'Mixed';
}

function metricVal(m: PlanMetrics, key: string): number | undefined {
  const v = (m as unknown as Record<string, unknown>)[key];
  return typeof v === 'number' ? v : undefined;
}

// ---------------------------------------------------------------------------
// Column definitions — plan-level CSV
// ---------------------------------------------------------------------------

export const PLAN_COLUMNS: ColumnDef[] = [
  // Metadata
  { key: 'fileName', header: 'File', decimals: 0, extract: p => p.fileName },
  { key: 'planLabel', header: 'Plan Label', decimals: 0, extract: p => p.plan.planLabel },
  { key: 'technique', header: 'Technique', decimals: 0, extract: p => p.plan.technique },
  { key: 'beamCount', header: 'Beam Count', decimals: 0, extract: p => p.plan.beams?.length ?? 0 },
  { key: 'cpCount', header: 'CP Count', decimals: 0, extract: p => p.plan.beams?.reduce((s, b) => s + (b.numberOfControlPoints || 0), 0) ?? 0 },
  { key: 'radiationType', header: 'Radiation Type', decimals: 0, extract: p => getDominantRadiationType(p.plan) },
  { key: 'energy', header: 'Energy', decimals: 0, extract: p => getDominantEnergy(p.plan) },

  // Geometric
  { key: 'MFA', header: 'MFA (cm²)', decimals: 2, extract: p => metricVal(p.metrics, 'MFA') },
  { key: 'EFS', header: 'EFS (mm)', decimals: 2, extract: p => metricVal(p.metrics, 'EFS') },
  { key: 'PA', header: 'PA (cm²)', decimals: 2, extract: p => metricVal(p.metrics, 'PA') },
  { key: 'JA', header: 'JA (cm²)', decimals: 2, extract: p => metricVal(p.metrics, 'JA') },
  { key: 'psmall', header: 'psmall', decimals: 4, extract: p => metricVal(p.metrics, 'psmall') },

  // Beam / delivery
  { key: 'totalMU', header: 'Total MU', decimals: 1, extract: p => p.metrics.totalMU },
  { key: 'totalDeliveryTime', header: 'Delivery Time (s)', decimals: 1, extract: p => metricVal(p.metrics, 'totalDeliveryTime') },
  { key: 'GT', header: 'GT (°)', decimals: 1, extract: p => metricVal(p.metrics, 'GT') },
  { key: 'MUCA', header: 'MUCA (MU/CP)', decimals: 4, extract: p => metricVal(p.metrics, 'MUCA') },
  { key: 'LTMU', header: 'LTMU (mm/MU)', decimals: 4, extract: p => metricVal(p.metrics, 'LTMU') },
  { key: 'GS', header: 'GS (°/s)', decimals: 2, extract: p => metricVal(p.metrics, 'GS') },
  { key: 'LS', header: 'LS (mm/s)', decimals: 2, extract: p => metricVal(p.metrics, 'LS') },
  { key: 'mDRV', header: 'mDRV (MU/min)', decimals: 2, extract: p => metricVal(p.metrics, 'mDRV') },
  { key: 'mGSV', header: 'mGSV (°/s)', decimals: 4, extract: p => metricVal(p.metrics, 'mGSV') },

  // Complexity
  { key: 'MCS', header: 'MCS', decimals: 4, extract: p => metricVal(p.metrics, 'MCS') },
  { key: 'LSV', header: 'LSV', decimals: 4, extract: p => metricVal(p.metrics, 'LSV') },
  { key: 'AAV', header: 'AAV', decimals: 4, extract: p => metricVal(p.metrics, 'AAV') },
  { key: 'LT', header: 'LT (mm)', decimals: 1, extract: p => metricVal(p.metrics, 'LT') },
  { key: 'LTMCS', header: 'LTMCS', decimals: 1, extract: p => metricVal(p.metrics, 'LTMCS') },
  { key: 'SAS5', header: 'SAS5', decimals: 4, extract: p => metricVal(p.metrics, 'SAS5') },
  { key: 'SAS10', header: 'SAS10', decimals: 4, extract: p => metricVal(p.metrics, 'SAS10') },
  { key: 'EM', header: 'EM', decimals: 4, extract: p => metricVal(p.metrics, 'EM') },
  { key: 'PI', header: 'PI', decimals: 4, extract: p => metricVal(p.metrics, 'PI') },
  { key: 'LG', header: 'LG (mm)', decimals: 2, extract: p => metricVal(p.metrics, 'LG') },
  { key: 'MAD', header: 'MAD (mm)', decimals: 2, extract: p => metricVal(p.metrics, 'MAD') },
  { key: 'TG', header: 'TG', decimals: 4, extract: p => metricVal(p.metrics, 'TG') },
  { key: 'PM', header: 'PM', decimals: 4, extract: p => metricVal(p.metrics, 'PM') },
  { key: 'MD', header: 'MD', decimals: 4, extract: p => metricVal(p.metrics, 'MD') },
  { key: 'MI', header: 'MI', decimals: 4, extract: p => metricVal(p.metrics, 'MI') },

  // Deliverability extras
  { key: 'LTNLMU', header: 'LTNLMU', decimals: 6, extract: p => metricVal(p.metrics, 'LTNLMU') },
  { key: 'LNA', header: 'LNA', decimals: 4, extract: p => metricVal(p.metrics, 'LNA') },
  { key: 'LTAL', header: 'LTAL (mm/°)', decimals: 2, extract: p => metricVal(p.metrics, 'LTAL') },

  // Prescription
  { key: 'prescribedDose', header: 'Rx Dose (Gy)', decimals: 2, extract: p => metricVal(p.metrics, 'prescribedDose') },
  { key: 'dosePerFraction', header: 'Dose/Fx (Gy)', decimals: 2, extract: p => metricVal(p.metrics, 'dosePerFraction') },
  { key: 'numberOfFractions', header: 'Fractions', decimals: 0, extract: p => metricVal(p.metrics, 'numberOfFractions') },
  { key: 'MUperGy', header: 'MU/Gy', decimals: 1, extract: p => metricVal(p.metrics, 'MUperGy') },
];

// ---------------------------------------------------------------------------
// Beam-level column definitions
// ---------------------------------------------------------------------------

interface BeamColumnDef {
  key: string;
  header: string;
  decimals: number;
  extract: (bm: BeamMetrics) => number | string | undefined;
}

const BEAM_COLUMNS: BeamColumnDef[] = [
  { key: 'beamNumber', header: 'Beam Number', decimals: 0, extract: bm => bm.beamNumber },
  { key: 'beamName', header: 'Beam Name', decimals: 0, extract: bm => bm.beamName },
  { key: 'radiationType', header: 'Radiation Type', decimals: 0, extract: bm => bm.radiationType ?? '' },
  { key: 'nominalBeamEnergy', header: 'Nominal Energy (MeV)', decimals: 0, extract: bm => bm.nominalBeamEnergy },
  { key: 'energyLabel', header: 'Energy Label', decimals: 0, extract: bm => bm.energyLabel ?? '' },
  { key: 'beamMU', header: 'Beam MU', decimals: 1, extract: bm => bm.beamMU },
  { key: 'arcLength', header: 'Arc Length (°)', decimals: 1, extract: bm => bm.arcLength },
  { key: 'numberOfControlPoints', header: 'CPs', decimals: 0, extract: bm => bm.numberOfControlPoints },
  { key: 'estimatedDeliveryTime', header: 'Est Time (s)', decimals: 1, extract: bm => bm.estimatedDeliveryTime },
  { key: 'collimatorAngleStart', header: 'Collimator (°)', decimals: 1, extract: bm => bm.collimatorAngleStart },
  { key: 'MCS', header: 'MCS', decimals: 4, extract: bm => bm.MCS },
  { key: 'LSV', header: 'LSV', decimals: 4, extract: bm => bm.LSV },
  { key: 'AAV', header: 'AAV', decimals: 4, extract: bm => bm.AAV },
  { key: 'MFA', header: 'MFA (cm²)', decimals: 2, extract: bm => bm.MFA },
  { key: 'LT', header: 'LT (mm)', decimals: 1, extract: bm => bm.LT },
  { key: 'LTMCS', header: 'LTMCS', decimals: 1, extract: bm => bm.LTMCS },
  { key: 'LG', header: 'LG (mm)', decimals: 2, extract: bm => bm.LG },
  { key: 'MAD', header: 'MAD (mm)', decimals: 2, extract: bm => bm.MAD },
  { key: 'EFS', header: 'EFS (mm)', decimals: 2, extract: bm => bm.EFS },
  { key: 'psmall', header: 'psmall', decimals: 4, extract: bm => bm.psmall },
  { key: 'SAS5', header: 'SAS5', decimals: 4, extract: bm => bm.SAS5 },
  { key: 'SAS10', header: 'SAS10', decimals: 4, extract: bm => bm.SAS10 },
  { key: 'EM', header: 'EM', decimals: 4, extract: bm => bm.EM },
  { key: 'PI', header: 'PI', decimals: 4, extract: bm => bm.PI },
  { key: 'PA', header: 'PA (cm²)', decimals: 2, extract: bm => bm.PA },
  { key: 'JA', header: 'JA (cm²)', decimals: 2, extract: bm => bm.JA },
  { key: 'TG', header: 'TG', decimals: 4, extract: bm => bm.TG },
  { key: 'PM', header: 'PM', decimals: 4, extract: bm => bm.PM },
  { key: 'MUCA', header: 'MUCA (MU/CP)', decimals: 4, extract: bm => bm.MUCA },
  { key: 'LTMU', header: 'LTMU (mm/MU)', decimals: 4, extract: bm => bm.LTMU },
  { key: 'GT', header: 'GT (°)', decimals: 1, extract: bm => bm.GT },
  { key: 'GS', header: 'GS (°/s)', decimals: 2, extract: bm => bm.GS },
  { key: 'LS', header: 'LS (mm/s)', decimals: 2, extract: bm => bm.LS },
  { key: 'mDRV', header: 'mDRV (MU/min)', decimals: 2, extract: bm => bm.mDRV },
];

// ---------------------------------------------------------------------------
// CSV generators
// ---------------------------------------------------------------------------

/** Convert an array of plans to a standard tabular CSV string (plan-level). */
export function plansToCSV(plans: ExportablePlan[]): string {
  const headers = PLAN_COLUMNS.map(c => c.header);
  const rows = plans.map(p =>
    PLAN_COLUMNS.map(col => {
      const raw = col.extract(p);
      if (typeof raw === 'number') return fmtNum(raw, col.decimals);
      return escapeCSV(raw);
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

/** Convert plans to a beam-level CSV (one row per beam). */
export function beamsToCSV(plans: ExportablePlan[]): string {
  const metaHeaders = ['File', 'Plan Label'];
  const beamHeaders = BEAM_COLUMNS.map(c => c.header);
  const allHeaders = [...metaHeaders, ...beamHeaders];

  const rows: string[] = [];
  for (const p of plans) {
    for (const bm of p.metrics.beamMetrics) {
      const metaValues = [escapeCSV(p.fileName), escapeCSV(p.plan.planLabel)];
      const beamValues = BEAM_COLUMNS.map(col => {
        const raw = col.extract(bm);
        if (typeof raw === 'number') return fmtNum(raw, col.decimals);
        return escapeCSV(raw);
      });
      rows.push([...metaValues, ...beamValues].join(','));
    }
  }

  return [allHeaders.join(','), ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// JSON generator
// ---------------------------------------------------------------------------

export interface ExportJSONOptions {
  exportType: ExportType;
  includeBeamMetrics?: boolean;
  cohortData?: {
    clusters?: unknown[];
    correlation?: unknown;
    extendedStats?: unknown;
  };
}

export function plansToJSON(plans: ExportablePlan[], options: ExportJSONOptions): string {
  // Compute summary statistics for numeric plan columns
  const summary: Record<string, { min: number; max: number; mean: number; std: number }> = {};
  const numericCols = PLAN_COLUMNS.filter(c => {
    // Check if at least one plan has a numeric value for this column
    return plans.some(p => typeof c.extract(p) === 'number');
  });

  for (const col of numericCols) {
    const values = plans
      .map(p => col.extract(p))
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));
    if (values.length > 0) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      summary[col.key] = { min, max, mean, std: Math.sqrt(variance) };
    }
  }

  const exportData: Record<string, unknown> = {
    tool: 'RTp-lens',
    toolUrl: 'https://rt-complexity-lens.lovable.app',
    pythonToolkit: 'https://github.com/matteomaspero/rt-complexity-lens/blob/main/python/README.md',
    exportDate: new Date().toISOString(),
    exportType: options.exportType,
    planCount: plans.length,
    summary,
    plans: plans.map(p => {
      const planData: Record<string, unknown> = {
        fileName: p.fileName,
        planLabel: p.plan.planLabel,
        technique: p.plan.technique,
        beamCount: p.plan.beams?.length ?? 0,
        radiationType: getDominantRadiationType(p.plan),
        energy: getDominantEnergy(p.plan),
      };

      // All metrics as flat object
      const metrics: Record<string, number | undefined> = {};
      for (const col of PLAN_COLUMNS) {
        if (['fileName', 'planLabel', 'technique', 'beamCount', 'cpCount', 'radiationType', 'energy'].includes(col.key)) continue;
        const val = col.extract(p);
        if (typeof val === 'number') metrics[col.key] = val;
      }
      planData.metrics = metrics;

      if (options.includeBeamMetrics) {
        planData.beamMetrics = p.metrics.beamMetrics.map(bm => {
          const bmData: Record<string, unknown> = {};
          for (const col of BEAM_COLUMNS) {
            const val = col.extract(bm);
            if (val !== undefined && val !== '') bmData[col.key] = val;
          }
          return bmData;
        });
      }

      return planData;
    }),
  };

  if (options.cohortData) {
    exportData.cohortData = options.cohortData;
  }

  return JSON.stringify(exportData, null, 2);
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Convenience: export plan-level + optional beam-level
// ---------------------------------------------------------------------------

export function exportPlans(
  plans: ExportablePlan[],
  options: {
    format: 'csv' | 'json';
    includeBeamCSV?: boolean;
    includeBeamMetrics?: boolean;
    exportType?: ExportType;
    filenamePrefix?: string;
    cohortData?: ExportJSONOptions['cohortData'];
  }
) {
  const prefix = options.filenamePrefix ?? 'rtplens';
  const timestamp = new Date().toISOString().split('T')[0];

  if (options.format === 'csv') {
    const csv = plansToCSV(plans);
    downloadFile(csv, `${prefix}-plans-${timestamp}.csv`, 'text/csv');

    if (options.includeBeamCSV) {
      const beamCsv = beamsToCSV(plans);
      downloadFile(beamCsv, `${prefix}-beams-${timestamp}.csv`, 'text/csv');
    }
  } else {
    const json = plansToJSON(plans, {
      exportType: options.exportType ?? 'batch',
      includeBeamMetrics: options.includeBeamMetrics ?? options.includeBeamCSV ?? false,
      cohortData: options.cohortData,
    });
    downloadFile(json, `${prefix}-${timestamp}.json`, 'application/json');
  }
}
