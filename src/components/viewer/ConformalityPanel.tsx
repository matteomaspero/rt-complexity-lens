import { useCallback, useState } from 'react';
import { Target } from 'lucide-react';
import type { Structure } from '@/lib/dicom/types';
import { RTStructUploadZone } from './RTStructUploadZone';
import { StructureSelector } from './StructureSelector';

interface ConformalityPanelProps {
  /** Called with the selected target ROI, or null when cleared. */
  onTargetChange: (structure: Structure | null) => void;
  description?: string;
  className?: string;
}

export function ConformalityPanel({
  onTargetChange,
  description = 'Optional: load an RTSTRUCT to compute conformality metrics (TCOV, ATR, MARG) against the plan apertures.',
  className,
}: ConformalityPanelProps) {
  const [structures, setStructures] = useState<Structure[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleLoaded = useCallback(
    (loaded: Structure[], name: string) => {
      setStructures(loaded);
      setFileName(name);
      const defaultIndex = pickDefaultIndex(loaded);
      setSelectedIndex(defaultIndex);
      onTargetChange(defaultIndex !== null ? loaded[defaultIndex] : null);
    },
    [onTargetChange]
  );

  const handleClear = useCallback(() => {
    setStructures(null);
    setFileName(null);
    setSelectedIndex(null);
    onTargetChange(null);
  }, [onTargetChange]);

  const handleSelect = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      if (structures) onTargetChange(structures[index] ?? null);
    },
    [structures, onTargetChange]
  );

  return (
    <div className={className}>
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Conformality (RTSTRUCT)</h3>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
        <RTStructUploadZone
          onStructuresLoaded={handleLoaded}
          onClear={handleClear}
          currentLabel={fileName ?? undefined}
        />
        {structures && structures.length > 0 && (
          <StructureSelector
            structures={structures}
            selectedIndex={selectedIndex}
            onSelect={handleSelect}
          />
        )}
      </div>
    </div>
  );
}

function pickDefaultIndex(structures: Structure[]): number | null {
  if (structures.length === 0) return null;
  const byPriority = ['ptv', 'ctv', 'gtv'];
  for (const token of byPriority) {
    const index = structures.findIndex(
      (s) => s.name.toLowerCase().includes(token) && s.contours.length > 0
    );
    if (index >= 0) return index;
  }
  const firstWithContours = structures.findIndex((s) => s.contours.length > 0);
  return firstWithContours >= 0 ? firstWithContours : 0;
}
