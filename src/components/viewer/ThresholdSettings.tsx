import { AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useThresholdConfig } from '@/contexts/ThresholdConfigContext';
import { MACHINE_PRESETS, type MachinePreset } from '@/lib/threshold-definitions';
import { METRIC_DEFINITIONS } from '@/lib/metrics-definitions';

interface ThresholdSettingsProps {
  className?: string;
}

const THRESHOLD_METRICS = ['MCS', 'LSV', 'AAV', 'MFA', 'LT', 'totalMU'] as const;

export function ThresholdSettings({ className }: ThresholdSettingsProps) {
  const {
    enabled,
    selectedPreset,
    customThresholds,
    setEnabled,
    setPreset,
    updateCustomThreshold,
  } = useThresholdConfig();

  const presetOptions = Object.values(MACHINE_PRESETS);

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
            <Label className="text-xs text-muted-foreground">Machine Preset</Label>
            <Select value={selectedPreset} onValueChange={(v) => setPreset(v as MachinePreset)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presetOptions.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    <div className="flex flex-col items-start">
                      <span>{preset.name}</span>
                      <span className="text-xs text-muted-foreground">{preset.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Thresholds Editor */}
          {selectedPreset === 'custom' && (
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
          )}

          {/* Legend */}
          {selectedPreset !== 'custom' && (
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
          )}
        </div>
      )}
    </div>
  );
}
