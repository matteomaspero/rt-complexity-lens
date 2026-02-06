import { cn } from '@/lib/utils';

interface IEC61217DiagramProps {
  className?: string;
  size?: number;
}

export function IEC61217Diagram({ className, size = 280 }: IEC61217DiagramProps) {
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 300 300"
        className="max-w-full"
        aria-label="IEC 61217 gantry coordinate system diagram showing beam directions at 0°, 90°, 180°, and 270° around a supine patient"
      >
        <defs>
          {/* Arrow marker for beam directions */}
          <marker
            id="arrowhead"
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
            id="rotationArrow"
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
        <rect width="300" height="300" className="fill-background" />

        {/* Gantry rotation circle */}
        <circle
          cx="150"
          cy="150"
          r="110"
          className="fill-none stroke-muted"
          strokeWidth="2"
          strokeDasharray="6 4"
        />

        {/* Clockwise rotation indicator arc */}
        <path
          d="M 150 55 A 95 95 0 0 1 245 150"
          className="fill-none stroke-muted-foreground"
          strokeWidth="1.5"
          markerEnd="url(#rotationArrow)"
        />
        <text
          x="215"
          y="85"
          className="fill-muted-foreground text-[9px]"
          textAnchor="middle"
        >
          CW
        </text>

        {/* Treatment couch (rectangle) */}
        <rect
          x="115"
          y="100"
          width="70"
          height="100"
          rx="4"
          className="fill-muted/30 stroke-muted-foreground"
          strokeWidth="1.5"
        />

        {/* Patient body (supine - head toward 0°) */}
        <ellipse
          cx="150"
          cy="165"
          rx="22"
          ry="30"
          className="fill-secondary stroke-foreground"
          strokeWidth="1"
        />
        {/* Patient head */}
        <circle
          cx="150"
          cy="120"
          r="14"
          className="fill-secondary stroke-foreground"
          strokeWidth="1"
        />
        {/* Patient arms */}
        <ellipse
          cx="122"
          cy="155"
          rx="6"
          ry="18"
          className="fill-secondary stroke-foreground"
          strokeWidth="1"
        />
        <ellipse
          cx="178"
          cy="155"
          rx="6"
          ry="18"
          className="fill-secondary stroke-foreground"
          strokeWidth="1"
        />

        {/* 0° Beam (Superior - from top) */}
        <line
          x1="150"
          y1="25"
          x2="150"
          y2="85"
          className="stroke-primary"
          strokeWidth="3"
          markerEnd="url(#arrowhead)"
        />
        <circle cx="150" cy="25" r="5" className="fill-primary" />
        <text
          x="150"
          y="12"
          className="fill-foreground text-[11px] font-medium"
          textAnchor="middle"
        >
          0° (Superior)
        </text>

        {/* 90° Beam (Left lateral) */}
        <line
          x1="275"
          y1="150"
          x2="215"
          y2="150"
          className="stroke-primary"
          strokeWidth="3"
          markerEnd="url(#arrowhead)"
        />
        <circle cx="275" cy="150" r="5" className="fill-primary" />
        <text
          x="275"
          y="140"
          className="fill-foreground text-[11px] font-medium"
          textAnchor="middle"
        >
          90°
        </text>
        <text
          x="275"
          y="170"
          className="fill-muted-foreground text-[9px]"
          textAnchor="middle"
        >
          (Left)
        </text>

        {/* 180° Beam (Inferior - from bottom) */}
        <line
          x1="150"
          y1="275"
          x2="150"
          y2="215"
          className="stroke-primary"
          strokeWidth="3"
          markerEnd="url(#arrowhead)"
        />
        <circle cx="150" cy="275" r="5" className="fill-primary" />
        <text
          x="150"
          y="295"
          className="fill-foreground text-[11px] font-medium"
          textAnchor="middle"
        >
          180° (Inferior)
        </text>

        {/* 270° Beam (Right lateral) */}
        <line
          x1="25"
          y1="150"
          x2="85"
          y2="150"
          className="stroke-primary"
          strokeWidth="3"
          markerEnd="url(#arrowhead)"
        />
        <circle cx="25" cy="150" r="5" className="fill-primary" />
        <text
          x="25"
          y="140"
          className="fill-foreground text-[11px] font-medium"
          textAnchor="middle"
        >
          270°
        </text>
        <text
          x="25"
          y="170"
          className="fill-muted-foreground text-[9px]"
          textAnchor="middle"
        >
          (Right)
        </text>

        {/* Isocenter marker */}
        <circle
          cx="150"
          cy="150"
          r="4"
          className="fill-primary"
        />
        <circle
          cx="150"
          cy="150"
          r="8"
          className="fill-none stroke-primary"
          strokeWidth="1"
        />

        {/* Patient orientation labels */}
        <text
          x="150"
          y="106"
          className="fill-foreground text-[8px] font-medium"
          textAnchor="middle"
        >
          HEAD
        </text>
        <text
          x="150"
          y="200"
          className="fill-foreground text-[8px] font-medium"
          textAnchor="middle"
        >
          FEET
        </text>
      </svg>
      <p className="mt-2 text-xs text-muted-foreground text-center max-w-[280px]">
        Bird's-eye view (looking down at patient). Gantry rotates clockwise from 0°.
        Beam directions shown as arrows pointing toward isocenter.
      </p>
    </div>
  );
}
