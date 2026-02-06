import { useState, useCallback, useEffect, useRef, forwardRef } from 'react';
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
} from '@/components/viewer';
import { MetricsSettings } from '@/components/viewer/MetricsSettings';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

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

  // No plan loaded - show upload zone
  if (!sessionPlan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">
            RT Plan Complexity Analyzer
          </h1>
          <p className="text-muted-foreground">
            Upload a DICOM-RT Plan file to analyze delivery complexity metrics
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
        
        {/* Metrics Settings */}
        <div className="mt-6 w-full max-w-md">
          <MetricsSettings />
        </div>
        
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Supports VMAT and IMRT plans • Browser-based processing</p>
          <p className="mt-1">UCoMX v1.1 complexity metrics</p>
        </div>
        
        {/* Help Link */}
        <div className="mt-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/help" className="flex items-center gap-1">
              <HelpCircle className="h-4 w-4" />
              Help & Documentation
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Plan loaded - show interactive viewer
  return (
    <div className="flex min-h-screen bg-background">
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
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/help">
                  <HelpCircle className="h-5 w-5" />
                </Link>
              </Button>
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
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column - Visualizations */}
              <div className="space-y-6">
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
                    <h4 className="mb-4 text-sm font-medium">Gantry Position</h4>
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
                    <h4 className="mb-4 text-sm font-medium">MLC Aperture</h4>
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

                {/* Current Control Point Details */}
                <div className="rounded-lg border bg-card p-4">
                  <h4 className="mb-3 text-sm font-medium">Control Point Details</h4>
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
              <div className="lg:max-w-sm">
                <MetricsPanel
                  metrics={sessionPlan.metrics}
                  currentBeamIndex={selectedBeamIndex}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
