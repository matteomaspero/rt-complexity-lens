import type { PlanMetrics } from '@/lib/dicom/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { metricsToCSV } from '@/lib/dicom';
import { useMetricsConfig } from '@/contexts/MetricsConfigContext';
import { METRIC_DEFINITIONS } from '@/lib/metrics-definitions';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const definition = METRIC_DEFINITIONS[metricKey];
  const displayValue = typeof value === 'number' 
    ? value.toFixed(value < 1 ? 4 : 2) 
    : value;

  const label = definition?.key || metricKey;
  const unit = unitOverride ?? definition?.unit;

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
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      <div className="metric-value">{displayValue}</div>
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
  const hasSecondaryMetrics = ['LT', 'LTMCS'].some(isMetricEnabled);
  const hasDeliveryMetrics = isMetricEnabled('totalMU');

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
              </>
            )}
            {hasDeliveryMetrics && isMetricEnabled('totalMU') && (
              <MetricItem metricKey="totalMU" value={metrics.totalMU} />
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
          <div>
            <h4 className="mb-3 text-sm font-medium">Beams ({metrics.beamMetrics.length})</h4>
            <div className="space-y-2">
              {metrics.beamMetrics.map((beam) => (
                <div
                  key={beam.beamNumber}
                  className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{beam.beamName}</span>
                  <div className="flex gap-4 text-muted-foreground">
                    {isMetricEnabled('beamMU') && (
                      <span>{beam.beamMU.toFixed(0)} MU</span>
                    )}
                    {isMetricEnabled('MCS') && (
                      <span>MCS: {beam.MCS.toFixed(3)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
