import { useMemo, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCohort } from '@/contexts/CohortContext';
import { METRIC_DEFINITIONS, METRIC_GROUPS, extractMetricValue, getMetricColor } from '@/lib/cohort';

interface ScatterMatrixProps {
  className?: string;
}

// Flatten all available metrics for selection
const ALL_METRICS = [
  ...METRIC_GROUPS.complexity,
  ...METRIC_GROUPS.geometric,
  ...METRIC_GROUPS.beam,
];

interface MetricPair {
  x: string;
  y: string;
}

const DEFAULT_PAIRS: MetricPair[] = [
  { x: 'MCS', y: 'totalMU' },
  { x: 'LSV', y: 'AAV' },
  { x: 'MCS', y: 'LT' },
  { x: 'MFA', y: 'totalMU' },
];

export function ScatterMatrix({ className }: ScatterMatrixProps) {
  const { successfulPlans, clusters } = useCohort();
  const [pairs, setPairs] = useState<MetricPair[]>(DEFAULT_PAIRS);

  const updatePair = (index: number, axis: 'x' | 'y', value: string) => {
    setPairs(prev => prev.map((pair, i) => 
      i === index ? { ...pair, [axis]: value } : pair
    ));
  };

  const scatterData = useMemo(() => {
    if (successfulPlans.length === 0) return null;

    // Build a map from planId to cluster for coloring
    const planClusterMap = new Map<string, string>();
    const clusterColorMap = new Map<string, string>();
    
    for (const cluster of clusters) {
      clusterColorMap.set(cluster.id, cluster.color);
      for (const planId of cluster.planIds) {
        planClusterMap.set(planId, cluster.id);
      }
    }

    return pairs.map(pair => {
      const xInfo = METRIC_DEFINITIONS[pair.x];
      const yInfo = METRIC_DEFINITIONS[pair.y];
      
      const data = successfulPlans.map(plan => {
        const xValue = extractMetricValue(plan, pair.x);
        const yValue = extractMetricValue(plan, pair.y);
        const clusterId = planClusterMap.get(plan.id) || 'Unknown';
        const color = clusterColorMap.get(clusterId) || 'hsl(var(--chart-1))';
        
        return {
          x: typeof xValue === 'number' ? xValue : 0,
          y: typeof yValue === 'number' ? yValue : 0,
          name: plan.fileName,
          cluster: clusterId,
          color,
        };
      }).filter(d => d.x !== 0 || d.y !== 0);

      return {
        ...pair,
        xLabel: xInfo?.shortName || pair.x,
        yLabel: yInfo?.shortName || pair.y,
        xUnit: xInfo?.unit,
        yUnit: yInfo?.unit,
        data,
      };
    });
  }, [successfulPlans, clusters, pairs]);

  if (!scatterData || scatterData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Scatter Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Upload plans to see scatter plot analysis
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Metric Relationships</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scatterData.map((pair, idx) => (
            <div key={idx} className="border rounded-lg p-3 bg-muted/20">
              {/* Metric selectors */}
              <div className="flex gap-2 mb-2">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">X-axis</Label>
                  <Select
                    value={pairs[idx].x}
                    onValueChange={(val) => updatePair(idx, 'x', val)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_METRICS.map(key => {
                        const info = METRIC_DEFINITIONS[key];
                        return (
                          <SelectItem key={key} value={key} className="text-xs">
                            {info?.shortName || key}
                            {info?.unit && ` (${info.unit})`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Y-axis</Label>
                  <Select
                    value={pairs[idx].y}
                    onValueChange={(val) => updatePair(idx, 'y', val)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_METRICS.map(key => {
                        const info = METRIC_DEFINITIONS[key];
                        return (
                          <SelectItem key={key} value={key} className="text-xs">
                            {info?.shortName || key}
                            {info?.unit && ` (${info.unit})`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="x" 
                      type="number"
                      name={pair.xLabel}
                      tick={{ fontSize: 9, fill: 'hsl(var(--foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      label={{ 
                        value: `${pair.xLabel}${pair.xUnit ? ` (${pair.xUnit})` : ''}`, 
                        position: 'bottom', 
                        offset: 0,
                        style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' }
                      }}
                    />
                    <YAxis 
                      dataKey="y" 
                      type="number"
                      name={pair.yLabel}
                      tick={{ fontSize: 9, fill: 'hsl(var(--foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      label={{ 
                        value: `${pair.yLabel}${pair.yUnit ? ` (${pair.yUnit})` : ''}`, 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' }
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload[0]) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-popover border rounded-lg p-2 shadow-lg text-xs">
                            <p className="font-medium truncate max-w-[150px]">{d.name}</p>
                            <p className="text-muted-foreground">Cluster: {d.cluster}</p>
                            <p>{pair.xLabel}: <span className="font-mono">{d.x.toFixed(3)}</span></p>
                            <p>{pair.yLabel}: <span className="font-mono">{d.y.toFixed(2)}</span></p>
                          </div>
                        );
                      }}
                    />
                    <Scatter data={pair.data} shape="circle">
                      {pair.data.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          fillOpacity={0.7}
                          stroke={entry.color}
                          strokeWidth={1}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>

        {/* Cluster Legend */}
        {clusters.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
            {clusters.map(cluster => (
              <div key={cluster.id} className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cluster.color }}
                />
                <span className="text-muted-foreground">{cluster.name}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
