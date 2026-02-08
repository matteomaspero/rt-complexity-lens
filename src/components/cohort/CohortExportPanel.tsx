import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { useCohort } from '@/contexts/CohortContext';
import { 
  METRIC_GROUPS, 
  METRIC_DEFINITIONS, 
  extractMetricValue,
  formatMetricValue,
  type MetricGroup 
} from '@/lib/cohort';

interface ExportOptions {
  includeGeometric: boolean;
  includeBeam: boolean;
  includeComplexity: boolean;
}

export function CohortExportPanel() {
  const { successfulPlans, extendedStats, clusters, clusterStats, correlationMatrix } = useCohort();
  
  const [options, setOptions] = useState<ExportOptions>({
    includeGeometric: true,
    includeBeam: true,
    includeComplexity: true,
  });

  const toggleOption = (key: keyof ExportOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Get selected metrics based on options
  const getSelectedMetrics = (): string[] => {
    const metrics: string[] = [];
    if (options.includeGeometric) {
      metrics.push(...METRIC_GROUPS.geometric);
    }
    if (options.includeBeam) {
      metrics.push(...METRIC_GROUPS.beam);
    }
    if (options.includeComplexity) {
      metrics.push(...METRIC_GROUPS.complexity);
    }
    return metrics;
  };

  const handleExportCSV = () => {
    if (successfulPlans.length === 0) return;

    const selectedMetrics = getSelectedMetrics();
    const lines: string[] = [];

    // Branded header
    lines.push('# Tool: RTp-lens');
    lines.push('# Export Type: Cohort Analysis');
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push(`# Total Plans: ${successfulPlans.length}`);
    lines.push(`# Metrics Included: ${selectedMetrics.length}`);
    lines.push('');

    // Overall Statistics Section
    if (extendedStats) {
      lines.push('# OVERALL STATISTICS');
      lines.push('Metric,Category,Min,Max,Mean,Std,Median,Q1,Q3,IQR,P5,P95,Outliers');

      for (const key of selectedMetrics) {
        const stats = extendedStats[key as keyof typeof extendedStats];
        const info = METRIC_DEFINITIONS[key];
        
        if (stats && 'q1' in stats) {
          lines.push([
            key,
            info?.group || 'unknown',
            stats.min.toFixed(4),
            stats.max.toFixed(4),
            stats.mean.toFixed(4),
            stats.std.toFixed(4),
            stats.median.toFixed(4),
            stats.q1.toFixed(4),
            stats.q3.toFixed(4),
            stats.iqr.toFixed(4),
            stats.p5.toFixed(4),
            stats.p95.toFixed(4),
            stats.outliers?.length?.toString() ?? '0',
          ].join(','));
        }
      }
      lines.push('');
    }

    // Cluster Statistics Section
    if (clusters.length > 0) {
      lines.push('# CLUSTER ANALYSIS');
      const clusterHeaders = ['Cluster', 'Plan Count', 'Percentage'];
      
      // Add metric headers for core metrics
      const coreMetrics = ['MCS', 'LSV', 'AAV', 'totalMU'];
      for (const m of coreMetrics) {
        clusterHeaders.push(`${m} Mean`, `${m} Std`);
      }
      lines.push(clusterHeaders.join(','));
      
      for (const cluster of clusters) {
        const stats = clusterStats.get(cluster.id);
        const percentage = ((cluster.planIds.length / successfulPlans.length) * 100).toFixed(1);
        
        const row = [
          `"${cluster.name}"`,
          cluster.planIds.length.toString(),
          `${percentage}%`,
        ];

        for (const m of coreMetrics) {
          const metricStats = stats?.[m as keyof typeof stats];
          if (metricStats && 'mean' in metricStats) {
            row.push(metricStats.mean.toFixed(4), metricStats.std.toFixed(4));
          } else {
            row.push('N/A', 'N/A');
          }
        }

        lines.push(row.join(','));
      }
      lines.push('');
    }

    // Correlation Matrix Section
    if (correlationMatrix) {
      lines.push('# CORRELATION MATRIX');
      lines.push(['', ...correlationMatrix.metrics].join(','));
      
      for (let i = 0; i < correlationMatrix.metrics.length; i++) {
        const row = [
          correlationMatrix.metrics[i],
          ...correlationMatrix.values[i].map(v => v.toFixed(4)),
        ];
        lines.push(row.join(','));
      }
      lines.push('');
    }

    // Individual Plan Data Section
    lines.push('# INDIVIDUAL PLAN DATA');
    const dataHeaders = ['File Name', ...selectedMetrics];
    lines.push(dataHeaders.join(','));
    
    for (const plan of successfulPlans) {
      const row = [`"${plan.fileName}"`];
      
      for (const key of selectedMetrics) {
        const value = extractMetricValue(plan, key);
        row.push(value !== undefined ? value.toFixed(4) : '');
      }
      
      lines.push(row.join(','));
    }

    // Download
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cohort-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (successfulPlans.length === 0) return;

    const selectedMetrics = getSelectedMetrics();

    const exportData = {
      tool: 'RTp-lens',
      exportType: 'Cohort Analysis',
      exportDate: new Date().toISOString(),
      summary: {
        totalPlans: successfulPlans.length,
        clusterCount: clusters.length,
        metricsIncluded: selectedMetrics,
        categories: {
          geometric: options.includeGeometric,
          beam: options.includeBeam,
          complexity: options.includeComplexity,
        },
      },
      overallStatistics: Object.fromEntries(
        selectedMetrics
          .filter(key => extendedStats?.[key as keyof typeof extendedStats])
          .map(key => [key, extendedStats?.[key as keyof typeof extendedStats]])
      ),
      clusters: clusters.map(cluster => ({
        ...cluster,
        statistics: Object.fromEntries(
          selectedMetrics
            .filter(key => clusterStats.get(cluster.id)?.[key as keyof ReturnType<typeof clusterStats.get>])
            .map(key => [key, clusterStats.get(cluster.id)?.[key as keyof ReturnType<typeof clusterStats.get>]])
        ),
      })),
      correlationMatrix: correlationMatrix,
      plans: successfulPlans.map(plan => {
        const metrics: Record<string, number | undefined> = {};
        for (const key of selectedMetrics) {
          metrics[key] = extractMetricValue(plan, key);
        }
        return {
          id: plan.id,
          fileName: plan.fileName,
          metrics,
        };
      }),
      pythonToolkit: 'https://github.com/matteomaspero/rt-complexity-lens/blob/main/python/README.md',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cohort-analysis-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasData = successfulPlans.length > 0;
  const anySelected = options.includeGeometric || options.includeBeam || options.includeComplexity;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metric Category Selection */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Include Metrics</Label>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="geometric"
                checked={options.includeGeometric}
                onCheckedChange={() => toggleOption('includeGeometric')}
              />
              <Label htmlFor="geometric" className="text-sm cursor-pointer">
                Geometric ({METRIC_GROUPS.geometric.length})
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="beam"
                checked={options.includeBeam}
                onCheckedChange={() => toggleOption('includeBeam')}
              />
              <Label htmlFor="beam" className="text-sm cursor-pointer">
                Beam ({METRIC_GROUPS.beam.length})
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="complexity"
                checked={options.includeComplexity}
                onCheckedChange={() => toggleOption('includeComplexity')}
              />
              <Label htmlFor="complexity" className="text-sm cursor-pointer">
                Complexity ({METRIC_GROUPS.complexity.length})
              </Label>
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={!hasData || !anySelected}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            disabled={!hasData || !anySelected}
            className="flex items-center gap-2"
          >
            <FileJson className="h-4 w-4" />
            Export JSON
          </Button>
        </div>

        {/* Status Messages */}
        {!hasData && (
          <p className="text-xs text-muted-foreground">
            Upload plans to enable export
          </p>
        )}
        {hasData && !anySelected && (
          <p className="text-xs text-muted-foreground">
            Select at least one metric category to export
          </p>
        )}
        {hasData && anySelected && (
          <p className="text-xs text-muted-foreground">
            {getSelectedMetrics().length} metrics from {successfulPlans.length} plans
          </p>
        )}
      </CardContent>
    </Card>
  );
}
