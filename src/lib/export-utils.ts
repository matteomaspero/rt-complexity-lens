/**
 * Unified export utilities for RTp-lens
 * 
 * Provides a single, consistent CSV/JSON export format across all modes
 * (single plan, batch, cohort). CSV format: two-row header (category + metric name),
 * one row per plan, one column per metric.
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
  category: string;
  decimals: number;
  extract: (p: ExportablePlan) => number | string | undefined;
}

interface BeamColumnDef {
  key: string;
  header: string;
  category: string;
  decimals: number;
  extract: (bm: BeamMetrics) => number | string | undefined;
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

/** Average dose rate across all beams */
function getAvgDoseRate(metrics: PlanMetrics): number | undefined {
  const rates = metrics.beamMetrics.map(b => b.avgDoseRate).filter((r): r is number => r !== undefined);
  if (rates.length === 0) return undefined;
  return rates.reduce((a, b) => a + b, 0) / rates.length;
}

function metricVal(m: PlanMetrics, key: string): number | undefined {
  const v = (m as unknown as Record<string, unknown>)[key];
  return typeof v === 'number' ? v : undefined;
}

/** Build the category row: category name at first column of each group, empty elsewhere */
function buildCategoryRow(columns: { category: string }[]): string {
  let lastCategory = '';
  return columns.map(col => {
    if (col.category !== lastCategory) {
      lastCategory = col.category;
      return escapeCSV(col.category);
    }
    return '';
  }).join(',');
}

function formatIsocenter(bm: BeamMetrics): string {
  if (!bm.isocenterPosition) return '';
  const [x, y, z] = bm.isocenterPosition;
  return `${x.toFixed(1)} ${y.toFixed(1)} ${z.toFixed(1)}`;
}

function formatTablePos(bm: BeamMetrics): string {
  const parts: string[] = [];
  if (bm.tableTopVertical !== undefined) parts.push(bm.tableTopVertical.toFixed(1));
  if (bm.tableTopLongitudinal !== undefined) parts.push(bm.tableTopLongitudinal.toFixed(1));
  if (bm.tableTopLateral !== undefined) parts.push(bm.tableTopLateral.toFixed(1));
  return parts.length > 0 ? parts.join(' ') : '';
}

// ---------------------------------------------------------------------------
// Plan-level column definitions (reordered: metadata → prescription → delivery → metrics)
// ---------------------------------------------------------------------------

