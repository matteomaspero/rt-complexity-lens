import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCohort } from '@/contexts/CohortContext';

interface ViolinPlotProps {
  className?: string;
}

interface DensityPoint {
  value: number;
  density: number;
}

// Kernel Density Estimation using Gaussian kernel
function kde(data: number[], bandwidth?: number): DensityPoint[] {
  if (data.length === 0) return [];
  
  const sorted = [...data].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min;
  
  if (range === 0) {
    return [{ value: min, density: 1 }];
  }

  // Silverman's rule of thumb for bandwidth
  const n = data.length;
  const std = Math.sqrt(data.reduce((acc, v) => acc + Math.pow(v - (data.reduce((a, b) => a + b, 0) / n), 2), 0) / n);
  const h = bandwidth || 1.06 * std * Math.pow(n, -0.2);

  const numPoints = 50;
  const step = range / (numPoints - 1);
  const points: DensityPoint[] = [];

  for (let i = 0; i < numPoints; i++) {
    const x = min + i * step;
    let density = 0;
    
    for (const xi of data) {
      const u = (x - xi) / h;
      density += Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
    }
    
    density /= (n * h);
    points.push({ value: x, density });
  }

  // Normalize to max density of 1
  const maxDensity = Math.max(...points.map(p => p.density));
  if (maxDensity > 0) {
    points.forEach(p => p.density /= maxDensity);
  }

  return points;
}

const METRICS = [
  { key: 'MCS', name: 'MCS', color: 'hsl(var(--chart-1))' },
  { key: 'LSV', name: 'LSV', color: 'hsl(var(--chart-2))' },
  { key: 'AAV', name: 'AAV', color: 'hsl(var(--chart-3))' },
];

export function ViolinPlot({ className }: ViolinPlotProps) {
  const { successfulPlans, extendedStats } = useCohort();

  const violinData = useMemo(() => {
    if (successfulPlans.length < 3) return null;

    return METRICS.map(metric => {
      const values = successfulPlans
        .map(p => p.metrics[metric.key as keyof typeof p.metrics])
        .filter((v): v is number => typeof v === 'number' && !isNaN(v));
      
      const density = kde(values);
      const stats = extendedStats?.[metric.key as keyof typeof extendedStats];
      
      return {
        ...metric,
        values,
        density,
        stats,
      };
    });
  }, [successfulPlans, extendedStats]);

  if (!violinData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Distribution Plots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Upload at least 3 plans to see distribution analysis
          </div>
        </CardContent>
      </Card>
    );
  }

  const plotWidth = 120;
  const plotHeight = 200;
  const padding = 40;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Metric Distributions (Violin Plots)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center gap-8 overflow-x-auto py-4">
          {violinData.map((metric, idx) => {
            if (metric.density.length === 0) return null;

            const min = metric.stats?.min ?? 0;
            const max = metric.stats?.max ?? 1;
            const range = max - min || 1;

            // Create violin path
            const pathPoints = metric.density.map((point, i) => {
              const y = plotHeight - ((point.value - min) / range) * plotHeight;
              const x = point.density * (plotWidth / 2 - 10);
              return { x, y, density: point.density };
            });

            // Build SVG path for violin (mirrored)
            const rightPath = pathPoints.map((p, i) => 
              `${i === 0 ? 'M' : 'L'} ${plotWidth / 2 + p.x} ${p.y}`
            ).join(' ');
            const leftPath = [...pathPoints].reverse().map((p, i) => 
              `L ${plotWidth / 2 - p.x} ${p.y}`
            ).join(' ');
            const violinPath = `${rightPath} ${leftPath} Z`;

            // Box plot overlay positions
            const q1Y = metric.stats ? plotHeight - ((metric.stats.q1 - min) / range) * plotHeight : 0;
            const medianY = metric.stats ? plotHeight - ((metric.stats.median - min) / range) * plotHeight : 0;
            const q3Y = metric.stats ? plotHeight - ((metric.stats.q3 - min) / range) * plotHeight : 0;

            return (
              <div key={metric.key} className="flex flex-col items-center">
                <svg 
                  width={plotWidth + padding} 
                  height={plotHeight + padding}
                  className="overflow-visible"
                >
                  {/* Y-axis */}
                  <line
                    x1={padding / 2}
                    y1={0}
                    x2={padding / 2}
                    y2={plotHeight}
                    stroke="hsl(var(--border))"
                    strokeWidth={1}
                  />
                  
                  {/* Y-axis ticks */}
                  {[0, 0.25, 0.5, 0.75, 1].map(tick => {
                    const y = plotHeight - tick * plotHeight;
                    const value = min + tick * range;
                    return (
                      <g key={tick}>
                        <line
                          x1={padding / 2 - 4}
                          y1={y}
                          x2={padding / 2}
                          y2={y}
                          stroke="hsl(var(--border))"
                        />
                        <text
                          x={padding / 2 - 6}
                          y={y}
                          textAnchor="end"
                          dominantBaseline="middle"
                          className="text-[8px] fill-muted-foreground"
                        >
                          {value.toFixed(2)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Violin shape */}
                  <g transform={`translate(${padding / 2}, 0)`}>
                    <path
                      d={violinPath}
                      fill={metric.color}
                      fillOpacity={0.3}
                      stroke={metric.color}
                      strokeWidth={1.5}
                    />

                    {/* Box plot overlay */}
                    {metric.stats && (
                      <>
                        {/* IQR box */}
                        <rect
                          x={plotWidth / 2 - 8}
                          y={q3Y}
                          width={16}
                          height={q1Y - q3Y}
                          fill="hsl(var(--background))"
                          stroke={metric.color}
                          strokeWidth={1.5}
                          rx={2}
                        />
                        {/* Median line */}
                        <line
                          x1={plotWidth / 2 - 8}
                          y1={medianY}
                          x2={plotWidth / 2 + 8}
                          y2={medianY}
                          stroke={metric.color}
                          strokeWidth={2}
                        />
                      </>
                    )}
                  </g>
                </svg>
                <p className="text-sm font-medium mt-1">{metric.name}</p>
                {metric.stats && (
                  <p className="text-xs text-muted-foreground">
                    μ = {metric.stats.mean.toFixed(3)}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          Violin plots show the distribution shape with embedded box plots (median and IQR)
        </div>
      </CardContent>
    </Card>
  );
}
