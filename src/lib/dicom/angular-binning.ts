// Angular binning calculations for distribution visualizations

import type { Beam, ControlPoint, ControlPointMetrics, MachineDeliveryParams } from './types';

export interface AngularBin {
  angleStart: number;      // Bin start angle
  angleEnd: number;        // Bin end angle
  angleMid: number;        // Bin center for plotting
  MU: number;              // Total MU in this angular range
  MUperDegree: number;     // MU per degree
  avgDoseRate: number;     // Average dose rate (MU/min)
  maxDoseRate: number;     // Peak dose rate in this bin
  duration: number;        // Time spent in this range (s)
  avgMCS: number;          // Average complexity (from LSV)
  maxLeafSpeed: number;    // Maximum MLC speed (mm/s)
  limitingFactor: 'doseRate' | 'gantrySpeed' | 'mlcSpeed';
  controlPointCount: number; // Number of control points in this bin
}

export interface ControlPointSegment {
  index: number;
  gantryAngle: number;
  gantryAngleEnd: number;
  MU: number;
  duration: number;
  doseRate: number;        // MU/min
  gantrySpeed: number;     // deg/s
  maxLeafSpeed: number;    // mm/s
  limitingFactor: 'doseRate' | 'gantrySpeed' | 'mlcSpeed';
  LSV: number;
  AAV: number;
  apertureArea: number;
}

/**
 * Get maximum leaf travel between two control points
 */
function getMaxLeafTravel(
  prevPositions: { bankA: number[]; bankB: number[] },
  currPositions: { bankA: number[]; bankB: number[] }
): number {
  if (prevPositions.bankA.length === 0 || currPositions.bankA.length === 0) return 0;
  
  let maxTravel = 0;
  const numPairs = Math.min(prevPositions.bankA.length, currPositions.bankA.length);
  
  for (let i = 0; i < numPairs; i++) {
    maxTravel = Math.max(maxTravel, Math.abs(currPositions.bankA[i] - prevPositions.bankA[i]));
    maxTravel = Math.max(maxTravel, Math.abs(currPositions.bankB[i] - prevPositions.bankB[i]));
  }
  
  return maxTravel;
}

/**
 * Calculate per-segment data for a beam
 */
export function calculateControlPointSegments(
  beam: Beam,
  controlPointMetrics: ControlPointMetrics[],
  machineParams: MachineDeliveryParams
): ControlPointSegment[] {
  const segments: ControlPointSegment[] = [];
  const beamMU = beam.beamDose || 100;
  
  for (let i = 1; i < beam.controlPoints.length; i++) {
    const cp = beam.controlPoints[i];
    const prevCP = beam.controlPoints[i - 1];
    const cpm = controlPointMetrics[i];
    const prevCPM = controlPointMetrics[i - 1];
    
    // MU for this segment
    const segmentMU = cpm.metersetWeight * beamMU;
    
    // Calculate times for each limiting factor
    const doseRateTime = segmentMU / (machineParams.maxDoseRate / 60);
    const gantryAngleDiff = Math.abs(cp.gantryAngle - prevCP.gantryAngle);
    const gantryTime = beam.isArc ? gantryAngleDiff / machineParams.maxGantrySpeed : 0;
    const maxLeafTravel = getMaxLeafTravel(prevCP.mlcPositions, cp.mlcPositions);
    const mlcTime = maxLeafTravel / machineParams.maxMLCSpeed;
    
    // Segment time is the maximum of all limiting factors
    const segmentTime = Math.max(doseRateTime, gantryTime, mlcTime, 0.001);
    
    // Determine limiting factor
    let limitingFactor: 'doseRate' | 'gantrySpeed' | 'mlcSpeed' = 'doseRate';
    if (gantryTime >= doseRateTime && gantryTime >= mlcTime) {
      limitingFactor = 'gantrySpeed';
    } else if (mlcTime >= doseRateTime) {
      limitingFactor = 'mlcSpeed';
    }
    
    // Calculate rates
    const doseRate = segmentTime > 0 ? (segmentMU / segmentTime) * 60 : 0;
    const gantrySpeed = segmentTime > 0 && beam.isArc ? gantryAngleDiff / segmentTime : 0;
    const mlcSpeed = segmentTime > 0 ? maxLeafTravel / segmentTime : 0;
    
    segments.push({
      index: i,
      gantryAngle: prevCP.gantryAngle,
      gantryAngleEnd: cp.gantryAngle,
      MU: segmentMU,
      duration: segmentTime,
      doseRate,
      gantrySpeed,
      maxLeafSpeed: mlcSpeed,
      limitingFactor,
      LSV: (cpm.apertureLSV + prevCPM.apertureLSV) / 2,
      AAV: cpm.apertureAAV,
      apertureArea: (cpm.apertureArea + prevCPM.apertureArea) / 2,
    });
  }
  
  return segments;
}

