import { useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBatch } from '@/contexts/BatchContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ChartExportButton } from '@/components/ui/exportable-chart';

interface DistributionData {
  range: string;
  count: number;
  plans: string[];
}

function createHistogram(
  values: { value: number; label: string }[],
  bins = 5
): DistributionData[] {
  if (values.length === 0) return [];

  const numericValues = values.map(v => v.value);
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const range = max - min || 1;
  const binSize = range / bins;

  const histogram: DistributionData[] = [];

  for (let i = 0; i < bins; i++) {
    const binMin = min + i * binSize;
    const binMax = min + (i + 1) * binSize;
    const inBin = values.filter(v => {
      if (i === bins - 1) {
        return v.value >= binMin && v.value <= binMax;
      }
      return v.value >= binMin && v.value < binMax;
    });

    histogram.push({
      range: `${binMin.toFixed(2)}–${binMax.toFixed(2)}`,
      count: inBin.length,
      plans: inBin.map(v => v.label),
    });
  }

  return histogram;
}

export function BatchDistributionChart() {
  const chartRef = useRef<HTMLDivElement>(null);
  const { plans } = useBatch();

  const successfulPlans = useMemo(
    () => plans.filter(p => p.status === 'success'),
    [plans]
  );

  const mcsData = useMemo(() => {
    const values = successfulPlans
      .filter(p => typeof p.metrics.MCS === 'number')
      .map(p => ({ value: p.metrics.MCS!, label: p.fileName }));
    return createHistogram(values);
  }, [successfulPlans]);

  if (successfulPlans.length < 2) {
    return null;
  }

  return (
    <Card ref={chartRef}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">MCS Distribution</CardTitle>
          <ChartExportButton chartRef={chartRef} filename="mcs_distribution" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mcsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
              <XAxis 
                dataKey="range" 
                tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const data = payload[0].payload as DistributionData;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <p className="text-sm font-medium">
                        MCS: {data.range}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {data.count} plan{data.count !== 1 ? 's' : ''}
                      </p>
                      {data.plans.length <= 3 && (
                        <ul className="mt-1 text-xs text-muted-foreground">
                          {data.plans.map(p => (
                            <li key={p} className="truncate max-w-[150px]">{p}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {mcsData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    className="fill-primary"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
