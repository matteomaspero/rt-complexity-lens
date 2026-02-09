import { useCallback, useState, forwardRef } from 'react';
import { Upload, FileWarning, CheckCircle2, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseRTSTRUCT } from '@/lib/dicom/parser';
import type { Structure } from '@/lib/dicom/types';
import { Button } from '@/components/ui/button';

interface RTStructUploadZoneProps {
  onStructuresLoaded: (structures: Structure[], fileName: string) => void;
  onClear?: () => void;
  currentLabel?: string;
  className?: string;
}

export const RTStructUploadZone = forwardRef<HTMLDivElement, RTStructUploadZoneProps>(
  function RTStructUploadZone({ onStructuresLoaded, onClear, currentLabel, className }, ref) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [structureCount, setStructureCount] = useState<number | null>(null);

  const processFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setIsLoading(true);
    setError(null);
    setStructureCount(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const structuresMap = parseRTSTRUCT(arrayBuffer, file.name);
      
      const structures = Array.from(structuresMap.values());
      
      if (structures.length === 0) {
        throw new Error('No structures found in RTSTRUCT file');
      }

      setStructureCount(structures.length);
      onStructuresLoaded(structures, file.name);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to parse RTSTRUCT file');
      setFileName(null);
      setStructureCount(null);
    }
  }, [onStructuresLoaded]);

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
  }, [processFile]);

  const handleClear = useCallback(() => {
    setFileName(null);
    setStructureCount(null);
    setError(null);
    setIsLoading(false);
    onClear?.();
  }, [onClear]);

  const isLoaded = fileName && structureCount !== null && !error;

  return (
    <div
      ref={ref}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-all',
        isDragOver && 'border-primary bg-primary/5',
        error && 'border-destructive bg-destructive/5',
        isLoaded && 'border-[hsl(var(--status-success))] bg-[hsl(var(--status-success))]/5',
        !isLoaded && !error && 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
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
        aria-label="Upload DICOM RTSTRUCT file"
        disabled={isLoading}
      />

      {!isLoaded && !error && !isLoading && (
        <>
          <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-center font-medium text-sm">
            {currentLabel ? `Change RTSTRUCT` : `Load RTSTRUCT`}
          </p>
          <p className="mt-0.5 text-center text-xs text-muted-foreground">
            drop file or click
          </p>
        </>
      )}

      {isLoading && (
        <>
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-primary" />
          <p className="text-center font-medium text-sm">Parsing...</p>
        </>
      )}

      {error && (
        <>
          <FileWarning className="mb-2 h-8 w-8 text-destructive" />
          <p className="text-center font-medium text-sm text-destructive">Error</p>
          <p className="mt-1 text-center text-xs text-muted-foreground max-w-xs">
            {error}
          </p>
          <button
            onClick={handleClear}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Try again
          </button>
        </>
      )}

      {isLoaded && (
        <>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-8 w-8 text-[hsl(var(--status-success))]" />
            <div className="text-left">
              <p className="font-medium text-sm">{structureCount} structures loaded</p>
              <p className="text-xs text-muted-foreground truncate max-w-xs">
                {fileName}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="mt-2 h-6 text-xs gap-1"
          >
            <X className="h-3 w-3" />
            Remove
          </Button>
        </>
      )}
    </div>
  );
}
);

RTStructUploadZone.displayName = 'RTStructUploadZone';
