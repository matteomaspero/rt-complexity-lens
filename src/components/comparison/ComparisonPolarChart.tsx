import { useMemo, useRef } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartExportButton } from '@/components/ui/exportable-chart';
import type { Beam, ControlPointMetrics, MachineDeliveryParams } from '@/lib/dicom/types';
import {
  calculateControlPointSegments,
  calculateAngularBins,
} from '@/lib/dicom/angular-binning';
import { DEFAULT_MACHINE_PARAMS } from '@/lib/threshold-definitions';

interface ComparisonPolarChartProps {
  beamA: Beam;
  beamB: Beam;
  controlPointMetricsA: ControlPointMetrics[];
  controlPointMetricsB: ControlPointMetrics[];
  machineParams?: MachineDeliveryParams;
}

export function ComparisonPolarChart({
  beamA,
  beamB,
  controlPointMetricsA,
  controlPointMetricsB,
  machineParams = DEFAULT_MACHINE_PARAMS,
}: ComparisonPolarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  // Calculate segments and bins for both plans
  const segmentsA = useMemo(
    () => calculateControlPointSegments(beamA, controlPointMetricsA, machineParams),
    [beamA, controlPointMetricsA, machineParams]
  );

  const segmentsB = useMemo(
    () => calculateControlPointSegments(beamB, controlPointMetricsB, machineParams),
    [beamB, controlPointMetricsB, machineParams]
  );

  const binsA = useMemo(() => calculateAngularBins(segmentsA, 15), [segmentsA]);
  const binsB = useMemo(() => calculateAngularBins(segmentsB, 15), [segmentsB]);

  // Merge bins for comparison
  const polarData = useMemo(() => {
    const maxMU = Math.max(
      ...binsA.map((b) => b.MU),
      ...binsB.map((b) => b.MU)
    );
    const fullMark = maxMU * 1.1;

    return binsA.map((binA, i) => {
      const binB = binsB[i];
      return {
        subject: `${binA.angleMid}°`,
        muA: binA.MU,
        muB: binB?.MU ?? 0,
        fullMark,
      };
    });
  }, [binsA, binsB]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalMuA = binsA.reduce((sum, b) => sum + b.MU, 0);
    const totalMuB = binsB.reduce((sum, b) => sum + b.MU, 0);
    const peakBinA = binsA.reduce((max, b) => (b.MU > max.MU ? b : max), binsA[0]);
    const peakBinB = binsB.reduce((max, b) => (b.MU > max.MU ? b : max), binsB[0]);

    return {
      totalMuA,
      totalMuB,
      peakAngleA: peakBinA?.angleMid ?? 0,
      peakAngleB: peakBinB?.angleMid ?? 0,
      peakMuA: peakBinA?.MU ?? 0,
      peakMuB: peakBinB?.MU ?? 0,
    };
  }, [binsA, binsB]);

  return (
    <Card ref={chartRef}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">MU Distribution by Gantry Angle</CardTitle>
          <ChartExportButton chartRef={chartRef} filename="mu_distribution_comparison" />
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>
            <span className="text-[hsl(var(--chart-comparison-a))]">●</span> Plan A peak:{' '}
            <span className="font-mono">{stats.peakMuA.toFixed(1)} MU</span> at {stats.peakAngleA}°
          </span>
          <span>
            <span className="text-[hsl(var(--chart-comparison-b))]">●</span> Plan B peak:{' '}
            <span className="font-mono">{stats.peakMuB.toFixed(1)} MU</span> at {stats.peakAngleB}°
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex justify-center">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={polarData} cx="50%" cy="50%" outerRadius="65%">
              <PolarGrid stroke="hsl(var(--chart-grid))" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
              />
              <PolarRadiusAxis
                tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => (v > 0 ? v.toFixed(0) : '')}
              />
              <Radar
                name="Plan A"
                dataKey="muA"
                stroke="hsl(var(--chart-comparison-a))"
                fill="hsl(var(--chart-comparison-a))"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Radar
                name="Plan B"
                dataKey="muB"
                stroke="hsl(var(--chart-comparison-b))"
                fill="hsl(var(--chart-comparison-b))"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(2)} MU`,
                  name,
                ]}
              />
              <Legend
                verticalAlign="bottom"
                height={24}
                wrapperStyle={{ fontSize: '11px' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          0° = Superior (IEC 61217) · 15° bins
        </p>
      </CardContent>
    </Card>
  );
}
