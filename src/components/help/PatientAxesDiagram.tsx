import { cn } from '@/lib/utils';

interface PatientAxesDiagramProps {
  className?: string;
  size?: number;
}

export function PatientAxesDiagram({ className, size = 220 }: PatientAxesDiagramProps) {
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 240 240"
        className="max-w-full"
        aria-label="Patient coordinate system showing X-axis (left/right), Y-axis (posterior/anterior), and Z-axis (superior/inferior)"
      >
        <defs>
          {/* X-axis arrow (red) */}
          <marker
            id="arrowX"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="hsl(0, 84%, 60%)" />
          </marker>
          {/* Y-axis arrow (green) */}
          <marker
            id="arrowY"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="hsl(142, 71%, 45%)" />
          </marker>
          {/* Z-axis arrow (blue) */}
          <marker
            id="arrowZ"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="hsl(217, 91%, 60%)" />
          </marker>
        </defs>

        {/* Background */}
        <rect width="240" height="240" className="fill-background" />

        {/* Grid lines for depth perception */}
        <g className="stroke-muted" strokeWidth="0.5" strokeDasharray="2 2">
          <line x1="120" y1="120" x2="60" y2="160" />
          <line x1="120" y1="120" x2="180" y2="160" />
          <line x1="120" y1="120" x2="120" y2="180" />
        </g>

        {/* Origin point */}
        <circle cx="120" cy="120" r="4" className="fill-foreground" />
        <text
          x="108"
          y="134"
          className="fill-muted-foreground text-[9px]"
        >
          O
        </text>

        {/* X-axis (Left/Right) - going right in isometric view */}
        <line
          x1="120"
          y1="120"
          x2="200"
          y2="150"
          stroke="hsl(0, 84%, 60%)"
          strokeWidth="3"
          markerEnd="url(#arrowX)"
        />
        {/* X+ label (Left) */}
        <text
          x="210"
          y="160"
          fill="hsl(0, 84%, 60%)"
          className="text-[11px] font-bold"
        >
          X+
        </text>
        <text
          x="210"
          y="173"
          fill="hsl(0, 84%, 60%)"
          className="text-[9px]"
        >
          (Left)
        </text>
        {/* X- direction indicator */}
        <line
          x1="120"
          y1="120"
          x2="70"
          y2="100"
          stroke="hsl(0, 84%, 60%)"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          opacity="0.5"
        />
        <text
          x="50"
          y="95"
          fill="hsl(0, 84%, 60%)"
          className="text-[9px]"
          opacity="0.7"
        >
          Right (−)
        </text>

        {/* Y-axis (Posterior/Anterior) - going left-down in isometric view */}
        <line
          x1="120"
          y1="120"
          x2="40"
          y2="150"
          stroke="hsl(142, 71%, 45%)"
          strokeWidth="3"
          markerEnd="url(#arrowY)"
        />
        {/* Y+ label (Posterior) */}
        <text
          x="18"
          y="160"
          fill="hsl(142, 71%, 45%)"
          className="text-[11px] font-bold"
        >
          Y+
        </text>
        <text
          x="10"
          y="173"
          fill="hsl(142, 71%, 45%)"
          className="text-[9px]"
        >
          (Post.)
        </text>
        {/* Y- direction indicator */}
        <line
          x1="120"
          y1="120"
          x2="170"
          y2="100"
          stroke="hsl(142, 71%, 45%)"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          opacity="0.5"
        />
        <text
          x="168"
          y="90"
          fill="hsl(142, 71%, 45%)"
          className="text-[9px]"
          opacity="0.7"
        >
          Ant. (−)
        </text>

        {/* Z-axis (Superior/Inferior) - going straight up */}
        <line
          x1="120"
          y1="120"
          x2="120"
          y2="35"
          stroke="hsl(217, 91%, 60%)"
          strokeWidth="3"
          markerEnd="url(#arrowZ)"
        />
        {/* Z+ label (Superior) */}
        <text
          x="130"
          y="30"
          fill="hsl(217, 91%, 60%)"
          className="text-[11px] font-bold"
        >
          Z+
        </text>
        <text
          x="130"
          y="43"
          fill="hsl(217, 91%, 60%)"
          className="text-[9px]"
        >
          (Superior)
        </text>
        {/* Z- direction indicator */}
        <line
          x1="120"
          y1="120"
          x2="120"
          y2="200"
          stroke="hsl(217, 91%, 60%)"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          opacity="0.5"
        />
        <text
          x="95"
          y="215"
          fill="hsl(217, 91%, 60%)"
          className="text-[9px]"
          opacity="0.7"
        >
          Inferior (−)
        </text>

        {/* Patient silhouette in center for reference */}
        <g opacity="0.4">
          {/* Head */}
          <ellipse
            cx="120"
            cy="70"
            rx="12"
            ry="10"
            className="fill-muted-foreground"
          />
          {/* Body hint */}
          <ellipse
            cx="120"
            cy="100"
            rx="8"
            ry="15"
            className="fill-muted-foreground"
          />
        </g>
      </svg>
      <p className="mt-2 text-xs text-muted-foreground text-center max-w-[220px]">
        Patient coordinate system (supine, head-first). Origin at isocenter.
        Solid arrows show positive (+) direction.
      </p>
    </div>
  );
}
