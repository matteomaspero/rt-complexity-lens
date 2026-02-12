import type { PlanMetrics } from '@/lib/dicom/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { plansToCSV, downloadFile, type ExportablePlan } from '@/lib/export-utils';
import { useMetricsConfig } from '@/contexts/MetricsConfigContext';
import { useThresholdConfig } from '@/contexts/ThresholdConfigContext';
import {
  METRIC_DEFINITIONS,
  METRIC_CATEGORIES,
  getMetricsByCategory,
  type MetricCategory,
} from '@/lib/metrics-definitions';
import { formatThresholdInfo } from '@/lib/threshold-definitions';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format delivery time as mm:ss */
function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Display-format a metric value */
function formatValue(metricKey: string, value: number | string): string {
  if (metricKey === 'estimatedDeliveryTime' || metricKey === 'totalDeliveryTime') {
    return formatTime(typeof value === 'number' ? value : parseFloat(String(value)));
  }
  if (typeof value === 'number') {
    return value.toFixed(value < 1 ? 4 : 2);
  }
  return String(value);
}

/** Resolve the raw value for a metric key from a source object.
 *  Handles special mapping: collimatorAngle → collimatorAngleStart */
function resolveValue(
  metricKey: string,
  source: Record<string, unknown>,
): unknown {
  if (metricKey === 'collimatorAngle') return source['collimatorAngleStart'];
  return source[metricKey];
}

// ---------------------------------------------------------------------------
// Category order
// ---------------------------------------------------------------------------

const CATEGORY_ORDER: MetricCategory[] = [
  'primary',
  'secondary',
  'accuracy',
  'deliverability',
  'delivery',
];

// ---------------------------------------------------------------------------
// MetricRow — one compact table row
// ---------------------------------------------------------------------------

