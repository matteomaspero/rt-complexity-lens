import { useState, useCallback, useEffect, useRef, forwardRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { SessionPlan, Beam, ControlPoint } from '@/lib/dicom/types';
import {
  FileUploadZone,
  MLCApertureViewer,
  GantryViewer,
  CollimatorViewer,
  ControlPointNavigator,
  MetricsPanel,
  CumulativeMUChart,
  GantrySpeedChart,
  BeamSelector,
  DemoLoader,
  AngularDistributionChart,
  DeliveryTimelineChart,
  ComplexityHeatmap,
  BeamSummaryCard,
} from '@/components/viewer';
import { MetricsSettings } from '@/components/viewer/MetricsSettings';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Logo } from '@/components/ui/logo';
import { HelpCircle, ChevronDown, Home, Github } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export const InteractiveViewer = forwardRef<HTMLDivElement, object>(
  function InteractiveViewer(_props, ref) {
  const [sessionPlan, setSessionPlan] = useState<SessionPlan | null>(null);
  const [selectedBeamIndex, setSelectedBeamIndex] = useState(0);
  const [currentCPIndex, setCurrentCPIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get current beam and control point
  const currentBeam: Beam | null = sessionPlan?.plan.beams[selectedBeamIndex] ?? null;
  const currentCP: ControlPoint | null = currentBeam?.controlPoints[currentCPIndex] ?? null;
  const totalCPs = currentBeam?.controlPoints.length ?? 0;

  // Get beam MU from fraction group
  const beamMU = useMemo(() => {
    if (!sessionPlan || !currentBeam) return 0;
    const fg = sessionPlan.plan.fractionGroups[0];
    const refBeam = fg?.referencedBeams.find(rb => rb.beamNumber === currentBeam.beamNumber);
    return refBeam?.beamMeterset ?? currentBeam.beamDose ?? 0;
  }, [sessionPlan, currentBeam]);

  // Handle plan loaded
  const handlePlanLoaded = useCallback((plan: SessionPlan) => {
    setSessionPlan(plan);
    setSelectedBeamIndex(0);
    setCurrentCPIndex(0);
    setIsPlaying(false);
  }, []);

  // Handle beam change
  const handleBeamChange = useCallback((index: number) => {
    setSelectedBeamIndex(index);
    setCurrentCPIndex(0);
    setIsPlaying(false);
  }, []);

  // Handle playback
  useEffect(() => {
    if (isPlaying && currentBeam) {
      playIntervalRef.current = setInterval(() => {
        setCurrentCPIndex((prev) => {
          if (prev >= totalCPs - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 100); // 10 FPS playback
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, currentBeam, totalCPs]);

  const handlePlayToggle = useCallback(() => {
    if (currentCPIndex >= totalCPs - 1) {
      setCurrentCPIndex(0);
    }
    setIsPlaying((prev) => !prev);
  }, [currentCPIndex, totalCPs]);

  // Handle closing plan and returning to home
  const handleClosePlan = useCallback(() => {
    setSessionPlan(null);
    setSelectedBeamIndex(0);
    setCurrentCPIndex(0);
    setIsPlaying(false);
  }, []);

  // No plan loaded - show upload zone
  if (!sessionPlan) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Logo size="lg" />
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            Upload a DICOM-RT Plan file to analyze delivery complexity metrics, timing estimates, and quality indicators.
          </p>
        </div>
        <FileUploadZone
          onPlanLoaded={handlePlanLoaded}
          className="w-full max-w-md"
        />
        <div className="mt-6 w-full max-w-md">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <DemoLoader
            onPlanLoaded={handlePlanLoaded}
            className="mt-4"
          />
        </div>

        {/* Mode Selection */}
        <div className="mt-8 w-full max-w-md">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or select a mode</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <Link to="/batch">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium">Batch Analysis</span>
                <span className="text-xs text-muted-foreground">Analyze multiple plans</span>
              </Button>
            </Link>
            <Link to="/compare">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="font-medium">Compare Plans</span>
                <span className="text-xs text-muted-foreground">Side-by-side diff view</span>
              </Button>
            </Link>
            <Link to="/cohort">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                <span className="font-medium">Cohort Analysis</span>
                <span className="text-xs text-muted-foreground">Statistical clustering</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Python Toolkit Link */}
        <div className="mt-6 w-full max-w-md">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">offline analysis</span>
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" asChild className="gap-2">
                  <a
                    href="https://github.com/matteomaspero/rt-complexity-lens/blob/main/python/README.md"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="h-4 w-4" />
                    Python Toolkit
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Run identical analyses offline on your workstation using the rtplan-complexity Python package.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Same metrics, offline workstation • <Link to="/python-docs" className="text-primary underline hover:no-underline">View docs</Link>
          </p>
        </div>
        
        {/* Metrics Settings */}
        <div className="mt-6 w-full max-w-md">
          <MetricsSettings />
        </div>
        
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Supports <span className="font-medium">VMAT</span> and <span className="font-medium">IMRT</span> plans • Browser-based processing</p>
        </div>
        
        {/* Help Link and Theme Toggle */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/help" className="flex items-center gap-1">
              <HelpCircle className="h-4 w-4" />
              Help & Documentation
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </main>
    );
  }

  // Plan loaded - show interactive viewer
  return (
    <main className="flex min-h-screen bg-background">
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">{sessionPlan.plan.planLabel}</h1>
              <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                <span>Patient: {sessionPlan.plan.patientId}</span>
                <Separator orientation="vertical" className="h-4" />
                <Badge variant="secondary">{sessionPlan.plan.technique}</Badge>
                <Separator orientation="vertical" className="h-4" />
                <span>{sessionPlan.plan.beams.length} beam{sessionPlan.plan.beams.length !== 1 ? 's' : ''}</span>
                <Separator orientation="vertical" className="h-4" />
                <span>{sessionPlan.plan.totalMU.toFixed(0)} MU total</span>
                {sessionPlan.plan.prescribedDose != null && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <span>
                      {sessionPlan.plan.dosePerFraction != null && sessionPlan.plan.numberOfFractions != null
                        ? `${sessionPlan.plan.dosePerFraction.toFixed(2)} Gy × ${sessionPlan.plan.numberOfFractions} fx = ${sessionPlan.plan.prescribedDose.toFixed(2)} Gy`
                        : `${sessionPlan.plan.prescribedDose.toFixed(2)} Gy prescribed`}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleClosePlan}
                title="Back to Home"
              >
                <Home className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/help">
                  <HelpCircle className="h-5 w-5" />
                </Link>
              </Button>
              <ThemeToggle />
              <FileUploadZone
                onPlanLoaded={handlePlanLoaded}
                className="h-12 w-48 border-dashed p-2"
              />
            </div>
          </div>

          {/* Beam Selector */}
          {sessionPlan.plan.beams.length > 1 && (
            <div className="mt-4">
              <BeamSelector
                beams={sessionPlan.plan.beams}
                selectedBeamIndex={selectedBeamIndex}
                onBeamChange={handleBeamChange}
              />
            </div>
          )}
        </header>

        {/* Viewer Content */}
        <div className="flex-1 overflow-auto p-6">
          {currentBeam && currentCP && (
            <div className="grid gap-6 lg:grid-cols-[1fr,380px] xl:grid-cols-[1fr,420px]">
              {/* Left Column - Visualizations */}
              <div className="space-y-6 min-w-0">
                {/* Beam Summary Card */}
                <BeamSummaryCard
                  beam={currentBeam}
                  controlPointMetrics={sessionPlan.metrics.beamMetrics[selectedBeamIndex]?.controlPointMetrics || []}
                  beamMU={beamMU}
                />

                {/* Control Point Navigator */}
                <ControlPointNavigator
                  currentIndex={currentCPIndex}
                  totalPoints={totalCPs}
                  isPlaying={isPlaying}
                  onIndexChange={setCurrentCPIndex}
                  onPlayToggle={handlePlayToggle}
                />

                {/* Gantry and Collimator Row */}
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Gantry View */}
                  <div className="rounded-lg border bg-card p-4">
                    <h4 className="mb-4 text-sm font-medium flex items-center gap-2">
                      <span className="w-1 h-4 bg-primary rounded-full" />
                      Gantry Position
                    </h4>
                    <div className="flex justify-center">
                      <GantryViewer
                        gantryAngle={currentCP.gantryAngle}
                        direction={currentCP.gantryRotationDirection}
                        size={160}
                      />
                    </div>
                  </div>

                  {/* Collimator View */}
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex justify-center">
                      <CollimatorViewer
                        collimatorAngle={currentCP.beamLimitingDeviceAngle}
                        jawPositions={currentCP.jawPositions}
                        size={160}
                      />
                    </div>
                  </div>

                  {/* MLC Aperture */}
                  <div className="rounded-lg border bg-card p-4">
                    <h4 className="mb-4 text-sm font-medium flex items-center gap-2">
                      <span className="w-1 h-4 bg-primary rounded-full" />
                      MLC Aperture
                    </h4>
                    <MLCApertureViewer
                      mlcPositions={currentCP.mlcPositions}
                      leafWidths={currentBeam.mlcLeafWidths}
                      jawPositions={currentCP.jawPositions}
                      width={200}
                      height={180}
                    />
                  </div>
                </div>

                {/* Charts */}
                <div className="grid gap-6 md:grid-cols-2">
                  <CumulativeMUChart
                    controlPoints={currentBeam.controlPoints}
                    currentIndex={currentCPIndex}
                    totalMU={currentBeam.beamDose || sessionPlan.plan.totalMU / sessionPlan.plan.beams.length}
                    height={140}
                  />
                  <GantrySpeedChart
                    controlPoints={currentBeam.controlPoints}
                    currentIndex={currentCPIndex}
                    height={140}
                  />
                </div>

                {/* MU Distribution Section */}
                <Collapsible defaultOpen className="rounded-lg border bg-card">
                  <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <span className="w-1 h-4 bg-primary rounded-full" />
                      MU Distribution
                    </h4>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4">
                    <AngularDistributionChart
                      beam={currentBeam}
                      controlPointMetrics={sessionPlan.metrics.beamMetrics[selectedBeamIndex]?.controlPointMetrics || []}
                      currentIndex={currentCPIndex}
                    />
                  </CollapsibleContent>
                </Collapsible>

                {/* Delivery Analysis Section */}
                <Collapsible defaultOpen className="rounded-lg border bg-card">
                  <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <span className="w-1 h-4 bg-primary rounded-full" />
                      Delivery Analysis
                    </h4>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4">
                    <DeliveryTimelineChart
                      beam={currentBeam}
                      controlPointMetrics={sessionPlan.metrics.beamMetrics[selectedBeamIndex]?.controlPointMetrics || []}
                      currentIndex={currentCPIndex}
                    />
                  </CollapsibleContent>
                </Collapsible>

                {/* Complexity Analysis Section */}
                <Collapsible defaultOpen className="rounded-lg border bg-card">
                  <CollapsibleTrigger className="flex w-full items-center justify-between p-4 hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <span className="w-1 h-4 bg-primary rounded-full" />
                      Complexity Analysis
                    </h4>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4">
                    <ComplexityHeatmap
                      beam={currentBeam}
                      controlPointMetrics={sessionPlan.metrics.beamMetrics[selectedBeamIndex]?.controlPointMetrics || []}
                      currentIndex={currentCPIndex}
                    />
                  </CollapsibleContent>
                </Collapsible>

                {/* Current Control Point Details */}
                <div className="rounded-lg border bg-card p-4">
                  <h4 className="mb-3 text-sm font-medium flex items-center gap-2">
                    <span className="w-1 h-4 bg-primary rounded-full" />
                    Control Point Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                    <div>
                      <span className="text-muted-foreground">Index</span>
                      <p className="font-mono font-semibold">{currentCP.index + 1}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gantry</span>
                      <p className="font-mono font-semibold">{currentCP.gantryAngle.toFixed(1)}°</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Collimator</span>
                      <p className="font-mono font-semibold">{currentCP.beamLimitingDeviceAngle.toFixed(1)}°</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Meterset</span>
                      <p className="font-mono font-semibold">{(currentCP.cumulativeMetersetWeight * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Metrics Panel */}
              <div>
                <MetricsPanel
                  metrics={sessionPlan.metrics}
                  currentBeamIndex={selectedBeamIndex}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
});
