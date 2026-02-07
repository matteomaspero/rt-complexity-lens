import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NoteBoxProps {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function NoteBox({ children, className, icon }: NoteBoxProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border-l-4 border-primary bg-primary/5 p-4 text-sm',
        className
      )}
    >
      <span className="shrink-0 text-primary mt-0.5">
        {icon ?? <Info className="h-4 w-4" />}
      </span>
      <div className="flex-1 text-muted-foreground">{children}</div>
    </div>
  );
}

interface SubsectionHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function SubsectionHeader({ children, className }: SubsectionHeaderProps) {
  return (
    <h4 className={cn('font-semibold text-base flex items-center gap-2', className)}>
      <span className="w-1 h-5 bg-primary rounded-full shrink-0" />
      {children}
    </h4>
  );
}

interface StepBadgeProps {
  step: number;
  className?: string;
}

export function StepBadge({ step, className }: StepBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0',
        className
      )}
    >
      {step}
    </span>
  );
}
