import { useEffect, useState, type ReactNode } from 'react';
import {
  ChartFocusButton,
  ChartFocusFooter,
  ChartFocusOverlay,
  useChartFocus,
} from '@/components/ui/chart-focus';
import { cn } from '@/lib/utils';

export interface FocusPanelSize {
  width: number;
  height: number;
}

interface FocusPanelProps {
  title?: string;
  /** Rendered next to the enlarge button. */
  actions?: ReactNode;
  /** Base (unfocused) render size of the SVG child. */
  size: FocusPanelSize;
  /**
   * Rendered below the child only while focused. Defaults to the shared
   * control-point transport so every enlarged panel steps in lockstep.
   */
  footer?: ReactNode;
  className?: string;
  children: (size: FocusPanelSize, isFocused: boolean) => ReactNode;
}

/** Fraction of the viewport an enlarged panel may occupy. */
const FOCUS_VIEWPORT_FRACTION = 0.78;

function useViewportSize() {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 1280 : window.innerWidth,
    height: typeof window === 'undefined' ? 800 : window.innerHeight,
  }));

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return viewport;
}

/**
 * Card panel with an enlarge button. Focus mode redraws the child at a larger
 * pixel size (preserving its aspect ratio) instead of CSS-scaling it, so SVG
 * strokes stay crisp.
 */
export function FocusPanel({
  title,
  actions,
  size,
  footer,
  className,
  children,
}: FocusPanelProps) {
  const { isFocused, toggle, close, focusClassName } = useChartFocus();
  const viewport = useViewportSize();

  const aspect = size.width / size.height;
  const maxWidth = viewport.width * FOCUS_VIEWPORT_FRACTION;
  const maxHeight = viewport.height * 0.62;
  const focusedWidth = Math.max(size.width, Math.min(maxWidth, maxHeight * aspect));
  const renderSize: FocusPanelSize = isFocused
    ? { width: Math.round(focusedWidth), height: Math.round(focusedWidth / aspect) }
    : size;

  return (
    <>
      <ChartFocusOverlay open={isFocused} onClose={close} />
      <div className={cn('rounded-lg border bg-card p-4', className, focusClassName)}>
        <div className="mb-4 flex items-center justify-between gap-2">
          {title ? (
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <span className="h-4 w-1 rounded-full bg-primary" />
              {title}
            </h4>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1">
            {actions}
            <ChartFocusButton isFocused={isFocused} onToggle={toggle} />
          </div>
        </div>
        <div className={cn('flex justify-center', isFocused && 'flex-1 items-center overflow-auto')}>
          {children(renderSize, isFocused)}
        </div>
        {isFocused && footer ? (
          <div className="mt-4 shrink-0">{footer}</div>
        ) : (
          <ChartFocusFooter isFocused={isFocused} />
        )}
      </div>
    </>
  );
}
