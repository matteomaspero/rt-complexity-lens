import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, Table2, Shapes, Zap, BarChart3 } from 'lucide-react';
import { useCohort } from '@/contexts/CohortContext';
import { formatExtendedStat, METRIC_DEFINITIONS, METRIC_GROUPS, type MetricGroup } from '@/lib/cohort';

interface ExtendedStatsTableProps {
  className?: string;
}

function getGroupMetrics(group: MetricGroup) {
  return METRIC_GROUPS[group].map(key => ({
    key,
    info: METRIC_DEFINITIONS[key],
  })).filter(m => m.info);
}

export function ExtendedStatsTable({ className }: ExtendedStatsTableProps) {
  const { extendedStats, clusters, clusterStats, successfulPlans } = useCohort();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MetricGroup>('complexity');

  if (!extendedStats) {
    return null;
  }

  const groupMetrics = getGroupMetrics(activeTab);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Table2 className="h-4 w-4" />
                Detailed Statistics
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {/* Metric Group Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MetricGroup)} className="mb-4">
              <TabsList className="grid w-full grid-cols-3">
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
            </Tabs>

            {/* Overall Statistics */}
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-3">
                All Plans (n = {successfulPlans.length})
              </h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Metric</TableHead>
                      <TableHead>Range</TableHead>
                      <TableHead>Mean ± SD</TableHead>
                      <TableHead>Median</TableHead>
                      <TableHead>IQR</TableHead>
                      <TableHead>P5 - P95</TableHead>
                      <TableHead>Outliers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupMetrics.map(({ key, info }) => {
                      const stats = extendedStats[key as keyof typeof extendedStats];
                      if (!stats || typeof stats !== 'object' || !('q1' in stats)) return null;
                      if (stats.count === 0) return null;
                      
                      const formatted = formatExtendedStat(stats, info.decimals);
                      
                      return (
                        <TableRow key={key}>
                          <TableCell className="font-medium">
                            {info.name}
                            {info.unit && <span className="text-muted-foreground ml-1">({info.unit})</span>}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{formatted.range}</TableCell>
                          <TableCell className="font-mono text-sm">{formatted.mean}</TableCell>
                          <TableCell className="font-mono text-sm">{formatted.median}</TableCell>
                          <TableCell className="font-mono text-sm">{formatted.iqr}</TableCell>
                          <TableCell className="font-mono text-sm">{formatted.percentiles}</TableCell>
                          <TableCell className="text-sm">{formatted.outliers}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Per-Cluster Statistics */}
            {clusters.length > 1 && (
              <div>
                <h4 className="text-sm font-medium mb-3">Per-Cluster Breakdown</h4>
                <div className="space-y-4">
                  {clusters.map(cluster => {
                    const stats = clusterStats.get(cluster.id);
                    if (!stats) return null;

                    // Get metrics from current tab that have data
                    const clusterMetrics = groupMetrics.filter(({ key }) => {
                      const metricStats = stats[key as keyof typeof stats];
                      return metricStats && typeof metricStats === 'object' && 'count' in metricStats && metricStats.count > 0;
                    });

                    if (clusterMetrics.length === 0) return null;

                    return (
                      <div key={cluster.id} className="border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: cluster.color }}
                          />
                          <span className="font-medium text-sm">{cluster.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({cluster.planIds.length} plan{cluster.planIds.length !== 1 ? 's' : ''})
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[120px]">Metric</TableHead>
                                <TableHead>Mean ± SD</TableHead>
                                <TableHead>Median</TableHead>
                                <TableHead>Range</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {clusterMetrics.slice(0, 6).map(({ key, info }) => {
                                const metricStats = stats[key as keyof typeof stats];
                                if (!metricStats || typeof metricStats !== 'object' || !('q1' in metricStats)) return null;
                                const formatted = formatExtendedStat(metricStats, info.decimals);
                                
                                return (
                                  <TableRow key={key}>
                                    <TableCell className="font-medium text-sm">{info.shortName}</TableCell>
                                    <TableCell className="font-mono text-xs">{formatted.mean}</TableCell>
                                    <TableCell className="font-mono text-xs">{formatted.median}</TableCell>
                                    <TableCell className="font-mono text-xs">{formatted.range}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
