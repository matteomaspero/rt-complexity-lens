import { useMemo } from 'react';
import { RotateCw, RotateCcw, Minus } from 'lucide-react';
import type { Beam, ControlPointMetrics, MachineDeliveryParams } from '@/lib/dicom/types';
import { calculateControlPointSegments } from '@/lib/dicom/angular-binning';
import { DEFAULT_MACHINE_PARAMS } from '@/lib/threshold-definitions';

interface BeamSummaryCardProps {
  beam: Beam;
  controlPointMetrics: ControlPointMetrics[];
  beamMU: number;
  machineParams?: MachineDeliveryParams;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function BeamSummaryCard({
  beam,
  controlPointMetrics,
  beamMU,
  machineParams = DEFAULT_MACHINE_PARAMS,
}: BeamSummaryCardProps) {
  const segments = useMemo(
    () => calculateControlPointSegments(beam, controlPointMetrics, machineParams),
    [beam, controlPointMetrics, machineParams]
  );

  // Calculate statistics from segments
  const stats = useMemo(() => {
    if (segments.length === 0) {
      return {
        totalTime: 0,
        doseRateMin: 0,
        doseRateMax: 0,
        avgGantrySpeed: 0,
        avgMLCSpeed: 0,
      };
    }

    const doseRates = segments.map((s) => s.doseRate);
    const gantryAngles = segments.map((s) => s.gantryAngle);
    
    // Calculate total arc length
    let arcLength = 0;
    for (let i = 1; i < gantryAngles.length; i++) {
      let delta = Math.abs(gantryAngles[i] - gantryAngles[i - 1]);
      if (delta > 180) delta = 360 - delta;
      arcLength += delta;
    }

    const totalTime = segments.reduce((sum, s) => sum + s.duration, 0);
    const avgGantrySpeed = totalTime > 0 ? arcLength / totalTime : 0;
    const avgMLCSpeed =
      segments.reduce((sum, s) => sum + s.maxLeafSpeed, 0) / segments.length;

    return {
      totalTime,
      doseRateMin: Math.min(...doseRates),
      doseRateMax: Math.max(...doseRates),
      avgGantrySpeed,
      avgMLCSpeed,
    };
  }, [segments]);

  // Determine rotation direction
  const rotationDir = beam.controlPoints[0]?.gantryRotationDirection ?? 'NONE';
  const RotationIcon =
    rotationDir === 'CW' ? RotateCw : rotationDir === 'CCW' ? RotateCcw : Minus;
  const rotationLabel =
    rotationDir === 'CW'
      ? 'Clockwise'
      : rotationDir === 'CCW'
        ? 'Counter-CW'
        : 'Static';

  // Arc length calculation
  const arcLength = useMemo(() => {
    const start = beam.gantryAngleStart;
    const end = beam.gantryAngleEnd;
    let delta = Math.abs(end - start);
    if (delta > 180) delta = 360 - delta;
    // For full arcs, check if it's actually a full rotation
    if (delta < 5 && beam.numberOfControlPoints > 10) {
      return 360;
    }
    return delta;
  }, [beam]);

  return (
    <div className="rounded-lg border bg-card p-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{beam.beamName}</h3>
          <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
            {beam.isArc ? 'VMAT Arc' : beam.beamType === 'DYNAMIC' ? 'IMRT' : 'Static'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <RotationIcon className="h-4 w-4" />
          <span>{rotationLabel}</span>
        </div>
      </div>

      {/* Info grid - Row 1: Delivery parameters */}
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4 lg:grid-cols-7">
        <div>
          <span className="text-xs text-muted-foreground">Energy</span>
          <p className="font-mono font-semibold">
            {beam.energyLabel || beam.radiationType || '—'}
            {beam.nominalBeamEnergy && !beam.energyLabel && (
              <span className="ml-1 text-muted-foreground">
                ({beam.nominalBeamEnergy} MeV)
              </span>
            )}
          </p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Control Points</span>
          <p className="font-mono font-semibold">{beam.numberOfControlPoints}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Gantry Range</span>
          <p className="font-mono font-semibold">
            {beam.gantryAngleStart.toFixed(1)}° → {beam.gantryAngleEnd.toFixed(1)}°
            <span className="ml-1 text-muted-foreground">({arcLength.toFixed(0)}°)</span>
          </p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">MU</span>
          <p className="font-mono font-semibold">{beamMU.toFixed(1)}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Est. Time</span>
          <p className="font-mono font-semibold">{formatTime(stats.totalTime)}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Dose Rate</span>
          <p className="font-mono font-semibold">
            {stats.doseRateMin.toFixed(0)} – {stats.doseRateMax.toFixed(0)}{' '}
            <span className="text-xs text-muted-foreground">MU/min</span>
          </p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Avg Gantry</span>
          <p className="font-mono font-semibold">
            {stats.avgGantrySpeed.toFixed(1)}{' '}
            <span className="text-xs text-muted-foreground">°/s</span>
          </p>
        </div>
        {(beam as any).BAM !== undefined && (
          <div>
            <span className="text-xs text-muted-foreground">BAM</span>
            <p className="font-mono font-semibold">{((beam as any).BAM as number).toFixed(4)}</p>
          </div>
        )}
      </div>

      {/* Info grid - Row 2: Geometric parameters */}
      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4 lg:grid-cols-4 border-t pt-2">
        <div>
          <span className="text-xs text-muted-foreground">Isocenter</span>
          <p className="font-mono font-semibold">
            {beam.controlPoints[0]?.isocenterPosition 
              ? `(${beam.controlPoints[0].isocenterPosition[0].toFixed(1)}, ${beam.controlPoints[0].isocenterPosition[1].toFixed(1)}, ${beam.controlPoints[0].isocenterPosition[2].toFixed(1)}) mm`
              : '—'}
          </p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Table Angle</span>
          <p className="font-mono font-semibold">
            {beam.controlPoints[0]?.patientSupportAngle !== undefined
              ? `${beam.controlPoints[0].patientSupportAngle.toFixed(1)}°`
              : '0.0°'}
          </p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Collimator</span>
          <p className="font-mono font-semibold">
            {beam.controlPoints[0]?.beamLimitingDeviceAngle.toFixed(1)}°
            {beam.controlPoints.length > 1 && 
             beam.controlPoints[0]?.beamLimitingDeviceAngle !== beam.controlPoints[beam.controlPoints.length - 1]?.beamLimitingDeviceAngle
              ? ` → ${beam.controlPoints[beam.controlPoints.length - 1]?.beamLimitingDeviceAngle.toFixed(1)}°`
              : ''}
          </p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Table Position</span>
          <p className="font-mono font-semibold text-xs">
            {beam.controlPoints[0]?.tableTopVertical !== undefined ||
             beam.controlPoints[0]?.tableTopLongitudinal !== undefined ||
             beam.controlPoints[0]?.tableTopLateral !== undefined
              ? `V:${(beam.controlPoints[0]?.tableTopVertical ?? 0).toFixed(0)} L:${(beam.controlPoints[0]?.tableTopLongitudinal ?? 0).toFixed(0)} Lat:${(beam.controlPoints[0]?.tableTopLateral ?? 0).toFixed(0)}`
              : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
