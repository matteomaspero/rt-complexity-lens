import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { MLCApertureViewer } from '@/components/viewer/MLCApertureViewer';
import type { Beam, ControlPoint } from '@/lib/dicom/types';
import { cn } from '@/lib/utils';

interface CPComparisonViewerProps {
  beamA: Beam;
  beamB: Beam;
  currentCPIndex: number;
  onCPIndexChange: (index: number) => void;
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
}: CPComparisonViewerProps) {
  const maxCPs = Math.max(beamA.controlPoints.length, beamB.controlPoints.length);
  const minCPs = Math.min(beamA.controlPoints.length, beamB.controlPoints.length);

  // Clamp index to valid range for both beams
  const safeIndex = Math.min(currentCPIndex, minCPs - 1);
  
  const cpA = beamA.controlPoints[safeIndex];
  const cpB = beamB.controlPoints[safeIndex];

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
          <Badge variant="outline">
            CP {safeIndex + 1} / {minCPs}
          </Badge>
        </div>
        {beamA.controlPoints.length !== beamB.controlPoints.length && (
          <p className="text-xs text-amber-500">
            Note: Beams have different CP counts ({beamA.controlPoints.length} vs {beamB.controlPoints.length})
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CP Slider */}
        <div className="space-y-2">
          <Slider
            value={[safeIndex]}
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

        {/* Side-by-side apertures */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Plan A */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Plan A</span>
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
              <span className="text-sm font-medium">Plan B</span>
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
