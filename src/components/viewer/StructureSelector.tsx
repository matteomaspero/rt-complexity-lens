import { useMemo } from 'react';
import type { Structure } from '@/lib/dicom/types';
import { structureDistanceToIsocenter } from '@/lib/dicom/conformality';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Beyond this centroid-to-isocentre distance the ROI is likely not treated by the plan. */
export const OFF_TARGET_DISTANCE_MM = 30;

interface StructureSelectorProps {
  structures: Structure[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  label?: string;
  className?: string;
  /** Plan isocentre (patient coordinates, mm) used to flag off-plan ROIs. */
  isocenter?: [number, number, number] | null;
}

export function StructureSelector({
  structures,
  selectedIndex,
  onSelect,
  label = 'Target ROI for conformality',
  className,
  isocenter,
}: StructureSelectorProps) {
  const distances = useMemo(
    () => structures.map((s) => structureDistanceToIsocenter(s, isocenter)),
    [structures, isocenter]
  );

  if (structures.length === 0) return null;

  const selectedDistance = selectedIndex !== null ? distances[selectedIndex] : null;
  const offTarget = selectedDistance !== null && selectedDistance > OFF_TARGET_DISTANCE_MM;

  return (
    <div className={className}>
      <Label htmlFor="structure-selector" className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select
        value={selectedIndex !== null ? String(selectedIndex) : undefined}
        onValueChange={(value) => onSelect(Number(value))}
      >
        <SelectTrigger id="structure-selector" className="mt-1 h-9">
          <SelectValue placeholder="Select a structure" />
        </SelectTrigger>
        <SelectContent>
          {structures.map((structure, index) => (
            <SelectItem key={`${structure.number}-${index}`} value={String(index)}>
              {structure.name}
              {structure.contours.length > 0 ? ` (${structure.contours.length} slices` : ''}
              {distances[index] !== null && distances[index] !== undefined
                ? `${structure.contours.length > 0 ? ', ' : ' ('}${distances[index]!.toFixed(0)} mm from iso)`
                : structure.contours.length > 0
                  ? ')'
                  : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {offTarget && (
        <p className="mt-1 text-xs text-muted-foreground">
          This ROI centroid is {selectedDistance!.toFixed(0)} mm from the plan isocentre, so it is
          probably not the target treated by this plan — conformality values (TCOV, ATR, MARG) will
          be misleading.
        </p>
      )}
    </div>
  );
}
