import { useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface ControlPointNavigatorProps {
  currentIndex: number;
  totalPoints: number;
  isPlaying: boolean;
  onIndexChange: (index: number) => void;
  onPlayToggle: () => void;
  className?: string;
}

export function ControlPointNavigator({
  currentIndex,
  totalPoints,
  isPlaying,
  onIndexChange,
  onPlayToggle,
  className,
}: ControlPointNavigatorProps) {
  const handleSliderChange = useCallback(
    (value: number[]) => {
      onIndexChange(value[0]);
    },
    [onIndexChange]
  );

  const goToFirst = useCallback(() => onIndexChange(0), [onIndexChange]);
  const goToLast = useCallback(() => onIndexChange(totalPoints - 1), [onIndexChange, totalPoints]);
  const goToPrev = useCallback(
    () => onIndexChange(Math.max(0, currentIndex - 1)),
    [onIndexChange, currentIndex]
  );
  const goToNext = useCallback(
    () => onIndexChange(Math.min(totalPoints - 1, currentIndex + 1)),
    [onIndexChange, currentIndex, totalPoints]
  );

  if (totalPoints === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-col gap-3 rounded-lg border bg-card p-4', className)}>
      {/* Control Point Display */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Control Point</span>
        <span className="font-mono text-lg font-semibold tabular-nums">
          {currentIndex + 1} <span className="text-muted-foreground">/ {totalPoints}</span>
        </span>
      </div>

      {/* Timeline Slider */}
      <Slider
        value={[currentIndex]}
        min={0}
        max={totalPoints - 1}
        step={1}
        onValueChange={handleSliderChange}
        className="w-full"
      />

      {/* Playback Controls */}
      <div className="flex items-center justify-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToFirst}
          disabled={currentIndex === 0}
          aria-label="Go to first control point"
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={goToPrev}
          disabled={currentIndex === 0}
          aria-label="Previous control point"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="default"
          size="icon"
          onClick={onPlayToggle}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="mx-2"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={goToNext}
          disabled={currentIndex === totalPoints - 1}
          aria-label="Next control point"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={goToLast}
          disabled={currentIndex === totalPoints - 1}
          aria-label="Go to last control point"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress bar visualization */}
      <div className="flex h-2 gap-px overflow-hidden rounded-full bg-muted">
        {Array.from({ length: Math.min(totalPoints, 100) }).map((_, i) => {
          const segmentIndex = Math.floor((i / 100) * totalPoints);
          const isActive = segmentIndex <= currentIndex;
          const isCurrent = segmentIndex === currentIndex;
          
          return (
            <div
              key={i}
              className={cn(
                'flex-1 transition-colors',
                isCurrent && 'bg-primary',
                isActive && !isCurrent && 'bg-primary/40',
                !isActive && 'bg-muted'
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
