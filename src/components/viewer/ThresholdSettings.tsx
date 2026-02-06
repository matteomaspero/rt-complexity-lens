import { AlertTriangle, Settings } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useThresholdConfig } from '@/contexts/ThresholdConfigContext';
import { BUILTIN_PRESETS } from '@/lib/threshold-definitions';
import { METRIC_DEFINITIONS } from '@/lib/metrics-definitions';
import { PresetManager } from '@/components/settings';

interface ThresholdSettingsProps {
  className?: string;
}

const THRESHOLD_METRICS = ['MCS', 'LSV', 'AAV', 'MFA', 'LT', 'totalMU'] as const;

export function ThresholdSettings({ className }: ThresholdSettingsProps) {
  const {
    enabled,
    selectedPreset,
    customThresholds,
    customDeliveryParams,
    userPresets,
    setEnabled,
    setPreset,
    updateCustomThreshold,
    updateCustomDeliveryParams,
  } = useThresholdConfig();

  const builtInOptions = Object.values(BUILTIN_PRESETS);
  const isCustomOrUserPreset = !Object.keys(BUILTIN_PRESETS).includes(selectedPreset);
  const selectedUserPreset = userPresets.find(p => p.id === selectedPreset);

  return (
    <div className={className}>
      {/* Master Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="threshold-toggle" className="cursor-pointer text-sm font-medium">
            Enable Threshold Alerts
          </Label>
        </div>
        <Switch
          id="threshold-toggle"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>

      {/* Threshold Configuration - Only shown when enabled */}
      {enabled && (
        <div className="mt-4 space-y-4">
          {/* Machine Preset Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Machine Preset</Label>
              <PresetManager
                trigger={
                  <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs">
                    <Settings className="h-3 w-3" />
                    Manage
                  </Button>
                }
              />
            </div>
            <Select value={selectedPreset} onValueChange={setPreset}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Built-in presets */}
                <div className="px-2 py-1 text-xs text-muted-foreground">Built-in</div>
                {builtInOptions.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    <div className="flex flex-col items-start">
                      <span>{preset.name}</span>
                      <span className="text-xs text-muted-foreground">{preset.description}</span>
                    </div>
                  </SelectItem>
                ))}
                
                {/* User presets */}
                {userPresets.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs text-muted-foreground border-t mt-1 pt-1">
                      Your Presets
                    </div>
                    {userPresets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        <div className="flex flex-col items-start">
                          <span>{preset.name}</span>
                          <span className="text-xs text-muted-foreground">{preset.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Show delivery params for selected user preset (read-only) */}
          {selectedUserPreset && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <Label className="text-xs text-muted-foreground">Delivery Parameters</Label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Max Dose Rate:</span>{' '}
                  {selectedUserPreset.deliveryParams.maxDoseRate} MU/min
                </div>
                <div>
                  <span className="text-muted-foreground">Gantry Speed:</span>{' '}
                  {selectedUserPreset.deliveryParams.maxGantrySpeed} °/s
                </div>
                <div>
                  <span className="text-muted-foreground">MLC Speed:</span>{' '}
                  {selectedUserPreset.deliveryParams.maxMLCSpeed} mm/s
                </div>
                <div>
                  <span className="text-muted-foreground">MLC Type:</span>{' '}
                  {selectedUserPreset.deliveryParams.mlcType}
                </div>
              </div>
            </div>
          )}

          {/* Custom Thresholds Editor - for non-preset selection */}
          {!selectedUserPreset && isCustomOrUserPreset && (
            <div className="space-y-4">
              {/* Delivery Parameters */}
              <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                <Label className="text-xs text-muted-foreground">Delivery Parameters</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Max Dose Rate (MU/min)</Label>
                    <Input
                      type="number"
                      value={customDeliveryParams.maxDoseRate}
                      onChange={(e) =>
                        updateCustomDeliveryParams({
                          maxDoseRate: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max Gantry Speed (°/s)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={customDeliveryParams.maxGantrySpeed}
                      onChange={(e) =>
                        updateCustomDeliveryParams({
                          maxGantrySpeed: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max MLC Speed (mm/s)</Label>
                    <Input
                      type="number"
                      value={customDeliveryParams.maxMLCSpeed}
                      onChange={(e) =>
                        updateCustomDeliveryParams({
                          maxMLCSpeed: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Thresholds */}
              <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                <Label className="text-xs text-muted-foreground">Custom Thresholds</Label>
                {THRESHOLD_METRICS.map((metricKey) => {
                  const threshold = customThresholds[metricKey];
                  const definition = METRIC_DEFINITIONS[metricKey];
                  if (!threshold) return null;

                  const directionLabel = threshold.direction === 'low' ? '<' : '>';

                  return (
                    <div key={metricKey} className="grid grid-cols-5 items-center gap-2">
                      <Label className="col-span-1 text-xs font-medium">
                        {metricKey}
                      </Label>
                      <div className="col-span-2 flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">{directionLabel}</span>
                        <Input
                          type="number"
                          value={threshold.warningThreshold}
                          onChange={(e) =>
                            updateCustomThreshold(metricKey, {
                              warningThreshold: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="h-7 text-xs"
                          step={metricKey === 'LT' || metricKey === 'totalMU' ? 100 : 0.01}
                          title={`Warning threshold for ${definition?.name || metricKey}`}
                        />
                      </div>
                      <div className="col-span-2 flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">{directionLabel}</span>
                        <Input
                          type="number"
                          value={threshold.criticalThreshold}
                          onChange={(e) =>
                            updateCustomThreshold(metricKey, {
                              criticalThreshold: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="h-7 text-xs"
                          step={metricKey === 'LT' || metricKey === 'totalMU' ? 100 : 0.01}
                          title={`Critical threshold for ${definition?.name || metricKey}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
      )}
    </div>
  );
}