export const PLAN_COLUMNS: ColumnDef[] = [
  // ── Plan Info ──
  { key: 'fileName', header: 'File', category: 'Plan Info', decimals: 0, extract: p => p.fileName },
  { key: 'patientId', header: 'Patient ID', category: 'Plan Info', decimals: 0, extract: p => p.plan.patientId },
  { key: 'patientName', header: 'Patient Name', category: 'Plan Info', decimals: 0, extract: p => p.plan.patientName },
  { key: 'planLabel', header: 'Plan Label', category: 'Plan Info', decimals: 0, extract: p => p.plan.planLabel },
  { key: 'technique', header: 'Technique', category: 'Plan Info', decimals: 0, extract: p => p.plan.technique },
  { key: 'beamCount', header: 'Beam Count', category: 'Plan Info', decimals: 0, extract: p => p.plan.beams?.length ?? 0 },
  { key: 'cpCount', header: 'CP Count', category: 'Plan Info', decimals: 0, extract: p => p.plan.beams?.reduce((s, b) => s + (b.numberOfControlPoints || 0), 0) ?? 0 },
  { key: 'radiationType', header: 'Radiation Type', category: 'Plan Info', decimals: 0, extract: p => getDominantRadiationType(p.plan) },
  { key: 'energy', header: 'Energy', category: 'Plan Info', decimals: 0, extract: p => getDominantEnergy(p.plan) },
  { key: 'machine', header: 'Machine', category: 'Plan Info', decimals: 0, extract: p => p.plan.treatmentMachineName ?? '' },
  { key: 'institution', header: 'Institution', category: 'Plan Info', decimals: 0, extract: p => p.plan.institutionName ?? '' },

  // ── Prescription ──
  { key: 'prescribedDose', header: 'Rx Dose (Gy)', category: 'Prescription', decimals: 2, extract: p => metricVal(p.metrics, 'prescribedDose') },
  { key: 'dosePerFraction', header: 'Dose/Fx (Gy)', category: 'Prescription', decimals: 2, extract: p => metricVal(p.metrics, 'dosePerFraction') },
  { key: 'numberOfFractions', header: 'Fractions', category: 'Prescription', decimals: 0, extract: p => metricVal(p.metrics, 'numberOfFractions') },
  { key: 'MUperGy', header: 'MU/Gy', category: 'Prescription', decimals: 1, extract: p => metricVal(p.metrics, 'MUperGy') },

  // ── Delivery ──
  { key: 'totalMU', header: 'Total MU', category: 'Delivery', decimals: 1, extract: p => p.metrics.totalMU },
  { key: 'totalDeliveryTime', header: 'Delivery Time (s)', category: 'Delivery', decimals: 1, extract: p => metricVal(p.metrics, 'totalDeliveryTime') },
  { key: 'GT', header: 'GT (°)', category: 'Delivery', decimals: 1, extract: p => metricVal(p.metrics, 'GT') },
  { key: 'avgDoseRate', header: 'Avg Dose Rate (MU/min)', category: 'Delivery', decimals: 1, extract: p => getAvgDoseRate(p.metrics) },
  { key: 'psmall', header: 'psmall', category: 'Delivery', decimals: 4, extract: p => metricVal(p.metrics, 'psmall') },

  // ── Geometric ──
  { key: 'MFA', header: 'MFA (cm²)', category: 'Geometric', decimals: 2, extract: p => metricVal(p.metrics, 'MFA') },
  { key: 'EFS', header: 'EFS (mm)', category: 'Geometric', decimals: 2, extract: p => metricVal(p.metrics, 'EFS') },
  { key: 'PA', header: 'PA (cm²)', category: 'Geometric', decimals: 2, extract: p => metricVal(p.metrics, 'PA') },
  { key: 'JA', header: 'JA (cm²)', category: 'Geometric', decimals: 2, extract: p => metricVal(p.metrics, 'JA') },

  // ── Complexity (Primary) ──
  { key: 'MCS', header: 'MCS', category: 'Complexity (Primary)', decimals: 4, extract: p => metricVal(p.metrics, 'MCS') },
  { key: 'LSV', header: 'LSV', category: 'Complexity (Primary)', decimals: 4, extract: p => metricVal(p.metrics, 'LSV') },
  { key: 'AAV', header: 'AAV', category: 'Complexity (Primary)', decimals: 4, extract: p => metricVal(p.metrics, 'AAV') },

  // ── Complexity (Secondary) ──
  { key: 'LT', header: 'LT (mm)', category: 'Complexity (Secondary)', decimals: 1, extract: p => metricVal(p.metrics, 'LT') },
  { key: 'LTMCS', header: 'LTMCS', category: 'Complexity (Secondary)', decimals: 1, extract: p => metricVal(p.metrics, 'LTMCS') },
  { key: 'SAS5', header: 'SAS5', category: 'Complexity (Secondary)', decimals: 4, extract: p => metricVal(p.metrics, 'SAS5') },
  { key: 'SAS10', header: 'SAS10', category: 'Complexity (Secondary)', decimals: 4, extract: p => metricVal(p.metrics, 'SAS10') },
  { key: 'EM', header: 'EM', category: 'Complexity (Secondary)', decimals: 4, extract: p => metricVal(p.metrics, 'EM') },
  { key: 'PI', header: 'PI', category: 'Complexity (Secondary)', decimals: 4, extract: p => metricVal(p.metrics, 'PI') },
  { key: 'LG', header: 'LG (mm)', category: 'Complexity (Secondary)', decimals: 2, extract: p => metricVal(p.metrics, 'LG') },
  { key: 'MAD', header: 'MAD (mm)', category: 'Complexity (Secondary)', decimals: 2, extract: p => metricVal(p.metrics, 'MAD') },
  { key: 'TG', header: 'TG', category: 'Complexity (Secondary)', decimals: 4, extract: p => metricVal(p.metrics, 'TG') },
  { key: 'PM', header: 'PM', category: 'Complexity (Secondary)', decimals: 4, extract: p => metricVal(p.metrics, 'PM') },
  { key: 'MD', header: 'MD', category: 'Complexity (Secondary)', decimals: 4, extract: p => metricVal(p.metrics, 'MD') },
  { key: 'MI', header: 'MI', category: 'Complexity (Secondary)', decimals: 4, extract: p => metricVal(p.metrics, 'MI') },

  // ── Deliverability ──
  { key: 'MUCA', header: 'MUCA (MU/CP)', category: 'Deliverability', decimals: 4, extract: p => metricVal(p.metrics, 'MUCA') },
  { key: 'LTMU', header: 'LTMU (mm/MU)', category: 'Deliverability', decimals: 4, extract: p => metricVal(p.metrics, 'LTMU') },
  { key: 'LTNLMU', header: 'LTNLMU', category: 'Deliverability', decimals: 6, extract: p => metricVal(p.metrics, 'LTNLMU') },
  { key: 'LNA', header: 'LNA', category: 'Deliverability', decimals: 4, extract: p => metricVal(p.metrics, 'LNA') },
  { key: 'LTAL', header: 'LTAL (mm/°)', category: 'Deliverability', decimals: 2, extract: p => metricVal(p.metrics, 'LTAL') },
  { key: 'GS', header: 'GS (°/s)', category: 'Deliverability', decimals: 2, extract: p => metricVal(p.metrics, 'GS') },
  { key: 'mGSV', header: 'mGSV (°/s)', category: 'Deliverability', decimals: 4, extract: p => metricVal(p.metrics, 'mGSV') },
  { key: 'LS', header: 'LS (mm/s)', category: 'Deliverability', decimals: 2, extract: p => metricVal(p.metrics, 'LS') },
  { key: 'mDRV', header: 'mDRV (MU/min)', category: 'Deliverability', decimals: 2, extract: p => metricVal(p.metrics, 'mDRV') },
];

