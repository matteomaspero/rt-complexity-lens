import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { icon: 20, text: 'text-sm' },
  md: { icon: 28, text: 'text-lg' },
  lg: { icon: 40, text: 'text-2xl' },
};

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const config = sizeConfig[size];
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LogoIcon size={config.icon} />
      {showText && (
        <span className={cn('font-bold tracking-tight', config.text)}>
          RT<span className="text-[0.7em] align-baseline">p</span>-lens
        </span>
      )}
    </div>
  );
}

interface LogoIconProps {
  size?: number;
  className?: string;
}

export function LogoIcon({ size = 28, className }: LogoIconProps) {
  // Network node positions (centered around 13,13 which is lens center)
  const centerX = 13;
  const centerY = 13;
  const radius = 5;
  
  // 6 outer nodes in hexagonal pattern
  const nodes = [
    { x: centerX, y: centerY }, // center
    { x: centerX, y: centerY - radius }, // top
    { x: centerX + radius * 0.866, y: centerY - radius * 0.5 }, // top-right
    { x: centerX + radius * 0.866, y: centerY + radius * 0.5 }, // bottom-right
    { x: centerX, y: centerY + radius }, // bottom
    { x: centerX - radius * 0.866, y: centerY + radius * 0.5 }, // bottom-left
    { x: centerX - radius * 0.866, y: centerY - radius * 0.5 }, // top-left
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer decorative ring */}
      <circle
        cx="13"
        cy="13"
        r="11"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.3"
        className="text-primary"
      />
      
      {/* Main lens circle */}
      <circle
        cx="13"
        cy="13"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        className="text-primary"
      />
      
      {/* Lens fill (semi-transparent) */}
      <circle
        cx="13"
        cy="13"
        r="8"
        fill="currentColor"
        fillOpacity="0.1"
        className="text-primary"
      />
      
      {/* Network connections - lines from center to outer nodes */}
      {nodes.slice(1).map((node, i) => (
        <line
          key={`center-${i}`}
          x1={centerX}
          y1={centerY}
          x2={node.x}
          y2={node.y}
          stroke="currentColor"
          strokeWidth="0.8"
          strokeOpacity="0.6"
          className="text-primary"
        />
      ))}
      
      {/* Network connections - lines between adjacent outer nodes */}
      {nodes.slice(1).map((node, i) => {
        const nextNode = nodes[(i + 1) % 6 + 1];
        return (
          <line
            key={`outer-${i}`}
            x1={node.x}
            y1={node.y}
            x2={nextNode.x}
            y2={nextNode.y}
            stroke="currentColor"
            strokeWidth="0.6"
            strokeOpacity="0.4"
            className="text-primary"
          />
        );
      })}
      
      {/* Network nodes */}
      {nodes.map((node, i) => (
        <circle
          key={`node-${i}`}
          cx={node.x}
          cy={node.y}
          r={i === 0 ? 1.5 : 1}
          fill="currentColor"
          className="text-primary"
        />
      ))}
      
      {/* Magnifying glass handle */}
      <line
        x1="20"
        y1="20"
        x2="28"
        y2="28"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-primary"
      />
      
      {/* Handle highlight */}
      <line
        x1="21"
        y1="21"
        x2="27"
        y2="27"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.3"
        strokeLinecap="round"
        className="text-primary"
      />
    </svg>
  );
}
