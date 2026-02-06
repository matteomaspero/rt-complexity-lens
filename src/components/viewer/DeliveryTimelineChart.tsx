import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
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

  const totalTime = timelineData.length > 0
    ? timelineData[timelineData.length - 1].endTime
    : 0;

  // Current segment timing
  const currentSegment = timelineData[Math.min(currentIndex - 1, timelineData.length - 1)];
  const currentTime = currentSegment?.startTime ?? 0;

  return (
    <div className="space-y-4">
      {/* Segment Duration Bar Chart with Limiting Factor Colors */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-medium">Segment Duration</h4>
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
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={timelineData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--chart-grid))"
              vertical={false}
            />
            <XAxis
              dataKey="gantryAngle"
              tick={{ fontSize: 9 }}
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
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v.toFixed(1)}s`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'duration') return [`${value.toFixed(2)}s`, 'Duration'];
                return [value, name];
              }}
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
              x={currentSegment?.gantryAngle ?? '0'}
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              strokeDasharray="4 2"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 rounded-lg border bg-card p-4">
        <div>
          <span className="text-xs text-muted-foreground">Total Time</span>
          <p className="font-mono text-sm font-semibold">{totalTime.toFixed(1)}s</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Current</span>
          <p className="font-mono text-sm font-semibold">{currentTime.toFixed(1)}s</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Avg Segment</span>
          <p className="font-mono text-sm font-semibold">
            {(totalTime / Math.max(timelineData.length, 1)).toFixed(2)}s
          </p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Limiting Factor</span>
          <p className="text-sm font-semibold capitalize">
            {currentSegment?.limitingFactor.replace('Speed', ' Spd') ?? '-'}
          </p>
        </div>
      </div>
    </div>
  );
}
