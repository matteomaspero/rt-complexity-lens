import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SessionPlan } from '@/lib/dicom/types';
import {
  ComparisonHeader,
  MetricsDiffTable,
  BeamComparisonTable,
  CPComparisonViewer,
} from '@/components/comparison';
import { matchBeams } from '@/lib/comparison/beam-matcher';

export default function ComparePlans() {
  const [planA, setPlanA] = useState<SessionPlan | null>(null);
  const [planB, setPlanB] = useState<SessionPlan | null>(null);
  const [selectedBeamMatch, setSelectedBeamMatch] = useState(0);
  const [currentCPIndex, setCurrentCPIndex] = useState(0);

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
          <Link to="/help">
            <Button variant="ghost" size="icon">
              <HelpCircle className="h-5 w-5" />
            </Button>
          </Link>
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
                <CPComparisonViewer
                  beamA={selectedBeams.beamA}
                  beamB={selectedBeams.beamB}
                  currentCPIndex={currentCPIndex}
                  onCPIndexChange={setCurrentCPIndex}
                />
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
