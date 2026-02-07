import { useMemo, useState } from 'react';
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
import { getBoxPlotData, type BoxPlotData, getMetricColor, METRIC_DEFINITIONS } from '@/lib/cohort';
import { MetricSelector } from './MetricSelector';

interface BoxPlotChartProps {
  className?: string;
}

interface BoxPlotDataExtended extends BoxPlotData {
  boxBase: number;
  boxHeight: number;
  color: string;
}

const DEFAULT_METRICS = ['MCS', 'LSV', 'AAV'];

export function BoxPlotChart({ className }: BoxPlotChartProps) {
  const { extendedStats } = useCohort();
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(DEFAULT_METRICS);

  const data = useMemo((): BoxPlotDataExtended[] => {
    if (!extendedStats) return [];

    return selectedMetrics.map(key => {
      const stats = extendedStats[key as keyof typeof extendedStats];
      if (!stats || typeof stats !== 'object' || !('q1' in stats)) return null;
      
      const info = METRIC_DEFINITIONS[key];
      const boxData = getBoxPlotData(stats, info?.shortName || key);
      
      return {
        ...boxData,
        boxBase: stats.q1,
        boxHeight: stats.q3 - stats.q1,
        color: getMetricColor(key),
      };
    }).filter((d): d is BoxPlotDataExtended => d !== null);
  }, [extendedStats, selectedMetrics]);

  // Calculate Y-axis domain based on selected metrics
  const yDomain = useMemo(() => {
    if (data.length === 0) return [0, 1];
    const allValues = data.flatMap(d => [d.min, d.max, ...d.outliers]);
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const padding = (maxVal - minVal) * 0.1;
    return [Math.max(0, minVal - padding), maxVal + padding];
  }, [data]);

  if (!extendedStats) {
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
      <CardContent className="space-y-4">
        <MetricSelector
          selected={selectedMetrics}
          onChange={setSelectedMetrics}
          maxSelections={6}
          groups={['complexity', 'geometric']}
          placeholder="Select metrics to display..."
        />

        {data.length > 0 ? (
          <>
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
                    domain={yDomain}
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

            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
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
          </>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Select metrics to display
          </div>
        )}
      </CardContent>
    </Card>
  );
}
