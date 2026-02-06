import type { PlanMetrics } from '@/lib/dicom/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { metricsToCSV } from '@/lib/dicom';
import { useMetricsConfig } from '@/contexts/MetricsConfigContext';
import { useThresholdConfig } from '@/contexts/ThresholdConfigContext';
import { METRIC_DEFINITIONS } from '@/lib/metrics-definitions';
import { formatThresholdInfo } from '@/lib/threshold-definitions';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface MetricsPanelProps {
  metrics: PlanMetrics;
  currentBeamIndex?: number;
}

interface MetricItemProps {
  metricKey: string;
  value: string | number;
  unitOverride?: string;
}

function MetricItem({ metricKey, value, unitOverride }: MetricItemProps) {
  const { getThresholdStatus, enabled: thresholdsEnabled, getCurrentThresholds, getPresetName } = useThresholdConfig();
  
  const definition = METRIC_DEFINITIONS[metricKey];
  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  const displayValue = typeof value === 'number' 
    ? value.toFixed(value < 1 ? 4 : 2) 
    : value;

  const label = definition?.key || metricKey;
  const unit = unitOverride ?? definition?.unit;
  
  // Get threshold status for numeric values
  const status = !isNaN(numericValue) ? getThresholdStatus(metricKey, numericValue) : 'normal';
  const thresholds = getCurrentThresholds();
  const threshold = thresholds[metricKey];

  const valueClassName = cn(
    'metric-value',
    status === 'warning' && 'metric-value-warning',
    status === 'critical' && 'metric-value-critical'
  );

  // Build tooltip content
  const thresholdInfo = thresholdsEnabled && threshold && status !== 'normal'
    ? formatThresholdInfo(threshold, getPresetName())
    : null;

  return (
    <div className="metric-card">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-1">
          <span className="metric-label">{label}</span>
          {definition && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 cursor-help text-muted-foreground" />
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
            <AlertTriangle className={cn(
              'h-3 w-3',
              status === 'warning' && 'text-[hsl(var(--status-warning))]',
              status === 'critical' && 'text-[hsl(var(--status-error))]'
            )} />
          )}
        </div>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      <div className={valueClassName}>{displayValue}</div>
    </div>
  );
}

interface BeamsSummaryProps {
  beamMetrics: PlanMetrics['beamMetrics'];
  isMetricEnabled: (key: string) => boolean;
}

