import type { Structure } from '@/lib/dicom/types';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StructureSelectorProps {
  structures: Structure[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  label?: string;
  className?: string;
}

export function StructureSelector({
  structures,
  selectedIndex,
  onSelect,
  label = 'Target ROI for conformality',
  className,
}: StructureSelectorProps) {
  if (structures.length === 0) return null;

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
            <SelectItem key={`${structure.roiNumber}-${index}`} value={String(index)}>
              {structure.name}
              {structure.contours.length > 0 ? ` (${structure.contours.length} slices)` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
