import { useCallback, useState } from 'react';
import { Upload, CheckCircle2, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseRTPlan, calculatePlanMetrics } from '@/lib/dicom';
import type { SessionPlan, ParseStatus } from '@/lib/dicom/types';
import { Button } from '@/components/ui/button';

interface ComparisonUploadZoneProps {
  label: string;
  plan: SessionPlan | null;
  onPlanLoaded: (plan: SessionPlan) => void;
  onPlanRemoved: () => void;
  className?: string;
}

export function ComparisonUploadZone({
  label,
  plan,
  onPlanLoaded,
  onPlanRemoved,
  className,
}: ComparisonUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [status, setStatus] = useState<ParseStatus>('pending');

  const processFile = useCallback(async (file: File) => {
    setStatus('parsing');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const parsedPlan = parseRTPlan(arrayBuffer, file.name);
      const metrics = calculatePlanMetrics(parsedPlan);

      const sessionPlan: SessionPlan = {
        id: crypto.randomUUID(),
        fileName: file.name,
        uploadTime: new Date(),
        plan: parsedPlan,
        metrics,
      };

      setStatus('success');
      onPlanLoaded(sessionPlan);
    } catch (err) {
      console.error('DICOM parse error:', err);
      setStatus('error');
    }
  }, [onPlanLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const dcmFile = files.find(f => 
      f.name.toLowerCase().endsWith('.dcm') || 
      f.type === 'application/dicom'
    );

    if (dcmFile) {
      processFile(dcmFile);
    } else if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  }, [processFile]);

  const handleRemove = () => {
    setStatus('pending');
    onPlanRemoved();
  };

  if (plan) {
    return (
      <div className={cn(
        'rounded-lg border bg-card p-4',
        className
      )}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-[hsl(var(--status-success))]" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="font-medium truncate" title={plan.fileName}>
                {plan.plan.planLabel}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {plan.fileName}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{plan.plan.technique}</span>
          <span>•</span>
          <span>{plan.plan.beams.length} beams</span>
          <span>•</span>
          <span>{plan.plan.totalMU.toFixed(0)} MU</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all',
        isDragOver && 'border-primary bg-primary/5',
        status === 'error' && 'border-destructive bg-destructive/5',
        status === 'pending' && 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        type="file"
        accept=".dcm,application/dicom"
        onChange={handleFileInput}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label={`Upload ${label}`}
      />

      {status === 'pending' && (
        <>
          <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
          <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-center text-muted-foreground">
            Drop DICOM file or click to browse
          </p>
        </>
      )}

      {status === 'parsing' && (
        <>
          <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-center">Parsing...</p>
        </>
      )}

      {status === 'error' && (
        <>
          <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
          <p className="text-sm text-center text-destructive">
            Failed to parse file
          </p>
          <button
            onClick={() => setStatus('pending')}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}
