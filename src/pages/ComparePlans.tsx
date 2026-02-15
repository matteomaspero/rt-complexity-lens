import { useState, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Settings, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ThemeToggle } from '@/components/ui/theme-toggle';
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
import { generateComparePDF, type PDFChartRef } from '@/lib/pdf-report';

export default function ComparePlans() {
  const [planA, setPlanA] = useState<SessionPlan | null>(null);
  const [planB, setPlanB] = useState<SessionPlan | null>(null);
  const [selectedBeamMatch, setSelectedBeamMatch] = useState(0);
  const [currentCPIndex, setCurrentCPIndex] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const compareContentRef = useRef<HTMLDivElement>(null);
  
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

  const handleExportPDF = useCallback(async () => {
    if (!planA || !planB) return;
    setPdfLoading(true);
    try {
      const chartRefs: PDFChartRef[] = [];
      if (compareContentRef.current) {
        const sections = compareContentRef.current.querySelectorAll<HTMLElement>('[data-chart-section]');
        sections.forEach(el => {
          const label = el.getAttribute('data-chart-section') || 'Chart';
          chartRefs.push({ label, element: el });
        });
      }
      await generateComparePDF(
        { plan: planA.plan, metrics: planA.metrics, fileName: planA.fileName },
        { plan: planB.plan, metrics: planB.metrics, fileName: planB.fileName },
        chartRefs,
      );
    } finally {
      setPdfLoading(false);
    }
  }, [planA, planB]);

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
            <p className="text-xs text-muted-foreground hidden sm:block">
              Compare two DICOM-RT plans side-by-side
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
            {bothLoaded && (
              <Button variant="ghost" size="sm" onClick={handleExportPDF} disabled={pdfLoading} className="gap-1">
                <FileText className="h-4 w-4" />
                {pdfLoading ? '...' : 'PDF'}
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
          <div className="grid gap-6 lg:grid-cols-2" ref={compareContentRef}>
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
                  <div data-chart-section="MU Comparison">
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
                  </div>
                  
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
                  
                  <div data-chart-section="Polar Chart">
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
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!bothLoaded && (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-lg font-medium">Upload two plans to compare</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
              Drop DICOM-RT Plan files in the zones above to see a side-by-side comparison of metrics, beams, and control points.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
