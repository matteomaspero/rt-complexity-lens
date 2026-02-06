import { Progress } from '@/components/ui/progress';
import { useBatch } from '@/contexts/BatchContext';

export function BatchProgressBar() {
  const { isProcessing, progress } = useBatch();

  if (!isProcessing) return null;

  const percentage = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Processing files...</span>
        <span className="font-medium">
          {progress.current} / {progress.total}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
