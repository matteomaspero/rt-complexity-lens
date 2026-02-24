import { useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Crosshair } from 'lucide-react';
import { MLCApertureViewer } from '@/components/viewer/MLCApertureViewer';
import { MLCDifferenceViewer } from './MLCDifferenceViewer';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { Beam, ControlPoint } from '@/lib/dicom/types';
import { cn } from '@/lib/utils';

interface CPComparisonViewerProps {
  beamA: Beam;
  beamB: Beam;
  currentCPIndex: number;
  onCPIndexChange: (index: number) => void;
  independentNav: boolean;
  onIndependentNavChange: (value: boolean) => void;
  cpIndexB: number;
  onCPIndexBChange: (index: number) => void;
}

function CPDetails({ cp, label }: { cp: ControlPoint; label: string }) {
  return (
    <div className="text-xs text-muted-foreground space-y-1">
      <div className="flex justify-between">
        <span>Gantry:</span>
        <span className="font-mono">{cp.gantryAngle.toFixed(1)}°</span>
      </div>
      <div className="flex justify-between">
        <span>Collimator:</span>
        <span className="font-mono">{cp.beamLimitingDeviceAngle.toFixed(1)}°</span>
      </div>
      <div className="flex justify-between">
        <span>Meterset:</span>
        <span className="font-mono">{(cp.cumulativeMetersetWeight * 100).toFixed(1)}%</span>
      </div>
    </div>
  );
}

