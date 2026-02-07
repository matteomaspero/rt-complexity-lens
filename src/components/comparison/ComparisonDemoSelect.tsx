import { useState, useCallback } from 'react';
import { Beaker, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DEMO_FILES, loadDemoFile, type DemoFile } from '@/lib/demo-data';
import type { SessionPlan } from '@/lib/dicom/types';
import { cn } from '@/lib/utils';

interface ComparisonDemoSelectProps {
  onPlanLoaded: (plan: SessionPlan) => void;
  disabled?: boolean;
  className?: string;
}

export function ComparisonDemoSelect({ 
  onPlanLoaded, 
  disabled,
  className 
}: ComparisonDemoSelectProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);

  const handleSelect = useCallback(async (demo: DemoFile) => {
    setIsLoading(true);
    setLoadingFile(demo.name);

    try {
      const plan = await loadDemoFile(demo);
      onPlanLoaded(plan);
    } catch {
      // Demo loading failed - user sees no plan loaded
    } finally {
      setIsLoading(false);
      setLoadingFile(null);
    }
  }, [onPlanLoaded]);

  const monacoPlans = DEMO_FILES.filter(f => f.category === 'monaco');
  const tg119Plans = DEMO_FILES.filter(f => f.category === 'tg119');
  const vmatPlans = DEMO_FILES.filter(f => f.category === 'vmat');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || isLoading}
          className={cn('h-7 gap-1 text-xs text-muted-foreground hover:text-foreground', className)}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading {loadingFile}...
            </>
          ) : (
            <>
              <Beaker className="h-3 w-3" />
              Use Demo
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {vmatPlans.length > 0 && (
          <>
            <DropdownMenuLabel className="text-xs">VMAT</DropdownMenuLabel>
            {vmatPlans.map((demo) => (
              <DropdownMenuItem
                key={demo.file}
                onClick={() => handleSelect(demo)}
                className="text-sm"
              >
                {demo.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuLabel className="text-xs">Monaco</DropdownMenuLabel>
        {monacoPlans.map((demo) => (
          <DropdownMenuItem
            key={demo.file}
            onClick={() => handleSelect(demo)}
            className="text-sm"
          >
            {demo.name}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs">TG-119</DropdownMenuLabel>
        {tg119Plans.map((demo) => (
          <DropdownMenuItem
            key={demo.file}
            onClick={() => handleSelect(demo)}
            className="text-sm"
          >
            {demo.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
