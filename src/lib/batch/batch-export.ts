import type { BatchPlan } from '@/contexts/BatchContext';
import type { BatchStatistics } from './batch-statistics';
import { calculateBatchStatistics } from './batch-statistics';

export interface ExportOptions {
  format: 'csv' | 'json';
  includePlanMetrics: boolean;
  includeBeamMetrics: boolean;
  includeControlPointData: boolean;
}

function escapeCSV(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV(plans: BatchPlan[], options: ExportOptions): string {
  const successfulPlans = plans.filter(p => p.status === 'success');
  
  if (successfulPlans.length === 0) return '';

  const headers = [
    'File',
    'Plan Label',
    'Technique',
    'Beams',
    'Total MU',
    'MCS',
    'LSV',
    'AAV',
    'MFA (cm²)',
    'LT (mm)',
    'LTMCS',
    'SAS5',
    'SAS10',
    'EM (mm⁻¹)',
    'PI',
    'Est. Time (s)',
  ];

  if (options.includeBeamMetrics) {
    headers.push('Beam Details');
  }

  const rows = successfulPlans.map(p => {
    const m = p.metrics;
    const plan = p.plan;
    
    const row = [
      escapeCSV(p.fileName),
      escapeCSV(plan.planLabel),
      escapeCSV(plan.technique),
      plan.beams.length,
      m.totalMU?.toFixed(1) ?? '',
      m.MCS?.toFixed(4) ?? '',
      m.LSV?.toFixed(4) ?? '',
      m.AAV?.toFixed(4) ?? '',
      m.MFA?.toFixed(2) ?? '',
      m.LT?.toFixed(0) ?? '',
      m.LTMCS?.toFixed(4) ?? '',
      m.SAS5?.toFixed(4) ?? '',
      m.SAS10?.toFixed(4) ?? '',
      m.EM?.toFixed(4) ?? '',
      m.PI?.toFixed(2) ?? '',
      m.totalDeliveryTime?.toFixed(1) ?? '',
    ];

    if (options.includeBeamMetrics) {
      const beamSummary = m.beamMetrics
        .map(bm => `${bm.beamName}: ${bm.beamMU?.toFixed(1)} MU, MCS=${bm.MCS?.toFixed(3)}`)
        .join(' | ');
      row.push(escapeCSV(beamSummary));
    }

    return row.join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function exportToJSON(plans: BatchPlan[], options: ExportOptions): string {
  const successfulPlans = plans.filter(p => p.status === 'success');
  
  const stats = calculateBatchStatistics(successfulPlans.map(p => ({ metrics: p.metrics, plan: p.plan })));
  
  const exportData = {
    exportDate: new Date().toISOString(),
    planCount: successfulPlans.length,
    summary: {
      MCS: { min: stats.MCS.min, max: stats.MCS.max, mean: stats.MCS.mean, std: stats.MCS.std },
      LSV: { min: stats.LSV.min, max: stats.LSV.max, mean: stats.LSV.mean, std: stats.LSV.std },
      AAV: { min: stats.AAV.min, max: stats.AAV.max, mean: stats.AAV.mean, std: stats.AAV.std },
      MFA: { min: stats.MFA.min, max: stats.MFA.max, mean: stats.MFA.mean, std: stats.MFA.std },
      totalMU: { min: stats.totalMU.min, max: stats.totalMU.max, mean: stats.totalMU.mean, std: stats.totalMU.std },
    },
    plans: successfulPlans.map(p => {
      const planData: Record<string, unknown> = {
        fileName: p.fileName,
        planLabel: p.plan.planLabel,
        technique: p.plan.technique,
        uploadTime: p.uploadTime.toISOString(),
      };

      if (options.includePlanMetrics) {
        planData.metrics = {
          MCS: p.metrics.MCS,
          LSV: p.metrics.LSV,
          AAV: p.metrics.AAV,
          MFA: p.metrics.MFA,
          LT: p.metrics.LT,
          LTMCS: p.metrics.LTMCS,
          totalMU: p.metrics.totalMU,
          SAS5: p.metrics.SAS5,
          SAS10: p.metrics.SAS10,
          EM: p.metrics.EM,
          PI: p.metrics.PI,
          totalDeliveryTime: p.metrics.totalDeliveryTime,
        };
      }

      if (options.includeBeamMetrics) {
        planData.beamMetrics = p.metrics.beamMetrics.map(bm => ({
          beamNumber: bm.beamNumber,
          beamName: bm.beamName,
          beamMU: bm.beamMU,
          MCS: bm.MCS,
          LSV: bm.LSV,
          AAV: bm.AAV,
          MFA: bm.MFA,
          LT: bm.LT,
          arcLength: bm.arcLength,
          estimatedDeliveryTime: bm.estimatedDeliveryTime,
        }));
      }

      return planData;
    }),
  };

  return JSON.stringify(exportData, null, 2);
}

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

export function exportBatch(
  plans: BatchPlan[],
  options: ExportOptions,
  filenamePrefix = 'batch-analysis'
) {
  const timestamp = new Date().toISOString().split('T')[0];
  
  if (options.format === 'csv') {
    const content = exportToCSV(plans, options);
    downloadFile(content, `${filenamePrefix}-${timestamp}.csv`, 'text/csv');
  } else {
    const content = exportToJSON(plans, options);
    downloadFile(content, `${filenamePrefix}-${timestamp}.json`, 'application/json');
  }
}
