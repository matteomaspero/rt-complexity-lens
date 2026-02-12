/**
 * Batch export — thin wrapper around the shared export utility.
 */

import type { BatchPlan } from '@/contexts/BatchContext';
import { exportPlans, type ExportablePlan } from '@/lib/export-utils';

export interface ExportOptions {
  format: 'csv' | 'json';
  includeBeamBreakdown: boolean;
}

function toExportable(plans: BatchPlan[]): ExportablePlan[] {
  return plans
    .filter(p => p.status === 'success')
    .map(p => ({ fileName: p.fileName, plan: p.plan, metrics: p.metrics }));
}

export function exportBatch(plans: BatchPlan[], options: ExportOptions) {
  const exportable = toExportable(plans);
  if (exportable.length === 0) return;

  exportPlans(exportable, {
    format: options.format,
    includeBeamCSV: options.includeBeamBreakdown,
    includeBeamMetrics: options.includeBeamBreakdown,
    exportType: 'batch',
    filenamePrefix: 'rtplens-batch',
  });
}
