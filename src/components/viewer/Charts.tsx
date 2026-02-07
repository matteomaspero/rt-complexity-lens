import { useMemo, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ChartExportButton } from '@/components/ui/exportable-chart';
import type { ControlPoint } from '@/lib/dicom/types';

interface CumulativeMUChartProps {
  controlPoints: ControlPoint[];
  currentIndex: number;
  totalMU: number;
  height?: number;
}

export function CumulativeMUChart({
  controlPoints,
  currentIndex,
  totalMU,
  height = 150,
}: CumulativeMUChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    return controlPoints.map((cp, index) => ({
      index: index + 1,
      cumulativeMU: cp.cumulativeMetersetWeight * totalMU,
      gantryAngle: cp.gantryAngle,
    }));
  }, [controlPoints, totalMU]);

  const currentMU = chartData[currentIndex]?.cumulativeMU ?? 0;

  return (
    <div ref={chartRef} className="rounded-lg border bg-card p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-sm font-medium">Cumulative MU</h4>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-semibold tabular-nums">
            {currentMU.toFixed(1)} <span className="text-sm text-muted-foreground">MU</span>
          </span>
          <ChartExportButton chartRef={chartRef} filename="cumulative_mu" />
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--chart-grid))" 
            vertical={false}
          />
          <XAxis
            dataKey="index"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value.toFixed(1)} MU`, 'Cumulative MU']}
            labelFormatter={(label) => `Control Point ${label}`}
          />
          <Line
            type="monotone"
            dataKey="cumulativeMU"
            stroke="hsl(var(--chart-primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'hsl(var(--chart-primary))' }}
          />
          <ReferenceLine
            x={currentIndex + 1}
            stroke="hsl(var(--chart-secondary))"
            strokeWidth={2}
            strokeDasharray="4 2"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface GantrySpeedChartProps {
  controlPoints: ControlPoint[];
  currentIndex: number;
  height?: number;
}

export function GantrySpeedChart({
  controlPoints,
  currentIndex,
  height = 150,
}: GantrySpeedChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const chartData = useMemo(() => {
    const data: Array<{ index: number; speed: number; angle: number }> = [];
    
    for (let i = 0; i < controlPoints.length; i++) {
      const cp = controlPoints[i];
      let speed = 0;
      
      if (i > 0) {
        const prevCP = controlPoints[i - 1];
        const angleDiff = Math.abs(cp.gantryAngle - prevCP.gantryAngle);
        const mwDiff = cp.cumulativeMetersetWeight - prevCP.cumulativeMetersetWeight;
        
        // Estimate speed based on meterset weight change
        // This is a rough approximation
        if (mwDiff > 0) {
          speed = angleDiff / (mwDiff * 10); // Normalize to reasonable values
        }
      }
      
      data.push({
        index: i + 1,
        speed: Math.min(speed, 10), // Cap at reasonable max
        angle: cp.gantryAngle,
      });
    }
    
    return data;
  }, [controlPoints]);

  const currentSpeed = chartData[currentIndex]?.speed ?? 0;

  return (
    <div ref={chartRef} className="rounded-lg border bg-card p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-sm font-medium">Gantry Speed (relative)</h4>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-semibold tabular-nums">
            {currentSpeed.toFixed(1)}
          </span>
          <ChartExportButton chartRef={chartRef} filename="gantry_speed" />
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--chart-grid))" 
            vertical={false}
          />
          <XAxis
            dataKey="index"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [value.toFixed(2), 'Relative Speed']}
            labelFormatter={(label) => `Control Point ${label}`}
          />
          <Line
            type="monotone"
            dataKey="speed"
            stroke="hsl(var(--chart-tertiary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'hsl(var(--chart-tertiary))' }}
          />
          <ReferenceLine
            x={currentIndex + 1}
            stroke="hsl(var(--chart-secondary))"
            strokeWidth={2}
            strokeDasharray="4 2"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
