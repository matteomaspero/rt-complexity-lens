import { useMemo } from 'react';
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
import { useCohort } from '@/contexts/CohortContext';

interface ScatterMatrixProps {
  className?: string;
}

const METRIC_PAIRS = [
  { x: 'MCS', y: 'totalMU', xLabel: 'MCS', yLabel: 'Total MU' },
  { x: 'LSV', y: 'AAV', xLabel: 'LSV', yLabel: 'AAV' },
  { x: 'MCS', y: 'LT', xLabel: 'MCS', yLabel: 'Leaf Travel (mm)' },
  { x: 'MFA', y: 'totalMU', xLabel: 'MFA (cm²)', yLabel: 'Total MU' },
];

export function ScatterMatrix({ className }: ScatterMatrixProps) {
  const { successfulPlans, clusters } = useCohort();

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

    return METRIC_PAIRS.map(pair => {
      const data = successfulPlans.map(plan => {
        const xValue = plan.metrics[pair.x as keyof typeof plan.metrics];
        const yValue = plan.metrics[pair.y as keyof typeof plan.metrics];
        const clusterId = planClusterMap.get(plan.id) || 'Unknown';
        const color = clusterColorMap.get(clusterId) || 'hsl(var(--chart-1))';
        
        return {
          x: typeof xValue === 'number' ? xValue : 0,
          y: typeof yValue === 'number' ? yValue : 0,
          name: plan.fileName,
          cluster: clusterId,
          color,
        };
      });

      return {
        ...pair,
        data,
      };
    });
  }, [successfulPlans, clusters]);

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
              <p className="text-xs text-muted-foreground mb-2 text-center">
                {pair.xLabel} vs {pair.yLabel}
              </p>
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
                        value: pair.xLabel, 
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
                        value: pair.yLabel, 
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
