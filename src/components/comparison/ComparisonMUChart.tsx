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
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartExportButton } from '@/components/ui/exportable-chart';
import type { Beam } from '@/lib/dicom/types';

interface ComparisonMUChartProps {
  beamA: Beam;
  beamB: Beam;
  muA: number;
  muB: number;
  currentCPIndex: number;
  height?: number;
}

export function ComparisonMUChart({
  beamA,
  beamB,
  muA,
  muB,
  currentCPIndex,
  height = 180,
}: ComparisonMUChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  // Normalize control points to same x-axis (percentage of arc)
  const chartData = useMemo(() => {
    const maxCPs = Math.max(beamA.controlPoints.length, beamB.controlPoints.length);
    const data: Array<{
      index: number;
      percentComplete: number;
      muA: number | null;
      muB: number | null;
      gantryA: number | null;
      gantryB: number | null;
    }> = [];

    for (let i = 0; i < maxCPs; i++) {
      const cpA = beamA.controlPoints[i];
      const cpB = beamB.controlPoints[i];
      
      data.push({
        index: i + 1,
        percentComplete: (i / (maxCPs - 1)) * 100,
        muA: cpA ? cpA.cumulativeMetersetWeight * muA : null,
        muB: cpB ? cpB.cumulativeMetersetWeight * muB : null,
        gantryA: cpA ? cpA.gantryAngle : null,
        gantryB: cpB ? cpB.gantryAngle : null,
      });
    }

    return data;
  }, [beamA, beamB, muA, muB]);

  const currentMU_A = chartData[currentCPIndex]?.muA ?? 0;
  const currentMU_B = chartData[currentCPIndex]?.muB ?? 0;

  return (
    <Card ref={chartRef}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Cumulative MU Comparison</CardTitle>
          <ChartExportButton chartRef={chartRef} filename="cumulative_mu_comparison" />
        </div>
        <div className="flex gap-4 text-xs">
          <span>
            <span className="text-[hsl(var(--chart-comparison-a))]">● Plan A:</span>{' '}
            <span className="font-mono">{currentMU_A.toFixed(1)} MU</span>
          </span>
          <span>
            <span className="text-[hsl(var(--chart-comparison-b))]">● Plan B:</span>{' '}
            <span className="font-mono">{currentMU_B.toFixed(1)} MU</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
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
              formatter={(value: number | null, name: string) => {
                if (value === null) return ['N/A', name];
                const label = name === 'muA' ? 'Plan A' : 'Plan B';
                return [`${value.toFixed(1)} MU`, label];
              }}
              labelFormatter={(label) => `Control Point ${label}`}
            />
            <Legend
              verticalAlign="top"
              height={24}
              formatter={(value) => (value === 'muA' ? 'Plan A' : 'Plan B')}
            />
            <Line
              type="monotone"
              dataKey="muA"
              name="muA"
              stroke="hsl(var(--chart-comparison-a))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--chart-comparison-a))' }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="muB"
              name="muB"
              stroke="hsl(var(--chart-comparison-b))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--chart-comparison-b))' }}
              connectNulls
            />
            <ReferenceLine
              x={currentCPIndex + 1}
              stroke="hsl(var(--foreground))"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              opacity={0.5}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
