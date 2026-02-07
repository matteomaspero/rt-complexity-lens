import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Table2 } from 'lucide-react';
import { useCohort } from '@/contexts/CohortContext';
import { formatExtendedStat } from '@/lib/cohort';
import { useState } from 'react';

interface ExtendedStatsTableProps {
  className?: string;
}

const METRIC_LABELS: Record<string, { name: string; unit: string }> = {
  MCS: { name: 'Modulation Complexity Score', unit: '' },
  LSV: { name: 'Leaf Sequence Variability', unit: '' },
  AAV: { name: 'Aperture Area Variability', unit: '' },
  MFA: { name: 'Mean Field Area', unit: 'cm²' },
  LT: { name: 'Leaf Travel', unit: 'mm' },
  totalMU: { name: 'Total MU', unit: 'MU' },
  deliveryTime: { name: 'Delivery Time', unit: 's' },
};

export function ExtendedStatsTable({ className }: ExtendedStatsTableProps) {
  const { extendedStats, clusters, clusterStats, successfulPlans } = useCohort();
  const [isOpen, setIsOpen] = useState(false);

  if (!extendedStats) {
    return null;
  }

  const metricKeys = Object.keys(METRIC_LABELS) as Array<keyof typeof METRIC_LABELS>;

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
                    {metricKeys.map(key => {
                      const stats = extendedStats[key as keyof typeof extendedStats];
                      if (!stats) return null;
                      const formatted = formatExtendedStat(stats);
                      const label = METRIC_LABELS[key];
                      
                      return (
                        <TableRow key={key}>
                          <TableCell className="font-medium">
                            {label.name}
                            {label.unit && <span className="text-muted-foreground ml-1">({label.unit})</span>}
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
                              {['MCS', 'LSV', 'AAV', 'totalMU'].map(key => {
                                const metricStats = stats[key as keyof typeof stats];
                                if (!metricStats || typeof metricStats !== 'object') return null;
                                const formatted = formatExtendedStat(metricStats);
                                
                                return (
                                  <TableRow key={key}>
                                    <TableCell className="font-medium text-sm">{key}</TableCell>
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
