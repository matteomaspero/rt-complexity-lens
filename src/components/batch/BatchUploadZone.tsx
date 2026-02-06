import { useCallback, useState } from 'react';
import { Upload, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBatch } from '@/contexts/BatchContext';

interface BatchUploadZoneProps {
  className?: string;
}

export function BatchUploadZone({ className }: BatchUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const { addPlans, isProcessing } = useBatch();

  const processFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => 
      f.name.toLowerCase().endsWith('.dcm') || 
      f.type === 'application/dicom' ||
      !f.name.includes('.') // Files without extension might be DICOM
    );
    
    if (fileArray.length > 0) {
      addPlans(fileArray);
    }
  }, [addPlans]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (isProcessing) return;
    
    const files = e.dataTransfer.files;
    processFiles(files);
  }, [processFiles, isProcessing]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isProcessing) {
      setIsDragOver(true);
    }
  }, [isProcessing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input so same files can be selected again
    e.target.value = '';
  }, [processFiles]);

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all',
        isDragOver && !isProcessing && 'border-primary bg-primary/5',
        isProcessing && 'opacity-50 cursor-not-allowed',
        !isDragOver && !isProcessing && 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        type="file"
        accept=".dcm,application/dicom"
        multiple
        onChange={handleFileInput}
        className="absolute inset-0 cursor-pointer opacity-0"
        disabled={isProcessing}
        aria-label="Upload multiple DICOM RT Plan files"
      />

      <div className="flex items-center gap-3">
        <div className="rounded-full bg-muted p-3">
          {isDragOver ? (
            <FolderOpen className="h-6 w-6 text-primary" />
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="font-medium">
            {isProcessing ? 'Processing...' : 'Drop DICOM-RT Plan files here'}
          </p>
          <p className="text-sm text-muted-foreground">
            or click to browse (supports multiple files)
          </p>
        </div>
      </div>
    </div>
  );
}
