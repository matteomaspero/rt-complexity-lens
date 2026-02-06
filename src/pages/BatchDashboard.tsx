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

export default function BatchDashboard() {
  const { plans, clearAll, isProcessing } = useBatch();
  const { selectedPreset, setPreset, userPresets, getPresetName } = useThresholdConfig();
  const hasPlans = plans.length > 0;

  const builtInOptions = Object.values(BUILTIN_PRESETS);

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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 space-y-6">
        {/* Upload Zone */}
        <BatchUploadZone />

        {/* Progress */}
        <BatchProgressBar />

        {/* Stats and Export Row */}
        {hasPlans && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <BatchSummaryStats />
            </div>
            <div className="space-y-6">
              <BatchExportPanel />
              <BatchDistributionChart />
            </div>
          </div>
        )}

        {/* Results Table */}
        <BatchResultsTable />
      </main>
    </div>
  );
}
