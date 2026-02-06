import { useCallback, useState } from 'react';
import { Upload, FolderOpen, Archive } from 'lucide-react';
import JSZip from 'jszip';
import { cn } from '@/lib/utils';
import { useBatch } from '@/contexts/BatchContext';

interface BatchUploadZoneProps {
  className?: string;
}

async function extractDicomFilesFromZip(zipFile: File): Promise<File[]> {
  const zip = await JSZip.loadAsync(zipFile);
  const dicomFiles: File[] = [];

  const filePromises: Promise<void>[] = [];

  zip.forEach((relativePath, zipEntry) => {
    // Skip directories and hidden files
    if (zipEntry.dir || relativePath.startsWith('__MACOSX') || relativePath.startsWith('.')) {
      return;
    }

    const fileName = relativePath.split('/').pop() || '';
    
    // Check if it's likely a DICOM file
    const isDicom = fileName.toLowerCase().endsWith('.dcm') ||
      !fileName.includes('.') || // Files without extension might be DICOM
      fileName.toLowerCase().startsWith('rp') || // RT Plan files often start with RP
      fileName.toLowerCase().startsWith('rt');

    if (isDicom) {
      const promise = zipEntry.async('blob').then(blob => {
        const file = new File([blob], fileName, { type: 'application/dicom' });
        dicomFiles.push(file);
      });
      filePromises.push(promise);
    }
  });

  await Promise.all(filePromises);
  return dicomFiles;
}

export function BatchUploadZone({ className }: BatchUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const { addPlans, isProcessing } = useBatch();

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const dicomFiles: File[] = [];
    const zipFiles: File[] = [];

    // Separate zip files from DICOM files
    for (const file of fileArray) {
      if (file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip') {
        zipFiles.push(file);
      } else if (
        file.name.toLowerCase().endsWith('.dcm') ||
        file.type === 'application/dicom' ||
        !file.name.includes('.') // Files without extension might be DICOM
      ) {
        dicomFiles.push(file);
      }
    }

    // Extract DICOM files from zip archives
    if (zipFiles.length > 0) {
      setIsExtracting(true);
      try {
        for (const zipFile of zipFiles) {
          const extracted = await extractDicomFilesFromZip(zipFile);
          dicomFiles.push(...extracted);
        }
      } catch (err) {
        console.error('Failed to extract zip file:', err);
      } finally {
        setIsExtracting(false);
      }
    }

    if (dicomFiles.length > 0) {
      addPlans(dicomFiles);
    }
  }, [addPlans]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (isProcessing || isExtracting) return;
    
    const files = e.dataTransfer.files;
    processFiles(files);
  }, [processFiles, isProcessing, isExtracting]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isProcessing && !isExtracting) {
      setIsDragOver(true);
    }
  }, [isProcessing, isExtracting]);

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

  const isBusy = isProcessing || isExtracting;

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all',
        isDragOver && !isBusy && 'border-primary bg-primary/5',
        isBusy && 'opacity-50 cursor-not-allowed',
        !isDragOver && !isBusy && 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        type="file"
        accept=".dcm,.zip,application/dicom,application/zip"
        multiple
        onChange={handleFileInput}
        className="absolute inset-0 cursor-pointer opacity-0"
        disabled={isBusy}
        aria-label="Upload DICOM RT Plan files or ZIP archives"
      />

      <div className="flex items-center gap-3">
        <div className="rounded-full bg-muted p-3">
          {isDragOver ? (
            <FolderOpen className="h-6 w-6 text-primary" />
          ) : isExtracting ? (
            <Archive className="h-6 w-6 animate-pulse text-primary" />
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="font-medium">
            {isExtracting ? 'Extracting ZIP...' : isProcessing ? 'Processing...' : 'Drop DICOM-RT Plan files here'}
          </p>
          <p className="text-sm text-muted-foreground">
            or click to browse (supports .dcm files and .zip archives)
          </p>
        </div>
      </div>
    </div>
  );
}
