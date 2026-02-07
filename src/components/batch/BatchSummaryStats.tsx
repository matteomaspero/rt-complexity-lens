import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBatch } from '@/contexts/BatchContext';
import { calculateBatchStatistics, formatStatRange, formatStatMean, type MetricStatistics } from '@/lib/batch/batch-statistics';
import { METRIC_DEFINITIONS, type MetricInfo } from '@/lib/cohort/metric-utils';
import { Shapes, Zap, BarChart3 } from 'lucide-react';

interface MetricRowProps {
  label: string;
  unit?: string;
  stat: MetricStatistics;
  decimals: number;
}

function MetricRow({ label, unit, stat, decimals }: MetricRowProps) {
  return (
    <div className="space-y-1 p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
      <p className="text-sm font-medium text-muted-foreground">
        {label}
        {unit && <span className="ml-1 text-xs">({unit})</span>}
      </p>
      <p className="text-sm">
        <span className="font-medium">Range:</span>{' '}
        <span className="font-mono">{formatStatRange(stat, decimals)}</span>
      </p>
      <p className="text-sm">
        <span className="font-medium">Mean:</span>{' '}
        <span className="font-mono">{formatStatMean(stat, decimals)}</span>
      </p>
    </div>
  );
}

interface MetricGroupGridProps {
  metrics: Array<{ key: string; stat: MetricStatistics }>;
}

function MetricGroupGrid({ metrics }: MetricGroupGridProps) {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {metrics.map(({ key, stat }) => {
        const info = METRIC_DEFINITIONS[key];
        if (!info) return null;
        return (
          <MetricRow
            key={key}
            label={info.shortName}
            unit={info.unit || undefined}
            stat={stat}
            decimals={info.decimals}
          />
        );
      })}
    </div>
  );
}

export function BatchSummaryStats() {
  const { plans } = useBatch();
  const [activeTab, setActiveTab] = useState('geometric');
  
  const successfulPlans = useMemo(
    () => plans.filter(p => p.status === 'success'),
    [plans]
  );

  const stats = useMemo(
    () => calculateBatchStatistics(successfulPlans.map(p => ({ metrics: p.metrics, plan: p.plan }))),
    [successfulPlans]
  );

  if (successfulPlans.length === 0) {
    return null;
  }

  // Group metrics by category
  const geometricMetrics = [
    { key: 'MFA', stat: stats.MFA },
    { key: 'EFS', stat: stats.EFS },
    { key: 'PA', stat: stats.PA },
    { key: 'JA', stat: stats.JA },
    { key: 'psmall', stat: stats.psmall },
  ].filter(m => m.stat.count > 0);

  const beamMetrics = [
    { key: 'beamCount', stat: stats.beamCount },
    { key: 'controlPointCount', stat: stats.controlPointCount },
    { key: 'GT', stat: stats.GT },
    { key: 'totalMU', stat: stats.totalMU },
    { key: 'totalDeliveryTime', stat: stats.deliveryTime },
    { key: 'MUCA', stat: stats.MUCA },
  ].filter(m => m.stat.count > 0);

  const complexityMetrics = [
    { key: 'MCS', stat: stats.MCS },
    { key: 'LSV', stat: stats.LSV },
    { key: 'AAV', stat: stats.AAV },
    { key: 'LT', stat: stats.LT },
    { key: 'LTMCS', stat: stats.LTMCS },
    { key: 'SAS5', stat: stats.SAS5 },
    { key: 'SAS10', stat: stats.SAS10 },
    { key: 'EM', stat: stats.EM },
    { key: 'PI', stat: stats.PI },
    { key: 'LG', stat: stats.LG },
    { key: 'MAD', stat: stats.MAD },
    { key: 'TG', stat: stats.TG },
    { key: 'PM', stat: stats.PM },
  ].filter(m => m.stat.count > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Summary Statistics</span>
          <span className="text-sm font-normal text-muted-foreground">
            ({stats.planCount} plans)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="geometric" className="flex items-center gap-1.5">
              <Shapes className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Geometric</span>
            </TabsTrigger>
            <TabsTrigger value="beam" className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Beam</span>
            </TabsTrigger>
            <TabsTrigger value="complexity" className="flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Complexity</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="geometric" className="mt-0">
            {geometricMetrics.length > 0 ? (
              <MetricGroupGrid metrics={geometricMetrics} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No geometric metrics available
              </p>
            )}
          </TabsContent>
          
          <TabsContent value="beam" className="mt-0">
            {beamMetrics.length > 0 ? (
              <MetricGroupGrid metrics={beamMetrics} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No beam metrics available
              </p>
            )}
          </TabsContent>
          
          <TabsContent value="complexity" className="mt-0">
            {complexityMetrics.length > 0 ? (
              <MetricGroupGrid metrics={complexityMetrics} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No complexity metrics available
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
