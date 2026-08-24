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
  Area,
  AreaChart,
} from 'recharts';
import { ChartExportButton } from '@/components/ui/exportable-chart';
import {
  ChartFocusButton,
  ChartFocusFooter,
  ChartFocusOverlay,
  useChartFocus,
} from '@/components/ui/chart-focus';
import { cn } from '@/lib/utils';
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
  const lsvRef = useRef<HTMLDivElement>(null);
  const aavRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const focus_lsvRef = useChartFocus();
  const focus_aavRef = useChartFocus();
  const focus_areaRef = useChartFocus();

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
  const currentArea = (controlPointMetrics[currentIndex]?.apertureArea ?? 0) / 100;

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '6px',
    fontSize: '12px',
  };

  return (
    <div className="space-y-3">
      {/* LSV Chart Card */}
      <div ref={lsvRef} className={cn("rounded-lg border bg-card p-3", focus_lsvRef.focusClassName)}>
        <ChartFocusOverlay open={focus_lsvRef.isFocused} onClose={focus_lsvRef.close} />
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-medium text-muted-foreground">
            LSV (Leaf Sequence Variability)
          </h4>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium">
              {currentLSV.toFixed(4)}
            </span>
            <ChartExportButton chartRef={lsvRef} filename="lsv_chart" />
            <ChartFocusButton isFocused={focus_lsvRef.isFocused} onToggle={focus_lsvRef.toggle} />
          </div>
        </div>
        <div className={cn(focus_lsvRef.focusHeightClassName)} style={focus_lsvRef.isFocused ? undefined : { height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--chart-grid))"
              vertical={false}
            />
            <XAxis
              dataKey="angle"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={{ fontSize: 9, fill: 'hsl(var(--foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(v) => `${v}°`}
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'hsl(var(--foreground))' }}
              tickLine={false}
              axisLine={false}
              domain={[0, 1]}
              tickFormatter={(v) => v.toFixed(1)}
              width={30}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number) => [value.toFixed(4), 'LSV']}
              labelFormatter={(label) => `Angle: ${Number(label).toFixed(1)}°`}
            />
            <Area
              type="monotone"
              dataKey="LSV"
              stroke="hsl(var(--chart-primary))"
              fill="hsl(var(--chart-primary))"
              fillOpacity={0.2}
              strokeWidth={2}
              isAnimationActive={false}
            />
            <ReferenceLine
              x={currentAngle}
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              strokeDasharray="4 2"
            />
          </AreaChart>
        </ResponsiveContainer>
        </div>
        <ChartFocusFooter isFocused={focus_lsvRef.isFocused} />
      </div>

      {/* AAV Chart Card */}
      <div ref={aavRef} className={cn("rounded-lg border bg-card p-3", focus_aavRef.focusClassName)}>
        <ChartFocusOverlay open={focus_aavRef.isFocused} onClose={focus_aavRef.close} />
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-medium text-muted-foreground">
            AAV (Aperture Area Variability)
          </h4>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium">
              {currentAAV.toFixed(4)}
            </span>
            <ChartExportButton chartRef={aavRef} filename="aav_chart" />
            <ChartFocusButton isFocused={focus_aavRef.isFocused} onToggle={focus_aavRef.toggle} />
          </div>
        </div>
        <div className={cn(focus_aavRef.focusHeightClassName)} style={focus_aavRef.isFocused ? undefined : { height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--chart-grid))"
              vertical={false}
            />
            <XAxis
              dataKey="angle"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={{ fontSize: 9, fill: 'hsl(var(--foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(v) => `${v}°`}
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'hsl(var(--foreground))' }}
              tickLine={false}
              axisLine={false}
              domain={[0, 1]}
              tickFormatter={(v) => v.toFixed(1)}
              width={30}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number) => [value.toFixed(4), 'AAV']}
              labelFormatter={(label) => `Angle: ${Number(label).toFixed(1)}°`}
            />
            <Line
              type="monotone"
              dataKey="AAV"
              stroke="hsl(var(--chart-secondary))"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <ReferenceLine
              x={currentAngle}
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
        </div>
        <ChartFocusFooter isFocused={focus_aavRef.isFocused} />
      </div>

      {/* Aperture Area Chart Card */}
      <div ref={areaRef} className={cn("rounded-lg border bg-card p-3", focus_areaRef.focusClassName)}>
        <ChartFocusOverlay open={focus_areaRef.isFocused} onClose={focus_areaRef.close} />
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-medium text-muted-foreground">
            Aperture Area
          </h4>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium">
              {currentArea.toFixed(1)} cm²
            </span>
            <ChartExportButton chartRef={areaRef} filename="aperture_area" />
            <ChartFocusButton isFocused={focus_areaRef.isFocused} onToggle={focus_areaRef.toggle} />
          </div>
        </div>
        <div className={cn(focus_areaRef.focusHeightClassName)} style={focus_areaRef.isFocused ? undefined : { height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--chart-grid))"
              vertical={false}
            />
            <XAxis
              dataKey="index"
              tick={{ fontSize: 9, fill: 'hsl(var(--foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'hsl(var(--foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
              width={30}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number) => [`${value.toFixed(1)} cm²`, 'Area']}
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
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              strokeDasharray="4 2"
            />
          </AreaChart>
        </ResponsiveContainer>
        </div>
        <ChartFocusFooter isFocused={focus_areaRef.isFocused} />
      </div>
    </div>
  );
}
