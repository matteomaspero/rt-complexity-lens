import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useBatch } from '@/contexts/BatchContext';
import { exportBatch, type ExportOptions } from '@/lib/batch/batch-export';
import { generateBatchPDF, type PDFChartRef } from '@/lib/pdf-report';
import type { ExportablePlan } from '@/lib/export-utils';

export function BatchExportPanel({ chartContainerRef }: { chartContainerRef?: React.RefObject<HTMLDivElement> }) {
  const { plans, selectedPlans } = useBatch();
  const [format, setFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [pdfLoading, setPdfLoading] = useState(false);

  const successfulPlans = plans.filter(p => p.status === 'success');
  const plansToExport = selectedPlans.length > 0 ? selectedPlans : successfulPlans;

  const handleExport = async () => {
    if (format === 'pdf') {
      setPdfLoading(true);
      try {
        const exportable: ExportablePlan[] = plansToExport.map(p => ({
          fileName: p.fileName,
          plan: p.plan,
          metrics: p.metrics,
        }));
        const chartRefs: PDFChartRef[] = [];
        if (chartContainerRef?.current) {
          const sections = chartContainerRef.current.querySelectorAll<HTMLElement>('[data-chart-section]');
          sections.forEach(el => {
            const label = el.getAttribute('data-chart-section') || 'Chart';
            chartRefs.push({ label, element: el });
          });
        }
        await generateBatchPDF(exportable, chartRefs);
      } finally {
        setPdfLoading(false);
      }
      return;
    }
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
            onValueChange={(v) => setFormat(v as 'csv' | 'json' | 'pdf')}
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
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pdf" id="pdf" />
              <Label htmlFor="pdf" className="flex items-center gap-1 text-sm font-normal cursor-pointer">
                <FileText className="h-4 w-4" />
                PDF
              </Label>
            </div>
          </RadioGroup>
        </div>

        <p className="text-xs text-muted-foreground">
          {format === 'csv'
            ? 'Plan-total and per-beam rows in a single CSV file.'
            : format === 'json'
            ? 'JSON includes full metrics with beam breakdown.'
            : 'Structured PDF report with statistics, metrics tables, and charts.'}
        </p>

        {/* Export button */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            {selectedPlans.length > 0
              ? `${selectedPlans.length} selected`
              : `${successfulPlans.length} plans`}
          </span>
          <Button onClick={handleExport} className="gap-2" disabled={pdfLoading}>
            <Download className="h-4 w-4" />
            {pdfLoading ? 'Generating...' : selectedPlans.length > 0 ? 'Export Selected' : 'Export All'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
