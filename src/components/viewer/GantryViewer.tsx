import { useMemo } from 'react';

interface GantryViewerProps {
  gantryAngle: number;
  direction: 'CW' | 'CCW' | 'NONE';
  size?: number;
}

export function GantryViewer({ gantryAngle, direction, size = 180 }: GantryViewerProps) {
  const center = size / 2;
  const radius = size / 2 - 20;
  const innerRadius = radius - 15;

  // Convert gantry angle to SVG coordinates (0° is at top, clockwise)
  const angleRad = ((gantryAngle - 90) * Math.PI) / 180;
  
  const gantryPosition = useMemo(() => ({
    x: center + radius * Math.cos(angleRad),
    y: center + radius * Math.sin(angleRad),
    innerX: center + innerRadius * Math.cos(angleRad),
    innerY: center + innerRadius * Math.sin(angleRad),
  }), [angleRad, center, radius, innerRadius]);

  // Generate tick marks every 30 degrees
  const tickMarks = useMemo(() => {
    const marks: Array<{ angle: number; x1: number; y1: number; x2: number; y2: number; label: string }> = [];
    
    for (let angle = 0; angle < 360; angle += 30) {
      const rad = ((angle - 90) * Math.PI) / 180;
      const tickLength = angle % 90 === 0 ? 10 : 5;
      
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
  }, [center, radius]);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />

        {/* Inner circle (couch representation) */}
        <circle
          cx={center}
          cy={center}
          r={25}
          className="fill-muted stroke-border"
          strokeWidth="1"
        />
        <text
          x={center}
          y={center + 4}
          textAnchor="middle"
          className="fill-muted-foreground text-[10px]"
        >
          Couch
        </text>

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
            {tick.label && (
              <text
                x={center + (radius + 15) * Math.cos(((tick.angle - 90) * Math.PI) / 180)}
                y={center + (radius + 15) * Math.sin(((tick.angle - 90) * Math.PI) / 180) + 3}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {tick.label}
              </text>
            )}
          </g>
        ))}

        {/* Gantry beam line */}
        <line
          x1={center}
          y1={center}
          x2={gantryPosition.innerX}
          y2={gantryPosition.innerY}
          stroke="hsl(var(--chart-primary))"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Gantry head indicator */}
        <circle
          cx={gantryPosition.innerX}
          cy={gantryPosition.innerY}
          r="8"
          className="fill-primary stroke-primary-foreground"
          strokeWidth="2"
        />

        {/* Direction indicator */}
        {direction !== 'NONE' && (
          <text
            x={center}
            y={size - 5}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {direction === 'CW' ? '↻ Clockwise' : '↺ Counter-clockwise'}
          </text>
        )}
      </svg>

      {/* Angle display */}
      <div className="mt-2 text-center">
        <span className="font-mono text-xl font-semibold tabular-nums">
          {gantryAngle.toFixed(1)}°
        </span>
      </div>
    </div>
  );
}
