import { cn } from '@/lib/utils';

interface PatientAxesDiagramProps {
  className?: string;
  size?: number;
}

export function PatientAxesDiagram({ className, size = 300 }: PatientAxesDiagramProps) {
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg
        width={size}
        height={size * 0.9}
        viewBox="0 0 300 270"
        className="max-w-full"
        aria-label="Patient coordinate system showing supine patient on treatment table with X-axis (left/right), Y-axis (posterior/anterior), and Z-axis (superior/inferior), with linac gantry ring for reference"
      >
        <defs>
          {/* X-axis arrow (red) */}
          <marker
            id="arrowAxisX"
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
            id="arrowAxisY"
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
            id="arrowAxisZ"
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
        <rect width="300" height="270" className="fill-background" />

        {/* Treatment table (3D isometric box) */}
        <g className="fill-muted/30 stroke-muted-foreground" strokeWidth="1.5">
          {/* Table top surface */}
          <path d="M 50,175 L 90,190 L 250,190 L 270,175 L 270,170 L 250,185 L 90,185 L 50,170 Z" />
          {/* Table front edge */}
          <path d="M 90,185 L 90,195 L 250,195 L 250,185" className="fill-muted/20" />
          {/* Table legs hint */}
          <line x1="100" y1="195" x2="100" y2="210" />
          <line x1="240" y1="195" x2="240" y2="210" />
        </g>

        {/* Linac gantry ring (tilted ellipse around patient) */}
        <ellipse
          cx="170"
          cy="130"
          rx="95"
          ry="70"
          className="fill-none stroke-muted"
          strokeWidth="2"
          strokeDasharray="6 3"
          transform="rotate(-5, 170, 130)"
        />
        {/* Gantry label */}
        <text
          x="275"
          y="100"
          className="fill-muted-foreground text-[8px]"
          textAnchor="start"
        >
          Gantry
        </text>

        {/* Linac head representation at 0° (top) */}
        <rect
          x="160"
          y="45"
          width="20"
          height="25"
          rx="3"
          className="fill-muted/50 stroke-muted-foreground"
          strokeWidth="1"
        />
        <rect
          x="165"
          y="70"
          width="10"
          height="8"
          className="fill-muted-foreground/60"
        />

        {/* Patient body lying supine on table */}
        <g>
          {/* Torso */}
          <ellipse
            cx="170"
            cy="150"
            rx="50"
            ry="22"
            className="fill-secondary stroke-foreground"
            strokeWidth="1"
          />
          {/* Head */}
          <ellipse
            cx="235"
            cy="148"
            rx="18"
            ry="14"
            className="fill-secondary stroke-foreground"
            strokeWidth="1"
          />
          {/* Neck connection */}
          <ellipse
            cx="215"
            cy="150"
            rx="8"
            ry="10"
            className="fill-secondary stroke-foreground"
            strokeWidth="1"
          />
          {/* Legs/feet area */}
          <ellipse
            cx="100"
            cy="155"
            rx="25"
            ry="15"
            className="fill-secondary stroke-foreground"
            strokeWidth="1"
          />
          {/* Left arm hint */}
          <ellipse
            cx="170"
            cy="170"
            rx="35"
            ry="6"
            className="fill-secondary/80 stroke-foreground"
            strokeWidth="0.5"
          />
        </g>

        {/* Labels for patient orientation */}
        <text
          x="255"
          y="148"
          className="fill-foreground text-[9px] font-medium"
          textAnchor="start"
        >
          Head
        </text>
        <text
          x="65"
          y="158"
          className="fill-foreground text-[9px] font-medium"
          textAnchor="end"
        >
          Feet
        </text>

        {/* Isocenter point */}
        <circle
          cx="170"
          cy="140"
          r="4"
          className="fill-primary"
        />
        <circle
          cx="170"
          cy="140"
          r="8"
          className="fill-none stroke-primary"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {/* X-axis (Left/Right) - pointing to patient's left (viewer's right in this view) */}
        <line
          x1="170"
          y1="140"
          x2="170"
          y2="80"
          stroke="hsl(0, 84%, 60%)"
          strokeWidth="2.5"
          markerEnd="url(#arrowAxisX)"
        />
        <text
          x="178"
          y="70"
          fill="hsl(0, 84%, 60%)"
          className="text-[11px] font-bold"
        >
          X+
        </text>
        <text
          x="178"
          y="82"
          fill="hsl(0, 84%, 60%)"
          className="text-[8px]"
        >
          (Left)
        </text>
        {/* X- indicator (dashed, toward Right) */}
        <line
          x1="170"
          y1="140"
          x2="170"
          y2="175"
          stroke="hsl(0, 84%, 60%)"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          opacity="0.5"
        />
        <text
          x="175"
          y="188"
          fill="hsl(0, 84%, 60%)"
          className="text-[7px]"
          opacity="0.7"
        >
          Right (−)
        </text>

        {/* Y-axis (Posterior/Anterior) - pointing posterior (toward table/down in isometric) */}
        <line
          x1="170"
          y1="140"
          x2="135"
          y2="175"
          stroke="hsl(142, 71%, 45%)"
          strokeWidth="2.5"
          markerEnd="url(#arrowAxisY)"
        />
        <text
          x="115"
          y="188"
          fill="hsl(142, 71%, 45%)"
          className="text-[11px] font-bold"
        >
          Y+
        </text>
        <text
          x="105"
          y="200"
          fill="hsl(142, 71%, 45%)"
          className="text-[8px]"
        >
          (Post.)
        </text>
        {/* Y- indicator (dashed, toward Anterior/ceiling) */}
        <line
          x1="170"
          y1="140"
          x2="195"
          y2="115"
          stroke="hsl(142, 71%, 45%)"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          opacity="0.5"
        />
        <text
          x="200"
          y="108"
          fill="hsl(142, 71%, 45%)"
          className="text-[7px]"
          opacity="0.7"
        >
          Ant. (−)
        </text>

        {/* Z-axis (Superior/Inferior) - pointing toward head (superior) */}
        <line
          x1="170"
          y1="140"
          x2="265"
          y2="125"
          stroke="hsl(217, 91%, 60%)"
          strokeWidth="2.5"
          markerEnd="url(#arrowAxisZ)"
        />
        <text
          x="272"
          y="120"
          fill="hsl(217, 91%, 60%)"
          className="text-[11px] font-bold"
        >
          Z+
        </text>
        <text
          x="272"
          y="132"
          fill="hsl(217, 91%, 60%)"
          className="text-[8px]"
        >
          (Sup.)
        </text>
        {/* Z- indicator (dashed, toward feet/inferior) */}
        <line
          x1="170"
          y1="140"
          x2="90"
          y2="155"
          stroke="hsl(217, 91%, 60%)"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          opacity="0.5"
        />
        <text
          x="55"
          y="145"
          fill="hsl(217, 91%, 60%)"
          className="text-[7px]"
          opacity="0.7"
        >
          Inf. (−)
        </text>

        {/* Origin label */}
        <text
          x="152"
          y="138"
          className="fill-muted-foreground text-[8px]"
        >
          O
        </text>

        {/* Coordinate system note */}
        <text
          x="20"
          y="255"
          className="fill-muted-foreground text-[7px]"
        >
          Note: Y+ toward table (Posterior), Y− toward ceiling (Anterior)
        </text>
      </svg>
      <p className="mt-2 text-xs text-muted-foreground text-center max-w-[280px]">
        Patient supine (face-up) on treatment table, head-first. Origin at isocenter.
        Linac gantry ring shown for context. Solid arrows = positive (+) directions.
      </p>
    </div>
  );
}
