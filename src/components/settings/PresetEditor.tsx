import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  UserPreset,
  ThresholdSet,
  MachineDeliveryParams,
  ThresholdDefinition,
} from '@/lib/threshold-definitions';
import { METRIC_DEFINITIONS } from '@/lib/metrics-definitions';

interface PresetEditorProps {
  preset: UserPreset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (preset: UserPreset) => void;
}

const THRESHOLD_METRICS = ['MCS', 'LSV', 'AAV', 'MFA', 'LT', 'totalMU'] as const;

export function PresetEditor({ preset, open, onOpenChange, onSave }: PresetEditorProps) {
  const [name, setName] = useState(preset.name);
  const [description, setDescription] = useState(preset.description);
  const [thresholds, setThresholds] = useState<ThresholdSet>(
    JSON.parse(JSON.stringify(preset.thresholds))
  );
  const [deliveryParams, setDeliveryParams] = useState<MachineDeliveryParams>(
    JSON.parse(JSON.stringify(preset.deliveryParams))
  );

  const handleThresholdChange = (
    metricKey: string,
    field: keyof ThresholdDefinition,
    value: number
  ) => {
    setThresholds((prev) => ({
      ...prev,
      [metricKey]: {
        ...prev[metricKey],
        [field]: value,
      },
    }));
  };

  const handleDeliveryChange = (
    field: keyof MachineDeliveryParams,
    value: number | string
  ) => {
    setDeliveryParams((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    const updated: UserPreset = {
      ...preset,
      name,
      description,
      thresholds,
      deliveryParams,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Machine Preset</DialogTitle>
          <DialogDescription>
            Configure thresholds and delivery parameters for this machine.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Machine"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preset-description">Description</Label>
              <Input
                id="preset-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Machine-specific settings"
              />
            </div>
          </div>

          <Separator />

          {/* Delivery Parameters */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Delivery Parameters</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max-dose-rate" className="text-xs">
                  Max Dose Rate (MU/min)
                </Label>
                <Input
                  id="max-dose-rate"
                  type="number"
                  value={deliveryParams.maxDoseRate}
                  onChange={(e) =>
                    handleDeliveryChange('maxDoseRate', parseFloat(e.target.value) || 0)
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-dose-rate-fff" className="text-xs">
                  Max Dose Rate FFF (MU/min)
                </Label>
                <Input
                  id="max-dose-rate-fff"
                  type="number"
                  value={deliveryParams.maxDoseRateFFF ?? ''}
                  onChange={(e) =>
                    handleDeliveryChange(
                      'maxDoseRateFFF',
                      e.target.value ? parseFloat(e.target.value) : undefined as unknown as number
                    )
                  }
                  placeholder="Optional"
                  className="h-8"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-gantry-speed" className="text-xs">
                  Max Gantry Speed (°/s)
                </Label>
                <Input
                  id="max-gantry-speed"
                  type="number"
                  step="0.1"
                  value={deliveryParams.maxGantrySpeed}
                  onChange={(e) =>
                    handleDeliveryChange('maxGantrySpeed', parseFloat(e.target.value) || 0)
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-mlc-speed" className="text-xs">
                  Max MLC Speed (mm/s)
                </Label>
                <Input
                  id="max-mlc-speed"
                  type="number"
                  value={deliveryParams.maxMLCSpeed}
                  onChange={(e) =>
                    handleDeliveryChange('maxMLCSpeed', parseFloat(e.target.value) || 0)
                  }
                  className="h-8"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="mlc-type" className="text-xs">
                  MLC Type
                </Label>
                <Select
                  value={deliveryParams.mlcType}
                  onValueChange={(v) =>
                    handleDeliveryChange('mlcType', v as MachineDeliveryParams['mlcType'])
                  }
                >
                  <SelectTrigger id="mlc-type" className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MLCX">MLCX (Varian-style)</SelectItem>
                    <SelectItem value="MLCY">MLCY (Elekta-style)</SelectItem>
                    <SelectItem value="DUAL">Dual Layer (Halcyon)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Thresholds */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Alert Thresholds</h4>
            <div className="rounded-md border bg-muted/30 p-3 space-y-3">
              <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground">
                <div>Metric</div>
                <div className="col-span-2">Warning</div>
                <div className="col-span-2">Critical</div>
              </div>
              {THRESHOLD_METRICS.map((metricKey) => {
                const threshold = thresholds[metricKey];
                const definition = METRIC_DEFINITIONS[metricKey];
                if (!threshold) return null;

                const directionLabel = threshold.direction === 'low' ? '<' : '>';

                return (
                  <div key={metricKey} className="grid grid-cols-5 items-center gap-2">
                    <Label className="text-xs font-medium" title={definition?.name}>
                      {metricKey}
                    </Label>
                    <div className="col-span-2 flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">{directionLabel}</span>
                      <Input
                        type="number"
                        value={threshold.warningThreshold}
                        onChange={(e) =>
                          handleThresholdChange(
                            metricKey,
                            'warningThreshold',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="h-7 text-xs"
                        step={metricKey === 'LT' || metricKey === 'totalMU' ? 100 : 0.01}
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">{directionLabel}</span>
                      <Input
                        type="number"
                        value={threshold.criticalThreshold}
                        onChange={(e) =>
                          handleThresholdChange(
                            metricKey,
                            'criticalThreshold',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="h-7 text-xs"
                        step={metricKey === 'LT' || metricKey === 'totalMU' ? 100 : 0.01}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-sm bg-[hsl(var(--status-warning)/0.3)]" />
                  <span>Warning</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-sm bg-[hsl(var(--status-error)/0.3)]" />
                  <span>Critical</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
