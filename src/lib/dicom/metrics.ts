// UCoMX Complexity Metrics Implementation
// Based on UCoMX v1.1 MATLAB implementation

import type { 
  RTPlan, 
  Beam, 
  ControlPoint, 
  PlanMetrics, 
  BeamMetrics, 
  ControlPointMetrics,
  MLCLeafPositions 
} from './types';

/**
 * Calculate the aperture area for a given control point
 * Area is calculated as the sum of individual leaf pair openings
 * weighted by their respective leaf widths
 */
function calculateApertureArea(
  mlcPositions: MLCLeafPositions,
  leafWidths: number[],
  jawPositions: { x1: number; x2: number; y1: number; y2: number }
): number {
  const { bankA, bankB } = mlcPositions;
  
  if (bankA.length === 0 || bankB.length === 0) return 0;
  
  let totalArea = 0;
  const numPairs = Math.min(bankA.length, bankB.length, leafWidths.length || bankA.length);
  
  // Default leaf width if not specified
  const defaultWidth = 5; // mm
  
  for (let i = 0; i < numPairs; i++) {
    const leafWidth = leafWidths[i] || defaultWidth;
    
    // Leaf opening = bankB - bankA (bankB is positive side)
    const opening = bankB[i] - bankA[i];
    
    if (opening > 0) {
      // Clip to jaw positions
      const effectiveOpening = Math.max(0, Math.min(opening, jawPositions.x2 - jawPositions.x1));
      totalArea += effectiveOpening * leafWidth;
    }
  }
  
  return totalArea; // mm²
}

/**
 * Calculate Leaf Sequence Variability (LSV) for a control point
 * LSV measures the variability in leaf positions within an aperture
 * Higher LSV = more irregular aperture shape
 */
function calculateLSV(mlcPositions: MLCLeafPositions, leafWidths: number[]): number {
  const { bankA, bankB } = mlcPositions;
  
  if (bankA.length < 2 || bankB.length < 2) return 0;
  
  const numPairs = Math.min(bankA.length, bankB.length);
  
  // Calculate position differences between adjacent leaves for each bank
  let sumPosMaxA = 0;
  let sumPosMaxB = 0;
  
  for (let i = 0; i < numPairs - 1; i++) {
    const diffA = Math.abs(bankA[i + 1] - bankA[i]);
    const diffB = Math.abs(bankB[i + 1] - bankB[i]);
    
    const maxDiff = Math.max(diffA, diffB);
    sumPosMaxA += diffA;
    sumPosMaxB += diffB;
  }
  
  // Normalize by number of leaf pairs
  const posMax = Math.max(
    Math.max(...bankA) - Math.min(...bankA),
    Math.max(...bankB) - Math.min(...bankB),
    1 // Avoid division by zero
  );
  
  const lsvA = sumPosMaxA / ((numPairs - 1) * posMax);
  const lsvB = sumPosMaxB / ((numPairs - 1) * posMax);
  
  // LSV is 1 - normalized variability (1 = perfectly uniform, 0 = maximum variability)
  return 1 - Math.min((lsvA + lsvB) / 2, 1);
}

/**
 * Calculate leaf travel between two control points
 */
function calculateLeafTravel(
  prevPositions: MLCLeafPositions,
  currPositions: MLCLeafPositions
): number {
  if (prevPositions.bankA.length === 0 || currPositions.bankA.length === 0) return 0;
  
  const numPairs = Math.min(
    prevPositions.bankA.length,
    currPositions.bankA.length
  );
  
  let totalTravel = 0;
  
  for (let i = 0; i < numPairs; i++) {
    totalTravel += Math.abs(currPositions.bankA[i] - prevPositions.bankA[i]);
    totalTravel += Math.abs(currPositions.bankB[i] - prevPositions.bankB[i]);
  }
  
  return totalTravel;
}

/**
 * Calculate metrics for a single control point
 */
function calculateControlPointMetrics(
  currentCP: ControlPoint,
  previousCP: ControlPoint | null,
  leafWidths: number[]
): ControlPointMetrics {
  const apertureArea = calculateApertureArea(
    currentCP.mlcPositions,
    leafWidths,
    currentCP.jawPositions
  );
  
  const lsv = calculateLSV(currentCP.mlcPositions, leafWidths);
  
  let leafTravel = 0;
  let aav = 0;
  
  if (previousCP) {
    leafTravel = calculateLeafTravel(previousCP.mlcPositions, currentCP.mlcPositions);
    
    const prevArea = calculateApertureArea(
      previousCP.mlcPositions,
      leafWidths,
      previousCP.jawPositions
    );
    
    // AAV: relative change in aperture area
    if (prevArea > 0) {
      aav = Math.abs(apertureArea - prevArea) / prevArea;
    }
  }
  
  const metersetWeight = currentCP.cumulativeMetersetWeight - 
    (previousCP?.cumulativeMetersetWeight ?? 0);
  
  return {
    controlPointIndex: currentCP.index,
    apertureLSV: lsv,
    apertureAAV: aav,
    apertureArea,
    leafTravel,
    metersetWeight: Math.max(0, metersetWeight),
  };
}

