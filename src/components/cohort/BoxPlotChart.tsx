import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Scatter,
  ReferenceLine,
  ErrorBar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCohort } from '@/contexts/CohortContext';
import { getBoxPlotData, type BoxPlotData } from '@/lib/cohort';

interface BoxPlotChartProps {
  className?: string;
}

const METRIC_COLORS: Record<string, string> = {
  MCS: 'hsl(var(--chart-1))',
  LSV: 'hsl(var(--chart-2))',
  AAV: 'hsl(var(--chart-3))',
  MFA: 'hsl(var(--chart-4))',
  LT: 'hsl(var(--chart-5))',
};

interface BoxPlotDataExtended extends BoxPlotData {
  boxBase: number;
  boxHeight: number;
  color: string;
}

export function BoxPlotChart({ className }: BoxPlotChartProps) {
  const { extendedStats } = useCohort();

  const data = useMemo((): BoxPlotDataExtended[] => {
    if (!extendedStats) return [];

    const metrics: { key: keyof typeof extendedStats; name: string }[] = [
      { key: 'MCS', name: 'MCS' },
      { key: 'LSV', name: 'LSV' },
      { key: 'AAV', name: 'AAV' },
    ];

    return metrics.map(({ key, name }) => {
      const stats = extendedStats[key];
      const boxData = getBoxPlotData(stats, name);
      return {
        ...boxData,
        boxBase: stats.q1,
        boxHeight: stats.q3 - stats.q1,
        color: METRIC_COLORS[name] || 'hsl(var(--chart-1))',
      };
    });
  }, [extendedStats]);

  if (!extendedStats || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Box Plot Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Upload plans to see box plot analysis
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Complexity Metrics Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="metric" 
                tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                domain={[0, 1]}
                tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                label={{ 
                  value: 'Value', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload[0]) return null;
                  const d = payload[0].payload as BoxPlotDataExtended;
                  return (
                    <div className="bg-popover border rounded-lg p-3 shadow-lg text-sm">
                      <p className="font-medium mb-2">{d.metric}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <span className="text-muted-foreground">Min:</span>
                        <span className="font-mono">{d.min.toFixed(3)}</span>
                        <span className="text-muted-foreground">Q1:</span>
                        <span className="font-mono">{d.q1.toFixed(3)}</span>
                        <span className="text-muted-foreground">Median:</span>
                        <span className="font-mono font-semibold">{d.median.toFixed(3)}</span>
                        <span className="text-muted-foreground">Q3:</span>
                        <span className="font-mono">{d.q3.toFixed(3)}</span>
                        <span className="text-muted-foreground">Max:</span>
                        <span className="font-mono">{d.max.toFixed(3)}</span>
                        <span className="text-muted-foreground">Mean:</span>
                        <span className="font-mono">{d.mean.toFixed(3)}</span>
                        {d.outliers.length > 0 && (
                          <>
                            <span className="text-muted-foreground">Outliers:</span>
                            <span className="font-mono">{d.outliers.length}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              
              {/* Box (IQR) - positioned at Q1 with height of IQR */}
              <Bar 
                dataKey="boxHeight" 
                stackId="box"
                barSize={40}
                radius={[4, 4, 4, 4]}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`box-${index}`}
                    fill={entry.color}
                    fillOpacity={0.7}
                    stroke={entry.color}
                    strokeWidth={2}
                  />
                ))}
                <ErrorBar
                  dataKey="whiskerLow"
                  direction="y"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={1.5}
                />
              </Bar>

              {/* Median lines */}
              {data.map((entry, index) => (
                <ReferenceLine
                  key={`median-${index}`}
                  y={entry.median}
                  stroke={entry.color}
                  strokeWidth={2}
                  strokeDasharray="none"
                  segment={[
                    { x: index - 0.15, y: entry.median },
                    { x: index + 0.15, y: entry.median },
                  ]}
                />
              ))}

              {/* Mean markers as scatter points */}
              <Scatter
                dataKey="mean"
                fill="hsl(var(--foreground))"
                shape="diamond"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-8 h-3 bg-primary/70 rounded border border-primary" />
            <span>IQR (Q1-Q3)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-foreground" />
            <span>Median</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-foreground rotate-45" />
            <span>Mean</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
