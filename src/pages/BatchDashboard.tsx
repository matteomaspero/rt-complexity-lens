import { useRef, useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2, HelpCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useBatch } from '@/contexts/BatchContext';
import { useThresholdConfig } from '@/contexts/ThresholdConfigContext';
import { BUILTIN_PRESETS } from '@/lib/threshold-definitions';
import { PresetManager } from '@/components/settings';
import {
  BatchUploadZone,
  BatchProgressBar,
  BatchSummaryStats,
  BatchResultsTable,
  BatchDistributionChart,
  BatchExportPanel,
} from '@/components/batch';
import { OutlierReport } from '@/components/batch/OutlierReport';
import { type OutlierConfig, DEFAULT_OUTLIER_CONFIG } from '@/components/batch/OutlierSettings';
import { detectOutliers } from '@/lib/outlier-detection';
import { matchMachineToPreset, loadMachineMappings, loadAutoSelectEnabled, getAllPresetIds } from '@/lib/machine-mapping';
import { toast } from 'sonner';

export default function BatchDashboard() {
  const { plans, clearAll, isProcessing } = useBatch();
  const { selectedPreset, setPreset, userPresets, getPresetName } = useThresholdConfig();
  const hasPlans = plans.length > 0;
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [outlierConfig, setOutlierConfig] = useState<OutlierConfig>(DEFAULT_OUTLIER_CONFIG);

  const builtInOptions = Object.values(BUILTIN_PRESETS);

  // Detect outliers in the batch
  const outliers = useMemo(() => {
    if (plans.length < outlierConfig.minPlans) return [];
    return detectOutliers(plans, outlierConfig);
  }, [plans, outlierConfig]);

  // Auto-select machine preset when batch plans are loaded
  const autoMatchAppliedRef = useRef<string | null>(null);
  const successfulPlans = useMemo(() => plans.filter(p => p.status === 'success'), [plans]);

  useEffect(() => {
    if (successfulPlans.length === 0 || isProcessing) {
      autoMatchAppliedRef.current = null;
      return;
    }
    const firstMachine = successfulPlans[0]?.plan.treatmentMachineName;
    // Only auto-match once per unique first machine
    if (!firstMachine || autoMatchAppliedRef.current === firstMachine) return;

    const autoSelectEnabled = loadAutoSelectEnabled();
    if (!autoSelectEnabled) return;

    autoMatchAppliedRef.current = firstMachine;
    const mappings = loadMachineMappings();
    const allPresetIds = getAllPresetIds(userPresets.map(p => p.id));
    const matched = matchMachineToPreset(
      firstMachine,
      successfulPlans[0]?.plan.manufacturer,
      mappings,
      allPresetIds
    );
    if (matched) {
      setPreset(matched);
      const presetName = BUILTIN_PRESETS[matched]?.name ?? matched;

      // Check for mixed machines
      const machineNames = new Set(successfulPlans.map(p => p.plan.treatmentMachineName).filter(Boolean));
      if (machineNames.size > 1) {
        toast.info(`Mixed machines detected`, {
          description: `Using preset for "${firstMachine}". Found: ${[...machineNames].join(', ')}`,
        });
      } else {
        toast.success(`Machine detected: ${firstMachine}`, {
          description: `Switched to "${presetName}" preset`,
        });
      }
    }
  }, [successfulPlans, isProcessing, setPreset, userPresets]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Batch Analysis</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Analyze multiple plans and compare complexity metrics
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Machine Preset Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">Machine:</span>
              <Select value={selectedPreset} onValueChange={setPreset}>
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue placeholder={getPresetName()} />
                </SelectTrigger>
                <SelectContent>
                  {builtInOptions.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                  {userPresets.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-muted-foreground border-t mt-1 pt-1">
                        Your Presets
                      </div>
                      {userPresets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              <PresetManager
                trigger={
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                  </Button>
                }
              />
            </div>
            {hasPlans && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={isProcessing}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
            )}
            <Link to="/help">
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 py-6 space-y-6 w-full max-w-none">
        {/* Upload Zone */}
        <BatchUploadZone />

        {/* Progress */}
        <BatchProgressBar />

        {/* Stats and Export Row */}
        {hasPlans && (
          <div className="grid gap-6 lg:grid-cols-4">
            <div className="lg:col-span-3" ref={chartContainerRef}>
              <BatchSummaryStats />
            </div>
            <div className="space-y-6">
              <BatchExportPanel chartContainerRef={chartContainerRef} />
              <div data-chart-section="Distribution">
                <BatchDistributionChart />
              </div>
            </div>
          </div>
        )}

        {/* Outlier Detection Report */}
        {hasPlans && plans.length >= outlierConfig.minPlans && (
          <OutlierReport 
            outliers={outliers} 
            totalPlans={plans.length}
            outlierConfig={outlierConfig}
            onOutlierConfigChange={setOutlierConfig}
            onExport={() => {
              const headers = ['Plan', 'File', 'Severity', 'Metric', 'Metric Name', 'Value', 'Z-Score', 'Percentile', 'Complexity Score', 'Recommendation'];
              const rows = outliers.flatMap(o =>
                o.outlierMetrics.map(m => [
                  o.planId,
                  o.fileName,
                  m.severity,
                  m.metricKey,
                  m.metricName,
                  m.value.toFixed(4),
                  m.zScore.toFixed(2),
                  m.percentile.toFixed(1),
                  o.overallComplexityScore.toFixed(1),
                  `"${o.recommendation}"`,
                ].join(','))
              );
              const csv = [headers.join(','), ...rows].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'rtplens-outlier-report.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
          />
        )}

        {/* Results Table */}
        <BatchResultsTable />
      </main>
    </div>
  );
}
