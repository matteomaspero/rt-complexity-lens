import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useBatch } from '@/contexts/BatchContext';
import { exportBatch, type ExportOptions } from '@/lib/batch/batch-export';

export function BatchExportPanel() {
  const { plans, selectedPlans } = useBatch();
  const [format, setFormat] = useState<'csv' | 'json'>('csv');

  const successfulPlans = plans.filter(p => p.status === 'success');
  const plansToExport = selectedPlans.length > 0 ? selectedPlans : successfulPlans;

  const handleExport = () => {
    const options: ExportOptions = { format };
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

        <p className="text-xs text-muted-foreground">
          CSV includes plan-total and per-beam rows. JSON includes full metrics with beam breakdown.
        </p>

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