export function CPComparisonViewer({
  beamA,
  beamB,
  currentCPIndex,
  onCPIndexChange,
  independentNav,
  onIndependentNavChange,
  cpIndexB,
  onCPIndexBChange,
}: CPComparisonViewerProps) {
  const maxCPsA = beamA.controlPoints.length;
  const maxCPsB = beamB.controlPoints.length;
  const minCPs = Math.min(maxCPsA, maxCPsB);

  // In synced mode, clamp to min; in independent mode, each uses its own max
  const safeIndexA = independentNav
    ? Math.min(currentCPIndex, maxCPsA - 1)
    : Math.min(currentCPIndex, minCPs - 1);
  const safeIndexB = independentNav
    ? Math.min(cpIndexB, maxCPsB - 1)
    : Math.min(currentCPIndex, minCPs - 1);

  const cpA = beamA.controlPoints[safeIndexA];
  const cpB = beamB.controlPoints[safeIndexB];

  // Find nearest CP in Plan B matching Plan A's current gantry angle
  const handleGantrySnap = useCallback(() => {
    if (!cpA) return;
    const targetAngle = cpA.gantryAngle;
    let bestIdx = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < maxCPsB; i++) {
      const diff = Math.abs(beamB.controlPoints[i].gantryAngle - targetAngle);
      // Handle 360° wraparound
      const wrappedDiff = Math.min(diff, 360 - diff);
      if (wrappedDiff < bestDiff) {
        bestDiff = wrappedDiff;
        bestIdx = i;
      }
    }
    onCPIndexBChange(bestIdx);
  }, [cpA, beamB.controlPoints, maxCPsB, onCPIndexBChange]);

  // Calculate differences
  const gantryDiff = cpA && cpB ? Math.abs(cpA.gantryAngle - cpB.gantryAngle) : 0;
  const metersetDiff = cpA && cpB
    ? Math.abs(cpA.cumulativeMetersetWeight - cpB.cumulativeMetersetWeight) * 100
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Control Point Comparison
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="independent-nav"
                checked={independentNav}
                onCheckedChange={onIndependentNavChange}
              />
              <Label htmlFor="independent-nav" className="text-xs cursor-pointer">
                Independent
              </Label>
            </div>
            {independentNav ? (
              <div className="flex gap-1">
                <Badge variant="outline" className="text-[hsl(var(--chart-comparison-a))]">
                  A: {safeIndexA + 1}/{maxCPsA}
                </Badge>
                <Badge variant="outline" className="text-[hsl(var(--chart-comparison-b))]">
                  B: {safeIndexB + 1}/{maxCPsB}
                </Badge>
              </div>
            ) : (
              <Badge variant="outline">
                CP {safeIndexA + 1} / {minCPs}
              </Badge>
            )}
          </div>
        </div>
        {beamA.controlPoints.length !== beamB.controlPoints.length && !independentNav && (
          <p className="text-xs text-amber-500">
            Note: Beams have different CP counts ({maxCPsA} vs {maxCPsB}). Enable independent navigation to browse each fully.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CP Slider(s) */}
        {independentNav ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[hsl(var(--chart-comparison-a))] font-medium">Plan A</span>
                <span className="text-muted-foreground font-mono">CP {safeIndexA + 1}</span>
              </div>
              <Slider
                value={[safeIndexA]}
                min={0}
                max={maxCPsA - 1}
                step={1}
                onValueChange={([val]) => onCPIndexChange(val)}
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[hsl(var(--chart-comparison-b))] font-medium">Plan B</span>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={handleGantrySnap}
                        >
                          <Crosshair className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p className="text-xs">Snap to nearest gantry match ({cpA?.gantryAngle.toFixed(1)}°)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="text-muted-foreground font-mono">CP {safeIndexB + 1}</span>
                </div>
              </div>
              <Slider
                value={[safeIndexB]}
                min={0}
                max={maxCPsB - 1}
                step={1}
                onValueChange={([val]) => onCPIndexBChange(val)}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Slider
              value={[safeIndexA]}
              min={0}
              max={minCPs - 1}
              step={1}
              onValueChange={([val]) => onCPIndexChange(val)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>CP 1</span>
              <span>CP {minCPs}</span>
            </div>
          </div>
        )}

        {/* View Mode Tabs */}
        <Tabs defaultValue="side-by-side" className="w-full">
          <TabsList className="mb-3 h-8 w-full">
            <TabsTrigger value="side-by-side" className="flex-1 text-xs">Side-by-Side</TabsTrigger>
            <TabsTrigger value="difference" className="flex-1 text-xs">Difference Overlay</TabsTrigger>
          </TabsList>

          {/* Side-by-side View */}
          <TabsContent value="side-by-side" className="mt-0">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Plan A */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[hsl(var(--chart-comparison-a))]">Plan A</span>
                  <span className="text-xs text-muted-foreground">{beamA.beamName}</span>
                </div>
                {cpA && (
                  <>
                    <div className="flex justify-center rounded-lg border bg-muted/30 p-2">
                      <MLCApertureViewer
                        mlcPositions={cpA.mlcPositions}
                        leafWidths={beamA.mlcLeafWidths}
                        jawPositions={cpA.jawPositions}
                        width={180}
                        height={160}
                      />
                    </div>
                    <CPDetails cp={cpA} label="A" />
                  </>
                )}
              </div>

              {/* Plan B */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[hsl(var(--chart-comparison-b))]">Plan B</span>
                  <span className="text-xs text-muted-foreground">{beamB.beamName}</span>
                </div>
                {cpB && (
                  <>
                    <div className="flex justify-center rounded-lg border bg-muted/30 p-2">
                      <MLCApertureViewer
                        mlcPositions={cpB.mlcPositions}
                        leafWidths={beamB.mlcLeafWidths}
                        jawPositions={cpB.jawPositions}
                        width={180}
                        height={160}
                      />
                    </div>
                    <CPDetails cp={cpB} label="B" />
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Difference Overlay View */}
          <TabsContent value="difference" className="mt-0">
            {cpA && cpB && (
              <div className="flex flex-col items-center gap-3">
                <MLCDifferenceViewer
                  mlcPositionsA={cpA.mlcPositions}
                  mlcPositionsB={cpB.mlcPositions}
                  leafWidths={beamA.mlcLeafWidths}
                  jawPositionsA={cpA.jawPositions}
                  jawPositionsB={cpB.jawPositions}
                  width={340}
                  height={280}
                />
                <div className="grid w-full grid-cols-2 gap-4 text-sm">
                  <CPDetails cp={cpA} label="A" />
                  <CPDetails cp={cpB} label="B" />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Difference indicators */}
        {cpA && cpB && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Gantry Δ:</span>
                <span className={cn(
                  'ml-2 font-mono',
                  gantryDiff > 5 && 'text-amber-500',
                  gantryDiff > 10 && 'text-destructive'
                )}>
                  {gantryDiff.toFixed(1)}°
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Meterset Δ:</span>
                <span className={cn(
                  'ml-2 font-mono',
                  metersetDiff > 5 && 'text-amber-500',
                  metersetDiff > 10 && 'text-destructive'
                )}>
                  {metersetDiff.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
