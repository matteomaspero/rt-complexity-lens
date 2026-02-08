import { useMemo, useRef } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  ComposedChart,
} from 'recharts';
import { ChartExportButton } from '@/components/ui/exportable-chart';
import type { Beam, ControlPointMetrics, MachineDeliveryParams } from '@/lib/dicom/types';
import {
  calculateControlPointSegments,
  calculateAngularBins,
  getDoseRateByAngleData,
} from '@/lib/dicom/angular-binning';
import { DEFAULT_MACHINE_PARAMS } from '@/lib/threshold-definitions';

interface AngularDistributionChartProps {
  beam: Beam;
  controlPointMetrics: ControlPointMetrics[];
  currentIndex: number;
  machineParams?: MachineDeliveryParams;
}

// Color scheme for rotations (tailwind colors)
const ROTATION_COLORS = [
  'hsl(var(--chart-primary))',      // Blue
  'hsl(var(--chart-secondary))',    // Orange
  'hsl(var(--chart-tertiary))',     // Green
  'hsl(var(--chart-quaternary))',   // Purple/Red
  'hsl(208, 100%, 50%)',            // Cyan
  'hsl(142, 76%, 36%)',             // Emerald
];

const ROTATION_DASH_PATTERNS = [[], [4, 2], [2, 2], [8, 2], [4, 4]];

export function AngularDistributionChart({
  beam,
  controlPointMetrics,
  currentIndex,
  machineParams = DEFAULT_MACHINE_PARAMS,
}: AngularDistributionChartProps) {
  const polarRef = useRef<HTMLDivElement>(null);
  const doseRateRef = useRef<HTMLDivElement>(null);

  // Calculate segments and bins
  const segments = useMemo(() => 
    calculateControlPointSegments(beam, controlPointMetrics, machineParams),
    [beam, controlPointMetrics, machineParams]
  );

  const angularBins = useMemo(() => 
    calculateAngularBins(segments, 15),
    [segments]
  );

  // Transform bins for Recharts RadarChart (needs specific format)
  const polarData = useMemo(() => {
    // Recharts radar expects subject-based data
    return angularBins.map(bin => ({
      subject: `${bin.angleMid}°`,
      MU: bin.MU,
      fullMark: Math.max(...angularBins.map(b => b.MU)) * 1.1,
    }));
  }, [angularBins]);

  // Dose rate line chart data with rotation info
  const doseRateData = useMemo(() => 
    getDoseRateByAngleData(segments),
    [segments]
  );

  // Get unique rotations
  const uniqueRotations = useMemo(() => {
    const rotations = [...new Set(doseRateData.map(d => d.rotationNumber))];
    return rotations.sort((a, b) => a - b);
  }, [doseRateData]);

  // Current gantry angle for reference line
  const currentAngle = beam.controlPoints[currentIndex]?.gantryAngle ?? 0;
  
  // Find current rotation state
  const currentRotation = useMemo(() => {
    const currentSeg = segments[Math.min(currentIndex, segments.length - 1)];
    return currentSeg?.rotationNumber ?? 0;
  }, [currentIndex, segments]);

  return (
    <div className="space-y-4">
      {/* Polar MU Distribution */}
      <div ref={polarRef} className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-medium">MU Distribution by Angle</h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Current: <span className="font-mono">{currentAngle.toFixed(1)}°</span>
            </span>
            <ChartExportButton chartRef={polarRef} filename="mu_distribution_polar" />
          </div>
        </div>
        <div className="flex justify-center">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={polarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(var(--chart-grid))" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              />
              <PolarRadiusAxis
                tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => v > 0 ? v.toFixed(0) : ''}
              />
              <Radar
                name="MU"
                dataKey="MU"
                stroke="hsl(var(--chart-primary))"
                fill="hsl(var(--chart-primary))"
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          0° = Superior (IEC 61217)
        </p>
      </div>

      {/* Dose Rate vs Gantry Angle - Multi-Rotation */}
      <div ref={doseRateRef} className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Dose Rate vs Gantry Angle</h4>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">
                {doseRateData[Math.min(currentIndex, doseRateData.length - 1)]?.doseRate.toFixed(0) ?? 0} MU/min
              </span>
              <ChartExportButton chartRef={doseRateRef} filename="dose_rate_vs_angle" />
            </div>
          </div>
          
          {/* Rotation Info */}
          {uniqueRotations.length > 1 && (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="font-semibold">Rotations:</span>
              {uniqueRotations.map(rot => (
                <span
                  key={rot}
                  className={`px-2 py-1 rounded ${
                    rot === currentRotation
                      ? 'bg-primary/10 text-foreground font-semibold'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {rot + 1} ({doseRateData.find(d => d.rotationNumber === rot)?.gantryDirection})
                </span>
              ))}
            </div>
          )}
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={doseRateData} margin={{ top: 5, right: 5, bottom: 30, left: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--chart-grid))"
              vertical={false}
            />
            <XAxis
              dataKey="normalizedAngle"
              type="number"
              domain={[0, 360]}
              tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(value: number) => `${value.toFixed(0)}°`}
              label={{
                value: 'Gantry Angle per Rotation (°)',
                position: 'insideBottom',
                offset: -15,
                fontSize: 10,
                fill: 'hsl(var(--muted-foreground))',
              }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v.toFixed(0)}`}
              label={{
                value: 'Dose Rate (MU/min)',
                angle: -90,
                position: 'insideLeft',
                fontSize: 10,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'doseRate') return [`${value.toFixed(1)} MU/min`, 'Dose Rate'];
                return [value, name];
              }}
              labelFormatter={(label) => `${Number(label).toFixed(1)}°`}
            />

            {/* Render separate lines for each rotation */}
            {uniqueRotations.map((rotNum) => (
              <Line
                key={`rotation-${rotNum}`}
                data={doseRateData.filter(d => d.rotationNumber === rotNum)}
                dataKey="doseRate"
                stroke={ROTATION_COLORS[rotNum % ROTATION_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                strokeDasharray={ROTATION_DASH_PATTERNS[rotNum % ROTATION_DASH_PATTERNS.length]}
                name={`Rotation ${rotNum + 1}`}
                connectNulls={false}
                type="monotone"
              />
            ))}

            <ReferenceLine
              x={currentAngle}
              stroke="hsl(var(--chart-secondary))"
              strokeWidth={2}
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Legend for rotations */}
        {uniqueRotations.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-3 border-t pt-2">
            {uniqueRotations.map((rotNum) => (
              <div key={`legend-${rotNum}`} className="flex items-center gap-2 text-xs">
                <div
                  className="h-2 w-4"
                  style={{
                    backgroundColor: ROTATION_COLORS[rotNum % ROTATION_COLORS.length],
                    borderDasharray: ROTATION_DASH_PATTERNS[rotNum % ROTATION_DASH_PATTERNS.length]
                      .join(','),
                  }}
                />
                <span className="text-muted-foreground">
                  Rotation {rotNum + 1}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
