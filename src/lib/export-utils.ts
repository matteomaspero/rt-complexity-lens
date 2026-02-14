/**
 * Unified export utilities for RTp-lens
 * 
 * Provides a single, consistent CSV/JSON export format across all modes
 * (single plan, batch, cohort). CSV format: two-row header (category + metric name),
 * plan-total row + per-beam rows for each plan.
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
  /** Extract from beam-level data for beam rows; undefined = plan-only column */
  extractBeam?: (bm: BeamMetrics) => number | string | undefined;
  /** If true, column is only filled for beam rows */
  beamOnly?: boolean;
  /** If true, column is only filled for plan rows */
  planOnly?: boolean;
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

function beamMetricVal(bm: BeamMetrics, key: string): number | undefined {
  const v = (bm as unknown as Record<string, unknown>)[key];
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
// Unified column definitions — used for both plan-total and beam rows
// ---------------------------------------------------------------------------

export const PLAN_COLUMNS: ColumnDef[] = [
  // ── Plan Info ──
  { key: 'fileName', header: 'File', category: 'Plan Info', decimals: 0, extract: p => p.fileName, extractBeam: () => undefined },
  { key: 'patientId', header: 'Patient ID', category: 'Plan Info', decimals: 0, extract: p => p.plan.patientId, extractBeam: () => undefined },
  { key: 'patientName', header: 'Patient Name', category: 'Plan Info', decimals: 0, extract: p => p.plan.patientName, extractBeam: () => undefined },
  { key: 'planLabel', header: 'Plan Label', category: 'Plan Info', decimals: 0, extract: p => p.plan.planLabel, extractBeam: () => undefined },
  { key: 'technique', header: 'Technique', category: 'Plan Info', decimals: 0, extract: p => p.plan.technique, extractBeam: () => undefined },
  { key: 'beamCount', header: 'Beam Count', category: 'Plan Info', decimals: 0, extract: p => p.plan.beams?.length ?? 0, extractBeam: () => undefined },
  { key: 'cpCount', header: 'CP Count', category: 'Plan Info', decimals: 0, extract: p => p.plan.beams?.reduce((s, b) => s + (b.numberOfControlPoints || 0), 0) ?? 0, extractBeam: bm => bm.numberOfControlPoints },
  { key: 'radiationType', header: 'Radiation Type', category: 'Plan Info', decimals: 0, extract: p => getDominantRadiationType(p.plan), extractBeam: bm => bm.radiationType ?? '' },
  { key: 'energy', header: 'Energy', category: 'Plan Info', decimals: 0, extract: p => getDominantEnergy(p.plan), extractBeam: bm => bm.energyLabel ?? (bm.nominalBeamEnergy !== undefined ? `${bm.nominalBeamEnergy} MeV` : '') },
  { key: 'machine', header: 'Machine', category: 'Plan Info', decimals: 0, extract: p => p.plan.treatmentMachineName ?? '', extractBeam: () => undefined },
  { key: 'institution', header: 'Institution', category: 'Plan Info', decimals: 0, extract: p => p.plan.institutionName ?? '', extractBeam: () => undefined },

  // ── Row Identifiers ──
  { key: 'beam', header: 'Beam', category: 'Row', decimals: 0, extract: () => 'ALL', extractBeam: bm => `${bm.beamNumber}-${bm.beamName}` },
  { key: 'level', header: 'Level', category: 'Row', decimals: 0, extract: () => 'Plan', extractBeam: () => 'Beam' },

  // ── Beam Geometry (beam-only) ──
  { key: 'gantryRange', header: 'Gantry Range', category: 'Beam Geometry', decimals: 0, beamOnly: true, extract: () => undefined, extractBeam: bm => bm.gantryAngleStart !== undefined && bm.gantryAngleEnd !== undefined ? `${bm.gantryAngleStart.toFixed(1)}→${bm.gantryAngleEnd.toFixed(1)}` : '' },
  { key: 'collimator', header: 'Collimator (°)', category: 'Beam Geometry', decimals: 1, beamOnly: true, extract: () => undefined, extractBeam: bm => bm.collimatorAngleStart },
  { key: 'tableAngle', header: 'Table Angle (°)', category: 'Beam Geometry', decimals: 1, beamOnly: true, extract: () => undefined, extractBeam: bm => bm.patientSupportAngle },
  { key: 'isocenter', header: 'Isocenter (mm)', category: 'Beam Geometry', decimals: 0, beamOnly: true, extract: () => undefined, extractBeam: bm => formatIsocenter(bm) },
  { key: 'tablePosition', header: 'Table Position (V,L,Lat)', category: 'Beam Geometry', decimals: 0, beamOnly: true, extract: () => undefined, extractBeam: bm => formatTablePos(bm) },

  // ── Prescription (plan-only) ──
  { key: 'prescribedDose', header: 'Rx Dose (Gy)', category: 'Prescription', decimals: 2, planOnly: true, extract: p => metricVal(p.metrics, 'prescribedDose'), extractBeam: () => undefined },
  { key: 'dosePerFraction', header: 'Dose/Fx (Gy)', category: 'Prescription', decimals: 2, planOnly: true, extract: p => metricVal(p.metrics, 'dosePerFraction'), extractBeam: () => undefined },
  { key: 'numberOfFractions', header: 'Fractions', category: 'Prescription', decimals: 0, planOnly: true, extract: p => metricVal(p.metrics, 'numberOfFractions'), extractBeam: () => undefined },
  { key: 'MUperGy', header: 'MU/Gy', category: 'Prescription', decimals: 1, planOnly: true, extract: p => metricVal(p.metrics, 'MUperGy'), extractBeam: () => undefined },

  // ── Delivery ──
  { key: 'totalMU', header: 'Total MU', category: 'Delivery', decimals: 1, extract: p => p.metrics.totalMU, extractBeam: bm => bm.beamMU },
  { key: 'totalDeliveryTime', header: 'Delivery Time (s)', category: 'Delivery', decimals: 1, extract: p => metricVal(p.metrics, 'totalDeliveryTime'), extractBeam: bm => bm.estimatedDeliveryTime },
  { key: 'GT', header: 'GT (°)', category: 'Delivery', decimals: 1, extract: p => metricVal(p.metrics, 'GT'), extractBeam: bm => bm.GT },
  { key: 'avgDoseRate', header: 'Avg Dose Rate (MU/min)', category: 'Delivery', decimals: 1, extract: p => getAvgDoseRate(p.metrics), extractBeam: bm => bm.avgDoseRate },
  { key: 'psmall', header: 'psmall', category: 'Delivery', decimals: 4, extract: p => metricVal(p.metrics, 'psmall'), extractBeam: bm => bm.psmall },

  // ── Geometric ──
  { key: 'MFA', header: 'MFA (cm²)', category: 'Geometric', decimals: 2, extract: p => metricVal(p.metrics, 'MFA'), extractBeam: bm => bm.MFA },
  { key: 'EFS', header: 'EFS (mm)', category: 'Geometric', decimals: 2, extract: p => metricVal(p.metrics, 'EFS'), extractBeam: bm => bm.EFS },
  { key: 'PA', header: 'PA (cm²)', category: 'Geometric', decimals: 2, extract: p => metricVal(p.metrics, 'PA'), extractBeam: bm => bm.PA },
  { key: 'JA', header: 'JA (cm²)', category: 'Geometric', decimals: 2, extract: p => metricVal(p.metrics, 'JA'), extractBeam: bm => bm.JA },

  // ── Complexity (Primary) ──
  { key: 'MCS', header: 'MCS', category: 'Complexity (Primary)', decimals: 4, extract: p => metricVal(p.metrics, 'MCS'), extractBeam: bm => bm.MCS },
  { key: 'LSV', header: 'LSV', category: 'Complexity (Primary)', decimals: 4, extract: p => metricVal(p.metrics, 'LSV'), extractBeam: bm => bm.LSV },
  { key: 'AAV', header: 'AAV', category: 'Complexity (Primary)', decimals: 4, extract: p => metricVal(p.metrics, 'AAV'), extractBeam: bm => bm.AAV },

  // ── Complexity (Secondary) ──
  { key: 'LT', header: 'LT (mm)', category: 'Complexity (Secondary)', decimals: 1, extract: p => metricVal(p.metrics, 'LT'), extractBeam: bm => bm.LT },
  { key: 'LTMCS', header: 'LTMCS', category: 'Complexity (Secondary)', decimals: 1, extract: p => metricVal(p.metrics, 'LTMCS'), extractBeam: bm => bm.LTMCS },
  { key: 'SAS5', header: 'SAS5', category: 'Complexity (Secondary)', decimals: 4, extract: p => metricVal(p.metrics, 'SAS5'), extractBeam: bm => bm.SAS5 },
  { key: 'SAS10', header: 'SAS10', category: 'Complexity (Secondary)', decimals: 4, extract: p => metricVal(p.metrics, 'SAS10'), extractBeam: bm => bm.SAS10 },
  { key: 'EM', header: 'EM', category: 'Complexity (Secondary)', decimals: 4, extract: p => metricVal(p.metrics, 'EM'), extractBeam: bm => bm.EM },
  { key: 'PI', header: 'PI', category: 'Complexity (Secondary)', decimals: 4, extract: p => metricVal(p.metrics, 'PI'), extractBeam: bm => bm.PI },
  { key: 'LG', header: 'LG (mm)', category: 'Complexity (Secondary)', decimals: 2, extract: p => metricVal(p.metrics, 'LG'), extractBeam: bm => bm.LG },
  { key: 'MAD', header: 'MAD (mm)', category: 'Complexity (Secondary)', decimals: 2, extract: p => metricVal(p.metrics, 'MAD'), extractBeam: bm => bm.MAD },
  { key: 'TG', header: 'TG', category: 'Complexity (Secondary)', decimals: 4, extract: p => metricVal(p.metrics, 'TG'), extractBeam: bm => bm.TG },
  { key: 'PM', header: 'PM', category: 'Complexity (Secondary)', decimals: 4, extract: p => metricVal(p.metrics, 'PM'), extractBeam: bm => bm.PM },
  { key: 'MD', header: 'MD', category: 'Complexity (Secondary)', decimals: 4, extract: p => metricVal(p.metrics, 'MD'), extractBeam: bm => bm.MD },
  { key: 'MI', header: 'MI', category: 'Complexity (Secondary)', decimals: 4, extract: p => metricVal(p.metrics, 'MI'), extractBeam: bm => bm.MI },

  // ── Deliverability ──
  { key: 'MUCA', header: 'MUCA (MU/CP)', category: 'Deliverability', decimals: 4, extract: p => metricVal(p.metrics, 'MUCA'), extractBeam: bm => bm.MUCA },
  { key: 'LTMU', header: 'LTMU (mm/MU)', category: 'Deliverability', decimals: 4, extract: p => metricVal(p.metrics, 'LTMU'), extractBeam: bm => bm.LTMU },
  { key: 'LTNLMU', header: 'LTNLMU', category: 'Deliverability', decimals: 6, extract: p => metricVal(p.metrics, 'LTNLMU'), extractBeam: bm => bm.LTNLMU },
  { key: 'LNA', header: 'LNA', category: 'Deliverability', decimals: 4, extract: p => metricVal(p.metrics, 'LNA'), extractBeam: bm => bm.LNA },
  { key: 'LTAL', header: 'LTAL (mm/°)', category: 'Deliverability', decimals: 2, extract: p => metricVal(p.metrics, 'LTAL'), extractBeam: bm => bm.LTAL },
  { key: 'GS', header: 'GS (°/s)', category: 'Deliverability', decimals: 2, extract: p => metricVal(p.metrics, 'GS'), extractBeam: bm => bm.GS },
  { key: 'mGSV', header: 'mGSV (°/s)', category: 'Deliverability', decimals: 4, extract: p => metricVal(p.metrics, 'mGSV'), extractBeam: bm => bm.mGSV },
  { key: 'LS', header: 'LS (mm/s)', category: 'Deliverability', decimals: 2, extract: p => metricVal(p.metrics, 'LS'), extractBeam: bm => bm.LS },
  { key: 'mDRV', header: 'mDRV (MU/min)', category: 'Deliverability', decimals: 2, extract: p => metricVal(p.metrics, 'mDRV'), extractBeam: bm => bm.mDRV },
];

// ---------------------------------------------------------------------------
// CSV generators
// ---------------------------------------------------------------------------

/** Format a single cell value for CSV */
function formatCell(col: ColumnDef, raw: number | string | undefined): string {
  if (typeof raw === 'number') return fmtNum(raw, col.decimals);
  return escapeCSV(raw);
}

/** Combined CSV: plan-total row + per-beam rows for each plan */
export function plansToCSV(plans: ExportablePlan[]): string {
  const categoryRow = buildCategoryRow(PLAN_COLUMNS);
  const headerRow = PLAN_COLUMNS.map(c => c.header).join(',');

  const rows: string[] = [];
  for (const p of plans) {
    // Plan-total row
    const planRow = PLAN_COLUMNS.map(col => {
      if (col.beamOnly) return '';
      return formatCell(col, col.extract(p));
    }).join(',');
    rows.push(planRow);

    // Per-beam rows
    for (const bm of p.metrics.beamMetrics) {
      const beamRow = PLAN_COLUMNS.map(col => {
        if (col.planOnly) return '';
        if (col.extractBeam) {
          const val = col.extractBeam(bm);
          // For beam rows, fall back to plan extract for plan-info columns that return undefined
          if (val === undefined && !col.beamOnly) {
            return formatCell(col, col.extract(p));
          }
          return formatCell(col, val);
        }
        // No extractBeam defined — use plan extract (for plan info columns)
        return formatCell(col, col.extract(p));
      }).join(',');
      rows.push(beamRow);
    }
  }

  return [categoryRow, headerRow, ...rows].join('\n');
}

/** Legacy beam-only CSV (kept for internal use) */
export function beamsToCSV(plans: ExportablePlan[]): string {
  // Now just delegates to the combined format
  return plansToCSV(plans);
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
      const skipKeys = ['fileName', 'patientId', 'patientName', 'planLabel', 'technique', 'beamCount', 'cpCount', 'radiationType', 'energy', 'machine', 'institution', 'beam', 'level'];
      for (const col of PLAN_COLUMNS) {
        if (skipKeys.includes(col.key)) continue;
        if (col.beamOnly) continue;
        const val = col.extract(p);
        if (typeof val === 'number') metrics[col.key] = val;
      }
      planData.metrics = metrics;

      // Always include beam metrics in JSON
      planData.beamMetrics = p.metrics.beamMetrics.map(bm => {
        const bmData: Record<string, unknown> = {};
        for (const col of PLAN_COLUMNS) {
          if (col.planOnly) continue;
          if (col.extractBeam) {
            const val = col.extractBeam(bm);
            if (val !== undefined && val !== '') bmData[col.key] = val;
          }
        }
        return bmData;
      });

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
// Convenience: export plan-level + beam-level (always combined for CSV)
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
    downloadFile(csv, `${prefix}-${timestamp}.csv`, 'text/csv');
  } else {
    const json = plansToJSON(plans, {
      exportType: options.exportType ?? 'batch',
      includeBeamMetrics: true,
      cohortData: options.cohortData,
    });
    downloadFile(json, `${prefix}-${timestamp}.json`, 'application/json');
  }
}
