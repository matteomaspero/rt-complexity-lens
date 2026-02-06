import type { PlanMetrics, BeamMetrics } from '@/lib/dicom/types';
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

// Format delivery time as mm:ss
function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Render beam-level metrics
function BeamMetricsSection({ beam, isMetricEnabled }: { beam: BeamMetrics; isMetricEnabled: (key: string) => boolean }) {
  return (
    <div className="grid gap-3">
      {/* Primary metrics */}
      {isMetricEnabled('MCS') && (
        <MetricItem metricKey="MCS" value={beam.MCS} />
      )}
      {isMetricEnabled('LSV') && (
        <MetricItem metricKey="LSV" value={beam.LSV} />
      )}
      {isMetricEnabled('AAV') && (
        <MetricItem metricKey="AAV" value={beam.AAV} />
      )}
      {isMetricEnabled('MFA') && (
        <MetricItem metricKey="MFA" value={beam.MFA} />
      )}
      
      {/* Secondary metrics */}
      {isMetricEnabled('LT') && beam.LT !== undefined && (
        <MetricItem metricKey="LT" value={beam.LT} />
      )}
      {isMetricEnabled('LTMCS') && beam.LTMCS !== undefined && (
        <MetricItem metricKey="LTMCS" value={beam.LTMCS} />
      )}
      {isMetricEnabled('SAS5') && beam.SAS5 !== undefined && (
        <MetricItem metricKey="SAS5" value={beam.SAS5} />
      )}
      {isMetricEnabled('SAS10') && beam.SAS10 !== undefined && (
        <MetricItem metricKey="SAS10" value={beam.SAS10} />
      )}
      
      {/* Accuracy metrics */}
      {isMetricEnabled('LG') && beam.LG !== undefined && (
        <MetricItem metricKey="LG" value={beam.LG} />
      )}
      {isMetricEnabled('MAD') && beam.MAD !== undefined && (
        <MetricItem metricKey="MAD" value={beam.MAD} />
      )}
      {isMetricEnabled('EFS') && beam.EFS !== undefined && (
        <MetricItem metricKey="EFS" value={beam.EFS} />
      )}
      {isMetricEnabled('psmall') && beam.psmall !== undefined && (
        <MetricItem metricKey="psmall" value={beam.psmall} />
      )}
      {isMetricEnabled('EM') && beam.EM !== undefined && (
        <MetricItem metricKey="EM" value={beam.EM} />
      )}
      {isMetricEnabled('PI') && beam.PI !== undefined && (
        <MetricItem metricKey="PI" value={beam.PI} />
      )}
      
      {/* Deliverability metrics */}
      {isMetricEnabled('MUCA') && beam.MUCA !== undefined && (
        <MetricItem metricKey="MUCA" value={beam.MUCA} />
      )}
      {isMetricEnabled('LTMU') && beam.LTMU !== undefined && (
        <MetricItem metricKey="LTMU" value={beam.LTMU} />
      )}
      {isMetricEnabled('LTNLMU') && beam.LTNLMU !== undefined && (
        <MetricItem metricKey="LTNLMU" value={beam.LTNLMU} />
      )}
      {isMetricEnabled('LNA') && beam.LNA !== undefined && (
        <MetricItem metricKey="LNA" value={beam.LNA} />
      )}
      {isMetricEnabled('LTAL') && beam.LTAL !== undefined && (
        <MetricItem metricKey="LTAL" value={beam.LTAL} />
      )}
      {isMetricEnabled('GT') && beam.GT !== undefined && (
        <MetricItem metricKey="GT" value={beam.GT} />
      )}
      {isMetricEnabled('GS') && beam.GS !== undefined && (
        <MetricItem metricKey="GS" value={beam.GS} />
      )}
      {isMetricEnabled('mDRV') && beam.mDRV !== undefined && (
        <MetricItem metricKey="mDRV" value={beam.mDRV} />
      )}
      {isMetricEnabled('mGSV') && beam.mGSV !== undefined && (
        <MetricItem metricKey="mGSV" value={beam.mGSV} />
      )}
      {isMetricEnabled('LS') && beam.LS !== undefined && (
        <MetricItem metricKey="LS" value={beam.LS} />
      )}
      {isMetricEnabled('PA') && beam.PA !== undefined && (
        <MetricItem metricKey="PA" value={beam.PA} />
      )}
      {isMetricEnabled('JA') && beam.JA !== undefined && (
        <MetricItem metricKey="JA" value={beam.JA} />
      )}
      {isMetricEnabled('PM') && beam.PM !== undefined && (
        <MetricItem metricKey="PM" value={beam.PM} />
      )}
      {isMetricEnabled('TG') && beam.TG !== undefined && (
        <MetricItem metricKey="TG" value={beam.TG} />
      )}
      {isMetricEnabled('MD') && beam.MD !== undefined && (
        <MetricItem metricKey="MD" value={beam.MD} />
      )}
      {isMetricEnabled('MI') && beam.MI !== undefined && (
        <MetricItem metricKey="MI" value={beam.MI} />
      )}
      
      {/* Delivery metrics */}
      {isMetricEnabled('beamMU') && (
        <MetricItem metricKey="beamMU" value={beam.beamMU} />
      )}
      {beam.arcLength && isMetricEnabled('arcLength') && (
        <MetricItem metricKey="arcLength" value={beam.arcLength} />
      )}
      {isMetricEnabled('numberOfControlPoints') && (
        <MetricItem 
          metricKey="numberOfControlPoints" 
          value={beam.numberOfControlPoints} 
        />
      )}
      {isMetricEnabled('estimatedDeliveryTime') && beam.estimatedDeliveryTime !== undefined && (
        <div className="metric-card">
          <div className="flex items-baseline justify-between gap-2">
            <span className="metric-label">Est. Time</span>
            <span className="text-xs text-muted-foreground">mm:ss</span>
          </div>
          <div className="metric-value">{formatTime(beam.estimatedDeliveryTime)}</div>
        </div>
      )}
      {isMetricEnabled('MUperDegree') && beam.MUperDegree !== undefined && (
        <MetricItem metricKey="MUperDegree" value={beam.MUperDegree} />
      )}
      {isMetricEnabled('avgDoseRate') && beam.avgDoseRate !== undefined && (
        <MetricItem metricKey="avgDoseRate" value={beam.avgDoseRate} />
      )}
      {isMetricEnabled('avgMLCSpeed') && beam.avgMLCSpeed !== undefined && (
        <MetricItem metricKey="avgMLCSpeed" value={beam.avgMLCSpeed} />
      )}
      {isMetricEnabled('collimatorAngle') && beam.collimatorAngleStart !== undefined && (
        <MetricItem metricKey="collimatorAngle" value={beam.collimatorAngleStart} />
      )}
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
  const hasSecondaryMetrics = ['LT', 'LTMCS', 'SAS5', 'SAS10'].some(isMetricEnabled);
  const hasAccuracyMetrics = ['LG', 'MAD', 'EFS', 'psmall', 'EM', 'PI'].some(isMetricEnabled);
  const hasDeliverabilityMetrics = ['MUCA', 'LTMU', 'LTNLMU', 'LNA', 'LTAL', 'GT', 'GS', 'mDRV', 'mGSV', 'LS', 'PA', 'JA', 'PM', 'TG', 'MD', 'MI'].some(isMetricEnabled);
  const hasDeliveryMetrics = ['totalMU', 'totalDeliveryTime'].some(isMetricEnabled);

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
              </>
            )}
            {hasAccuracyMetrics && (
              <>
                {isMetricEnabled('LG') && metrics.LG !== undefined && (
                  <MetricItem metricKey="LG" value={metrics.LG} />
                )}
                {isMetricEnabled('MAD') && metrics.MAD !== undefined && (
                  <MetricItem metricKey="MAD" value={metrics.MAD} />
                )}
                {isMetricEnabled('EFS') && metrics.EFS !== undefined && (
                  <MetricItem metricKey="EFS" value={metrics.EFS} />
                )}
                {isMetricEnabled('psmall') && metrics.psmall !== undefined && (
                  <MetricItem metricKey="psmall" value={metrics.psmall} />
                )}
                {isMetricEnabled('EM') && metrics.EM !== undefined && (
                  <MetricItem metricKey="EM" value={metrics.EM} />
                )}
                {isMetricEnabled('PI') && metrics.PI !== undefined && (
                  <MetricItem metricKey="PI" value={metrics.PI} />
                )}
              </>
            )}
            {hasDeliverabilityMetrics && (
              <>
                {isMetricEnabled('MUCA') && metrics.MUCA !== undefined && (
                  <MetricItem metricKey="MUCA" value={metrics.MUCA} />
                )}
                {isMetricEnabled('LTMU') && metrics.LTMU !== undefined && (
                  <MetricItem metricKey="LTMU" value={metrics.LTMU} />
                )}
                {isMetricEnabled('LTNLMU') && metrics.LTNLMU !== undefined && (
                  <MetricItem metricKey="LTNLMU" value={metrics.LTNLMU} />
                )}
                {isMetricEnabled('LNA') && metrics.LNA !== undefined && (
                  <MetricItem metricKey="LNA" value={metrics.LNA} />
                )}
                {isMetricEnabled('LTAL') && metrics.LTAL !== undefined && (
                  <MetricItem metricKey="LTAL" value={metrics.LTAL} />
                )}
                {isMetricEnabled('GT') && metrics.GT !== undefined && (
                  <MetricItem metricKey="GT" value={metrics.GT} />
                )}
                {isMetricEnabled('GS') && metrics.GS !== undefined && (
                  <MetricItem metricKey="GS" value={metrics.GS} />
                )}
                {isMetricEnabled('mDRV') && metrics.mDRV !== undefined && (
                  <MetricItem metricKey="mDRV" value={metrics.mDRV} />
                )}
                {isMetricEnabled('mGSV') && metrics.mGSV !== undefined && (
                  <MetricItem metricKey="mGSV" value={metrics.mGSV} />
                )}
                {isMetricEnabled('LS') && metrics.LS !== undefined && (
                  <MetricItem metricKey="LS" value={metrics.LS} />
                )}
                {isMetricEnabled('PA') && metrics.PA !== undefined && (
                  <MetricItem metricKey="PA" value={metrics.PA} />
                )}
                {isMetricEnabled('JA') && metrics.JA !== undefined && (
                  <MetricItem metricKey="JA" value={metrics.JA} />
                )}
                {isMetricEnabled('PM') && metrics.PM !== undefined && (
                  <MetricItem metricKey="PM" value={metrics.PM} />
                )}
                {isMetricEnabled('TG') && metrics.TG !== undefined && (
                  <MetricItem metricKey="TG" value={metrics.TG} />
                )}
                {isMetricEnabled('MD') && metrics.MD !== undefined && (
                  <MetricItem metricKey="MD" value={metrics.MD} />
                )}
                {isMetricEnabled('MI') && metrics.MI !== undefined && (
                  <MetricItem metricKey="MI" value={metrics.MI} />
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
            <BeamMetricsSection beam={currentBeam} isMetricEnabled={isMetricEnabled} />
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
