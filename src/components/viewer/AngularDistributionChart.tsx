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

  // Dose rate line chart data
  const doseRateData = useMemo(() => 
    getDoseRateByAngleData(segments),
    [segments]
  );

  // Current gantry angle for reference line
  const currentAngle = beam.controlPoints[currentIndex]?.gantryAngle ?? 0;

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

      {/* Dose Rate vs Gantry Angle */}
      <div ref={doseRateRef} className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-medium">Dose Rate vs Gantry Angle</h4>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">
              {doseRateData[Math.min(currentIndex, doseRateData.length - 1)]?.doseRate.toFixed(0) ?? 0} MU/min
            </span>
            <ChartExportButton chartRef={doseRateRef} filename="dose_rate_vs_angle" />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={doseRateData} margin={{ top: 5, right: 5, bottom: 20, left: 5 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--chart-grid))"
              vertical={false}
            />
            <XAxis
              dataKey="angle"
              type="number"
              domain={[0, 360]}
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
              formatter={(value: number) => [`${value.toFixed(1)} MU/min`, 'Dose Rate']}
              labelFormatter={(label) => `${Number(label).toFixed(1)}°`}
            />
            <Line
              type="monotone"
              dataKey="doseRate"
              stroke="hsl(var(--chart-primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--chart-primary))' }}
            />
            <ReferenceLine
              x={currentAngle}
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
