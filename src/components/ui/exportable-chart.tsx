import { useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { exportChartAsPng } from '@/lib/chart-export';
import { cn } from '@/lib/utils';

interface ExportableChartProps {
  title: string;
  filename?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  rightContent?: React.ReactNode;
}

export function ExportableChart({
  title,
  filename,
  children,
  className,
  headerClassName,
  contentClassName,
  rightContent,
}: ExportableChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!chartRef.current || isExporting) return;

    setIsExporting(true);
    try {
      await exportChartAsPng(
        chartRef.current,
        filename || title.replace(/\s+/g, '_').toLowerCase()
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 border-b',
          headerClassName
        )}
      >
        <h4 className="text-sm font-medium">{title}</h4>
        <div className="flex items-center gap-2">
          {rightContent}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleExport}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export as PNG</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div ref={chartRef} className={cn('p-4', contentClassName)}>
        {children}
      </div>
    </div>
  );
}

// Hook for components that want to manage export themselves
export function useChartExport(filename: string) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!chartRef.current || isExporting) return;

    setIsExporting(true);
    try {
      await exportChartAsPng(chartRef.current, filename);
    } finally {
      setIsExporting(false);
    }
  };

  return { chartRef, isExporting, handleExport };
}

// Simple export button for adding to existing cards
interface ChartExportButtonProps {
  chartRef: React.RefObject<HTMLDivElement>;
  filename: string;
  className?: string;
}

export function ChartExportButton({
  chartRef,
  filename,
  className,
}: ChartExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!chartRef.current || isExporting) return;

    setIsExporting(true);
    try {
      await exportChartAsPng(chartRef.current, filename);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', className)}
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Export as PNG</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
