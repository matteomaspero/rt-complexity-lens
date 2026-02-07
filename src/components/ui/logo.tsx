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
          RTp-lens
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
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background circle representing the lens */}
      <circle
        cx="16"
        cy="16"
        r="14"
        stroke="currentColor"
        strokeWidth="2"
        className="text-primary"
      />
      
      {/* Inner lens rings */}
      <circle
        cx="16"
        cy="16"
        r="10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.4"
        className="text-primary"
      />
      <circle
        cx="16"
        cy="16"
        r="6"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.2"
        className="text-primary"
      />
      
      {/* RT letters */}
      <text
        x="16"
        y="18"
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-primary"
        fill="currentColor"
        fontSize="10"
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        RT
      </text>
      
      {/* Lens reflection highlight */}
      <path
        d="M8 10 Q12 6 16 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.3"
        fill="none"
        className="text-primary"
      />
    </svg>
  );
}