/**
 * Calculate beam-level UCoMX metrics
 */
function calculateBeamMetrics(beam: Beam): BeamMetrics {
  const controlPointMetrics: ControlPointMetrics[] = [];
  
  // Calculate per-control-point metrics
  for (let i = 0; i < beam.controlPoints.length; i++) {
    const cp = beam.controlPoints[i];
    const prevCP = i > 0 ? beam.controlPoints[i - 1] : null;
    
    controlPointMetrics.push(
      calculateControlPointMetrics(cp, prevCP, beam.mlcLeafWidths)
    );
  }
  
  // Aggregate metrics (MU-weighted where applicable)
  let totalMetersetWeight = 0;
  let weightedLSV = 0;
  let weightedAAV = 0;
  let totalArea = 0;
  let totalLeafTravel = 0;
  let areaCount = 0;
  
  for (const cpm of controlPointMetrics) {
    const weight = cpm.metersetWeight;
    totalMetersetWeight += weight;
    
    if (weight > 0) {
      weightedLSV += cpm.apertureLSV * weight;
      weightedAAV += cpm.apertureAAV * weight;
    }
    
    if (cpm.apertureArea > 0) {
      totalArea += cpm.apertureArea;
      areaCount++;
    }
    
    totalLeafTravel += cpm.leafTravel;
  }
  
  // Normalize weighted averages
  const LSV = totalMetersetWeight > 0 ? weightedLSV / totalMetersetWeight : 0;
  const AAV = totalMetersetWeight > 0 ? weightedAAV / totalMetersetWeight : 0;
  
  // MCS = LSV × AAV (simplified UCoMX formulation)
  const MCS = LSV * (1 - AAV);
  
  // Mean Field Area in cm²
  const MFA = areaCount > 0 ? (totalArea / areaCount) / 100 : 0;
  
  // Leaf Travel
  const LT = totalLeafTravel;
  
  // LTMCS: Combined metric
  const LTMCS = LT > 0 ? MCS / (1 + Math.log10(1 + LT / 1000)) : MCS;
  
  // Calculate arc length and average gantry speed
  let arcLength: number | undefined;
  let averageGantrySpeed: number | undefined;
  
  if (beam.isArc && beam.controlPoints.length > 1) {
    arcLength = Math.abs(beam.gantryAngleEnd - beam.gantryAngleStart);
    if (arcLength > 180) {
      arcLength = 360 - arcLength;
    }
    
    // Estimate gantry speed (assuming 1 MU ~ 0.01 min for typical dose rates)
    // This is a rough approximation
    const estimatedTimeMin = (beam.beamDose || 100) / 600; // 600 MU/min typical
    if (estimatedTimeMin > 0) {
      averageGantrySpeed = arcLength / (estimatedTimeMin * 60);
    }
  }
  
  return {
    beamNumber: beam.beamNumber,
    beamName: beam.beamName,
    MCS,
    LSV,
    AAV,
    MFA,
    LT,
    LTMCS,
    beamMU: beam.beamDose || 0,
    arcLength,
    numberOfControlPoints: beam.numberOfControlPoints,
    averageGantrySpeed,
    controlPointMetrics,
  };
}

/**
 * Calculate plan-level UCoMX metrics
 */
