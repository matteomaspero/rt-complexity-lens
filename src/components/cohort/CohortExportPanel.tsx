import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { useCohort } from '@/contexts/CohortContext';
import { formatExtendedStat } from '@/lib/cohort';

export function CohortExportPanel() {
  const { successfulPlans, extendedStats, clusters, clusterStats, correlationMatrix } = useCohort();

  const handleExportCSV = () => {
    if (!extendedStats) return;

    const lines: string[] = [];

    // Header
    lines.push('Cohort Analysis Export');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Total Plans: ${successfulPlans.length}`);
    lines.push('');

    // Overall Statistics
    lines.push('OVERALL STATISTICS');
    lines.push('Metric,Min,Max,Mean,Std,Median,Q1,Q3,IQR,P5,P95,Outliers');

    const metricKeys = ['MCS', 'LSV', 'AAV', 'MFA', 'LT', 'totalMU', 'deliveryTime'] as const;
    for (const key of metricKeys) {
      const stats = extendedStats[key as keyof typeof extendedStats];
      if (stats) {
        lines.push([
          key,
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
          stats.outliers.length.toString(),
        ].join(','));
      }
    }
    lines.push('');

    // Cluster Statistics
    if (clusters.length > 0) {
      lines.push('CLUSTER ANALYSIS');
      lines.push('Cluster,Plan Count,Percentage,MCS Mean,MCS Std,LSV Mean,AAV Mean,Total MU Mean');
      
      for (const cluster of clusters) {
        const stats = clusterStats.get(cluster.id);
        const percentage = ((cluster.planIds.length / successfulPlans.length) * 100).toFixed(1);
        
        if (stats) {
          lines.push([
            `"${cluster.name}"`,
            cluster.planIds.length.toString(),
            `${percentage}%`,
            stats.MCS.mean.toFixed(4),
            stats.MCS.std.toFixed(4),
            stats.LSV.mean.toFixed(4),
            stats.AAV.mean.toFixed(4),
            stats.totalMU.mean.toFixed(1),
          ].join(','));
        }
      }
      lines.push('');
    }

    // Correlation Matrix
    if (correlationMatrix) {
      lines.push('CORRELATION MATRIX');
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

    // Individual Plan Data
    lines.push('INDIVIDUAL PLAN DATA');
    lines.push('File Name,MCS,LSV,AAV,MFA,LT,Total MU,Delivery Time');
    
    for (const plan of successfulPlans) {
      lines.push([
        `"${plan.fileName}"`,
        plan.metrics.MCS?.toFixed(4) ?? '',
        plan.metrics.LSV?.toFixed(4) ?? '',
        plan.metrics.AAV?.toFixed(4) ?? '',
        plan.metrics.MFA?.toFixed(2) ?? '',
        plan.metrics.LT?.toFixed(2) ?? '',
        plan.metrics.totalMU?.toFixed(1) ?? '',
        plan.metrics.totalDeliveryTime?.toFixed(1) ?? '',
      ].join(','));
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
    if (!extendedStats) return;

    const exportData = {
      exportDate: new Date().toISOString(),
      summary: {
        totalPlans: successfulPlans.length,
        clusterCount: clusters.length,
      },
      overallStatistics: extendedStats,
      clusters: clusters.map(cluster => ({
        ...cluster,
        statistics: clusterStats.get(cluster.id),
      })),
      correlationMatrix: correlationMatrix,
      plans: successfulPlans.map(plan => ({
        id: plan.id,
        fileName: plan.fileName,
        metrics: plan.metrics,
      })),
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={!hasData}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            disabled={!hasData}
            className="flex items-center gap-2"
          >
            <FileJson className="h-4 w-4" />
            Export JSON
          </Button>
        </div>
        {!hasData && (
          <p className="text-xs text-muted-foreground mt-2">
            Upload plans to enable export
          </p>
        )}
      </CardContent>
    </Card>
  );
}
