import { cn } from '@/lib/utils';

interface PatientAxesDiagramProps {
  className?: string;
  size?: number;
}

export function PatientAxesDiagram({ className, size = 320 }: PatientAxesDiagramProps) {
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg
        width={size}
        height={size * 0.85}
        viewBox="0 0 320 272"
        className="max-w-full"
        aria-label="Patient coordinate system: lateral view from patient's right side showing supine patient on treatment table with X-axis (left/right), Y-axis (posterior/anterior), and Z-axis (superior/inferior)"
      >
        <defs>
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
        <rect width="320" height="272" className="fill-background" />

        {/* Linac gantry ring (vertical circle around patient, viewed from side) */}
        <ellipse
          cx="160"
          cy="130"
          rx="110"
          ry="105"
          className="fill-none stroke-muted"
          strokeWidth="2.5"
          strokeDasharray="8 4"
        />
        
        {/* Gantry label */}
        <text
          x="280"
          y="50"
          className="fill-muted-foreground text-[9px]"
          textAnchor="start"
        >
          Gantry
        </text>
        <text
          x="280"
          y="60"
          className="fill-muted-foreground text-[9px]"
          textAnchor="start"
        >
          Ring
        </text>

        {/* Linac head at 0° (top of ring) */}
        <rect
          x="150"
          y="15"
          width="20"
          height="28"
          rx="3"
          className="fill-muted/50 stroke-muted-foreground"
          strokeWidth="1"
        />
        <rect
          x="155"
          y="43"
          width="10"
          height="10"
          className="fill-muted-foreground/60"
        />
        <text
          x="160"
          y="10"
          className="fill-muted-foreground text-[8px]"
          textAnchor="middle"
        >
          0°
        </text>

        {/* Treatment table */}
        <g className="fill-muted/30 stroke-muted-foreground" strokeWidth="1.5">
          {/* Table top */}
          <rect x="30" y="190" width="260" height="12" rx="2" />
          {/* Table legs */}
          <rect x="50" y="202" width="8" height="25" rx="1" />
          <rect x="262" y="202" width="8" height="25" rx="1" />
        </g>
        <text
          x="160"
          y="245"
          className="fill-muted-foreground text-[9px]"
          textAnchor="middle"
        >
          Treatment Table
        </text>

        {/* Patient body - lateral view (from patient's right side) */}
        <g>
          {/* Torso (horizontal ellipse) */}
          <ellipse
            cx="160"
            cy="165"
            rx="70"
            ry="25"
            className="fill-secondary stroke-foreground"
            strokeWidth="1"
          />
          {/* Head (on right = toward Z+) */}
          <ellipse
            cx="250"
            cy="160"
            rx="18"
            ry="22"
            className="fill-secondary stroke-foreground"
            strokeWidth="1"
          />
          {/* Neck */}
          <ellipse
            cx="228"
            cy="165"
            rx="10"
            ry="12"
            className="fill-secondary stroke-foreground"
            strokeWidth="1"
          />
          {/* Legs/feet (on left = toward Z-) */}
          <ellipse
            cx="70"
            cy="170"
            rx="30"
            ry="18"
            className="fill-secondary stroke-foreground"
            strokeWidth="1"
          />
        </g>

        {/* Patient orientation labels */}
        <text
          x="265"
          y="140"
          className="fill-foreground text-[10px] font-medium"
          textAnchor="start"
        >
          Head
        </text>
        <text
          x="35"
          y="150"
          className="fill-foreground text-[10px] font-medium"
          textAnchor="end"
        >
          Feet
        </text>

        {/* Isocenter point */}
        <circle
          cx="160"
          cy="150"
          r="4"
          className="fill-primary"
        />
        <circle
          cx="160"
          cy="150"
          r="9"
          className="fill-none stroke-primary"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {/* Z-axis (Superior/Inferior) - horizontal, pointing toward head (right) */}
        <line
          x1="160"
          y1="150"
          x2="295"
          y2="150"
          stroke="hsl(217, 91%, 60%)"
          strokeWidth="2.5"
          markerEnd="url(#arrowAxisZ)"
        />
        <text
          x="305"
          y="148"
          fill="hsl(217, 91%, 60%)"
          className="text-[12px] font-bold"
        >
          Z+
        </text>
        <text
          x="305"
          y="162"
          fill="hsl(217, 91%, 60%)"
          className="text-[9px]"
        >
          Superior
        </text>
        {/* Z- indicator (dashed, toward feet) */}
        <line
          x1="160"
          y1="150"
          x2="40"
          y2="150"
          stroke="hsl(217, 91%, 60%)"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          opacity="0.5"
        />
        <text
          x="15"
          y="160"
          fill="hsl(217, 91%, 60%)"
          className="text-[8px]"
          opacity="0.7"
        >
          Inf (−)
        </text>

        {/* Y-axis (Posterior/Anterior) - vertical */}
        {/* Y+ points DOWN toward table (posterior) */}
        <line
          x1="160"
          y1="150"
          x2="160"
          y2="250"
          stroke="hsl(142, 71%, 45%)"
          strokeWidth="2.5"
          markerEnd="url(#arrowAxisY)"
        />
        <text
          x="168"
          y="262"
          fill="hsl(142, 71%, 45%)"
          className="text-[12px] font-bold"
        >
          Y+
        </text>
        <text
          x="125"
          y="268"
          fill="hsl(142, 71%, 45%)"
          className="text-[9px]"
        >
          Posterior
        </text>
        {/* Y- indicator (dashed, toward ceiling/anterior) */}
        <line
          x1="160"
          y1="150"
          x2="160"
          y2="65"
          stroke="hsl(142, 71%, 45%)"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          opacity="0.5"
        />
        <text
          x="140"
          y="72"
          fill="hsl(142, 71%, 45%)"
          className="text-[8px]"
          opacity="0.7"
        >
          Ant (−)
        </text>

        {/* X-axis (Left/Right) - coming OUT of page (toward viewer) */}
        {/* Shown as a dot-in-circle symbol (⊙) for "toward viewer" */}
        <circle
          cx="160"
          cy="110"
          r="12"
          className="fill-none"
          stroke="hsl(0, 84%, 60%)"
          strokeWidth="2"
        />
        <circle
          cx="160"
          cy="110"
          r="3"
          fill="hsl(0, 84%, 60%)"
        />
        <text
          x="178"
          y="108"
          fill="hsl(0, 84%, 60%)"
          className="text-[12px] font-bold"
        >
          X+
        </text>
        <text
          x="178"
          y="120"
          fill="hsl(0, 84%, 60%)"
          className="text-[9px]"
        >
          Left
        </text>
        <text
          x="120"
          y="114"
          fill="hsl(0, 84%, 60%)"
          className="text-[8px]"
          opacity="0.7"
        >
          (toward you)
        </text>

        {/* Origin label */}
        <text
          x="145"
          y="145"
          className="fill-muted-foreground text-[9px] font-medium"
        >
          O
        </text>

        {/* View direction indicator */}
        <g transform="translate(25, 20)">
          <text
            className="fill-muted-foreground text-[8px]"
          >
            Viewing from
          </text>
          <text
            y="12"
            className="fill-muted-foreground text-[8px]"
          >
            patient's right
          </text>
        </g>
      </svg>
      <p className="mt-2 text-xs text-muted-foreground text-center max-w-[300px]">
        Lateral view from patient's right side. Patient supine (face-up), head-first.
        Origin at isocenter. X+ (⊙) points toward viewer (patient's left).
      </p>
    </div>
  );
}
