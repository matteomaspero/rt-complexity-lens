import type { BatchPlan } from '@/contexts/BatchContext';
import { calculateBatchStatistics } from './batch-statistics';
import { METRIC_DEFINITIONS, type MetricKey } from '@/lib/cohort/metric-utils';

export interface ExportOptions {
  format: 'csv' | 'json';
  includePlanMetrics: boolean;
  includeBeamMetrics: boolean;
  includeControlPointData: boolean;
  includeGeometricMetrics?: boolean;
  includeComplexityMetrics?: boolean;
}

function escapeCSV(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatMetricValue(value: number | undefined, decimals: number = 4): string {
  if (value === undefined || value === null || isNaN(value)) return '';
  return value.toFixed(decimals);
}

// All metrics organized by category for export
const GEOMETRIC_METRICS: { key: MetricKey; decimals: number }[] = [
  { key: 'MFA', decimals: 2 },
  { key: 'EFS', decimals: 2 },
  { key: 'PA', decimals: 2 },
  { key: 'JA', decimals: 2 },
  { key: 'psmall', decimals: 2 },
];

const BEAM_METRICS: { key: MetricKey; decimals: number }[] = [
  { key: 'totalMU', decimals: 1 },
  { key: 'totalDeliveryTime', decimals: 1 },
  { key: 'GT', decimals: 1 },
  { key: 'MUCA', decimals: 2 },
  { key: 'beamCount', decimals: 0 },
  { key: 'controlPointCount', decimals: 0 },
];

const COMPLEXITY_METRICS: { key: MetricKey; decimals: number }[] = [
  { key: 'MCS', decimals: 4 },
  { key: 'LSV', decimals: 4 },
  { key: 'AAV', decimals: 4 },
  { key: 'LT', decimals: 1 },
  { key: 'LTMCS', decimals: 4 },
  { key: 'SAS5', decimals: 4 },
  { key: 'SAS10', decimals: 4 },
  { key: 'EM', decimals: 4 },
  { key: 'PI', decimals: 2 },
  { key: 'LG', decimals: 4 },
  { key: 'MAD', decimals: 4 },
  { key: 'TG', decimals: 4 },
  { key: 'PM', decimals: 4 },
];

function getMetricValue(plan: BatchPlan, key: MetricKey): number | undefined {
  const m = plan.metrics;
  const p = plan.plan;
  
  switch (key) {
    case 'beamCount': return p.beams?.length ?? 0;
    case 'controlPointCount': 
      return p.beams?.reduce((sum, b) => sum + (b.numberOfControlPoints || 0), 0) ?? 0;
    case 'totalDeliveryTime': return m.totalDeliveryTime;
    case 'GT': return m.beamMetrics?.reduce((sum, b) => sum + (b.arcLength || 0), 0) ?? 0;
    default: return (m as unknown as Record<string, number | undefined>)[key];
  }
}

export function exportToCSV(plans: BatchPlan[], options: ExportOptions): string {
  const successfulPlans = plans.filter(p => p.status === 'success');
  
  if (successfulPlans.length === 0) return '';

  // Build header row with all metric categories
  const headers: string[] = ['File', 'Plan Label', 'Technique', 'Beams'];
  
  // Always include geometric metrics at the beginning
  const includeGeometric = options.includeGeometricMetrics !== false;
  const includeComplexity = options.includeComplexityMetrics !== false;
  
  if (includeGeometric) {
    GEOMETRIC_METRICS.forEach(({ key }) => {
      const def = METRIC_DEFINITIONS[key];
      headers.push(def?.unit ? `${key} (${def.unit})` : key);
    });
  }
  
  // Beam metrics
  if (options.includePlanMetrics) {
    BEAM_METRICS.forEach(({ key }) => {
      const def = METRIC_DEFINITIONS[key];
      headers.push(def?.unit ? `${key} (${def.unit})` : key);
    });
  }
  
  // Complexity metrics
  if (includeComplexity) {
    COMPLEXITY_METRICS.forEach(({ key }) => {
      const def = METRIC_DEFINITIONS[key];
      headers.push(def?.unit ? `${key} (${def.unit})` : key);
    });
  }

  if (options.includeBeamMetrics) {
    headers.push('Beam Details');
  }

  const rows = successfulPlans.map(p => {
    const plan = p.plan;
    const row: string[] = [
      escapeCSV(p.fileName),
      escapeCSV(plan.planLabel),
      escapeCSV(plan.technique),
      String(plan.beams?.length ?? 0),
    ];

    // Geometric metrics
    if (includeGeometric) {
      GEOMETRIC_METRICS.forEach(({ key, decimals }) => {
        row.push(formatMetricValue(getMetricValue(p, key), decimals));
      });
    }

    // Beam metrics
    if (options.includePlanMetrics) {
      BEAM_METRICS.forEach(({ key, decimals }) => {
        row.push(formatMetricValue(getMetricValue(p, key), decimals));
      });
    }

    // Complexity metrics
    if (includeComplexity) {
      COMPLEXITY_METRICS.forEach(({ key, decimals }) => {
        row.push(formatMetricValue(getMetricValue(p, key), decimals));
      });
    }

    if (options.includeBeamMetrics) {
      const beamSummary = p.metrics.beamMetrics
        .map(bm => `${bm.beamName}: ${bm.beamMU?.toFixed(1)} MU, MCS=${bm.MCS?.toFixed(3)}`)
        .join(' | ');
      row.push(escapeCSV(beamSummary));
    }

    return row.join(',');
  });

  // Add branded header comment
  return `# Tool: RTp-lens (https://rt-complexity-lens.lovable.app)\n# Export Date: ${new Date().toISOString()}\n# Plans: ${successfulPlans.length}\n${headers.join(',')}\n${rows.join('\n')}`;
}

export function exportToJSON(plans: BatchPlan[], options: ExportOptions): string {
  const successfulPlans = plans.filter(p => p.status === 'success');
  
  const stats = calculateBatchStatistics(successfulPlans.map(p => ({ metrics: p.metrics, plan: p.plan })));
  
  const includeGeometric = options.includeGeometricMetrics !== false;
  const includeComplexity = options.includeComplexityMetrics !== false;
  
  // Build summary with all available stats
  const summary: Record<string, { min: number; max: number; mean: number; std: number }> = {};
  
  // Helper to add stat if available
  const addStat = (key: string) => {
    const s = stats[key as keyof typeof stats];
    if (s && typeof s === 'object' && 'mean' in s) {
      summary[key] = { min: s.min, max: s.max, mean: s.mean, std: s.std };
    }
  };
  
  if (includeGeometric) {
    GEOMETRIC_METRICS.forEach(({ key }) => addStat(key));
  }
  
  if (options.includePlanMetrics) {
    BEAM_METRICS.forEach(({ key }) => addStat(key));
  }
  
  if (includeComplexity) {
    COMPLEXITY_METRICS.forEach(({ key }) => addStat(key));
  }
  
  const exportData = {
    tool: 'RTp-lens',
    toolUrl: 'https://rt-complexity-lens.lovable.app',
    pythonToolkit: 'https://github.com/matteomaspero/rt-complexity-lens/blob/main/python/README.md',
    exportDate: new Date().toISOString(),
    planCount: successfulPlans.length,
    summary,
    plans: successfulPlans.map(p => {
      const planData: Record<string, unknown> = {
        fileName: p.fileName,
        planLabel: p.plan.planLabel,
        technique: p.plan.technique,
        beamCount: p.plan.beams?.length ?? 0,
        uploadTime: p.uploadTime.toISOString(),
      };

      if (options.includePlanMetrics || includeGeometric || includeComplexity) {
        const metrics: Record<string, number | undefined> = {};
        
        if (includeGeometric) {
          GEOMETRIC_METRICS.forEach(({ key }) => {
            metrics[key] = getMetricValue(p, key);
          });
        }
        
        if (options.includePlanMetrics) {
          BEAM_METRICS.forEach(({ key }) => {
            metrics[key] = getMetricValue(p, key);
          });
        }
        
        if (includeComplexity) {
          COMPLEXITY_METRICS.forEach(({ key }) => {
            metrics[key] = getMetricValue(p, key);
          });
        }
        
        planData.metrics = metrics;
      }

      if (options.includeBeamMetrics) {
        planData.beamMetrics = p.metrics.beamMetrics.map(bm => ({
          beamNumber: bm.beamNumber,
          beamName: bm.beamName,
          radiationType: bm.radiationType,
          nominalBeamEnergy: bm.nominalBeamEnergy,
          energyLabel: bm.energyLabel,
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
  filenamePrefix = 'rtplens-batch'
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
