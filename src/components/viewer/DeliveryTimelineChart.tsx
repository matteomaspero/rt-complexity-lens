import { useMemo, useRef } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { ChartExportButton } from '@/components/ui/exportable-chart';
import type { Beam, ControlPointMetrics, MachineDeliveryParams } from '@/lib/dicom/types';
import { calculateControlPointSegments } from '@/lib/dicom/angular-binning';
import { DEFAULT_MACHINE_PARAMS } from '@/lib/threshold-definitions';

interface DeliveryTimelineChartProps {
  beam: Beam;
  controlPointMetrics: ControlPointMetrics[];
  currentIndex: number;
  machineParams?: MachineDeliveryParams;
}

const LIMITING_FACTOR_COLORS = {
  doseRate: 'hsl(var(--chart-primary))',
  gantrySpeed: 'hsl(var(--chart-secondary))',
  mlcSpeed: 'hsl(var(--chart-tertiary))',
};

export function DeliveryTimelineChart({
  beam,
  controlPointMetrics,
  currentIndex,
  machineParams = DEFAULT_MACHINE_PARAMS,
}: DeliveryTimelineChartProps) {
  const durationRef = useRef<HTMLDivElement>(null);
  const doseRateRef = useRef<HTMLDivElement>(null);
  const gantryRef = useRef<HTMLDivElement>(null);
  const mlcRef = useRef<HTMLDivElement>(null);

  const segments = useMemo(
    () => calculateControlPointSegments(beam, controlPointMetrics, machineParams),
    [beam, controlPointMetrics, machineParams]
  );

  // Build timeline data with cumulative time
  const timelineData = useMemo(() => {
    let cumulativeTime = 0;
    return segments.map((seg, idx) => {
      const startTime = cumulativeTime;
      cumulativeTime += seg.duration;
      return {
        index: idx + 1,
        gantryAngle: seg.gantryAngle.toFixed(0),
        duration: seg.duration,
        startTime,
        endTime: cumulativeTime,
        limitingFactor: seg.limitingFactor,
        doseRate: seg.doseRate,
        gantrySpeed: seg.gantrySpeed,
        mlcSpeed: seg.maxLeafSpeed,
        MU: seg.MU,
      };
    });
  }, [segments]);

  const totalTime =
    timelineData.length > 0 ? timelineData[timelineData.length - 1].endTime : 0;

  // Current segment timing
  const currentSegment =
    timelineData[Math.min(currentIndex - 1, timelineData.length - 1)];
  const currentAngle = currentSegment?.gantryAngle ?? '0';

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '6px',
    fontSize: '12px',
  };

  const chartHeight = 90;

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Total Est. Time: <span className="font-mono font-medium">{totalTime.toFixed(1)}s</span>
        </span>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: LIMITING_FACTOR_COLORS.doseRate }}
            />
            Dose Rate
          </span>
          <span className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: LIMITING_FACTOR_COLORS.gantrySpeed }}
            />
            Gantry
          </span>
          <span className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: LIMITING_FACTOR_COLORS.mlcSpeed }}
            />
            MLC
          </span>
        </div>
      </div>

      {/* Segment Duration Bar Chart */}
      <div ref={durationRef} className="rounded-lg border bg-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-medium text-muted-foreground">
            Segment Duration (colored by limiting factor)
          </h4>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium">
              {currentSegment?.duration.toFixed(2) ?? 0}s
            </span>
            <ChartExportButton chartRef={durationRef} filename="segment_duration" />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={timelineData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--chart-grid))"
              vertical={false}
            />
            <XAxis
              dataKey="gantryAngle"
              tick={{ fontSize: 9, fill: 'hsl(var(--foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(v) => `${v}°`}
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'hsl(var(--foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v.toFixed(1)}s`}
              width={35}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number) => [`${value.toFixed(2)}s`, 'Duration']}
              labelFormatter={(label) => `Angle: ${label}°`}
            />
            <Bar dataKey="duration" radius={[2, 2, 0, 0]}>
              {timelineData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={LIMITING_FACTOR_COLORS[entry.limitingFactor]}
                  opacity={index === currentIndex - 1 ? 1 : 0.7}
                />
              ))}
            </Bar>
            <ReferenceLine
              x={currentAngle}
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              strokeDasharray="4 2"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Dose Rate Chart */}
      <div ref={doseRateRef} className="rounded-lg border bg-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-medium text-muted-foreground">Dose Rate</h4>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium">
              {currentSegment?.doseRate.toFixed(0) ?? 0} MU/min
            </span>
            <ChartExportButton chartRef={doseRateRef} filename="dose_rate" />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={timelineData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--chart-grid))"
              vertical={false}
            />
            <XAxis
              dataKey="gantryAngle"
              tick={{ fontSize: 9, fill: 'hsl(var(--foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(v) => `${v}°`}
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'hsl(var(--foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
              width={35}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number) => [`${value.toFixed(0)} MU/min`, 'Dose Rate']}
              labelFormatter={(label) => `Angle: ${label}°`}
            />
            <Line
              type="monotone"
              dataKey="doseRate"
              stroke={LIMITING_FACTOR_COLORS.doseRate}
              strokeWidth={2}
              dot={false}
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

      {/* Gantry Speed Chart (only for arcs) */}
      {beam.isArc && (
        <div ref={gantryRef} className="rounded-lg border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-medium text-muted-foreground">Gantry Speed</h4>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium">
                {currentSegment?.gantrySpeed.toFixed(1) ?? 0} °/s
              </span>
              <ChartExportButton chartRef={gantryRef} filename="gantry_speed" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={timelineData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--chart-grid))"
                vertical={false}
              />
              <XAxis
                dataKey="gantryAngle"
                tick={{ fontSize: 9, fill: 'hsl(var(--foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickFormatter={(v) => `${v}°`}
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'hsl(var(--foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}`}
                width={35}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => [`${value.toFixed(2)} °/s`, 'Gantry Speed']}
                labelFormatter={(label) => `Angle: ${label}°`}
              />
              <Line
                type="monotone"
                dataKey="gantrySpeed"
                stroke={LIMITING_FACTOR_COLORS.gantrySpeed}
                strokeWidth={2}
                dot={false}
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
      )}

      {/* MLC Speed Chart */}
      <div ref={mlcRef} className="rounded-lg border bg-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-medium text-muted-foreground">Max MLC Speed</h4>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium">
              {currentSegment?.mlcSpeed.toFixed(1) ?? 0} mm/s
            </span>
            <ChartExportButton chartRef={mlcRef} filename="mlc_speed" />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={timelineData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--chart-grid))"
              vertical={false}
            />
            <XAxis
              dataKey="gantryAngle"
              tick={{ fontSize: 9, fill: 'hsl(var(--foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(v) => `${v}°`}
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'hsl(var(--foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
              width={35}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number) => [`${value.toFixed(1)} mm/s`, 'MLC Speed']}
              labelFormatter={(label) => `Angle: ${label}°`}
            />
            <Line
              type="monotone"
              dataKey="mlcSpeed"
              stroke={LIMITING_FACTOR_COLORS.mlcSpeed}
              strokeWidth={2}
              dot={false}
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
    </div>
  );
}