function MetricRow({ metricKey, value }: { metricKey: string; value: number | string }) {
  const {
    getThresholdStatus,
    enabled: thresholdsEnabled,
    getCurrentThresholds,
    getPresetName,
  } = useThresholdConfig();

  const definition = METRIC_DEFINITIONS[metricKey];
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
  const displayValue = formatValue(metricKey, value);
  const label = definition?.key || metricKey;
  const unit =
    metricKey === 'estimatedDeliveryTime' || metricKey === 'totalDeliveryTime'
      ? 'mm:ss'
      : (definition?.unit ?? '');

  const status = !isNaN(numericValue) ? getThresholdStatus(metricKey, numericValue) : 'normal';
  const thresholds = getCurrentThresholds();
  const threshold = thresholds[metricKey];
  const thresholdInfo =
    thresholdsEnabled && threshold && status !== 'normal'
      ? formatThresholdInfo(threshold, getPresetName())
      : null;

  return (
    <tr className="border-b border-border/30 last:border-0">
      {/* Metric key + info tooltip + warning icon */}
      <td className="py-1 pr-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground whitespace-nowrap">{label}</span>
          {definition && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 shrink-0 cursor-help text-muted-foreground/60" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium">{definition.name}</p>
                  <p className="text-xs">{definition.fullDescription}</p>
                  {definition.reference && (
                    <p className="text-xs text-muted-foreground">
                      Ref: {definition.reference}
                    </p>
                  )}
                  {thresholdInfo && (
                    <p className="text-xs font-medium text-destructive">
                      ⚠ {thresholdInfo}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
          {status !== 'normal' && (
            <AlertTriangle
              className={cn(
                'h-3 w-3 shrink-0',
                status === 'warning' && 'text-[hsl(var(--status-warning))]',
                status === 'critical' && 'text-[hsl(var(--status-error))]',
              )}
            />
          )}
        </div>
      </td>

      {/* Value */}
      <td
        className={cn(
          'py-1 pr-1 text-right font-mono text-sm tabular-nums',
          status === 'warning' &&
            'rounded text-[hsl(var(--status-warning))] bg-[hsl(var(--status-warning)/0.15)]',
          status === 'critical' &&
            'rounded text-[hsl(var(--status-error))] bg-[hsl(var(--status-error)/0.15)]',
        )}
      >
        {displayValue}
      </td>

      {/* Unit */}
      <td className="py-1 pl-1 text-right text-[11px] text-muted-foreground/70 w-16 whitespace-nowrap">
        {unit}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// CategoryTable — one subtable per metric category
// ---------------------------------------------------------------------------

function CategoryTable({
  category,
  source,
  isMetricEnabled,
}: {
  category: MetricCategory;
  source: Record<string, unknown>;
  isMetricEnabled: (key: string) => boolean;
}) {
  const defs = getMetricsByCategory(category);
  const rows = defs.filter((m) => {
    if (!isMetricEnabled(m.key)) return false;
    const v = resolveValue(m.key, source);
    return v !== undefined && v !== null;
  });

  if (rows.length === 0) return null;

  const cat = METRIC_CATEGORIES[category];

  return (
    <div>
      <h5 className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
        {cat.label}
      </h5>
      <table className="w-full">
        <tbody>
          {rows.map((m) => (
            <MetricRow
              key={m.key}
              metricKey={m.key}
              value={resolveValue(m.key, source) as number | string}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BeamsSummary — compact beam list (no beam selected)
// ---------------------------------------------------------------------------

interface BeamsSummaryProps {
  beamMetrics: PlanMetrics['beamMetrics'];
  isMetricEnabled: (key: string) => boolean;
}

function BeamsSummary({ beamMetrics, isMetricEnabled }: BeamsSummaryProps) {
  const { getThresholdStatus, enabled: thresholdsEnabled } = useThresholdConfig();

  return (
    <div>
      <h4 className="mb-2 text-sm font-medium">Beams ({beamMetrics.length})</h4>
      <div className="space-y-1.5">
        {beamMetrics.map((beam) => {
          const mcsStatus = getThresholdStatus('MCS', beam.MCS);

          return (
            <div
              key={beam.beamNumber}
              className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-sm"
            >
              <span className="font-medium">{beam.beamName}</span>
              <div className="flex items-center gap-4 text-muted-foreground">
                {isMetricEnabled('beamMU') && (
                  <span>{beam.beamMU.toFixed(0)} MU</span>
                )}
                {isMetricEnabled('MCS') && (
                  <span
                    className={cn(
                      mcsStatus === 'warning' &&
                        'rounded px-1 text-[hsl(var(--status-warning))] bg-[hsl(var(--status-warning)/0.15)]',
                      mcsStatus === 'critical' &&
                        'rounded px-1 text-[hsl(var(--status-error))] bg-[hsl(var(--status-error)/0.15)]',
                    )}
                  >
                    MCS: {beam.MCS.toFixed(3)}
                    {thresholdsEnabled && mcsStatus !== 'normal' && (
                      <AlertTriangle
                        className={cn(
                          'ml-1 inline h-3 w-3',
                          mcsStatus === 'warning' && 'text-[hsl(var(--status-warning))]',
                          mcsStatus === 'critical' && 'text-[hsl(var(--status-error))]',
                        )}
                      />
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricsPanel — main export
// ---------------------------------------------------------------------------

interface MetricsPanelProps {
  metrics: PlanMetrics;
  plan?: import('@/lib/dicom/types').RTPlan;
  currentBeamIndex?: number;
}

export function MetricsPanel({ metrics, plan, currentBeamIndex }: MetricsPanelProps) {
  const { isMetricEnabled, getEnabledMetricKeys } = useMetricsConfig();

  const currentBeam =
    currentBeamIndex !== undefined ? metrics.beamMetrics[currentBeamIndex] : null;

  const handleExportCSV = () => {
    // Use the unified export format: one row per plan, all metrics as columns
    const exportable: ExportablePlan = {
      fileName: plan?.planLabel ?? metrics.planLabel ?? 'plan',
      plan: plan ?? { beams: [], planLabel: metrics.planLabel, technique: 'UNKNOWN' } as any,
      metrics,
    };
    const csv = plansToCSV([exportable]);
    const dateStr = new Date().toISOString().split('T')[0];
    const safeName = metrics.planLabel.replace(/[^a-zA-Z0-9]/g, '_');
    downloadFile(csv, `${safeName}_metrics_${dateStr}.csv`, 'text/csv');
  };

  return (
    <Card className="h-full overflow-auto">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Complexity Metrics</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleExportCSV}>
            <Download className="mr-1 h-4 w-4" />
            CSV
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">UCoMX v1.1</p>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Plan-Level Metrics */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Plan Metrics</h4>
          {CATEGORY_ORDER.map((cat) => (
            <CategoryTable
              key={cat}
              category={cat}
              source={metrics as unknown as Record<string, unknown>}
              isMetricEnabled={isMetricEnabled}
            />
          ))}
        </div>

        <Separator />

        {/* Current Beam Metrics */}
        {currentBeam && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              Beam: {currentBeam.beamName}
            </h4>
            {CATEGORY_ORDER.map((cat) => (
              <CategoryTable
                key={cat}
                category={cat}
                source={currentBeam as unknown as Record<string, unknown>}
                isMetricEnabled={isMetricEnabled}
              />
            ))}
          </div>
        )}

        {/* All Beams Summary */}
        {!currentBeam && metrics.beamMetrics.length > 0 && (
          <BeamsSummary
            beamMetrics={metrics.beamMetrics}
            isMetricEnabled={isMetricEnabled}
          />
        )}
      </CardContent>
    </Card>
  );
}
