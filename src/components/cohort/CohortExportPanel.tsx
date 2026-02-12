import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { useCohort } from '@/contexts/CohortContext';
import { exportPlans, type ExportablePlan } from '@/lib/export-utils';

export function CohortExportPanel() {
  const { successfulPlans, extendedStats, clusters, clusterStats, correlationMatrix } = useCohort();

  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [includeBeamBreakdown, setIncludeBeamBreakdown] = useState(false);

  const handleExport = () => {
    if (successfulPlans.length === 0) return;

    const exportable: ExportablePlan[] = successfulPlans.map(p => ({
      fileName: p.fileName,
      plan: p.plan,
      metrics: p.metrics,
    }));

    // Build cohort-specific data for JSON
    const cohortData = format === 'json'
      ? {
          extendedStats: extendedStats ?? undefined,
          clusters: clusters.map(cluster => ({
            ...cluster,
            statistics: Object.fromEntries(
              Array.from(clusterStats.entries())
                .filter(([id]) => id === cluster.id)
                .map(([id, stats]) => [id, stats])
            )?.[cluster.id] ?? {},
          })),
          correlation: correlationMatrix ?? undefined,
        }
      : undefined;

    exportPlans(exportable, {
      format,
      includeBeamCSV: includeBeamBreakdown,
      includeBeamMetrics: includeBeamBreakdown,
      exportType: 'cohort',
      filenamePrefix: 'rtplens-cohort',
      cohortData,
    });
  };

  const hasData = successfulPlans.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Results
        </CardTitle>
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
              <RadioGroupItem value="csv" id="cohort-csv" />
              <Label htmlFor="cohort-csv" className="flex items-center gap-1 text-sm font-normal cursor-pointer">
                <FileSpreadsheet className="h-4 w-4" />
                CSV
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="json" id="cohort-json" />
              <Label htmlFor="cohort-json" className="flex items-center gap-1 text-sm font-normal cursor-pointer">
                <FileJson className="h-4 w-4" />
                JSON
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Options */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Options</Label>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cohort-beamBreakdown"
              checked={includeBeamBreakdown}
              onCheckedChange={(v) => setIncludeBeamBreakdown(v === true)}
            />
            <Label htmlFor="cohort-beamBreakdown" className="text-sm font-normal cursor-pointer">
              {format === 'csv' ? 'Include per-beam CSV (separate file)' : 'Include per-beam metrics'}
            </Label>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {format === 'csv'
            ? 'Clean tabular CSV — one row per plan, all metrics as columns.'
            : 'JSON includes summary statistics, clusters, and correlation data.'}
        </p>

        {/* Export button */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            {hasData ? `${successfulPlans.length} plans` : 'No plans'}
          </span>
          <Button onClick={handleExport} disabled={!hasData} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {!hasData && (
          <p className="text-xs text-muted-foreground">
            Upload plans to enable export
          </p>
        )}
      </CardContent>
    </Card>
  );
}
