import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useBatch } from '@/contexts/BatchContext';
import { exportBatch, type ExportOptions } from '@/lib/batch/batch-export';

export function BatchExportPanel() {
  const { plans, selectedPlans } = useBatch();
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [includeGeometricMetrics, setIncludeGeometricMetrics] = useState(true);
  const [includePlanMetrics, setIncludePlanMetrics] = useState(true);
  const [includeComplexityMetrics, setIncludeComplexityMetrics] = useState(true);
  const [includeBeamMetrics, setIncludeBeamMetrics] = useState(false);
  const [includeControlPointData, setIncludeControlPointData] = useState(false);

  const successfulPlans = plans.filter(p => p.status === 'success');
  const plansToExport = selectedPlans.length > 0 ? selectedPlans : successfulPlans;

  const handleExport = () => {
    const options: ExportOptions = {
      format,
      includeGeometricMetrics,
      includePlanMetrics,
      includeComplexityMetrics,
      includeBeamMetrics,
      includeControlPointData,
    };
    
    exportBatch(plansToExport, options);
  };

  if (successfulPlans.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Export</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Format selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Format</Label>
          <RadioGroup 
            value={format} 
            onValueChange={(v) => setFormat(v as 'csv' | 'json')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="csv" id="csv" />
              <Label htmlFor="csv" className="flex items-center gap-1 text-sm font-normal cursor-pointer">
                <FileSpreadsheet className="h-4 w-4" />
                CSV
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="json" id="json" />
              <Label htmlFor="json" className="flex items-center gap-1 text-sm font-normal cursor-pointer">
                <FileJson className="h-4 w-4" />
                JSON
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Include options organized by category */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Include Metrics</Label>
          
          {/* Metric category checkboxes */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="geometricMetrics"
                checked={includeGeometricMetrics}
                onCheckedChange={(v) => setIncludeGeometricMetrics(v === true)}
              />
              <Label htmlFor="geometricMetrics" className="text-sm font-normal cursor-pointer">
                Geometric (MFA, EFS, PA, JA, psmall)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="planMetrics"
                checked={includePlanMetrics}
                onCheckedChange={(v) => setIncludePlanMetrics(v === true)}
              />
              <Label htmlFor="planMetrics" className="text-sm font-normal cursor-pointer">
                Beam (MU, Time, Arc, MUCA, Counts)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="complexityMetrics"
                checked={includeComplexityMetrics}
                onCheckedChange={(v) => setIncludeComplexityMetrics(v === true)}
              />
              <Label htmlFor="complexityMetrics" className="text-sm font-normal cursor-pointer">
                Complexity (MCS, LSV, AAV, LT, SAS, EM, PI...)
              </Label>
            </div>
          </div>
          
          {/* Additional data options */}
          <div className="pt-2 border-t space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="beamMetrics"
                checked={includeBeamMetrics}
                onCheckedChange={(v) => setIncludeBeamMetrics(v === true)}
              />
              <Label htmlFor="beamMetrics" className="text-sm font-normal cursor-pointer">
                Per-beam breakdown
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cpData"
                checked={includeControlPointData}
                onCheckedChange={(v) => setIncludeControlPointData(v === true)}
                disabled
              />
              <Label htmlFor="cpData" className="text-sm font-normal text-muted-foreground cursor-pointer">
                Control point data (coming soon)
              </Label>
            </div>
          </div>
        </div>

        {/* Export button */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            {selectedPlans.length > 0 
              ? `${selectedPlans.length} selected`
              : `${successfulPlans.length} plans`}
          </span>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            {selectedPlans.length > 0 ? 'Export Selected' : 'Export All'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
