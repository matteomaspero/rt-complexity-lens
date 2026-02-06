import { useMemo } from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PlanMetrics } from '@/lib/dicom/types';
import {
  calculatePlanComparison,
  formatDiffPercent,
  getDiffColorClass,
  type MetricDiff,
} from '@/lib/comparison/diff-calculator';
import { cn } from '@/lib/utils';

interface MetricsDiffTableProps {
  metricsA: PlanMetrics;
  metricsB: PlanMetrics;
}

function DiffIndicator({ diff }: { diff: MetricDiff }) {
  const colorClass = getDiffColorClass(diff);

  if (diff.significance === 'minor') {
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span className="text-xs">~0%</span>
      </span>
    );
  }

  const Icon = diff.direction === 'increase' ? ArrowUp : ArrowDown;

  return (
    <span className={cn('flex items-center gap-1', colorClass)}>
      <Icon className="h-3 w-3" />
      <span className="text-xs font-medium">{formatDiffPercent(diff.percentDiff)}</span>
    </span>
  );
}

function formatValue(value: number | undefined, metric: string): string {
  if (value === undefined || value === null) return '—';

  switch (metric) {
    case 'totalMU':
      return value.toFixed(0);
    case 'totalDeliveryTime':
      return `${Math.floor(value / 60)}:${String(Math.round(value % 60)).padStart(2, '0')}`;
    case 'LT':
      return value.toFixed(0);
    case 'MFA':
      return value.toFixed(1);
    case 'PI':
      return value.toFixed(1);
    default:
      return value.toFixed(3);
  }
}

export function MetricsDiffTable({ metricsA, metricsB }: MetricsDiffTableProps) {
  const comparison = useMemo(
    () => calculatePlanComparison(metricsA, metricsB),
    [metricsA, metricsB]
  );

  // Filter to show only the most important metrics
  const primaryMetrics = comparison.metricsComparison.filter(m =>
    ['MCS', 'LSV', 'AAV', 'MFA', 'totalMU', 'totalDeliveryTime'].includes(m.metric)
  );

  const secondaryMetrics = comparison.metricsComparison.filter(m =>
    ['LT', 'LTMCS', 'SAS5', 'SAS10', 'EM', 'PI'].includes(m.metric)
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Metrics Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Primary Metrics */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Plan A</TableHead>
                <TableHead className="text-right">Plan B</TableHead>
                <TableHead className="text-right">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {primaryMetrics.map(diff => (
                <TableRow key={diff.metric}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{diff.metric}</span>
                      {diff.unit && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({diff.unit})
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{diff.label}</span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatValue(diff.planA, diff.metric)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatValue(diff.planB, diff.metric)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DiffIndicator diff={diff} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Secondary Metrics */}
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            Show additional metrics
          </summary>
          <div className="mt-2 rounded-md border">
            <Table>
              <TableBody>
                {secondaryMetrics.map(diff => (
                  <TableRow key={diff.metric}>
                    <TableCell>
                      <span className="font-medium">{diff.metric}</span>
                      {diff.unit && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({diff.unit})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatValue(diff.planA, diff.metric)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatValue(diff.planB, diff.metric)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DiffIndicator diff={diff} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
