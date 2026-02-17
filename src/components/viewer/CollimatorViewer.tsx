import { useMemo } from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CollimatorViewerProps {
  collimatorAngle: number;
  jawPositions: {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
  };
  size?: number;
}

export function CollimatorViewer({ collimatorAngle, jawPositions, size = 160 }: CollimatorViewerProps) {
  const center = size / 2;
  const maxFieldSize = 200; // mm reference for scaling
  const scale = (size - 40) / maxFieldSize;

  // Validate jaw positions
  const hasValidJaws = 
    jawPositions.x2 > jawPositions.x1 && 
    jawPositions.y2 > jawPositions.y1;
  
  if (!hasValidJaws) {
    return (
      <div className="flex flex-col items-center">
        <div className="mb-2 flex items-center gap-1">
          <span className="text-xs font-medium text-muted-foreground">Collimator</span>
        </div>
        <div 
          className="flex items-center justify-center rounded-md border bg-muted/30"
          style={{ width: size, height: size }}
        >
          <span className="text-xs text-muted-foreground">No jaw data</span>
        </div>
      </div>
    );
  }

  // Convert collimator angle to radians (IEC 61217: 0° = leaves perpendicular to gantry axis)
  const angleRad = (collimatorAngle * Math.PI) / 180;

  // Calculate field dimensions
  const fieldWidth = (jawPositions.x2 - jawPositions.x1) * scale;
  const fieldHeight = (jawPositions.y2 - jawPositions.y1) * scale;
  const fieldArea = ((jawPositions.x2 - jawPositions.x1) * (jawPositions.y2 - jawPositions.y1)) / 100; // cm²

  // Generate tick marks every 45 degrees
  const tickMarks = useMemo(() => {
    const marks: Array<{ angle: number; x1: number; y1: number; x2: number; y2: number; label: string }> = [];
    const radius = size / 2 - 10;
    
    for (let angle = 0; angle < 360; angle += 45) {
      const rad = ((angle - 90) * Math.PI) / 180;
      const tickLength = angle % 90 === 0 ? 8 : 4;
      
      marks.push({
        angle,
        x1: center + (radius - tickLength) * Math.cos(rad),
        y1: center + (radius - tickLength) * Math.sin(rad),
        x2: center + radius * Math.cos(rad),
        y2: center + radius * Math.sin(rad),
        label: angle % 90 === 0 ? `${angle}°` : '',
      });
    }
    
    return marks;
  }, [center, size]);

  return (
    <div className="flex flex-col items-center">
      <div className="mb-2 flex items-center gap-1">
        <span className="text-xs font-medium text-muted-foreground">Collimator</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3 w-3 cursor-help text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">IEC 61217 Collimator Angle</p>
              <p className="text-xs">
                0° = MLC leaves perpendicular to gantry rotation axis.
                Positive rotation is clockwise when viewed from the radiation source.
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      <svg width={size} height={size} className="overflow-visible">
        {/* Outer circle */}
        <circle
          cx={center}
          cy={center}
          r={size / 2 - 10}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />

        {/* Tick marks */}
        {tickMarks.map((tick) => (
          <g key={tick.angle}>
            <line
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke="hsl(var(--foreground))"
              strokeWidth={tick.angle % 90 === 0 ? 1.5 : 0.5}
              opacity={tick.angle % 90 === 0 ? 0.6 : 0.3}
            />
          </g>
        ))}

        {/* Rotated field rectangle */}
        <g transform={`rotate(${collimatorAngle}, ${center}, ${center})`}>
          {/* Field rectangle */}
          <rect
            x={center - fieldWidth / 2}
            y={center - fieldHeight / 2}
            width={fieldWidth}
            height={fieldHeight}
            fill="hsl(var(--chart-secondary) / 0.3)"
            stroke="hsl(var(--chart-secondary))"
            strokeWidth="2"
          />

          {/* Cross-hairs */}
          <line
            x1={center - fieldWidth / 2 - 5}
            y1={center}
            x2={center + fieldWidth / 2 + 5}
            y2={center}
            stroke="hsl(var(--chart-primary))"
            strokeWidth="1"
            strokeDasharray="3,2"
          />
          <line
            x1={center}
            y1={center - fieldHeight / 2 - 5}
            x2={center}
            y2={center + fieldHeight / 2 + 5}
            stroke="hsl(var(--chart-primary))"
            strokeWidth="1"
            strokeDasharray="3,2"
          />

          {/* MLC direction indicator (leaves move along X) */}
          <line
            x1={center - 15}
            y1={center - fieldHeight / 2 - 3}
            x2={center + 15}
            y2={center - fieldHeight / 2 - 3}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* Current angle indicator */}
        <circle
          cx={center + (size / 2 - 20) * Math.cos(angleRad - Math.PI / 2)}
          cy={center + (size / 2 - 20) * Math.sin(angleRad - Math.PI / 2)}
          r="4"
          className="fill-primary"
        />
      </svg>

      {/* Angle and field info */}
      <div className="mt-2 text-center">
        <span className="font-mono text-lg font-semibold tabular-nums">
          {collimatorAngle.toFixed(1)}°
        </span>
      </div>

      {/* Jaw positions */}
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>X1:</span>
          <span className="font-mono">{jawPositions.x1.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span>X2:</span>
          <span className="font-mono">{jawPositions.x2.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span>Y1:</span>
          <span className="font-mono">{jawPositions.y1.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span>Y2:</span>
          <span className="font-mono">{jawPositions.y2.toFixed(1)}</span>
        </div>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Field: {fieldArea.toFixed(1)} cm²
      </div>
    </div>
  );
}
