import { useState, useCallback } from 'react';
import { Beaker, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DEMO_FILES, loadDemoFile } from '@/lib/demo-data';
import type { SessionPlan } from '@/lib/dicom/types';
import { cn } from '@/lib/utils';

interface DemoLoaderProps {
  onPlanLoaded: (plan: SessionPlan) => void;
  className?: string;
}

export function DemoLoader({ onPlanLoaded, className }: DemoLoaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLoadDemoFile = useCallback(async (name: string) => {
    const demoFile = DEMO_FILES.find(f => f.name === name);
    if (!demoFile) return;

    setIsLoading(true);
    setLoadingFile(name);

    try {
      const sessionPlan = await loadDemoFile(demoFile);
      onPlanLoaded(sessionPlan);
    } catch {
      // Demo file loading failed - user sees loading state reset
    } finally {
      setIsLoading(false);
      setLoadingFile(null);
    }
  }, [onPlanLoaded]);

  const loadDefaultDemo = useCallback(() => {
    handleLoadDemoFile(DEMO_FILES[0].name);
  }, [handleLoadDemoFile]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Main demo button */}
      <Button
        variant="outline"
        onClick={loadDefaultDemo}
        disabled={isLoading}
        className="w-full gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Beaker className="h-4 w-4" />
        )}
        {isLoading ? `Loading ${loadingFile}...` : 'Load Demo Plan'}
      </Button>

      {/* Expandable list of all test files */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button
            className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <span>More test plans</span>
            <ChevronDown className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-180')} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="grid grid-cols-2 gap-2">
            {DEMO_FILES.slice(1).map((demo) => (
              <Button
                key={demo.file}
                variant="ghost"
                size="sm"
                onClick={() => handleLoadDemoFile(demo.name)}
                disabled={isLoading}
                className="h-8 text-xs"
              >
                {demo.name}
              </Button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
