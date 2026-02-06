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
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Beam, BeamMetrics } from '@/lib/dicom/types';

interface ComparisonDeliveryChartProps {
  beamA: Beam;
  beamB: Beam;
  metricsA: BeamMetrics;
  metricsB: BeamMetrics;
  currentCPIndex: number;
  height?: number;
}

export function ComparisonDeliveryChart({
  beamA,
  beamB,
  metricsA,
  metricsB,
  currentCPIndex,
  height = 180,
}: ComparisonDeliveryChartProps) {
  // Prepare aperture area data
  const apertureData = useMemo(() => {
    const maxCPs = Math.max(
      metricsA.controlPointMetrics.length,
      metricsB.controlPointMetrics.length
    );
    const data: Array<{
      index: number;
      areaA: number | null;
      areaB: number | null;
    }> = [];

    for (let i = 0; i < maxCPs; i++) {
      const cpA = metricsA.controlPointMetrics[i];
      const cpB = metricsB.controlPointMetrics[i];
      
      data.push({
        index: i + 1,
        areaA: cpA ? cpA.apertureArea / 100 : null, // Convert to cm²
        areaB: cpB ? cpB.apertureArea / 100 : null,
      });
    }

    return data;
  }, [metricsA, metricsB]);

  // Prepare gantry angle data
  const gantryData = useMemo(() => {
    const maxCPs = Math.max(beamA.controlPoints.length, beamB.controlPoints.length);
    const data: Array<{
      index: number;
      gantryA: number | null;
      gantryB: number | null;
    }> = [];

    for (let i = 0; i < maxCPs; i++) {
      const cpA = beamA.controlPoints[i];
      const cpB = beamB.controlPoints[i];
      
      data.push({
        index: i + 1,
        gantryA: cpA ? cpA.gantryAngle : null,
        gantryB: cpB ? cpB.gantryAngle : null,
      });
    }

    return data;
  }, [beamA, beamB]);

  // Prepare LSV/AAV complexity data
  const complexityData = useMemo(() => {
    const maxCPs = Math.max(
      metricsA.controlPointMetrics.length,
      metricsB.controlPointMetrics.length
    );
    const data: Array<{
      index: number;
      lsvA: number | null;
      lsvB: number | null;
      aavA: number | null;
      aavB: number | null;
    }> = [];

    for (let i = 0; i < maxCPs; i++) {
      const cpA = metricsA.controlPointMetrics[i];
      const cpB = metricsB.controlPointMetrics[i];
      
      data.push({
        index: i + 1,
        lsvA: cpA ? cpA.apertureLSV : null,
        lsvB: cpB ? cpB.apertureLSV : null,
        aavA: cpA ? cpA.apertureAAV : null,
        aavB: cpB ? cpB.apertureAAV : null,
      });
    }

    return data;
  }, [metricsA, metricsB]);

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '6px',
    fontSize: '12px',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Delivery Comparison</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="aperture" className="w-full">
          <TabsList className="mb-2 h-8">
            <TabsTrigger value="aperture" className="text-xs">Aperture</TabsTrigger>
            <TabsTrigger value="gantry" className="text-xs">Gantry</TabsTrigger>
            <TabsTrigger value="complexity" className="text-xs">Complexity</TabsTrigger>
          </TabsList>

          {/* Aperture Area Chart */}
          <TabsContent value="aperture" className="mt-0">
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={apertureData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
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
                  label={{
                    value: 'cm²',
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 10,
                    fill: 'hsl(var(--muted-foreground))',
                  }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number | null, name: string) => {
                    if (value === null) return ['N/A', name];
                    const label = name === 'areaA' ? 'Plan A' : 'Plan B';
                    return [`${value.toFixed(1)} cm²`, label];
                  }}
                  labelFormatter={(label) => `CP ${label}`}
                />
                <Legend
                  verticalAlign="top"
                  height={24}
                  formatter={(value) => (value === 'areaA' ? 'Plan A' : 'Plan B')}
                />
                <Line
                  type="monotone"
                  dataKey="areaA"
                  name="areaA"
                  stroke="hsl(var(--chart-comparison-a))"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="areaB"
                  name="areaB"
                  stroke="hsl(var(--chart-comparison-b))"
                  strokeWidth={2}
                  dot={false}
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
          </TabsContent>

          {/* Gantry Angle Chart */}
          <TabsContent value="gantry" className="mt-0">
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={gantryData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
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
                  domain={[0, 360]}
                  tickFormatter={(v) => `${v}°`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number | null, name: string) => {
                    if (value === null) return ['N/A', name];
                    const label = name === 'gantryA' ? 'Plan A' : 'Plan B';
                    return [`${value.toFixed(1)}°`, label];
                  }}
                  labelFormatter={(label) => `CP ${label}`}
                />
                <Legend
                  verticalAlign="top"
                  height={24}
                  formatter={(value) => (value === 'gantryA' ? 'Plan A' : 'Plan B')}
                />
                <Line
                  type="monotone"
                  dataKey="gantryA"
                  name="gantryA"
                  stroke="hsl(var(--chart-comparison-a))"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="gantryB"
                  name="gantryB"
                  stroke="hsl(var(--chart-comparison-b))"
                  strokeWidth={2}
                  dot={false}
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
          </TabsContent>

          {/* Complexity (LSV) Chart */}
          <TabsContent value="complexity" className="mt-0">
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={complexityData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
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
                  domain={[0, 1]}
                  tickFormatter={(v) => v.toFixed(1)}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number | null, name: string) => {
                    if (value === null) return ['N/A', name];
                    const label = name.includes('A') ? 'Plan A' : 'Plan B';
                    const metric = name.includes('lsv') ? 'LSV' : 'AAV';
                    return [value.toFixed(3), `${label} ${metric}`];
                  }}
                  labelFormatter={(label) => `CP ${label}`}
                />
                <Legend
                  verticalAlign="top"
                  height={24}
                  formatter={(value) => {
                    if (value === 'lsvA') return 'A LSV';
                    if (value === 'lsvB') return 'B LSV';
                    if (value === 'aavA') return 'A AAV';
                    return 'B AAV';
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="lsvA"
                  name="lsvA"
                  stroke="hsl(var(--chart-comparison-a))"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="lsvB"
                  name="lsvB"
                  stroke="hsl(var(--chart-comparison-b))"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="aavA"
                  name="aavA"
                  stroke="hsl(var(--chart-comparison-a))"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="aavB"
                  name="aavB"
                  stroke="hsl(var(--chart-comparison-b))"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
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
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
