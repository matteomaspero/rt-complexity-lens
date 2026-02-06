import type { PlanMetrics } from '@/lib/dicom/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { metricsToCSV } from '@/lib/dicom';

interface MetricsPanelProps {
  metrics: PlanMetrics;
  currentBeamIndex?: number;
}

interface MetricItemProps {
  label: string;
  value: string | number;
  unit?: string;
  description?: string;
}

function MetricItem({ label, value, unit, description }: MetricItemProps) {
  const displayValue = typeof value === 'number' 
    ? value.toFixed(value < 1 ? 4 : 2) 
    : value;

  return (
    <div className="metric-card">
      <div className="flex items-baseline justify-between gap-2">
        <span className="metric-label">{label}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      <div className="metric-value">{displayValue}</div>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function MetricsPanel({ metrics, currentBeamIndex }: MetricsPanelProps) {
  const currentBeam = currentBeamIndex !== undefined 
    ? metrics.beamMetrics[currentBeamIndex] 
    : null;

  const handleExportCSV = () => {
    const csv = metricsToCSV(metrics);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${metrics.planLabel.replace(/[^a-zA-Z0-9]/g, '_')}_metrics.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
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
            <MetricItem
              label="MCS"
              value={metrics.MCS}
              description="Modulation Complexity Score"
            />
            <MetricItem
              label="LSV"
              value={metrics.LSV}
              description="Leaf Sequence Variability"
            />
            <MetricItem
              label="AAV"
              value={metrics.AAV}
              description="Aperture Area Variability"
            />
            <MetricItem
              label="MFA"
              value={metrics.MFA}
              unit="cm²"
              description="Mean Field Area"
            />
            <MetricItem
              label="LT"
              value={metrics.LT}
              unit="mm"
              description="Total Leaf Travel"
            />
            <MetricItem
              label="LTMCS"
              value={metrics.LTMCS}
              description="Leaf Travel-weighted MCS"
            />
            <MetricItem
              label="Total MU"
              value={metrics.totalMU}
              unit="MU"
            />
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
              <MetricItem label="MCS" value={currentBeam.MCS} />
              <MetricItem label="LSV" value={currentBeam.LSV} />
              <MetricItem label="AAV" value={currentBeam.AAV} />
              <MetricItem 
                label="MFA" 
                value={currentBeam.MFA} 
                unit="cm²" 
              />
              <MetricItem 
                label="Beam MU" 
                value={currentBeam.beamMU} 
                unit="MU" 
              />
              {currentBeam.arcLength && (
                <MetricItem 
                  label="Arc Length" 
                  value={currentBeam.arcLength} 
                  unit="°" 
                />
              )}
              <MetricItem 
                label="Control Points" 
                value={currentBeam.numberOfControlPoints} 
              />
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
                    <span>{beam.beamMU.toFixed(0)} MU</span>
                    <span>MCS: {beam.MCS.toFixed(3)}</span>
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
