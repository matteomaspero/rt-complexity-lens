// UCoMX Complexity Metrics Implementation
// Based on UCoMX v1.1 MATLAB implementation
// Extended with SAS, EM, PI metrics and delivery time estimation

import type { 
  RTPlan, 
  Beam, 
  ControlPoint, 
  PlanMetrics, 
  BeamMetrics, 
  ControlPointMetrics,
  MLCLeafPositions,
  MachineDeliveryParams
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
 * Calculate aperture perimeter (edge length) for Edge Metric
 */
function calculateAperturePerimeter(
  mlcPositions: MLCLeafPositions,
  leafWidths: number[]
): number {
  const { bankA, bankB } = mlcPositions;
  
  if (bankA.length < 2 || bankB.length < 2) return 0;
  
  const numPairs = Math.min(bankA.length, bankB.length);
  let perimeter = 0;
  
  for (let i = 0; i < numPairs; i++) {
    const opening = bankB[i] - bankA[i];
    const leafWidth = leafWidths[i] || 5;
    
    if (opening > 0) {
      // Add the horizontal extent (opening width * 2 for top and bottom of leaf)
      perimeter += opening * 2;
      
      // Add vertical edges between adjacent open leaves
      if (i > 0) {
        const prevOpeningA = bankA[i] - bankA[i - 1];
        const prevOpeningB = bankB[i] - bankB[i - 1];
        perimeter += Math.abs(prevOpeningA) + Math.abs(prevOpeningB);
      }
      
      // Add leaf width contribution
      perimeter += leafWidth * 2;
    }
  }
  
  return perimeter;
}

/**
 * Check for small apertures (for SAS calculation)
 */
function checkSmallApertures(
  mlcPositions: MLCLeafPositions
): { below2mm: boolean; below5mm: boolean; below10mm: boolean; below20mm: boolean } {
  const { bankA, bankB } = mlcPositions;
  
  let minGap = Infinity;
  
  for (let i = 0; i < Math.min(bankA.length, bankB.length); i++) {
    const gap = bankB[i] - bankA[i];
    if (gap > 0 && gap < minGap) {
      minGap = gap;
    }
  }
  
  return {
    below2mm: minGap < 2,
    below5mm: minGap < 5,
    below10mm: minGap < 10,
    below20mm: minGap < 20,
  };
}

/**
 * Calculate Aperture Irregularity (AI) for Plan Irregularity metric
 * AI = perimeter² / (4π × area) = 1 for circle
 */
function calculateApertureIrregularity(
  mlcPositions: MLCLeafPositions,
  leafWidths: number[],
  jawPositions: { x1: number; x2: number; y1: number; y2: number }
): number {
  const area = calculateApertureArea(mlcPositions, leafWidths, jawPositions);
  const perimeter = calculateAperturePerimeter(mlcPositions, leafWidths);
  
  if (area <= 0) return 1;
  
  // AI = P² / (4π × A), equals 1 for a perfect circle
  return (perimeter * perimeter) / (4 * Math.PI * area);
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
 * Get maximum leaf travel between two control points
 */
function getMaxLeafTravel(
  prevPositions: MLCLeafPositions,
  currPositions: MLCLeafPositions
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
  const aperturePerimeter = calculateAperturePerimeter(currentCP.mlcPositions, leafWidths);
  const smallApertureFlags = checkSmallApertures(currentCP.mlcPositions);
  
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
    aperturePerimeter,
    smallApertureFlags,
  };
}

/**
 * Estimate delivery time for a beam based on machine parameters
 */
function estimateBeamDeliveryTime(
  beam: Beam,
  controlPointMetrics: ControlPointMetrics[],
  machineParams: MachineDeliveryParams
): {
  deliveryTime: number;
  limitingFactor: 'doseRate' | 'gantrySpeed' | 'mlcSpeed';
  avgDoseRate: number;
  avgMLCSpeed: number;
  MUperDegree?: number;
} {
  let totalTime = 0;
  let limitingFactor: 'doseRate' | 'gantrySpeed' | 'mlcSpeed' = 'doseRate';
  let doseRateLimitedTime = 0;
  let gantryLimitedTime = 0;
  let mlcLimitedTime = 0;
  
  const beamMU = beam.beamDose || 100;
  
  for (let i = 1; i < beam.controlPoints.length; i++) {
    const cp = beam.controlPoints[i];
    const prevCP = beam.controlPoints[i - 1];
    const cpm = controlPointMetrics[i];
    
    // MU for this segment
    const segmentMU = cpm.metersetWeight * beamMU;
    
    // Time limited by dose rate
    const doseRateTime = segmentMU / (machineParams.maxDoseRate / 60); // seconds
    
    // Time limited by gantry speed (for arcs)
    const gantryAngleDiff = Math.abs(cp.gantryAngle - prevCP.gantryAngle);
    const gantryTime = beam.isArc ? gantryAngleDiff / machineParams.maxGantrySpeed : 0;
    
    // Time limited by MLC speed
    const maxLeafTravel = getMaxLeafTravel(prevCP.mlcPositions, cp.mlcPositions);
    const mlcTime = maxLeafTravel / machineParams.maxMLCSpeed;
    
    // The limiting factor determines actual time
    const segmentTime = Math.max(doseRateTime, gantryTime, mlcTime);
    totalTime += segmentTime;
    
    if (doseRateTime >= gantryTime && doseRateTime >= mlcTime) {
      doseRateLimitedTime += segmentTime;
    } else if (gantryTime >= mlcTime) {
      gantryLimitedTime += segmentTime;
    } else {
      mlcLimitedTime += segmentTime;
    }
  }
  
  // Determine overall limiting factor
  if (doseRateLimitedTime >= gantryLimitedTime && doseRateLimitedTime >= mlcLimitedTime) {
    limitingFactor = 'doseRate';
  } else if (gantryLimitedTime >= mlcLimitedTime) {
    limitingFactor = 'gantrySpeed';
  } else {
    limitingFactor = 'mlcSpeed';
  }
  
  // Calculate average rates
  const avgDoseRate = totalTime > 0 ? (beamMU / totalTime) * 60 : 0; // MU/min
  const totalLeafTravel = controlPointMetrics.reduce((sum, cpm) => sum + cpm.leafTravel, 0);
  const avgMLCSpeed = totalTime > 0 ? totalLeafTravel / totalTime / beam.numberOfLeaves : 0;
  
  // MU per degree for arcs
  let MUperDegree: number | undefined;
  const arcLengthForCalc = beam.isArc ? Math.abs(beam.gantryAngleEnd - beam.gantryAngleStart) : undefined;
  if (beam.isArc && arcLengthForCalc) {
    MUperDegree = beamMU / arcLengthForCalc;
  }
  
  return {
    deliveryTime: totalTime,
    limitingFactor,
    avgDoseRate,
    avgMLCSpeed,
    MUperDegree,
  };
}

/**
 * Calculate beam-level UCoMX metrics
 */
function calculateBeamMetrics(
  beam: Beam,
  machineParams: MachineDeliveryParams = {
    maxDoseRate: 600,
    maxGantrySpeed: 4.8,
    maxMLCSpeed: 25,
    mlcType: 'MLCX',
  }
): BeamMetrics {
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
  let weightedPI = 0;
  let totalArea = 0;
  let totalPerimeter = 0;
  let totalLeafTravel = 0;
  let areaCount = 0;
  let sas5Count = 0;
  let sas10Count = 0;
  
  for (let i = 0; i < controlPointMetrics.length; i++) {
    const cpm = controlPointMetrics[i];
    const cp = beam.controlPoints[i];
    const weight = cpm.metersetWeight;
    totalMetersetWeight += weight;
    
    if (weight > 0) {
      weightedLSV += cpm.apertureLSV * weight;
      weightedAAV += cpm.apertureAAV * weight;
      
      // Calculate PI contribution
      const ai = calculateApertureIrregularity(
        cp.mlcPositions,
        beam.mlcLeafWidths,
        cp.jawPositions
      );
      weightedPI += ai * weight;
    }
    
    if (cpm.apertureArea > 0) {
      totalArea += cpm.apertureArea;
      totalPerimeter += cpm.aperturePerimeter || 0;
      areaCount++;
    }
    
    if (cpm.smallApertureFlags?.below5mm) sas5Count++;
    if (cpm.smallApertureFlags?.below10mm) sas10Count++;
    
    totalLeafTravel += cpm.leafTravel;
  }
  
  // Normalize weighted averages
  const LSV = totalMetersetWeight > 0 ? weightedLSV / totalMetersetWeight : 0;
  const AAV = totalMetersetWeight > 0 ? weightedAAV / totalMetersetWeight : 0;
  const PI = totalMetersetWeight > 0 ? weightedPI / totalMetersetWeight : 1;
  
  // MCS = LSV × AAV (simplified UCoMX formulation)
  const MCS = LSV * (1 - AAV);
  
  // Mean Field Area in cm²
  const MFA = areaCount > 0 ? (totalArea / areaCount) / 100 : 0;
  
  // Edge Metric: perimeter / area (mm⁻¹)
  const EM = totalArea > 0 ? totalPerimeter / totalArea : 0;
  
  // Small Aperture Scores
  const totalCPs = controlPointMetrics.length;
  const SAS5 = totalCPs > 0 ? sas5Count / totalCPs : 0;
  const SAS10 = totalCPs > 0 ? sas10Count / totalCPs : 0;
  
  // Leaf Travel
  const LT = totalLeafTravel;
  
  // LTMCS: Combined metric
  const LTMCS = LT > 0 ? MCS / (1 + Math.log10(1 + LT / 1000)) : MCS;
  
  // Calculate arc length and collimator angles
  let arcLength: number | undefined;
  let averageGantrySpeed: number | undefined;
  let collimatorAngleStart: number | undefined;
  let collimatorAngleEnd: number | undefined;
  
  if (beam.controlPoints.length > 0) {
    collimatorAngleStart = beam.controlPoints[0].beamLimitingDeviceAngle;
    collimatorAngleEnd = beam.controlPoints[beam.controlPoints.length - 1].beamLimitingDeviceAngle;
  }
  
  if (beam.isArc && beam.controlPoints.length > 1) {
    arcLength = Math.abs(beam.gantryAngleEnd - beam.gantryAngleStart);
    if (arcLength > 180) {
      arcLength = 360 - arcLength;
    }
  }
  
  // Estimate delivery time
  const deliveryEstimate = estimateBeamDeliveryTime(beam, controlPointMetrics, machineParams);
  
  if (deliveryEstimate.deliveryTime > 0) {
    averageGantrySpeed = arcLength ? arcLength / deliveryEstimate.deliveryTime : undefined;
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
    estimatedDeliveryTime: deliveryEstimate.deliveryTime,
    MUperDegree: deliveryEstimate.MUperDegree,
    avgDoseRate: deliveryEstimate.avgDoseRate,
    avgMLCSpeed: deliveryEstimate.avgMLCSpeed,
    limitingFactor: deliveryEstimate.limitingFactor,
    collimatorAngleStart,
    collimatorAngleEnd,
    SAS5,
    SAS10,
    EM,
    PI,
    controlPointMetrics,
  };
}

/**
 * Calculate plan-level UCoMX metrics
 */
export function calculatePlanMetrics(
  plan: RTPlan,
  machineParams?: MachineDeliveryParams
): PlanMetrics {
  const beamMetrics: BeamMetrics[] = plan.beams.map((beam) =>
    calculateBeamMetrics(beam, machineParams)
  );
  
  // Aggregate across beams (MU-weighted)
  let totalMU = 0;
  let weightedMCS = 0;
  let weightedLSV = 0;
  let weightedAAV = 0;
  let weightedMFA = 0;
  let weightedSAS5 = 0;
  let weightedSAS10 = 0;
  let weightedEM = 0;
  let weightedPI = 0;
  let totalLT = 0;
  let totalDeliveryTime = 0;
  
  for (const bm of beamMetrics) {
    const mu = bm.beamMU || 1;
    totalMU += mu;
    
    weightedMCS += bm.MCS * mu;
    weightedLSV += bm.LSV * mu;
    weightedAAV += bm.AAV * mu;
    weightedMFA += bm.MFA * mu;
    weightedSAS5 += (bm.SAS5 || 0) * mu;
    weightedSAS10 += (bm.SAS10 || 0) * mu;
    weightedEM += (bm.EM || 0) * mu;
    weightedPI += (bm.PI || 1) * mu;
    totalLT += bm.LT;
    totalDeliveryTime += bm.estimatedDeliveryTime || 0;
  }
  
  const MCS = totalMU > 0 ? weightedMCS / totalMU : 0;
  const LSV = totalMU > 0 ? weightedLSV / totalMU : 0;
  const AAV = totalMU > 0 ? weightedAAV / totalMU : 0;
  const MFA = totalMU > 0 ? weightedMFA / totalMU : 0;
  const SAS5 = totalMU > 0 ? weightedSAS5 / totalMU : 0;
  const SAS10 = totalMU > 0 ? weightedSAS10 / totalMU : 0;
  const EM = totalMU > 0 ? weightedEM / totalMU : 0;
  const PI = totalMU > 0 ? weightedPI / totalMU : 1;
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
    totalDeliveryTime,
    SAS5,
    SAS10,
    EM,
    PI,
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
  if (isEnabled('totalDeliveryTime') && metrics.totalDeliveryTime) {
    lines.push(`Total Delivery Time,Estimated Beam-On Time,${metrics.totalDeliveryTime.toFixed(1)},s`);
  }
  if (isEnabled('SAS5') && metrics.SAS5 !== undefined) {
    lines.push(`SAS5,Small Aperture Score (5mm),${metrics.SAS5.toFixed(4)},`);
  }
  if (isEnabled('SAS10') && metrics.SAS10 !== undefined) {
    lines.push(`SAS10,Small Aperture Score (10mm),${metrics.SAS10.toFixed(4)},`);
  }
  if (isEnabled('EM') && metrics.EM !== undefined) {
    lines.push(`EM,Edge Metric,${metrics.EM.toFixed(4)},mm⁻¹`);
  }
  if (isEnabled('PI') && metrics.PI !== undefined) {
    lines.push(`PI,Plan Irregularity,${metrics.PI.toFixed(4)},`);
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
  if (isEnabled('estimatedDeliveryTime')) beamHeaders.push('Est. Time (s)');
  if (isEnabled('SAS5')) beamHeaders.push('SAS5');
  if (isEnabled('SAS10')) beamHeaders.push('SAS10');
  if (isEnabled('EM')) beamHeaders.push('EM (mm⁻¹)');
  if (isEnabled('PI')) beamHeaders.push('PI');
  if (isEnabled('collimatorAngle')) beamHeaders.push('Collimator Start (°)');
  
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
    if (isEnabled('estimatedDeliveryTime')) values.push(bm.estimatedDeliveryTime?.toFixed(1) ?? '');
    if (isEnabled('SAS5')) values.push(bm.SAS5?.toFixed(4) ?? '');
    if (isEnabled('SAS10')) values.push(bm.SAS10?.toFixed(4) ?? '');
    if (isEnabled('EM')) values.push(bm.EM?.toFixed(4) ?? '');
    if (isEnabled('PI')) values.push(bm.PI?.toFixed(4) ?? '');
    if (isEnabled('collimatorAngle')) values.push(bm.collimatorAngleStart?.toFixed(1) ?? '');
    lines.push(values.join(','));
  }
  
  return lines.join('\n');
}