/**
 * Bin control point segments into angular bins
 */
export function calculateAngularBins(
  segments: ControlPointSegment[],
  binSize: number = 10
): AngularBin[] {
  // Create empty bins for 0-360 degrees
  const numBins = Math.ceil(360 / binSize);
  const bins: AngularBin[] = [];
  
  for (let i = 0; i < numBins; i++) {
    bins.push({
      angleStart: i * binSize,
      angleEnd: (i + 1) * binSize,
      angleMid: i * binSize + binSize / 2,
      MU: 0,
      MUperDegree: 0,
      avgDoseRate: 0,
      maxDoseRate: 0,
      duration: 0,
      avgMCS: 0,
      maxLeafSpeed: 0,
      limitingFactor: 'doseRate',
      controlPointCount: 0,
    });
  }
  
  // Aggregate data into bins
  for (const segment of segments) {
    // Find which bin(s) this segment belongs to
    const startAngle = Math.min(segment.gantryAngle, segment.gantryAngleEnd);
    const endAngle = Math.max(segment.gantryAngle, segment.gantryAngleEnd);
    
    const startBinIndex = Math.floor(startAngle / binSize) % numBins;
    const endBinIndex = Math.floor(endAngle / binSize) % numBins;
    
    // For simplicity, assign to center bin if segment spans multiple bins
    const centerAngle = (startAngle + endAngle) / 2;
    const binIndex = Math.floor(centerAngle / binSize) % numBins;
    
    const bin = bins[binIndex];
    bin.MU += segment.MU;
    bin.duration += segment.duration;
    bin.maxDoseRate = Math.max(bin.maxDoseRate, segment.doseRate);
    bin.maxLeafSpeed = Math.max(bin.maxLeafSpeed, segment.maxLeafSpeed);
    bin.avgMCS += segment.LSV * segment.MU; // Will normalize later
    bin.controlPointCount++;
  }
  
  // Calculate derived metrics and normalize
  for (const bin of bins) {
    const angleDiff = bin.angleEnd - bin.angleStart;
    bin.MUperDegree = bin.MU / angleDiff;
    bin.avgDoseRate = bin.duration > 0 ? (bin.MU / bin.duration) * 60 : 0;
    bin.avgMCS = bin.MU > 0 ? bin.avgMCS / bin.MU : 0;
    
    // Determine limiting factor for the bin
    // (use the most common limiting factor based on duration)
    // For now, keep as doseRate if no clear winner
  }
  
  return bins;
}

/**
 * Get polar chart data with IEC 61217 orientation (0° at top, clockwise)
 */
export function getPolarChartData(bins: AngularBin[]): Array<{
  angle: number;
  MU: number;
  doseRate: number;
  label: string;
}> {
  return bins.map(bin => ({
    angle: bin.angleMid,
    MU: bin.MU,
    doseRate: bin.avgDoseRate,
    label: `${bin.angleStart}°-${bin.angleEnd}°`,
  }));
}

/**
 * Get dose rate vs angle chart data
 */
export function getDoseRateByAngleData(segments: ControlPointSegment[]): Array<{
  angle: number;
  doseRate: number;
  MU: number;
  index: number;
}> {
  return segments.map((seg, idx) => ({
    angle: (seg.gantryAngle + seg.gantryAngleEnd) / 2,
    doseRate: seg.doseRate,
    MU: seg.MU,
    index: idx + 1,
  }));
}
