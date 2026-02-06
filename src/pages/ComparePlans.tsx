import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SessionPlan } from '@/lib/dicom/types';
import { useThresholdConfig } from '@/contexts/ThresholdConfigContext';
import { BUILTIN_PRESETS } from '@/lib/threshold-definitions';
import { PresetManager } from '@/components/settings';
import {
  ComparisonHeader,
  MetricsDiffTable,
  BeamComparisonTable,
  CPComparisonViewer,
  ComparisonMUChart,
  ComparisonDeliveryChart,
  ComparisonPolarChart,
} from '@/components/comparison';
import { matchBeams } from '@/lib/comparison/beam-matcher';

export default function ComparePlans() {
  const [planA, setPlanA] = useState<SessionPlan | null>(null);
  const [planB, setPlanB] = useState<SessionPlan | null>(null);
  const [selectedBeamMatch, setSelectedBeamMatch] = useState(0);
  const [currentCPIndex, setCurrentCPIndex] = useState(0);
  
  const { selectedPreset, setPreset, userPresets, getPresetName } = useThresholdConfig();

  const bothLoaded = planA && planB;

  const beamMatches = useMemo(() => {
    if (!bothLoaded) return null;
    return matchBeams(planA.plan.beams, planB.plan.beams);
  }, [bothLoaded, planA, planB]);

  const selectedBeams = useMemo(() => {
    if (!bothLoaded || !beamMatches || beamMatches.matches.length === 0) return null;
    const match = beamMatches.matches[selectedBeamMatch];
    if (!match) return null;
    return {
      beamA: planA.plan.beams[match.indexA],
      beamB: planB.plan.beams[match.indexB],
    };
  }, [bothLoaded, planA, planB, beamMatches, selectedBeamMatch]);

  const handleBeamMatchSelect = useCallback((index: number) => {
    setSelectedBeamMatch(index);
    setCurrentCPIndex(0);
  }, []);

  const handlePlanARemoved = useCallback(() => {
    setPlanA(null);
    setSelectedBeamMatch(0);
    setCurrentCPIndex(0);
  }, []);

  const handlePlanBRemoved = useCallback(() => {
    setPlanB(null);
    setSelectedBeamMatch(0);
    setCurrentCPIndex(0);
  }, []);

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
            <h1 className="text-lg font-semibold">Plan Comparison</h1>
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
        <ComparisonHeader
          planA={planA}
          planB={planB}
          onPlanALoaded={setPlanA}
          onPlanBLoaded={setPlanB}
          onPlanARemoved={handlePlanARemoved}
          onPlanBRemoved={handlePlanBRemoved}
        />

        {/* Comparison Content */}
        {bothLoaded && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column */}
            <div className="space-y-6">
              <MetricsDiffTable
                metricsA={planA.metrics}
                metricsB={planB.metrics}
              />
              <BeamComparisonTable
                beamsA={planA.plan.beams}
                beamsB={planB.plan.beams}
                metricsA={planA.metrics.beamMetrics}
                metricsB={planB.metrics.beamMetrics}
                selectedBeamMatch={selectedBeamMatch}
                onBeamMatchSelect={handleBeamMatchSelect}
              />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {selectedBeams && (
                <>
                  <CPComparisonViewer
                    beamA={selectedBeams.beamA}
                    beamB={selectedBeams.beamB}
                    currentCPIndex={currentCPIndex}
                    onCPIndexChange={setCurrentCPIndex}
                  />
                  
                  {/* Comparison Charts */}
                  <ComparisonMUChart
                    beamA={selectedBeams.beamA}
                    beamB={selectedBeams.beamB}
                    muA={planA.metrics.beamMetrics.find(
                      (m) => m.beamNumber === selectedBeams.beamA.beamNumber
                    )?.beamMU ?? 0}
                    muB={planB.metrics.beamMetrics.find(
                      (m) => m.beamNumber === selectedBeams.beamB.beamNumber
                    )?.beamMU ?? 0}
                    currentCPIndex={currentCPIndex}
                  />
                  
                  <ComparisonDeliveryChart
                    beamA={selectedBeams.beamA}
                    beamB={selectedBeams.beamB}
                    metricsA={planA.metrics.beamMetrics.find(
                      (m) => m.beamNumber === selectedBeams.beamA.beamNumber
                    )!}
                    metricsB={planB.metrics.beamMetrics.find(
                      (m) => m.beamNumber === selectedBeams.beamB.beamNumber
                    )!}
                    currentCPIndex={currentCPIndex}
                  />
                  
                  <ComparisonPolarChart
                    beamA={selectedBeams.beamA}
                    beamB={selectedBeams.beamB}
                    controlPointMetricsA={
                      planA.metrics.beamMetrics.find(
                        (m) => m.beamNumber === selectedBeams.beamA.beamNumber
                      )?.controlPointMetrics ?? []
                    }
                    controlPointMetricsB={
                      planB.metrics.beamMetrics.find(
                        (m) => m.beamNumber === selectedBeams.beamB.beamNumber
                      )?.controlPointMetrics ?? []
                    }
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!bothLoaded && (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <p className="text-lg font-medium">Upload two plans to compare</p>
            <p className="mt-1 text-sm">
              Drop DICOM-RT Plan files in the zones above to see a side-by-side comparison
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