function BeamsSummary({ beamMetrics, isMetricEnabled }: BeamsSummaryProps) {
  const { getThresholdStatus, enabled: thresholdsEnabled } = useThresholdConfig();

  return (
    <div>
      <h4 className="mb-3 text-sm font-medium">Beams ({beamMetrics.length})</h4>
      <div className="space-y-2">
        {beamMetrics.map((beam) => {
          const mcsStatus = getThresholdStatus('MCS', beam.MCS);
          
          return (
            <div
              key={beam.beamNumber}
              className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
            >
              <span className="font-medium">{beam.beamName}</span>
              <div className="flex items-center gap-4 text-muted-foreground">
                {isMetricEnabled('beamMU') && (
                  <span>{beam.beamMU.toFixed(0)} MU</span>
                )}
                {isMetricEnabled('MCS') && (
                  <span className={cn(
                    mcsStatus === 'warning' && 'rounded px-1 text-[hsl(var(--status-warning))] bg-[hsl(var(--status-warning)/0.15)]',
                    mcsStatus === 'critical' && 'rounded px-1 text-[hsl(var(--status-error))] bg-[hsl(var(--status-error)/0.15)]'
                  )}>
                    MCS: {beam.MCS.toFixed(3)}
                    {thresholdsEnabled && mcsStatus !== 'normal' && (
                      <AlertTriangle className={cn(
                        'ml-1 inline h-3 w-3',
                        mcsStatus === 'warning' && 'text-[hsl(var(--status-warning))]',
                        mcsStatus === 'critical' && 'text-[hsl(var(--status-error))]'
                      )} />
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

export function MetricsPanel({ metrics, currentBeamIndex }: MetricsPanelProps) {
  const { isMetricEnabled, getEnabledMetricKeys } = useMetricsConfig();
  
  const currentBeam = currentBeamIndex !== undefined 
    ? metrics.beamMetrics[currentBeamIndex] 
    : null;

  const handleExportCSV = () => {
    const enabledKeys = getEnabledMetricKeys();
    const csv = metricsToCSV(metrics, enabledKeys);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `${metrics.planLabel.replace(/[^a-zA-Z0-9]/g, '_')}_metrics_${dateStr}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  // Check if any metrics in a category are enabled
  const hasPrimaryMetrics = ['MCS', 'LSV', 'AAV', 'MFA'].some(isMetricEnabled);
  const hasSecondaryMetrics = ['LT', 'LTMCS', 'SAS5', 'SAS10', 'EM', 'PI'].some(isMetricEnabled);
  const hasDeliveryMetrics = ['totalMU', 'totalDeliveryTime'].some(isMetricEnabled);

  // Format delivery time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="h-full overflow-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Complexity Metrics</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleExportCSV}>
            <Download className="mr-1 h-4 w-4" />
            CSV
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          UCoMX v1.1 Nomenclature
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Plan-Level Metrics */}
        <div>
          <h4 className="mb-3 text-sm font-medium">Plan Metrics</h4>
          <div className="grid gap-3">
            {hasPrimaryMetrics && (
              <>
                {isMetricEnabled('MCS') && (
                  <MetricItem metricKey="MCS" value={metrics.MCS} />
                )}
                {isMetricEnabled('LSV') && (
                  <MetricItem metricKey="LSV" value={metrics.LSV} />
                )}
                {isMetricEnabled('AAV') && (
                  <MetricItem metricKey="AAV" value={metrics.AAV} />
                )}
                {isMetricEnabled('MFA') && (
                  <MetricItem metricKey="MFA" value={metrics.MFA} />
                )}
              </>
            )}
            {hasSecondaryMetrics && (
              <>
                {isMetricEnabled('LT') && (
                  <MetricItem metricKey="LT" value={metrics.LT} />
                )}
                {isMetricEnabled('LTMCS') && (
                  <MetricItem metricKey="LTMCS" value={metrics.LTMCS} />
                )}
                {isMetricEnabled('SAS5') && metrics.SAS5 !== undefined && (
                  <MetricItem metricKey="SAS5" value={metrics.SAS5} />
                )}
                {isMetricEnabled('SAS10') && metrics.SAS10 !== undefined && (
                  <MetricItem metricKey="SAS10" value={metrics.SAS10} />
                )}
                {isMetricEnabled('EM') && metrics.EM !== undefined && (
                  <MetricItem metricKey="EM" value={metrics.EM} />
                )}
                {isMetricEnabled('PI') && metrics.PI !== undefined && (
                  <MetricItem metricKey="PI" value={metrics.PI} />
                )}
              </>
            )}
            {hasDeliveryMetrics && (
              <>
                {isMetricEnabled('totalMU') && (
                  <MetricItem metricKey="totalMU" value={metrics.totalMU} />
                )}
                {isMetricEnabled('totalDeliveryTime') && metrics.totalDeliveryTime && (
                  <div className="metric-card">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="metric-label">Est. Time</span>
                      <span className="text-xs text-muted-foreground">mm:ss</span>
                    </div>
                    <div className="metric-value">{formatTime(metrics.totalDeliveryTime)}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <Separator />

        {/* Current Beam Metrics */}
        {currentBeam && (
          <div>
            <h4 className="mb-3 text-sm font-medium">
              Beam: {currentBeam.beamName}
            </h4>
            <div className="grid gap-3">
              {isMetricEnabled('MCS') && (
                <MetricItem metricKey="MCS" value={currentBeam.MCS} />
              )}
              {isMetricEnabled('LSV') && (
                <MetricItem metricKey="LSV" value={currentBeam.LSV} />
              )}
              {isMetricEnabled('AAV') && (
                <MetricItem metricKey="AAV" value={currentBeam.AAV} />
              )}
              {isMetricEnabled('MFA') && (
                <MetricItem metricKey="MFA" value={currentBeam.MFA} />
              )}
              {isMetricEnabled('beamMU') && (
                <MetricItem metricKey="beamMU" value={currentBeam.beamMU} />
              )}
              {currentBeam.arcLength && isMetricEnabled('arcLength') && (
                <MetricItem metricKey="arcLength" value={currentBeam.arcLength} />
              )}
              {isMetricEnabled('numberOfControlPoints') && (
                <MetricItem 
                  metricKey="numberOfControlPoints" 
                  value={currentBeam.numberOfControlPoints} 
                />
              )}
            </div>
          </div>
        )}

        {/* All Beams Summary */}
        {!currentBeam && metrics.beamMetrics.length > 0 && (
          <BeamsSummary beamMetrics={metrics.beamMetrics} isMetricEnabled={isMetricEnabled} />
        )}
      </CardContent>
    </Card>
  );
}