export function calculatePlanMetrics(plan: RTPlan): PlanMetrics {
  const beamMetrics: BeamMetrics[] = plan.beams.map(calculateBeamMetrics);
  
  // Aggregate across beams (MU-weighted)
  let totalMU = 0;
  let weightedMCS = 0;
  let weightedLSV = 0;
  let weightedAAV = 0;
  let weightedMFA = 0;
  let totalLT = 0;
  
  for (const bm of beamMetrics) {
    const mu = bm.beamMU || 1;
    totalMU += mu;
    
    weightedMCS += bm.MCS * mu;
    weightedLSV += bm.LSV * mu;
    weightedAAV += bm.AAV * mu;
    weightedMFA += bm.MFA * mu;
    totalLT += bm.LT;
  }
  
  const MCS = totalMU > 0 ? weightedMCS / totalMU : 0;
  const LSV = totalMU > 0 ? weightedLSV / totalMU : 0;
  const AAV = totalMU > 0 ? weightedAAV / totalMU : 0;
  const MFA = totalMU > 0 ? weightedMFA / totalMU : 0;
  const LT = totalLT;
  const LTMCS = LT > 0 ? MCS / (1 + Math.log10(1 + LT / 1000)) : MCS;
  
  return {
    planLabel: plan.planLabel,
    MCS,
    LSV,
    AAV,
    MFA,
    LT,
    LTMCS,
    totalMU: plan.totalMU,
    beamMetrics,
    calculationDate: new Date(),
  };
}

/**
 * Export metrics to CSV format
 * @param metrics - The plan metrics to export
 * @param enabledMetrics - Optional array of metric keys to include (defaults to all)
 */
export function metricsToCSV(metrics: PlanMetrics, enabledMetrics?: string[]): string {
  const lines: string[] = [];
  const isEnabled = (key: string) => !enabledMetrics || enabledMetrics.includes(key);
  
  // Header
  lines.push('# RT Plan Complexity Metrics Report');
  lines.push(`# Plan: ${metrics.planLabel}`);
  lines.push(`# Exported: ${new Date().toISOString()}`);
  lines.push(`# Calculated: ${metrics.calculationDate.toISOString()}`);
  lines.push('# Tool: RT Plan Complexity Analyzer (UCoMX v1.1)');
  lines.push('');
  
  // Plan-level metrics
  lines.push('Plan-Level Metrics');
  lines.push('Metric,Full Name,Value,Unit');
  
  if (isEnabled('MCS')) {
    lines.push(`MCS,Modulation Complexity Score,${metrics.MCS.toFixed(4)},`);
  }
  if (isEnabled('LSV')) {
    lines.push(`LSV,Leaf Sequence Variability,${metrics.LSV.toFixed(4)},`);
  }
  if (isEnabled('AAV')) {
    lines.push(`AAV,Aperture Area Variability,${metrics.AAV.toFixed(4)},`);
  }
  if (isEnabled('MFA')) {
    lines.push(`MFA,Mean Field Area,${metrics.MFA.toFixed(2)},cm²`);
  }
  if (isEnabled('LT')) {
    lines.push(`LT,Leaf Travel,${metrics.LT.toFixed(1)},mm`);
  }
  if (isEnabled('LTMCS')) {
    lines.push(`LTMCS,Leaf Travel-weighted MCS,${metrics.LTMCS.toFixed(4)},`);
  }
  if (isEnabled('totalMU')) {
    lines.push(`Total MU,Total Monitor Units,${metrics.totalMU.toFixed(1)},MU`);
  }
  lines.push('');
  
  // Build dynamic header for beam metrics
  const beamHeaders = ['Beam'];
  if (isEnabled('MCS')) beamHeaders.push('MCS');
  if (isEnabled('LSV')) beamHeaders.push('LSV');
  if (isEnabled('AAV')) beamHeaders.push('AAV');
  if (isEnabled('MFA')) beamHeaders.push('MFA (cm²)');
  if (isEnabled('LT')) beamHeaders.push('LT (mm)');
  if (isEnabled('beamMU')) beamHeaders.push('MU');
  if (isEnabled('numberOfControlPoints')) beamHeaders.push('Control Points');
  if (isEnabled('arcLength')) beamHeaders.push('Arc Length (°)');
  
  lines.push('Beam-Level Metrics');
  lines.push(beamHeaders.join(','));
  
  for (const bm of metrics.beamMetrics) {
    const values: string[] = [bm.beamName];
    if (isEnabled('MCS')) values.push(bm.MCS.toFixed(4));
    if (isEnabled('LSV')) values.push(bm.LSV.toFixed(4));
    if (isEnabled('AAV')) values.push(bm.AAV.toFixed(4));
    if (isEnabled('MFA')) values.push(bm.MFA.toFixed(2));
    if (isEnabled('LT')) values.push(bm.LT.toFixed(1));
    if (isEnabled('beamMU')) values.push(bm.beamMU.toFixed(1));
    if (isEnabled('numberOfControlPoints')) values.push(bm.numberOfControlPoints.toString());
    if (isEnabled('arcLength')) values.push(bm.arcLength?.toFixed(1) ?? '');
    lines.push(values.join(','));
  }
  
  return lines.join('\n');
}
