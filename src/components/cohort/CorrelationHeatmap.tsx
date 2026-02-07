import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCohort } from '@/contexts/CohortContext';
import { getCorrelationColor, getMetricDisplayName, interpretCorrelation } from '@/lib/cohort';

interface CorrelationHeatmapProps {
  className?: string;
}

export function CorrelationHeatmap({ className }: CorrelationHeatmapProps) {
  const { correlationMatrix } = useCohort();

  const cellSize = 45;

  const gridData = useMemo(() => {
    if (!correlationMatrix) return null;

    const { metrics, values } = correlationMatrix;
    const cells: Array<{
      row: number;
      col: number;
      metric1: string;
      metric2: string;
      value: number;
      color: string;
    }> = [];

    for (let i = 0; i < metrics.length; i++) {
      for (let j = 0; j < metrics.length; j++) {
        cells.push({
          row: i,
          col: j,
          metric1: metrics[i],
          metric2: metrics[j],
          value: values[i][j],
          color: getCorrelationColor(values[i][j]),
        });
      }
    }

    return {
      metrics,
      cells,
      size: metrics.length,
    };
  }, [correlationMatrix]);

  if (!correlationMatrix || !gridData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Correlation Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Upload at least 2 plans to see correlation analysis
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalWidth = cellSize * gridData.size + 80;
  const totalHeight = cellSize * gridData.size + 40;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Metric Correlation Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <svg 
            width={totalWidth} 
            height={totalHeight}
            className="mx-auto"
          >
            {/* Y-axis labels */}
            {gridData.metrics.map((metric, i) => (
              <text
                key={`y-label-${i}`}
                x={75}
                y={20 + i * cellSize + cellSize / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-xs fill-foreground"
              >
                {getMetricDisplayName(metric)}
              </text>
            ))}

            {/* X-axis labels */}
            {gridData.metrics.map((metric, j) => (
              <text
                key={`x-label-${j}`}
                x={80 + j * cellSize + cellSize / 2}
                y={20 + gridData.size * cellSize + 15}
                textAnchor="middle"
                className="text-xs fill-foreground"
              >
                {getMetricDisplayName(metric)}
              </text>
            ))}

            {/* Cells */}
            {gridData.cells.map((cell, idx) => (
              <g key={idx}>
                <rect
                  x={80 + cell.col * cellSize}
                  y={20 + cell.row * cellSize}
                  width={cellSize - 2}
                  height={cellSize - 2}
                  fill={cell.color}
                  rx={4}
                  className="transition-opacity hover:opacity-80 cursor-pointer"
                >
                  <title>
                    {`${getMetricDisplayName(cell.metric1)} vs ${getMetricDisplayName(cell.metric2)}\nCorrelation: ${cell.value.toFixed(3)}\n${interpretCorrelation(cell.value)} ${cell.value >= 0 ? 'positive' : 'negative'}`}
                  </title>
                </rect>
                <text
                  x={80 + cell.col * cellSize + (cellSize - 2) / 2}
                  y={20 + cell.row * cellSize + (cellSize - 2) / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-mono pointer-events-none"
                  fill={Math.abs(cell.value) > 0.5 ? 'white' : 'hsl(var(--foreground))'}
                >
                  {cell.value.toFixed(2)}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Color Legend */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">-1</span>
          <div 
            className="w-40 h-4 rounded"
            style={{
              background: 'linear-gradient(to right, hsl(220, 70%, 55%), hsl(220, 0%, 95%), hsl(0, 70%, 55%))'
            }}
          />
          <span className="text-xs text-muted-foreground">+1</span>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Hover over cells for detailed correlation interpretation
        </p>
      </CardContent>
    </Card>
  );
}
