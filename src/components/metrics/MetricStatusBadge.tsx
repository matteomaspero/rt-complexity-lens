import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

export type MetricStatus = 'ok' | 'warning' | 'critical';

interface MetricStatusBadgeProps {
  status: MetricStatus;
  metricKey: string;
  value: number;
  threshold?: {
    warning?: number;
    critical?: number;
  };
  showIcon?: boolean;
  showText?: boolean;
}

const STATUS_CONFIG = {
  ok: {
    label: 'OK',
    icon: CheckCircle2,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    borderColor: 'border-green-300 dark:border-green-700',
    dotColor: 'bg-green-500',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    borderColor: 'border-yellow-300 dark:border-yellow-700',
    dotColor: 'bg-yellow-500',
  },
  critical: {
    label: 'Critical',
    icon: AlertCircle,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-300 dark:border-red-700',
    dotColor: 'bg-red-500',
  },
};

export function MetricStatusBadge({
  status,
  metricKey,
  value,
  threshold,
  showIcon = true,
  showText = true,
}: MetricStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const tooltipContent = (
    <div className="space-y-2">
      <div className="font-semibold">{config.label} Status</div>
      <div className="text-xs space-y-1">
        <div>Current value: {value.toFixed(3)}</div>
        {threshold && (
          <>
            {threshold.warning !== undefined && (
              <div>Warning threshold: {threshold.warning}</div>
            )}
            {threshold.critical !== undefined && (
              <div>Critical threshold: {threshold.critical}</div>
            )}
          </>
        )}
      </div>
      {status !== 'ok' && (
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <strong>Recommendation:</strong>{' '}
          {status === 'critical'
            ? 'Requires detailed QA verification before delivery'
            : 'Additional QA emphasis recommended'}
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`${config.bgColor} ${config.textColor} ${config.borderColor} gap-1.5 cursor-help`}
          >
            {showIcon && <Icon className="h-3 w-3" />}
            {showText && <span className="text-xs">{config.label}</span>}
            {!showText && <span className={`h-2 w-2 rounded-full ${config.dotColor}`} />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Determine metric status based on value and thresholds
 */
export function getMetricStatus(
  value: number,
  threshold?: {
    warning?: number;
    critical?: number;
    inverse?: boolean; // If true, higher values are better (e.g., MFA)
  }
): MetricStatus {
  if (!threshold) return 'ok';

  const { warning, critical, inverse = false } = threshold;

  if (inverse) {
    // Higher is better (e.g., MFA, aperture area)
    if (critical !== undefined && value < critical) return 'critical';
    if (warning !== undefined && value < warning) return 'warning';
  } else {
    // Lower is better (e.g., MCS, complexity metrics)
    if (critical !== undefined && value > critical) return 'critical';
    if (warning !== undefined && value > warning) return 'warning';
  }

  return 'ok';
}
