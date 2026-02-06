import { useCallback, useState } from 'react';
import { Upload, FileWarning, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseRTPlan, calculatePlanMetrics } from '@/lib/dicom';
import type { SessionPlan, ParseStatus } from '@/lib/dicom/types';

interface FileUploadZoneProps {
  onPlanLoaded: (plan: SessionPlan) => void;
  className?: string;
}

export function FileUploadZone({ onPlanLoaded, className }: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [status, setStatus] = useState<ParseStatus>('pending');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setStatus('parsing');
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const startTime = performance.now();
      
      const plan = parseRTPlan(arrayBuffer, file.name);
      const metrics = calculatePlanMetrics(plan);
      
      const parseTime = performance.now() - startTime;
      console.log(`Parsed ${file.name} in ${parseTime.toFixed(0)}ms`);

      const sessionPlan: SessionPlan = {
        id: crypto.randomUUID(),
        fileName: file.name,
        uploadTime: new Date(),
        plan,
        metrics,
      };

      setStatus('success');
      onPlanLoaded(sessionPlan);
    } catch (err) {
      console.error('DICOM parse error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to parse DICOM file');
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
      // Try to parse anyway - might be DICOM without extension
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
  }, [processFile]);

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all',
        isDragOver && 'border-primary bg-primary/5',
        status === 'error' && 'border-destructive bg-destructive/5',
        status === 'success' && 'border-[hsl(var(--status-success))] bg-[hsl(var(--status-success))]/5',
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
        aria-label="Upload DICOM RT Plan file"
      />

      {status === 'pending' && (
        <>
          <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-center font-medium">
            Drop DICOM-RT Plan file here
          </p>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            or click to browse
          </p>
        </>
      )}

      {status === 'parsing' && (
        <>
          <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
          <p className="text-center font-medium">Parsing...</p>
          {fileName && (
            <p className="mt-1 text-center text-sm text-muted-foreground">
              {fileName}
            </p>
          )}
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle2 className="mb-3 h-10 w-10 text-[hsl(var(--status-success))]" />
          <p className="text-center font-medium">Plan loaded successfully</p>
          {fileName && (
            <p className="mt-1 text-center text-sm text-muted-foreground">
              {fileName}
            </p>
          )}
          <button
            onClick={() => setStatus('pending')}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Upload another file
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <FileWarning className="mb-3 h-10 w-10 text-destructive" />
          <p className="text-center font-medium text-destructive">
            Failed to parse file
          </p>
          {error && (
            <p className="mt-1 text-center text-sm text-muted-foreground">
              {error}
            </p>
          )}
          <button
            onClick={() => setStatus('pending')}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}
