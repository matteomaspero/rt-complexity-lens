import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCohort } from '@/contexts/CohortContext';
import { MetricSelector } from './MetricSelector';
import { METRIC_DEFINITIONS, getMetricColor, extractMetricValues } from '@/lib/cohort';

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

const DEFAULT_METRICS = ['MCS', 'LSV', 'AAV'];

export function ViolinPlot({ className }: ViolinPlotProps) {
  const { successfulPlans, extendedStats } = useCohort();
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(DEFAULT_METRICS);

  const violinData = useMemo(() => {
    if (successfulPlans.length < 3) return null;

    return selectedMetrics.map(key => {
      const values = extractMetricValues(successfulPlans, key);
      const density = kde(values);
      const stats = extendedStats?.[key as keyof typeof extendedStats];
      const info = METRIC_DEFINITIONS[key];
      
      return {
        key,
        name: info?.shortName || key,
        color: getMetricColor(key),
        values,
        density,
        stats: stats && 'q1' in stats ? stats : null,
      };
    }).filter(m => m.values.length > 0);
  }, [successfulPlans, extendedStats, selectedMetrics]);

  if (successfulPlans.length < 3) {
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

  const plotWidth = 140;
  const plotHeight = 300;
  const padding = 44;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Metric Distributions (Violin Plots)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MetricSelector
          selected={selectedMetrics}
          onChange={setSelectedMetrics}
          maxSelections={5}
          groups={['complexity', 'geometric', 'beam']}
          placeholder="Select metrics to display..."
        />

        {violinData && violinData.length > 0 ? (
          <>
            <div className="flex justify-center gap-6 overflow-x-auto py-4">
              {violinData.map((metric) => {
                if (metric.density.length === 0 || !metric.stats) return null;

                const min = metric.stats.min ?? 0;
                const max = metric.stats.max ?? 1;
                const range = max - min || 1;

                // Create violin path
                const pathPoints = metric.density.map((point) => {
                  const y = plotHeight - ((point.value - min) / range) * plotHeight;
                  const x = point.density * (plotWidth / 2 - 10);
                  return { x, y, density: point.density };
                });

                // Build SVG path for violin (mirrored)
                const rightPath = pathPoints.map((p, i) => 
                  `${i === 0 ? 'M' : 'L'} ${plotWidth / 2 + p.x} ${p.y}`
                ).join(' ');
                const leftPath = [...pathPoints].reverse().map((p) => 
                  `L ${plotWidth / 2 - p.x} ${p.y}`
                ).join(' ');
                const violinPath = `${rightPath} ${leftPath} Z`;

                // Box plot overlay positions
                const q1Y = plotHeight - ((metric.stats.q1 - min) / range) * plotHeight;
                const medianY = plotHeight - ((metric.stats.median - min) / range) * plotHeight;
                const q3Y = plotHeight - ((metric.stats.q3 - min) / range) * plotHeight;
                
                // Whisker positions (1.5x IQR rule)
                const iqr = metric.stats.iqr;
                const lowerFence = Math.max(metric.stats.min, metric.stats.q1 - 1.5 * iqr);
                const upperFence = Math.min(metric.stats.max, metric.stats.q3 + 1.5 * iqr);
                const whiskerLowY = plotHeight - ((lowerFence - min) / range) * plotHeight;
                const whiskerHighY = plotHeight - ((upperFence - min) / range) * plotHeight;

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

                        {/* Box plot overlay with whiskers */}
                        <>
                          {/* Lower whisker line */}
                          <line
                            x1={plotWidth / 2}
                            y1={q1Y}
                            x2={plotWidth / 2}
                            y2={whiskerLowY}
                            stroke={metric.color}
                            strokeWidth={1.5}
                            strokeDasharray="2 2"
                          />
                          {/* Lower whisker cap */}
                          <line
                            x1={plotWidth / 2 - 6}
                            y1={whiskerLowY}
                            x2={plotWidth / 2 + 6}
                            y2={whiskerLowY}
                            stroke={metric.color}
                            strokeWidth={1.5}
                          />
                          {/* Upper whisker line */}
                          <line
                            x1={plotWidth / 2}
                            y1={q3Y}
                            x2={plotWidth / 2}
                            y2={whiskerHighY}
                            stroke={metric.color}
                            strokeWidth={1.5}
                            strokeDasharray="2 2"
                          />
                          {/* Upper whisker cap */}
                          <line
                            x1={plotWidth / 2 - 6}
                            y1={whiskerHighY}
                            x2={plotWidth / 2 + 6}
                            y2={whiskerHighY}
                            stroke={metric.color}
                            strokeWidth={1.5}
                          />
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
                      </g>
                    </svg>
                    <p className="text-sm font-medium mt-1">{metric.name}</p>
                    <p className="text-xs text-muted-foreground">
                      μ = {metric.stats.mean.toFixed(3)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="text-center text-xs text-muted-foreground">
              Violin plots show the distribution shape with embedded box plots (median, IQR, and 1.5×IQR whiskers)
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
