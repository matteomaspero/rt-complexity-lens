import { useState, useCallback } from 'react';
import { Beaker, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { parseRTPlan, calculatePlanMetrics } from '@/lib/dicom';
import type { SessionPlan } from '@/lib/dicom/types';
import { cn } from '@/lib/utils';

const DEMO_FILES = [
  { name: 'VMAT Complex', file: 'RP1.2.752.243.1.1.20230623170950828.2520.26087.dcm' },
  { name: 'Monaco PT 01', file: 'RTPLAN_MO_PT_01.dcm' },
  { name: 'Monaco PT 02', file: 'RTPLAN_MO_PT_02.dcm' },
  { name: 'Monaco PT 03', file: 'RTPLAN_MO_PT_03.dcm' },
  { name: 'Monaco PT 04', file: 'RTPLAN_MO_PT_04.dcm' },
  { name: 'Monaco Penalty', file: 'RTPLAN_MR_PT_01_PENALTY.dcm' },
  { name: 'TG-119 7F', file: 'RP.TG119.PR_ETH_7F.dcm' },
  { name: 'TG-119 2A', file: 'RP.TG119.PR_ETH_2A_2.dcm' },
] as const;

interface DemoLoaderProps {
  onPlanLoaded: (plan: SessionPlan) => void;
  className?: string;
}

export function DemoLoader({ onPlanLoaded, className }: DemoLoaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadDemoFile = useCallback(async (filename: string, displayName: string) => {
    setIsLoading(true);
    setLoadingFile(displayName);

    try {
      const response = await fetch(`/test-data/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch demo file: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const plan = parseRTPlan(arrayBuffer, filename);
      const metrics = calculatePlanMetrics(plan);

      const sessionPlan: SessionPlan = {
        id: crypto.randomUUID(),
        fileName: filename,
        uploadTime: new Date(),
        plan,
        metrics,
      };

      onPlanLoaded(sessionPlan);
    } catch {
      // Demo file loading failed - user sees loading state reset
    } finally {
      setIsLoading(false);
      setLoadingFile(null);
    }
  }, [onPlanLoaded]);

  const loadDefaultDemo = useCallback(() => {
    loadDemoFile(DEMO_FILES[0].file, DEMO_FILES[0].name);
  }, [loadDemoFile]);

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
                onClick={() => loadDemoFile(demo.file, demo.name)}
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