// ---------------------------------------------------------------------------
// Beam-level column definitions
// ---------------------------------------------------------------------------

const BEAM_COLUMNS: BeamColumnDef[] = [
  // ── Plan Info ──
  { key: 'beamNumber', header: 'Beam Number', category: 'Beam Info', decimals: 0, extract: bm => bm.beamNumber },
  { key: 'beamName', header: 'Beam Name', category: 'Beam Info', decimals: 0, extract: bm => bm.beamName },
  { key: 'radiationType', header: 'Radiation Type', category: 'Beam Info', decimals: 0, extract: bm => bm.radiationType ?? '' },
  { key: 'nominalBeamEnergy', header: 'Nominal Energy (MeV)', category: 'Beam Info', decimals: 0, extract: bm => bm.nominalBeamEnergy },
  { key: 'energyLabel', header: 'Energy Label', category: 'Beam Info', decimals: 0, extract: bm => bm.energyLabel ?? '' },
  { key: 'numberOfControlPoints', header: 'CPs', category: 'Beam Info', decimals: 0, extract: bm => bm.numberOfControlPoints },

  // ── Beam Geometry ──
  { key: 'gantryRange', header: 'Gantry Range', category: 'Beam Geometry', decimals: 0, extract: bm => bm.gantryAngleStart !== undefined && bm.gantryAngleEnd !== undefined ? `${bm.gantryAngleStart.toFixed(1)}→${bm.gantryAngleEnd.toFixed(1)}` : '' },
  { key: 'arcLength', header: 'Arc Length (°)', category: 'Beam Geometry', decimals: 1, extract: bm => bm.arcLength },
  { key: 'collimatorAngleStart', header: 'Collimator (°)', category: 'Beam Geometry', decimals: 1, extract: bm => bm.collimatorAngleStart },
  { key: 'patientSupportAngle', header: 'Table Angle (°)', category: 'Beam Geometry', decimals: 1, extract: bm => bm.patientSupportAngle },
  { key: 'isocenter', header: 'Isocenter (mm)', category: 'Beam Geometry', decimals: 0, extract: bm => formatIsocenter(bm) },
  { key: 'tablePosition', header: 'Table Position (V,L,Lat)', category: 'Beam Geometry', decimals: 0, extract: bm => formatTablePos(bm) },

  // ── Delivery ──
  { key: 'beamMU', header: 'Beam MU', category: 'Delivery', decimals: 1, extract: bm => bm.beamMU },
  { key: 'estimatedDeliveryTime', header: 'Est Time (s)', category: 'Delivery', decimals: 1, extract: bm => bm.estimatedDeliveryTime },
  { key: 'avgDoseRate', header: 'Avg Dose Rate (MU/min)', category: 'Delivery', decimals: 1, extract: bm => bm.avgDoseRate },
  { key: 'GT', header: 'GT (°)', category: 'Delivery', decimals: 1, extract: bm => bm.GT },

  // ── Geometric ──
  { key: 'MFA', header: 'MFA (cm²)', category: 'Geometric', decimals: 2, extract: bm => bm.MFA },
  { key: 'EFS', header: 'EFS (mm)', category: 'Geometric', decimals: 2, extract: bm => bm.EFS },
  { key: 'PA', header: 'PA (cm²)', category: 'Geometric', decimals: 2, extract: bm => bm.PA },
  { key: 'JA', header: 'JA (cm²)', category: 'Geometric', decimals: 2, extract: bm => bm.JA },
  { key: 'psmall', header: 'psmall', category: 'Geometric', decimals: 4, extract: bm => bm.psmall },

  // ── Complexity (Primary) ──
  { key: 'MCS', header: 'MCS', category: 'Complexity (Primary)', decimals: 4, extract: bm => bm.MCS },
  { key: 'LSV', header: 'LSV', category: 'Complexity (Primary)', decimals: 4, extract: bm => bm.LSV },
  { key: 'AAV', header: 'AAV', category: 'Complexity (Primary)', decimals: 4, extract: bm => bm.AAV },

  // ── Complexity (Secondary) ──
  { key: 'LT', header: 'LT (mm)', category: 'Complexity (Secondary)', decimals: 1, extract: bm => bm.LT },
  { key: 'LTMCS', header: 'LTMCS', category: 'Complexity (Secondary)', decimals: 1, extract: bm => bm.LTMCS },
  { key: 'SAS5', header: 'SAS5', category: 'Complexity (Secondary)', decimals: 4, extract: bm => bm.SAS5 },
  { key: 'SAS10', header: 'SAS10', category: 'Complexity (Secondary)', decimals: 4, extract: bm => bm.SAS10 },
  { key: 'EM', header: 'EM', category: 'Complexity (Secondary)', decimals: 4, extract: bm => bm.EM },
  { key: 'PI', header: 'PI', category: 'Complexity (Secondary)', decimals: 4, extract: bm => bm.PI },
  { key: 'LG', header: 'LG (mm)', category: 'Complexity (Secondary)', decimals: 2, extract: bm => bm.LG },
  { key: 'MAD', header: 'MAD (mm)', category: 'Complexity (Secondary)', decimals: 2, extract: bm => bm.MAD },
  { key: 'TG', header: 'TG', category: 'Complexity (Secondary)', decimals: 4, extract: bm => bm.TG },
  { key: 'PM', header: 'PM', category: 'Complexity (Secondary)', decimals: 4, extract: bm => bm.PM },

  // ── Deliverability ──
  { key: 'MUCA', header: 'MUCA (MU/CP)', category: 'Deliverability', decimals: 4, extract: bm => bm.MUCA },
  { key: 'LTMU', header: 'LTMU (mm/MU)', category: 'Deliverability', decimals: 4, extract: bm => bm.LTMU },
  { key: 'GS', header: 'GS (°/s)', category: 'Deliverability', decimals: 2, extract: bm => bm.GS },
  { key: 'LS', header: 'LS (mm/s)', category: 'Deliverability', decimals: 2, extract: bm => bm.LS },
  { key: 'mDRV', header: 'mDRV (MU/min)', category: 'Deliverability', decimals: 2, extract: bm => bm.mDRV },
];

