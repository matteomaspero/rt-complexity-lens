import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import type { Beam, ControlPointMetrics } from '@/lib/dicom/types';

interface ComplexityHeatmapProps {
  beam: Beam;
  controlPointMetrics: ControlPointMetrics[];
  currentIndex: number;
}

export function ComplexityHeatmap({
  beam,
  controlPointMetrics,
  currentIndex,
}: ComplexityHeatmapProps) {
  // Build chart data with angle and complexity metrics
  const chartData = useMemo(() => {
    return beam.controlPoints.map((cp, idx) => {
      const cpm = controlPointMetrics[idx];
      return {
        index: idx + 1,
        angle: cp.gantryAngle,
        LSV: cpm.apertureLSV,
        AAV: cpm.apertureAAV,
        area: cpm.apertureArea / 100, // Convert mm² to cm² for display
      };
    });
  }, [beam, controlPointMetrics]);

  const currentAngle = beam.controlPoints[currentIndex]?.gantryAngle ?? 0;
  const currentLSV = controlPointMetrics[currentIndex]?.apertureLSV ?? 0;
  const currentAAV = controlPointMetrics[currentIndex]?.apertureAAV ?? 0;

  return (
    <div className="space-y-4">
      {/* LSV and AAV over the arc */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-medium">Complexity vs Gantry Angle</h4>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: 'hsl(var(--chart-primary))' }}
              />
              LSV: {currentLSV.toFixed(3)}
            </span>
            <span className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: 'hsl(var(--chart-secondary))' }}
              />
              AAV: {currentAAV.toFixed(3)}
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--chart-grid))"
              vertical={false}
            />
            <XAxis
              dataKey="angle"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              label={{
                value: 'Gantry Angle (°)',
                position: 'insideBottom',
                offset: -10,
                fontSize: 10,
                fill: 'hsl(var(--muted-foreground))',
              }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={[0, 1]}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [value.toFixed(4), name]}
              labelFormatter={(label) => `Angle: ${Number(label).toFixed(1)}°`}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="LSV"
              stroke="hsl(var(--chart-primary))"
              fill="hsl(var(--chart-primary))"
              fillOpacity={0.1}
              strokeWidth={2}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="AAV"
              stroke="hsl(var(--chart-secondary))"
              strokeWidth={2}
              dot={false}
            />
            <ReferenceLine
              x={currentAngle}
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              strokeDasharray="4 2"
              yAxisId="left"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Aperture Area Variation */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-medium">Aperture Area vs Control Point</h4>
          <span className="font-mono text-sm">
            {(controlPointMetrics[currentIndex]?.apertureArea / 100).toFixed(1)} cm²
          </span>
        </div>
        <ResponsiveContainer width="100%" height={120}>
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
              formatter={(value: number) => [`${value.toFixed(1)} cm²`, 'Aperture Area']}
              labelFormatter={(label) => `Control Point ${label}`}
            />
            <Area
              type="monotone"
              dataKey="area"
              stroke="hsl(var(--chart-tertiary))"
              fill="hsl(var(--chart-tertiary))"
              fillOpacity={0.2}
              strokeWidth={2}
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
    </div>
  );
}
