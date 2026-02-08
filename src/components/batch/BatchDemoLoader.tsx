import { useState, useCallback } from 'react';
import { Beaker, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEMO_FILES, DEMO_CATEGORIES, fetchDemoBuffer, type DemoCategory } from '@/lib/demo-data';
import { useBatch } from '@/contexts/BatchContext';
import { cn } from '@/lib/utils';

interface BatchDemoLoaderProps {
  className?: string;
}

export function BatchDemoLoader({ className }: BatchDemoLoaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null);
  const { addPlans, isProcessing } = useBatch();

  const loadDemoFiles = useCallback(async (category: 'all' | DemoCategory) => {
    const filesToLoad = category === 'all' 
      ? DEMO_FILES 
      : DEMO_FILES.filter(f => f.category === category);
    
    if (filesToLoad.length === 0) return;

    setIsLoading(true);
    setLoadingCategory(category);

    try {
      // Fetch all files and convert to File objects for the batch context
      const files: File[] = [];
      for (const demo of filesToLoad) {
        const buffer = await fetchDemoBuffer(demo.file);
        const blob = new Blob([buffer], { type: 'application/dicom' });
        const file = new File([blob], demo.file, { type: 'application/dicom' });
        files.push(file);
      }
      
      // Add to batch context
      await addPlans(files);
    } catch {
      // Demo loading failed - user sees no plans added
    } finally {
      setIsLoading(false);
      setLoadingCategory(null);
    }
  }, [addPlans]);

  const isBusy = isLoading || isProcessing;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <p className="text-xs text-muted-foreground">Or try with demo data:</p>
      <div className="flex flex-wrap justify-center gap-2">
        {DEMO_CATEGORIES.map((cat) => (
          <Button
            key={cat.id}
            variant="outline"
            size="sm"
            onClick={() => loadDemoFiles(cat.id as 'all' | DemoCategory)}
            disabled={isBusy}
            className="h-8 gap-1.5 text-xs"
          >
            {isLoading && loadingCategory === cat.id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Beaker className="h-3 w-3" />
            )}
            {cat.label} ({cat.count})
          </Button>
        ))}
      </div>
    </div>
  );
}