// ---------------------------------------------------------------------------
// CSV generators
// ---------------------------------------------------------------------------

/** Convert an array of plans to a standard tabular CSV string (plan-level). */
export function plansToCSV(plans: ExportablePlan[]): string {
  const categoryRow = buildCategoryRow(PLAN_COLUMNS);
  const headerRow = PLAN_COLUMNS.map(c => c.header).join(',');
  const rows = plans.map(p =>
    PLAN_COLUMNS.map(col => {
      const raw = col.extract(p);
      if (typeof raw === 'number') return fmtNum(raw, col.decimals);
      return escapeCSV(raw);
    }).join(',')
  );
  return [categoryRow, headerRow, ...rows].join('\n');
}

/** Convert plans to a beam-level CSV (one row per beam). */
export function beamsToCSV(plans: ExportablePlan[]): string {
  const metaColumns: BeamColumnDef[] = [
    { key: 'file', header: 'File', category: 'Plan Info', decimals: 0, extract: () => '' },
    { key: 'planLabel', header: 'Plan Label', category: 'Plan Info', decimals: 0, extract: () => '' },
  ];
  const allColumns = [...metaColumns, ...BEAM_COLUMNS];

  const categoryRow = buildCategoryRow(allColumns);
  const headerRow = allColumns.map(c => c.header).join(',');

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

  return [categoryRow, headerRow, ...rows].join('\n');
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
        patientId: p.plan.patientId,
        patientName: p.plan.patientName,
        planLabel: p.plan.planLabel,
        technique: p.plan.technique,
        beamCount: p.plan.beams?.length ?? 0,
        radiationType: getDominantRadiationType(p.plan),
        energy: getDominantEnergy(p.plan),
        machine: p.plan.treatmentMachineName,
        institution: p.plan.institutionName,
      };

      // All metrics as flat object
      const metrics: Record<string, number | undefined> = {};
      const skipKeys = ['fileName', 'patientId', 'patientName', 'planLabel', 'technique', 'beamCount', 'cpCount', 'radiationType', 'energy', 'machine', 'institution'];
      for (const col of PLAN_COLUMNS) {
        if (skipKeys.includes(col.key)) continue;
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
