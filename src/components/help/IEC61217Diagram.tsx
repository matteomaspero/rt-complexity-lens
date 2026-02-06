import { cn } from '@/lib/utils';

interface IEC61217DiagramProps {
  className?: string;
  size?: number;
}

export function IEC61217Diagram({ className, size = 320 }: IEC61217DiagramProps) {
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 320 320"
        className="max-w-full"
        aria-label="IEC 61217 gantry coordinate system: transverse view looking from feet toward head, showing gantry positions at 0° (anterior), 90° (left), 180° (posterior), and 270° (right)"
      >
        <defs>
          {/* Arrow marker for beam directions */}
          <marker
            id="beamArrow"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              className="fill-primary"
            />
          </marker>
          {/* Rotation arrow marker */}
          <marker
            id="rotArrow"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 8 3, 0 6"
              className="fill-muted-foreground"
            />
          </marker>
        </defs>

        {/* Background */}
        <rect width="320" height="320" className="fill-background" />

        {/* Gantry rotation ring */}
        <circle
          cx="160"
          cy="160"
          r="130"
          className="fill-none stroke-muted"
          strokeWidth="3"
          strokeDasharray="8 4"
        />

        {/* Clockwise rotation indicator arc (top-right quadrant) */}
        <path
          d="M 160 45 A 115 115 0 0 1 275 160"
          className="fill-none stroke-muted-foreground"
          strokeWidth="1.5"
          markerEnd="url(#rotArrow)"
        />
        <text
          x="245"
          y="80"
          className="fill-muted-foreground text-[10px]"
          textAnchor="middle"
        >
          CW
        </text>

        {/* Treatment couch (at bottom/posterior of patient) */}
        <rect
          x="100"
          y="200"
          width="120"
          height="14"
          rx="2"
          className="fill-muted/40 stroke-muted-foreground"
          strokeWidth="1.5"
        />
        <text
          x="160"
          y="230"
          className="fill-muted-foreground text-[9px]"
          textAnchor="middle"
        >
          Couch
        </text>

        {/* Patient cross-section (transverse view - wider L-R than A-P) */}
        <ellipse
          cx="160"
          cy="160"
          rx="55"
          ry="40"
          className="fill-secondary stroke-foreground"
          strokeWidth="1.5"
        />

        {/* Spine indicator (posterior side) */}
        <ellipse
          cx="160"
          cy="193"
          rx="8"
          ry="5"
          className="fill-muted-foreground/50"
        />

        {/* Left/Right labels inside patient */}
        <text
          x="195"
          y="164"
          className="fill-foreground text-[11px] font-medium"
          textAnchor="middle"
        >
          L
        </text>
        <text
          x="125"
          y="164"
          className="fill-foreground text-[11px] font-medium"
          textAnchor="middle"
        >
          R
        </text>

        {/* Anterior label (top) */}
        <text
          x="160"
          y="108"
          className="fill-muted-foreground text-[9px]"
          textAnchor="middle"
        >
          Anterior
        </text>

        {/* Posterior label (bottom, near couch) */}
        <text
          x="160"
          y="248"
          className="fill-muted-foreground text-[9px]"
          textAnchor="middle"
        >
          Posterior
        </text>

        {/* 0° Beam (from top/anterior) */}
        <line
          x1="160"
          y1="30"
          x2="160"
          y2="105"
          className="stroke-primary"
          strokeWidth="3"
          markerEnd="url(#beamArrow)"
        />
        <circle cx="160" cy="30" r="6" className="fill-primary" />
        <text
          x="160"
          y="15"
          className="fill-foreground text-[12px] font-semibold"
          textAnchor="middle"
        >
          0°
        </text>

        {/* 90° Beam (from right side of diagram = patient's left) */}
        <line
          x1="290"
          y1="160"
          x2="225"
          y2="160"
          className="stroke-primary"
          strokeWidth="3"
          markerEnd="url(#beamArrow)"
        />
        <circle cx="290" cy="160" r="6" className="fill-primary" />
        <text
          x="305"
          y="155"
          className="fill-foreground text-[12px] font-semibold"
          textAnchor="start"
        >
          90°
        </text>
        <text
          x="305"
          y="170"
          className="fill-muted-foreground text-[9px]"
          textAnchor="start"
        >
          (Left)
        </text>

        {/* 180° Beam (from bottom/posterior - through couch) */}
        <line
          x1="160"
          y1="290"
          x2="160"
          y2="215"
          className="stroke-primary"
          strokeWidth="3"
          markerEnd="url(#beamArrow)"
        />
        <circle cx="160" cy="290" r="6" className="fill-primary" />
        <text
          x="160"
          y="308"
          className="fill-foreground text-[12px] font-semibold"
          textAnchor="middle"
        >
          180°
        </text>

        {/* 270° Beam (from left side of diagram = patient's right) */}
        <line
          x1="30"
          y1="160"
          x2="95"
          y2="160"
          className="stroke-primary"
          strokeWidth="3"
          markerEnd="url(#beamArrow)"
        />
        <circle cx="30" cy="160" r="6" className="fill-primary" />
        <text
          x="15"
          y="155"
          className="fill-foreground text-[12px] font-semibold"
          textAnchor="end"
        >
          270°
        </text>
        <text
          x="15"
          y="170"
          className="fill-muted-foreground text-[9px]"
          textAnchor="end"
        >
          (Right)
        </text>

        {/* Isocenter marker */}
        <circle
          cx="160"
          cy="160"
          r="4"
          className="fill-primary"
        />
        <circle
          cx="160"
          cy="160"
          r="10"
          className="fill-none stroke-primary"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {/* Viewing direction indicator (bottom corner) */}
        <g transform="translate(265, 280)">
          <circle cx="0" cy="0" r="12" className="fill-muted/50 stroke-muted-foreground" strokeWidth="1" />
          <circle cx="0" cy="0" r="3" className="fill-foreground" />
          <text
            x="0"
            y="28"
            className="fill-muted-foreground text-[8px]"
            textAnchor="middle"
          >
            View: ↑
          </text>
          <text
            x="0"
            y="38"
            className="fill-muted-foreground text-[7px]"
            textAnchor="middle"
          >
            (from feet)
          </text>
        </g>
      </svg>
      <p className="mt-2 text-xs text-muted-foreground text-center max-w-[300px]">
        Transverse view (looking from feet toward head). Patient supine on couch. 
        Gantry rotates clockwise. 0° = beam from above (AP).
      </p>
    </div>
  );
}
