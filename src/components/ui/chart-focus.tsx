import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useControlPointPlayback } from '@/contexts/ControlPointPlaybackContext';
import { ControlPointNavigator } from '@/components/viewer/ControlPointNavigator';

/**
 * Focus mode keeps the chart mounted in place and only restyles its container,
 * so Recharts stays interactive (tooltips, refs, PNG export) while enlarged.
 */
export function useChartFocus() {
  const [isFocused, setIsFocused] = useState(false);

  const close = useCallback(() => setIsFocused(false), []);
  const toggle = useCallback(() => setIsFocused(prev => !prev), []);

  useEffect(() => {
    if (!isFocused) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFocused(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFocused]);

  return {
    isFocused,
    toggle,
    close,
    /** Apply to the chart container element. */
    focusClassName: isFocused
      ? 'fixed inset-3 md:inset-10 z-50 flex flex-col overflow-auto bg-card shadow-2xl'
      : '',
    /** Apply to the element wrapping the ResponsiveContainer. */
    focusHeightClassName: isFocused ? 'flex-1 min-h-[60vh]' : '',
    /** Apply to an intermediate container (e.g. CardContent) so children can grow. */
    focusContentClassName: isFocused ? 'flex flex-1 flex-col gap-4 overflow-auto' : '',
  };

}

interface ChartFocusButtonProps {
  isFocused: boolean;
  onToggle: () => void;
  className?: string;
}

export function ChartFocusButton({
  isFocused,
  onToggle,
  className,
}: ChartFocusButtonProps) {
  const label = isFocused ? 'Restore chart size' : 'Enlarge chart';
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            className={cn('h-7 w-7', className)}
            onClick={onToggle}
          >
            {isFocused ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ChartFocusOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
      aria-hidden="true"
    />,
    document.body
  );
}

/**
 * Control-point transport rendered inside enlarged panels. Reads the shared
 * playback state, so every focused panel steps to the same control point.
 */
export function ChartFocusFooter({
  isFocused,
  className,
}: {
  isFocused: boolean;
  className?: string;
}) {
  const playback = useControlPointPlayback();
  if (!isFocused || !playback || playback.totalPoints === 0) return null;

  return (
    <div className={cn('mt-4 shrink-0 space-y-2', className)}>
      <ControlPointNavigator
        compact
        currentIndex={playback.currentIndex}
        totalPoints={playback.totalPoints}
        isPlaying={playback.isPlaying}
        onIndexChange={playback.setIndex}
        onPlayToggle={playback.togglePlay}
      />
      {playback.secondary && playback.secondary.totalPoints > 0 && (
        <ControlPointNavigator
          compact
          currentIndex={playback.secondary.index}
          totalPoints={playback.secondary.totalPoints}
          isPlaying={false}
          onIndexChange={playback.secondary.setIndex}
          onPlayToggle={playback.togglePlay}
        />
      )}
    </div>
  );
}
