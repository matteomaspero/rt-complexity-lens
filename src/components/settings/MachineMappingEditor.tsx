import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useThresholdConfig } from '@/contexts/ThresholdConfigContext';
import { BUILTIN_PRESETS } from '@/lib/threshold-definitions';
import type { MachineMappingEntry, MappingMatchType } from '@/lib/machine-mapping';

interface MachineMappingEditorProps {
  mapping: MachineMappingEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (mapping: MachineMappingEntry) => void;
  isNew?: boolean;
}

export function MachineMappingEditor({
  mapping,
  open,
  onOpenChange,
  onSave,
  isNew = false,
}: MachineMappingEditorProps) {
  const { userPresets } = useThresholdConfig();

  const [pattern, setPattern] = useState('');
  const [matchType, setMatchType] = useState<MappingMatchType>('prefix');
  const [presetId, setPresetId] = useState('generic');
  const [manufacturer, setManufacturer] = useState('');
  const [priority, setPriority] = useState(100);
  const [enabled, setEnabled] = useState(true);

  // Reset form when mapping changes
  useEffect(() => {
    if (mapping) {
      setPattern(mapping.pattern);
      setMatchType(mapping.matchType);
      setPresetId(mapping.presetId);
      setManufacturer(mapping.manufacturer || '');
      setPriority(mapping.priority);
      setEnabled(mapping.enabled);
    } else {
      // Reset to defaults for new mapping
      setPattern('');
      setMatchType('prefix');
      setPresetId('generic');
      setManufacturer('');
      setPriority(100);
      setEnabled(true);
    }
  }, [mapping, open]);

  const handleSave = () => {
    const now = new Date().toISOString();
    const updatedMapping: MachineMappingEntry = {
      id: mapping?.id || `mapping_${Date.now()}`,
      pattern,
      matchType,
      presetId,
      manufacturer: manufacturer.trim() || undefined,
      priority,
      enabled,
      createdAt: mapping?.createdAt || now,
      updatedAt: now,
    };
    onSave(updatedMapping);
    onOpenChange(false);
  };

  const allPresets = [
    ...Object.values(BUILTIN_PRESETS),
    ...userPresets,
  ];

  const isValid = pattern.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add Machine Mapping' : 'Edit Machine Mapping'}</DialogTitle>
          <DialogDescription>
            Define how machine names map to presets for automatic selection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pattern */}
          <div className="space-y-2">
            <Label htmlFor="pattern">Machine Name Pattern</Label>
            <Input
              id="pattern"
              placeholder="e.g., TrueBeam, Halcyon, LINAC-A"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The pattern to match against the machine name in DICOM files
            </p>
          </div>

          {/* Match Type */}
          <div className="space-y-2">
            <Label htmlFor="matchType">Match Type</Label>
            <Select value={matchType} onValueChange={(v) => setMatchType(v as MappingMatchType)}>
              <SelectTrigger id="matchType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exact">Exact Match</SelectItem>
                <SelectItem value="prefix">Starts With</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="regex">Regular Expression</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {matchType === 'exact' && 'Machine name must match exactly (case-insensitive)'}
              {matchType === 'prefix' && 'Machine name must start with this pattern'}
              {matchType === 'contains' && 'Machine name must contain this pattern'}
              {matchType === 'regex' && 'Use a regular expression for complex matching'}
            </p>
          </div>

          {/* Preset */}
          <div className="space-y-2">
            <Label htmlFor="preset">Target Preset</Label>
            <Select value={presetId} onValueChange={setPresetId}>
              <SelectTrigger id="preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allPresets.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Manufacturer Filter (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="manufacturer">
              Manufacturer Filter <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="manufacturer"
              placeholder="e.g., Varian, Elekta"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Only match if DICOM manufacturer contains this text
            </p>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Input
              id="priority"
              type="number"
              min={1}
              max={1000}
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 100)}
            />
            <p className="text-xs text-muted-foreground">
              Higher priority mappings are checked first (1-1000)
            </p>
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">Enabled</Label>
              <p className="text-xs text-muted-foreground">
                Disable to temporarily skip this mapping
              </p>
            </div>
            <Switch
              id="enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {isNew ? 'Add Mapping' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
