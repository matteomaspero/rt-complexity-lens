// UCoMX Complexity Metrics Implementation
// Based on UCoMX v1.1 MATLAB implementation (Cavinato et al., Med Phys 2024)
// Uses Control Arc (CA) midpoint interpolation, active leaf filtering,
// and union aperture A_max per the UCoMx paper.
// Extended with SAS, EM, PI metrics and delivery time estimation

import type { 
  RTPlan, 
  Beam, 
  ControlPoint, 
  PlanMetrics, 
  BeamMetrics, 
  ControlPointMetrics,
  MLCLeafPositions,
  MachineDeliveryParams,
  Structure
} from './types';

// ===================================================================
// CA-based UCoMx helper functions
// ===================================================================

/**
 * Compute leaf boundaries from widths if not directly available.
 * Returns N+1 boundary positions centered at 0.
 */
function computeLeafBoundaries(leafWidths: number[], numPairs: number): number[] {
  const n = Math.min(leafWidths.length, numPairs);
  const boundaries: number[] = [0];
  for (let i = 0; i < n; i++) {
    boundaries.push(boundaries[i] + (leafWidths[i] || 5));
  }
  const totalWidth = boundaries[boundaries.length - 1];
  const offset = totalWidth / 2;
  return boundaries.map(b => b - offset);
}

/**
 * Get effective leaf boundaries for a beam.
 * Uses stored DICOM boundaries if available, otherwise computes from widths.
 */
function getEffectiveLeafBoundaries(beam: Beam): number[] {
  if (beam.mlcLeafBoundaries && beam.mlcLeafBoundaries.length > 0) {
    return beam.mlcLeafBoundaries;
  }
  return computeLeafBoundaries(beam.mlcLeafWidths, beam.numberOfLeaves || beam.mlcLeafWidths.length);
}

/**
 * Determine active leaf pairs for a control arc midpoint.
 * Active = gap > minGap AND leaf pair overlaps with Y-jaw opening.
 * Per UCoMx: minGap is the minimum gap found anywhere in the entire plan.
 */
function determineActiveLeaves(
  gaps: number[],
  leafBounds: number[],
  jawY1: number,
  jawY2: number,
  minGap: number
): boolean[] {
  const nPairs = gaps.length;
  const active = new Array<boolean>(nPairs).fill(false);
  for (let k = 0; k < nPairs; k++) {
    const withinJaw = leafBounds[k + 1] > jawY1 && leafBounds[k] < jawY2;
    active[k] = withinJaw && gaps[k] > minGap;
  }
  return active;
}

/**
 * Calculate aperture area at a CA midpoint with Y-jaw clipping for active leaves.
 * Area = Σ (gap_k × effective_width_k) for active leaves only.
 */
function calculateAreaCA(
  bankA: number[],
  bankB: number[],
  leafBounds: number[],
  jawY1: number,
  jawY2: number,
  activeMask: boolean[]
): number {
  let area = 0;
  for (let k = 0; k < bankA.length; k++) {
    if (!activeMask[k]) continue;
    const gap = bankB[k] - bankA[k];
    if (gap <= 0) continue; // Safety: skip closed/overlapping leaves
    const effWidth = Math.max(0, Math.min(leafBounds[k + 1], jawY2) - Math.max(leafBounds[k], jawY1));
    area += gap * effWidth;
  }
  return area;
}

/**
 * LSV per bank using Masi (2008) position-based formula.
 * For adjacent active leaves: mean(1 - |diff(pos)| / max|diff(pos)|)
 * Returns 1.0 for uniform positions, 0.0 for maximum variability.
 */
function calculateLSVBank(positions: number[], activeMask: boolean[]): number {
  const activeIdx: number[] = [];
  for (let i = 0; i < positions.length; i++) {
    if (activeMask[i]) activeIdx.push(i);
  }
  if (activeIdx.length < 2) return 1.0;

  const diffs: number[] = [];
  for (let i = 1; i < activeIdx.length; i++) {
    diffs.push(Math.abs(positions[activeIdx[i]] - positions[activeIdx[i - 1]]));
  }

  const maxDiff = Math.max(...diffs);
  if (maxDiff === 0) return 1.0;

  let sum = 0;
  for (const d of diffs) {
    sum += 1 - d / maxDiff;
  }
  return sum / diffs.length;
}

/**
 * Calculate the aperture area for a given control point.
 * Area is calculated as the sum of individual leaf pair openings
 * weighted by their respective leaf widths.
 * If jaw X limits are both 0 (e.g., Monaco with no ASYMX), no X clipping is applied.
 */
function calculateApertureArea(
  mlcPositions: MLCLeafPositions,
  leafWidths: number[],
  jawPositions: { x1: number; x2: number; y1: number; y2: number }
): number {
  const { bankA, bankB } = mlcPositions;
  
  if (bankA.length === 0 || bankB.length === 0) return 0;
  
  let totalArea = 0;
  const n = Math.min(bankA.length, bankB.length, leafWidths.length || bankA.length);
  const defaultWidth = 5; // mm
  const hasXJaw = jawPositions.x1 !== 0 || jawPositions.x2 !== 0;

  // Compute leaf Y-boundaries (cumulative widths centered at 0)
  let totalWidth = 0;
  for (let i = 0; i < n; i++) totalWidth += leafWidths[i] || defaultWidth;
  let yPos = -totalWidth / 2;
  
  for (let i = 0; i < n; i++) {
    const w = leafWidths[i] || defaultWidth;
    const leafTop = yPos;
    const leafBot = yPos + w;
    yPos = leafBot;

    // Clip leaf width to Y-jaw
    const effWidth = Math.max(0, Math.min(leafBot, jawPositions.y2) - Math.max(leafTop, jawPositions.y1));
    if (effWidth <= 0) continue;

    // Clip leaf opening to X-jaw
    const a = hasXJaw ? Math.max(bankA[i], jawPositions.x1) : bankA[i];
    const b = hasXJaw ? Math.min(bankB[i], jawPositions.x2) : bankB[i];
    const gap = b - a;
    if (gap <= 0) continue;

    totalArea += gap * effWidth;
  }
  
  return totalArea; // mm²
}

/**
 * Calculate aperture perimeter using ComplexityCalc's side_perimeter algorithm.
 * Walks contiguous open leaf groups, adds horizontal edges at group boundaries,
 * vertical steps between adjacent open leaves, and left/right end-caps (effWidth×2).
 * Full X+Y jaw clipping on both leaf positions and effective widths.
 */
function calculateAperturePerimeter(
  mlcPositions: MLCLeafPositions,
  leafWidths: number[],
  jawPositions: { x1: number; x2: number; y1: number; y2: number }
): number {
  const { bankA, bankB } = mlcPositions;
  const n = Math.min(bankA.length, bankB.length);
  if (n === 0) return 0;

  // Compute leaf Y-boundaries (cumulative widths centered at 0)
  let totalWidth = 0;
  for (let i = 0; i < n; i++) totalWidth += leafWidths[i] || 5;
  const leafBounds: number[] = [];
  let yPos = -totalWidth / 2;
  for (let i = 0; i <= n; i++) {
    leafBounds.push(yPos);
    if (i < n) yPos += leafWidths[i] || 5;
  }

  const jawX1 = jawPositions.x1;
  const jawX2 = jawPositions.x2;
  const jawY1 = jawPositions.y1;
  const jawY2 = jawPositions.y2;

  let perimeter = 0;
  let prevOpen = false;
  let prevA = 0;
  let prevB = 0;

  for (let i = 0; i < n; i++) {
    // Clip leaf to Y-jaw
    const leafTop = leafBounds[i];
    const leafBot = leafBounds[i + 1];
    const effWidth = Math.max(0, Math.min(leafBot, jawY2) - Math.max(leafTop, jawY1));
    if (effWidth <= 0) { prevOpen = false; continue; }

    // Clip leaf positions to X-jaw
    const a = Math.max(bankA[i], jawX1);
    const b = Math.min(bankB[i], jawX2);
    const gap = b - a;

    if (gap <= 0) {
      // Leaf is closed (or clipped shut)
      if (prevOpen) {
        // Close off previous group: bottom horizontal edge
        perimeter += (prevB - prevA);
      }
      prevOpen = false;
      continue;
    }

    // Leaf is open
    if (!prevOpen) {
      // Start of new open group: top horizontal edge
      perimeter += gap;
    } else {
      // Continuation: vertical steps between this and previous leaf
      perimeter += Math.abs(a - prevA); // left bank step
      perimeter += Math.abs(b - prevB); // right bank step
    }

    // Left and right end-caps for this leaf (leaf width on each side)
    perimeter += effWidth * 2;

    prevOpen = true;
    prevA = a;
    prevB = b;
  }

  // Close final group
  if (prevOpen) {
    perimeter += (prevB - prevA); // bottom horizontal
  }

  return perimeter;
}

/**
 * Calculate average leaf gap (LG) for a control point
 */
function calculateLeafGap(mlcPositions: MLCLeafPositions): number {
  const { bankA, bankB } = mlcPositions;
  if (bankA.length === 0 || bankB.length === 0) return 0;

  let totalGap = 0;
  let openCount = 0;

  for (let i = 0; i < Math.min(bankA.length, bankB.length); i++) {
    const gap = bankB[i] - bankA[i];
    if (gap > 0) {
      totalGap += gap;
      openCount++;
    }
  }

  return openCount > 0 ? totalGap / openCount : 0;
}

/**
 * Calculate Mean Asymmetry Distance (MAD)
 */
function calculateMAD(mlcPositions: MLCLeafPositions): number {
  const { bankA, bankB } = mlcPositions;
  if (bankA.length === 0 || bankB.length === 0) return 0;

  let totalAsymmetry = 0;
  let openCount = 0;
  const centralAxis = 0; // Assume isocenter at 0

  for (let i = 0; i < Math.min(bankA.length, bankB.length); i++) {
    const gap = bankB[i] - bankA[i];
    if (gap > 0) {
      const centerPosition = (bankA[i] + bankB[i]) / 2;
      totalAsymmetry += Math.abs(centerPosition - centralAxis);
      openCount++;
    }
  }

  return openCount > 0 ? totalAsymmetry / openCount : 0;
}

/**
 * Calculate Equivalent Field Size (EFS) using Sterling's formula
 */
function calculateEFS(area: number, perimeter: number): number {
  if (perimeter <= 0) return 0;
  return (4 * area) / perimeter;
}

/**
 * Calculate Jaw Area (JA)
 */
function calculateJawArea(jawPositions: { x1: number; x2: number; y1: number; y2: number }): number {
  // Calculate jaw opening dimensions using absolute values
  const width = Math.abs(jawPositions.x2 - jawPositions.x1);
  const height = Math.abs(jawPositions.y2 - jawPositions.y1);
  
  // Return 0 if jaws are effectively closed (non-zero difference required)
  if (width < 0.1 || height < 0.1) {
    return 0.0;
  }
  
  return (width * height) / 100; // mm² to cm²
}

/**
 * Calculate Tongue-and-Groove index
 * T&G effect occurs when adjacent leaves have different positions creating exposed regions
 */
function calculateTongueAndGroove(mlcPositions: MLCLeafPositions, leafWidths: number[]): number {
  const { bankA, bankB } = mlcPositions;
  if (bankA.length < 2 || bankB.length < 2) return 0;

  let tgExposure = 0;
  let totalArea = 0;
  const numPairs = Math.min(bankA.length, bankB.length);

  for (let i = 0; i < numPairs - 1; i++) {
    const gapCurrent = bankB[i] - bankA[i];
    const gapNext = bankB[i + 1] - bankA[i + 1];
    const leafWidth = leafWidths[i] || 5;

    // T&G exposure occurs when one leaf is open and adjacent is closed or at different position
    if (gapCurrent > 0) {
      totalArea += gapCurrent * leafWidth;

      // Check for T&G between adjacent leaves
      if (gapNext <= 0) {
        // Adjacent leaf is closed - T&G exposure along the entire current opening
        tgExposure += gapCurrent * 0.5; // Approximate T&G width ~0.5mm
      } else {
        // Both open but at different positions
        const positionDiffA = Math.abs(bankA[i + 1] - bankA[i]);
        const positionDiffB = Math.abs(bankB[i + 1] - bankB[i]);
        tgExposure += (positionDiffA + positionDiffB) * 0.25;
      }
    }
  }

  return totalArea > 0 ? tgExposure / totalArea : 0;
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
  const perimeter = calculateAperturePerimeter(mlcPositions, leafWidths, jawPositions);
  
  if (area <= 0) return 1;
  
  // AI = P² / (4π × A), equals 1 for a perfect circle
  return (perimeter * perimeter) / (4 * Math.PI * area);
}

/**
 * Calculate Leaf Sequence Variability (LSV) for a control point (legacy per-CP version).
 * Used for per-CP display; beam-level LSV uses the CA-based Masi formula.
 */
function calculateLSV(mlcPositions: MLCLeafPositions, leafWidths: number[]): number {
  const { bankA, bankB } = mlcPositions;
  
  if (bankA.length < 2 || bankB.length < 2) return 0;
  
  const numPairs = Math.min(bankA.length, bankB.length);
  
  // Per-CP LSV: use simplified Masi formula on all open leaves
  const openMask: boolean[] = [];
  for (let i = 0; i < numPairs; i++) {
    openMask.push(bankB[i] - bankA[i] > 0);
  }
  
  const lsvA = calculateLSVBank(bankA, openMask);
  const lsvB = calculateLSVBank(bankB, openMask);
  
  // Product of banks per UCoMx Eq. (31)
  return lsvA * lsvB;
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
  const aperturePerimeter = calculateAperturePerimeter(currentCP.mlcPositions, leafWidths, currentCP.jawPositions);
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
 * Calculate beam-level UCoMX metrics using CA midpoint interpolation.
 * 
 * Core UCoMx metrics (LSV, AAV, MCS, LT) use Control Arc (CA) midpoint
 * interpolation with active leaf filtering per Cavinato et al. (Med Phys, 2024):
 * - CA midpoint: MLC/jaw positions averaged between adjacent CPs
 * - Active leaves: gap > plan_min_gap AND within Y-jaw
 * - A_max: union/envelope aperture (per-leaf max gap summed)
 * - LSV: Masi (2008) per-bank position-based formula
 * - AAV: A_ca / A_max_union (McNiven 2010)
 * - MCS: LSV × AAV, aggregated with Eq. 2 (MU-weighted)
 */
function calculateBeamMetrics(
  beam: Beam,
  machineParams: MachineDeliveryParams = {
    maxDoseRate: 600,
    maxGantrySpeed: 4.8,
    maxMLCSpeed: 25,
    mlcType: 'MLCX',
  },
  structure?: Structure
): BeamMetrics {
  // Check if this is an electron beam (uses fixed applicators/tubes, not MLCs)
  const isElectron = beam.radiationType && beam.radiationType.toUpperCase().includes('ELECTRON');
  
  const nPairs = beam.numberOfLeaves || beam.mlcLeafWidths.length || 60;
  const leafBounds = getEffectiveLeafBoundaries(beam);
  const nCPs = beam.controlPoints.length;
  const nCA = nCPs - 1;
  
  // ===== Per-CP metrics (for UI display and delivery time estimation) =====
  const controlPointMetrics: ControlPointMetrics[] = [];
  for (let i = 0; i < nCPs; i++) {
    const cp = beam.controlPoints[i];
    const prevCP = i > 0 ? beam.controlPoints[i - 1] : null;
    controlPointMetrics.push(
      calculateControlPointMetrics(cp, prevCP, beam.mlcLeafWidths)
    );
  }
  
  // ===== CA-based UCoMx metrics =====
  // Pass 1: Find min_gap across ALL CPs
  let planMinGap = Infinity;
  for (let i = 0; i < nCPs; i++) {
    const { bankA, bankB } = beam.controlPoints[i].mlcPositions;
    const n = Math.min(bankA.length, bankB.length, nPairs);
    for (let k = 0; k < n; k++) {
      const gap = bankB[k] - bankA[k];
      if (gap < planMinGap) planMinGap = gap;
    }
  }
  if (!isFinite(planMinGap) || planMinGap < 0) planMinGap = 0;
  
  // Pass 2: Compute per-CA metrics with midpoint interpolation
  const caAreas: number[] = [];
  const caLSVs: number[] = [];
  const caLTs: number[] = [];
  const caDeltaMU: number[] = [];
  const perLeafMaxContrib = new Float64Array(nPairs); // for union A_max
  let totalActiveLeafTravel = 0;
  let caActiveLeafCount = 0; // for NL computation
  
  // Also accumulate per-CP-like metrics for secondary computations
  let totalArea = 0;
  let totalPerimeter = 0;
  let areaCount = 0;
  let sas5Count = 0;
  let sas10Count = 0;
  let smallFieldCount = 0;
  let totalJawArea = 0;
  let weightedPI = 0;
  let weightedEM = 0;
  let weightedLG = 0;
  let weightedMAD = 0;
  let weightedEFS = 0;
  let weightedTG = 0;
  let totalMetersetWeight = 0;
  
  for (let i = 0; i < controlPointMetrics.length; i++) {
    const cpm = controlPointMetrics[i];
    const cp = beam.controlPoints[i];
    const weight = cpm.metersetWeight;
    totalMetersetWeight += weight;
    
    const lg = calculateLeafGap(cp.mlcPositions);
    const mad = calculateMAD(cp.mlcPositions);
    const perimeter = cpm.aperturePerimeter || 0;
    const efs = calculateEFS(cpm.apertureArea, perimeter);
    const tg = calculateTongueAndGroove(cp.mlcPositions, beam.mlcLeafWidths);
    const jawArea = calculateJawArea(cp.jawPositions);
    
    if (weight > 0) {
      weightedLG += lg * weight;
      weightedMAD += mad * weight;
      weightedEFS += efs * weight;
      weightedTG += tg * weight;
      const ai = calculateApertureIrregularity(cp.mlcPositions, beam.mlcLeafWidths, cp.jawPositions);
      weightedPI += ai * weight;
      // Per-CP Edge Metric: P / (2A), ComplexityCalc definition
      const cpArea = cpm.apertureArea;
      const cpEM = cpArea > 0 ? perimeter / (2 * cpArea) : 0;
      weightedEM += cpEM * weight;
    }
    if (cpm.apertureArea > 0) {
      totalArea += cpm.apertureArea;
      totalPerimeter += perimeter;
      areaCount++;
      if (cpm.apertureArea < 400) smallFieldCount++;
    }
    totalJawArea += jawArea;
    if (cpm.smallApertureFlags?.below5mm) sas5Count++;
    if (cpm.smallApertureFlags?.below10mm) sas10Count++;
  }
  
  if (nCA > 0) {
    for (let j = 0; j < nCA; j++) {
      const cp1 = beam.controlPoints[j];
      const cp2 = beam.controlPoints[j + 1];
      const { bankA: a1, bankB: b1 } = cp1.mlcPositions;
      const { bankA: a2, bankB: b2 } = cp2.mlcPositions;
      const n = Math.min(a1.length, b1.length, a2.length, b2.length, nPairs);
      
      // CA midpoint interpolation
      const midA = new Float64Array(n);
      const midB = new Float64Array(n);
      const gaps = new Float64Array(n);
      for (let k = 0; k < n; k++) {
        midA[k] = (a1[k] + a2[k]) / 2;
        midB[k] = (b1[k] + b2[k]) / 2;
        gaps[k] = midB[k] - midA[k];
      }
      
      const midJawY1 = (cp1.jawPositions.y1 + cp2.jawPositions.y1) / 2;
      const midJawY2 = (cp1.jawPositions.y2 + cp2.jawPositions.y2) / 2;
      
      // Active leaves
      const active = determineActiveLeaves(
        Array.from(gaps), leafBounds, midJawY1, midJawY2, planMinGap
      );
      
      // Area with Y-jaw clipping
      const area = calculateAreaCA(
        Array.from(midA), Array.from(midB), leafBounds, midJawY1, midJawY2, active
      );
      caAreas.push(area);
      
      // Track per-leaf max contribution for union A_max
      for (let k = 0; k < n; k++) {
        if (active[k]) {
          const effW = Math.max(0, Math.min(leafBounds[k + 1], midJawY2) - Math.max(leafBounds[k], midJawY1));
          const contrib = gaps[k] * effW;
          if (contrib > perLeafMaxContrib[k]) perLeafMaxContrib[k] = contrib;
        }
      }
      
      // LSV per bank (Masi formula), combined as product per UCoMx Eq. (31)
      const lsvA = calculateLSVBank(Array.from(midA), active);
      const lsvB = calculateLSVBank(Array.from(midB), active);
      caLSVs.push(lsvA * lsvB);
      
      // Active leaf travel (between actual CPs)
      let lt = 0;
      let activeCount = 0;
      for (let k = 0; k < n; k++) {
        if (active[k]) {
          lt += Math.abs(a2[k] - a1[k]);
          lt += Math.abs(b2[k] - b1[k]);
          activeCount++;
        }
      }
      caLTs.push(lt);
      totalActiveLeafTravel += lt;
      caActiveLeafCount += activeCount;
      
      // Delta MU
      const deltaMU = cp2.cumulativeMetersetWeight - cp1.cumulativeMetersetWeight;
      caDeltaMU.push(Math.max(0, deltaMU));
    }
  }
  
  // ===== Union aperture A_max =====
  let aMaxUnion = 0;
  for (let k = 0; k < nPairs; k++) {
    aMaxUnion += perLeafMaxContrib[k];
  }
  
  // ===== Compute AAV and MCS per CA =====
  const caAAVs = caAreas.map(a => aMaxUnion > 0 ? a / aMaxUnion : 0);
  const caMCSs = caLSVs.map((lsv, i) => lsv * caAAVs[i]);
  
  // ===== Aggregate: Eq. (2) MU-weighted for LSV, AAV, MCS per UCoMx manual =====
  const totalDeltaMU = caDeltaMU.reduce((s, v) => s + v, 0);
  const LSV = totalDeltaMU > 0
    ? caLSVs.reduce((s, v, i) => s + v * caDeltaMU[i], 0) / totalDeltaMU
    : (nCA > 0 ? caLSVs.reduce((s, v) => s + v, 0) / nCA : 0);
  const AAV = totalDeltaMU > 0
    ? caAAVs.reduce((s, v, i) => s + v * caDeltaMU[i], 0) / totalDeltaMU
    : (nCA > 0 ? caAAVs.reduce((s, v) => s + v, 0) / nCA : 0);
  const MCS = totalDeltaMU > 0
    ? caMCSs.reduce((s, v, i) => s + v * caDeltaMU[i], 0) / totalDeltaMU
    : LSV * AAV;
  
  // LT: total active leaf travel
  // Normalize by number of leaves to get per-leaf basis (average leaf travel distance per leaf pair)
  const numLeaves = beam.numberOfLeaves || beam.mlcLeafWidths.length || 80;
  const LT = numLeaves > 0 ? totalActiveLeafTravel / numLeaves : totalActiveLeafTravel;
  
  // NL: 2 × mean active leaf pairs per CA (both banks)
  const NL = nCA > 0 ? (2 * caActiveLeafCount) / nCA : 0;
  
  // Secondary metrics from per-CP data
  const PI = totalMetersetWeight > 0 ? weightedPI / totalMetersetWeight : 1;
  const LG = totalMetersetWeight > 0 ? weightedLG / totalMetersetWeight : 0;
  const MAD_val = totalMetersetWeight > 0 ? weightedMAD / totalMetersetWeight : 0;
  const EFS = totalMetersetWeight > 0 ? weightedEFS / totalMetersetWeight : 0;
  const TG = totalMetersetWeight > 0 ? weightedTG / totalMetersetWeight : 0;
  
  // PM (Plan Modulation) per UCoMx Eq. (38): 1 - Σ(MU_j × A_j) / (MU_beam × A^tot)
  const PM = aMaxUnion > 0 && totalDeltaMU > 0
    ? 1 - caAreas.reduce((s, a, i) => s + caDeltaMU[i] * a, 0) / (totalDeltaMU * aMaxUnion)
    : 1 - MCS;
  const MFA = areaCount > 0 ? (totalArea / areaCount) / 100 : 0;
  const EM = totalMetersetWeight > 0 ? weightedEM / totalMetersetWeight : 0;
  const PA = totalArea / 100;
  const JA = totalJawArea / 100;  // Convert mm² to cm² (sum across all CPs, not averaged)
  
  const totalCPs = controlPointMetrics.length;
  const SAS5 = totalCPs > 0 ? sas5Count / totalCPs : 0;
  const SAS10 = totalCPs > 0 ? sas10Count / totalCPs : 0;
  const psmall = totalCPs > 0 ? smallFieldCount / totalCPs : 0;
  
  const LTMCS = LT > 0 ? MCS / (1 + Math.log10(1 + LT / 1000)) : MCS;
  
  // Calculate arc length via CP-by-CP gantry angle summation (fixes full-arc GT=0 bug)
  let totalGantryTravel = 0;
  let averageGantrySpeed: number | undefined;
  let collimatorAngleStart: number | undefined;
  let collimatorAngleEnd: number | undefined;
  
  if (beam.controlPoints.length > 0) {
    collimatorAngleStart = beam.controlPoints[0].beamLimitingDeviceAngle;
    collimatorAngleEnd = beam.controlPoints[beam.controlPoints.length - 1].beamLimitingDeviceAngle;
  }
  
  if (beam.controlPoints.length > 1) {
    for (let i = 1; i < beam.controlPoints.length; i++) {
      let delta = Math.abs(beam.controlPoints[i].gantryAngle - beam.controlPoints[i-1].gantryAngle);
      if (delta > 180) delta = 360 - delta;
      totalGantryTravel += delta;
    }
  }
  const arcLength = beam.isArc && totalGantryTravel > 0 ? totalGantryTravel : undefined;
  
  // Estimate delivery time
  const deliveryEstimate = estimateBeamDeliveryTime(beam, controlPointMetrics, machineParams);
  
  if (deliveryEstimate.deliveryTime > 0) {
    averageGantrySpeed = arcLength ? arcLength / deliveryEstimate.deliveryTime : undefined;
  }
  
  // Calculate UCoMX deliverability metrics
  const beamMU = beam.beamDose || 0;
  const numCPs = beam.numberOfControlPoints;
  // numLeaves already declared earlier in function (line 805)
  
  // MUCA - MU per Control Arc (NCA = NCP - 1)
  const MUCA = nCA > 0 ? beamMU / nCA : 0;
  
  // LTMU - Leaf Travel per MU
  const LTMU = beamMU > 0 ? LT / beamMU : 0;
  
  // LTNLMU - Leaf Travel per Leaf and MU
  const LTNLMU = (numLeaves > 0 && beamMU > 0) ? LT / (numLeaves * beamMU) : 0;
  
  // LNA - Leaf Travel per Leaf and CA
  const LNA = (numLeaves > 0 && numCPs > 0) ? LT / (numLeaves * numCPs) : 0;
  
  // LTAL - Leaf Travel per Arc Length
  const LTAL = (arcLength && arcLength > 0) ? LT / arcLength : undefined;
  
  // GT - Gantry Travel (total angle traversed across all CPs)
  const GT = totalGantryTravel > 0 ? totalGantryTravel : undefined;
  
  // GS - Gantry Speed
  const GS = (arcLength && deliveryEstimate.deliveryTime > 0) 
    ? arcLength / deliveryEstimate.deliveryTime 
    : undefined;
  
  // LS - Leaf Speed (alias for avgMLCSpeed)
  const LS = deliveryEstimate.avgMLCSpeed;
  
  // Calculate dose rate and gantry speed variations
  let mDRV: number | undefined;
  let mGSV: number | undefined;
  
  if (beam.controlPoints.length > 1 && deliveryEstimate.deliveryTime > 0) {
    // Estimate per-segment dose rates
    const segmentDoseRates: number[] = [];
    const segmentGantrySpeeds: number[] = [];
    
    for (let i = 1; i < beam.controlPoints.length; i++) {
      const cpm = controlPointMetrics[i];
      const segmentMU = cpm.metersetWeight * beamMU;
      const gantryDiff = Math.abs(beam.controlPoints[i].gantryAngle - beam.controlPoints[i-1].gantryAngle);
      
      // Estimate segment time based on average
      const avgSegmentTime = deliveryEstimate.deliveryTime / (beam.controlPoints.length - 1);
      
      if (avgSegmentTime > 0) {
        segmentDoseRates.push((segmentMU / avgSegmentTime) * 60); // MU/min
        if (beam.isArc && gantryDiff > 0) {
          segmentGantrySpeeds.push(gantryDiff / avgSegmentTime);
        }
      }
    }
    
    // Mean Dose Rate Variation
    if (segmentDoseRates.length > 1) {
      let drvSum = 0;
      for (let i = 1; i < segmentDoseRates.length; i++) {
        drvSum += Math.abs(segmentDoseRates[i] - segmentDoseRates[i-1]);
      }
      mDRV = drvSum / (segmentDoseRates.length - 1);
    }
    
    // Mean Gantry Speed Variation
    if (segmentGantrySpeeds.length > 1) {
      let gsvSum = 0;
      for (let i = 1; i < segmentGantrySpeeds.length; i++) {
        gsvSum += Math.abs(segmentGantrySpeeds[i] - segmentGantrySpeeds[i-1]);
      }
      mGSV = gsvSum / (segmentGantrySpeeds.length - 1);
    }
  }
  
  // MD - Modulation Degree (simplified: based on MU distribution variance)
  let MD: number | undefined;
  if (controlPointMetrics.length > 1) {
    const metersetWeights = controlPointMetrics.map(cpm => cpm.metersetWeight);
    const avgWeight = metersetWeights.reduce((a, b) => a + b, 0) / metersetWeights.length;
    if (avgWeight > 0) {
      const variance = metersetWeights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / metersetWeights.length;
      MD = Math.sqrt(variance) / avgWeight; // Coefficient of variation
    }
  }
  
  // MI - Modulation Index (simplified: based on fluence gradients)
  let MI: number | undefined;
  if (controlPointMetrics.length > 1 && LT > 0) {
    const normalizedLT = LT / (numLeaves * numCPs);
    MI = normalizedLT;
  }
  
  // For electron beams: Clear MLC-based metrics (electrons use fixed applicators, not MLCs)
  if (isElectron) {
    MCS = undefined;
    LSV = undefined;
    AAV = undefined;
    MFA = undefined;
    LT = undefined;
    LTMCS = undefined;
    LG = undefined;
    MAD_val = undefined;
    EFS = undefined;
    psmall = undefined;
    MUCA = undefined;
    LTMU = undefined;
    LTNLMU = undefined;
    LNA = undefined;
    NL = undefined;
    LTAL = undefined;
    mDRV = undefined;
    GT = undefined;
    GS = undefined;
    mGSV = undefined;
    LS = undefined;
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
    // Accuracy metrics
    LG,
    MAD: MAD_val,
    EFS,
    psmall,
    // Radiation type and energy
    radiationType: beam.radiationType,
    nominalBeamEnergy: beam.nominalBeamEnergy,
    energyLabel: beam.energyLabel,
    // Deliverability metrics
    MUCA,
    LTMU,
    LTNLMU,
    LNA,
    NL,
    LTAL,
    mDRV,
    GT,
    GS,
    mGSV,
    LS,
    PA,
    JA,
    PM,
    TG,
    MD,
    MI,
    // Basic metrics
    beamMU,
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
    gantryAngleStart: beam.gantryAngleStart,
    gantryAngleEnd: beam.gantryAngleEnd,
    patientSupportAngle: beam.controlPoints[0]?.patientSupportAngle,
    isocenterPosition: beam.controlPoints[0]?.isocenterPosition,
    tableTopVertical: beam.controlPoints[0]?.tableTopVertical,
    tableTopLongitudinal: beam.controlPoints[0]?.tableTopLongitudinal,
    tableTopLateral: beam.controlPoints[0]?.tableTopLateral,
    SAS5,
    SAS10,
    EM,
    PI,
    BAM: calculateBAM(beam, structure),
    controlPointMetrics,
  };
}

/**
 * Calculate plan-level UCoMX metrics
 */
export function calculatePlanMetrics(
  plan: RTPlan,
  machineParams?: MachineDeliveryParams,
  structure?: Structure
): PlanMetrics {
  const beamMetrics: BeamMetrics[] = plan.beams.map((beam) =>
    calculateBeamMetrics(beam, machineParams, structure)
  );
  
  // Aggregate across beams
  // UCoMx Eq. (2): MU-weighted for all metrics per UCoMx manual
  let totalMU = 0;
  let weightedMCS = 0;
  let weightedLSV = 0;
  let weightedAAV = 0;
  let weightedMFA = 0;
  let weightedSAS5 = 0;
  let weightedSAS10 = 0;
  let weightedEM = 0;
  let weightedPI = 0;
  let weightedPAM = 0;
  // Accuracy metrics
  let weightedLG = 0;
  let weightedMAD = 0;
  let weightedEFS = 0;
  let weightedPsmall = 0;
  // Deliverability metrics
  let weightedMUCA = 0;
  let weightedLTMU = 0;
  let weightedLTNLMU = 0;
  let weightedLNA = 0;
  let weightedLTAL = 0;
  let weightedMDRV = 0;
  let weightedGS = 0;
  let weightedMGSV = 0;
  let weightedLS = 0;
  let weightedPM = 0;
  let weightedTG = 0;
  let weightedMD = 0;
  let weightedMI = 0;
  let totalLT = 0;
  let totalDeliveryTime = 0;
  let totalGT = 0;
  let totalPA = 0;
  let totalJA = 0;
  let countLTAL = 0;
  let countGS = 0;
  let countMGSV = 0;
  let countMDRV = 0;
  let countMD = 0;
  let countMI = 0;
  let countPAM = 0;
  
  for (const bm of beamMetrics) {
    const mu = bm.beamMU || 1;
    totalMU += mu;
    
    weightedMCS += bm.MCS * mu;
    weightedLSV += bm.LSV * mu;  // Eq. (2): MU-weighted
    weightedAAV += bm.AAV * mu;  // Eq. (2): MU-weighted
    weightedMFA += bm.MFA * mu;
    weightedSAS5 += (bm.SAS5 || 0) * mu;
    weightedSAS10 += (bm.SAS10 || 0) * mu;
    weightedEM += (bm.EM || 0) * mu;
    weightedPI += (bm.PI || 1) * mu;
    
    // Accuracy metrics
    weightedLG += (bm.LG || 0) * mu;
    weightedMAD += (bm.MAD || 0) * mu;
    weightedEFS += (bm.EFS || 0) * mu;
    weightedPsmall += (bm.psmall || 0) * mu;
    
    // Deliverability metrics
    weightedMUCA += (bm.MUCA || 0) * mu;
    weightedLTMU += (bm.LTMU || 0) * mu;
    weightedLTNLMU += (bm.LTNLMU || 0) * mu;
    weightedLNA += (bm.LNA || 0) * mu;
    weightedPM += (bm.PM || 0) * mu;
    weightedTG += (bm.TG || 0) * mu;
    
    if (bm.LTAL !== undefined) {
      weightedLTAL += bm.LTAL * mu;
      countLTAL += mu;
    }
    if (bm.GS !== undefined) {
      weightedGS += bm.GS * mu;
      countGS += mu;
    }
    if (bm.mGSV !== undefined) {
      weightedMGSV += bm.mGSV * mu;
      countMGSV += mu;
    }
    if (bm.mDRV !== undefined) {
      weightedMDRV += bm.mDRV * mu;
      countMDRV += mu;
    }
    if (bm.LS !== undefined) {
      weightedLS += bm.LS * mu;
    }
    if (bm.MD !== undefined) {
      weightedMD += bm.MD * mu;
      countMD += mu;
    }
    if (bm.MI !== undefined) {
      weightedMI += bm.MI * mu;
      countMI += mu;
    }
    
    // Plan Aperture Modulation (target-specific)
    if (bm.BAM !== undefined) {
      weightedPAM += bm.BAM * mu;
      countPAM += mu;
    }
    
    totalLT += bm.LT;
    totalDeliveryTime += bm.estimatedDeliveryTime || 0;
    totalGT += bm.GT || 0;
    totalPA += bm.PA || 0;
    totalJA += bm.JA || 0;
  }
  
  const nBeams = beamMetrics.length || 1;
  const MCS = totalMU > 0 ? weightedMCS / totalMU : 0;
  const LSV = totalMU > 0 ? weightedLSV / totalMU : 0;  // Eq. (2): MU-weighted
  const AAV = totalMU > 0 ? weightedAAV / totalMU : 0;  // Eq. (2): MU-weighted
  const MFA = totalMU > 0 ? weightedMFA / totalMU : 0;
  const SAS5 = totalMU > 0 ? weightedSAS5 / totalMU : 0;
  const SAS10 = totalMU > 0 ? weightedSAS10 / totalMU : 0;
  const EM = totalMU > 0 ? weightedEM / totalMU : 0;
  const PI = totalMU > 0 ? weightedPI / totalMU : 1;
  const LT = totalLT;
  const LTMCS = LT > 0 ? MCS / (1 + Math.log10(1 + LT / 1000)) : MCS;
  
  // Accuracy metrics
  const LG = totalMU > 0 ? weightedLG / totalMU : undefined;
  const MAD = totalMU > 0 ? weightedMAD / totalMU : undefined;
  const EFS = totalMU > 0 ? weightedEFS / totalMU : undefined;
  const psmall = totalMU > 0 ? weightedPsmall / totalMU : undefined;
  
  // Deliverability metrics
  const MUCA = totalMU > 0 ? weightedMUCA / totalMU : undefined;
  const LTMU = totalMU > 0 ? LT / totalMU : undefined;  // total LT / total MU
  const LTNLMU = totalMU > 0 ? weightedLTNLMU / totalMU : undefined;
  const LNA = totalMU > 0 ? weightedLNA / totalMU : undefined;
  const LTAL = countLTAL > 0 ? weightedLTAL / countLTAL : undefined;
  const mDRV = countMDRV > 0 ? weightedMDRV / countMDRV : undefined;
  const GT = totalGT > 0 ? totalGT : undefined;
  const GS = countGS > 0 ? weightedGS / countGS : undefined;
  const mGSV = countMGSV > 0 ? weightedMGSV / countMGSV : undefined;
  const LS = totalMU > 0 ? weightedLS / totalMU : undefined;
  const PA = totalPA > 0 ? totalPA : undefined;
  const JA = totalJA > 0 ? totalJA : undefined;  // Sum of beam JA values (not averaged)
  const PM = totalMU > 0 ? weightedPM / totalMU : undefined;
  const TG = totalMU > 0 ? weightedTG / totalMU : undefined;
  const MD = countMD > 0 ? weightedMD / countMD : undefined;
  const MI = countMI > 0 ? weightedMI / countMI : undefined;
  const PAM = countPAM > 0 ? weightedPAM / countPAM : undefined;
  
  return {
    planLabel: plan.planLabel,
    MCS,
    LSV,
    AAV,
    MFA,
    LT,
    LTMCS,
    // Accuracy metrics
    LG,
    MAD,
    EFS,
    psmall,
    // Deliverability metrics
    MUCA,
    LTMU,
    LTNLMU,
    LNA,
    LTAL,
    mDRV,
    GT,
    GS,
    mGSV,
    LS,
    PA,
    JA,
    PM,
    TG,
    MD,
    MI,
    // Basic metrics
    totalMU: plan.totalMU,
    prescribedDose: plan.prescribedDose,
    dosePerFraction: plan.dosePerFraction,
    numberOfFractions: plan.numberOfFractions,
    MUperGy: plan.prescribedDose && plan.totalMU > 0
      ? plan.totalMU / plan.prescribedDose
      : undefined,
    totalDeliveryTime,
    SAS5,
    SAS10,
    EM,
    PI,
    PAM,
    beamMetrics,
    calculationDate: new Date(),
  };
}

/**
 * Project a 3D point to Beam's Eye View (BEV) plane.
 * Uses gantry angle to transform from patient coordinates to BEV coordinates.
 * @param point - 3D patient coordinates [x, y, z]
 * @param gantryAngleDeg - Gantry angle in degrees
 * @returns 2D BEV coordinates [x_bev, y_bev]
 */
export function projectPointToBEV(
  point: [number, number, number],
  gantryAngleDeg: number
): [number, number] {
  const [x, y, z] = point;
  const gantryRad = (gantryAngleDeg * Math.PI) / 180;
  
  // BEV projection: rotate around Y-axis by gantry angle
  // X-component: z projects along beam direction (sin), x perpendicular (cos)
  // Y-component: unchanged
  const xBEV = z * Math.sin(gantryRad) + x * Math.cos(gantryRad);
  const yBEV = y;
  
  return [xBEV, yBEV];
}

/**
 * Calculate aperture modulation (AM) between target and aperture projections.
 * Simplified approach: bounding box comparison for fast calculation.
 * For exact calculation, use shapely or similar polygon library on backend.
 *
 * @param targetBevPoints - Projected target contour points in BEV [x, y]
 * @param apertureBevPoints - Aperture boundary points in BEV [x, y]
 * @returns AM value in [0, 1]
 */
function calculateApertureModulationSimplified(
  targetBevPoints: Array<[number, number]>,
  apertureBevPoints: Array<[number, number]>
): number {
  if (targetBevPoints.length === 0 || apertureBevPoints.length === 0) {
    return 1.0; // Fully blocked if no points
  }
  
  // Calculate bounding boxes as simplified geometry
  const targetBounds = {
    minX: Math.min(...targetBevPoints.map(p => p[0])),
    maxX: Math.max(...targetBevPoints.map(p => p[0])),
    minY: Math.min(...targetBevPoints.map(p => p[1])),
    maxY: Math.max(...targetBevPoints.map(p => p[1])),
  };
  
  const apertureBounds = {
    minX: Math.min(...apertureBevPoints.map(p => p[0])),
    maxX: Math.max(...apertureBevPoints.map(p => p[0])),
    minY: Math.min(...apertureBevPoints.map(p => p[1])),
    maxY: Math.max(...apertureBevPoints.map(p => p[1])),
  };
  
  const targetArea =
    (targetBounds.maxX - targetBounds.minX) * (targetBounds.maxY - targetBounds.minY);
  
  if (targetArea < 1e-6) {
    return 0; // Degenerate target
  }
  
  // Calculate intersection of bounding boxes
  const overlapX = Math.max(0, Math.min(targetBounds.maxX, apertureBounds.maxX) - 
                                Math.max(targetBounds.minX, apertureBounds.minX));
  const overlapY = Math.max(0, Math.min(targetBounds.maxY, apertureBounds.maxY) - 
                                Math.max(targetBounds.minY, apertureBounds.minY));
  const overlapArea = overlapX * overlapY;
  
  // AM = (total - overlap) / total
  const am = 1.0 - (overlapArea / targetArea);
  return Math.max(0, Math.min(1, am)); // Clamp to [0, 1]
}

/**
 * Calculate Beam Aperture Modulation (BAM) for a single beam with target.
 * NOTE: This is a TypeScript placeholder using simplified bounding box geometry.
 * For exact polygon-based calculation, use Python backend or integrate Turf.js/d3-polygon.
 *
 * @param beam - Beam to analyze
 * @param structure - Target structure with 3D contours
 * @returns BAM value in [0, 1] or undefined if calculation not possible
 */
export function calculateBAM(beam: Beam, structure?: Structure): number | undefined {
  if (!structure || !structure.contours || structure.contours.length === 0) {
    return undefined;
  }
  
  if (beam.controlPoints.length < 1) {
    return undefined;
  }
  
  // Collect all target points
  const targetPoints: [number, number, number][] = [];
  for (const contour of structure.contours) {
    targetPoints.push(...contour.points);
  }
  
  if (targetPoints.length === 0) {
    return undefined;
  }
  
  // Calculate weighted aperture modulation across control points
  let totalWeightedAM = 0;
  let totalMU = 0;
  
  for (let i = 0; i < beam.controlPoints.length; i++) {
    const cp = beam.controlPoints[i];
    
    // Project target to BEV
    const targetBevPoints = targetPoints.map(pt => 
      projectPointToBEV(pt, cp.gantryAngle)
    );
    
    // Create aperture boundary in BEV (simplified: rectangular bounds)
    const apertureBevBounds: Array<[number, number]> = [
      projectPointToBEV([-10000, cp.jawPositions.y1, 0], cp.gantryAngle),
      projectPointToBEV([10000, cp.jawPositions.y1, 0], cp.gantryAngle),
      projectPointToBEV([10000, cp.jawPositions.y2, 0], cp.gantryAngle),
      projectPointToBEV([-10000, cp.jawPositions.y2, 0], cp.gantryAngle),
    ];
    
    // Calculate AM for this control point
    const am = calculateApertureModulationSimplified(targetBevPoints, apertureBevBounds);
    
    // Get MU weight
    const deltaMU = i === 0 
      ? cp.cumulativeMetersetWeight 
      : cp.cumulativeMetersetWeight - beam.controlPoints[i - 1].cumulativeMetersetWeight;
    
    totalWeightedAM += am * deltaMU;
    totalMU += deltaMU;
  }
  
  return totalMU > 1e-6 ? totalWeightedAM / totalMU : undefined;
}

/**
 * Calculate Plan Aperture Modulation (PAM) for entire plan with target.
 * PAM is the MU-weighted average of BAM across all beams.
 * NOTE: This is a TypeScript placeholder using simplified bounding box geometry.
 *
 * @param plan - RT plan
 * @param structure - Target structure
 * @returns PAM value in [0, 1] or undefined if calculation not possible
 */
export function calculatePAM(plan: RTPlan, structure?: Structure): number | undefined {
  if (!plan.beams || plan.beams.length === 0 || !structure) {
    return undefined;
  }
  
  let totalWeightedPAM = 0;
  let totalMU = 0;
  
  for (const beam of plan.beams) {
    const bam = calculateBAM(beam, structure);
    if (bam === undefined) {
      continue;
    }
    
    const beamMU = beam.finalCumulativeMetersetWeight;
    totalWeightedPAM += bam * beamMU;
    totalMU += beamMU;
  }
  
  return totalMU > 1e-6 ? totalWeightedPAM / totalMU : undefined;
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
  lines.push('# Tool: RTp-lens (UCoMX v1.1)');
  lines.push('');
  
  // Plan-level metrics
  lines.push('Plan-Level Metrics');
  lines.push('Metric,Full Name,Value,Unit');
  
  // Primary metrics
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
  
  // Accuracy metrics
  if (isEnabled('LG') && metrics.LG !== undefined) {
    lines.push(`LG,Leaf Gap,${metrics.LG.toFixed(2)},mm`);
  }
  if (isEnabled('MAD') && metrics.MAD !== undefined) {
    lines.push(`MAD,Mean Asymmetry Distance,${metrics.MAD.toFixed(2)},mm`);
  }
  if (isEnabled('EFS') && metrics.EFS !== undefined) {
    lines.push(`EFS,Equivalent Field Size,${metrics.EFS.toFixed(2)},mm`);
  }
  if (isEnabled('psmall') && metrics.psmall !== undefined) {
    lines.push(`psmall,Percentage Small Fields,${metrics.psmall.toFixed(4)},`);
  }
  if (isEnabled('EM') && metrics.EM !== undefined) {
    lines.push(`EM,Edge Metric,${metrics.EM.toFixed(4)},mm⁻¹`);
  }
  if (isEnabled('PI') && metrics.PI !== undefined) {
    lines.push(`PI,Plan Irregularity,${metrics.PI.toFixed(4)},`);
  }
  if (isEnabled('SAS5') && metrics.SAS5 !== undefined) {
    lines.push(`SAS5,Small Aperture Score (5mm),${metrics.SAS5.toFixed(4)},`);
  }
  if (isEnabled('SAS10') && metrics.SAS10 !== undefined) {
    lines.push(`SAS10,Small Aperture Score (10mm),${metrics.SAS10.toFixed(4)},`);
  }
  
  // Deliverability metrics
  if (isEnabled('totalMU')) {
    lines.push(`Total MU,Total Monitor Units,${metrics.totalMU.toFixed(1)},MU`);
  }
  if (isEnabled('prescribedDose') && metrics.prescribedDose !== undefined) {
    lines.push(`Prescribed Dose,Prescribed Dose,${metrics.prescribedDose.toFixed(2)},Gy`);
  }
  if (isEnabled('dosePerFraction') && metrics.dosePerFraction !== undefined) {
    lines.push(`Dose per Fraction,Dose per Fraction,${metrics.dosePerFraction.toFixed(2)},Gy/fx`);
  }
  if (isEnabled('numberOfFractions') && metrics.numberOfFractions !== undefined) {
    lines.push(`Number of Fractions,Number of Fractions,${metrics.numberOfFractions},fx`);
  }
  if (isEnabled('MUperGy') && metrics.MUperGy !== undefined) {
    lines.push(`MU per Gy,MU per Gy,${metrics.MUperGy.toFixed(1)},MU/Gy`);
  }
  if (isEnabled('totalDeliveryTime') && metrics.totalDeliveryTime) {
    lines.push(`Total Delivery Time,Estimated Beam-On Time,${metrics.totalDeliveryTime.toFixed(1)},s`);
  }
  if (isEnabled('MUCA') && metrics.MUCA !== undefined) {
    lines.push(`MUCA,MU per Control Arc,${metrics.MUCA.toFixed(4)},MU/CP`);
  }
  if (isEnabled('LTMU') && metrics.LTMU !== undefined) {
    lines.push(`LTMU,Leaf Travel per MU,${metrics.LTMU.toFixed(4)},mm/MU`);
  }
  if (isEnabled('LTNLMU') && metrics.LTNLMU !== undefined) {
    lines.push(`LTNLMU,Leaf Travel per Leaf and MU,${metrics.LTNLMU.toFixed(6)},mm/(leaf·MU)`);
  }
  if (isEnabled('LNA') && metrics.LNA !== undefined) {
    lines.push(`LNA,Leaf Travel per Leaf and CA,${metrics.LNA.toFixed(4)},mm/(leaf·CP)`);
  }
  if (isEnabled('LTAL') && metrics.LTAL !== undefined) {
    lines.push(`LTAL,Leaf Travel per Arc Length,${metrics.LTAL.toFixed(2)},mm/°`);
  }
  if (isEnabled('GT') && metrics.GT !== undefined) {
    lines.push(`GT,Gantry Travel,${metrics.GT.toFixed(1)},°`);
  }
  if (isEnabled('GS') && metrics.GS !== undefined) {
    lines.push(`GS,Gantry Speed,${metrics.GS.toFixed(2)},deg/s`);
  }
  if (isEnabled('mDRV') && metrics.mDRV !== undefined) {
    lines.push(`mDRV,Mean Dose Rate Variation,${metrics.mDRV.toFixed(2)},MU/min`);
  }
  if (isEnabled('mGSV') && metrics.mGSV !== undefined) {
    lines.push(`mGSV,Mean Gantry Speed Variation,${metrics.mGSV.toFixed(4)},deg/s`);
  }
  if (isEnabled('LS') && metrics.LS !== undefined) {
    lines.push(`LS,Leaf Speed,${metrics.LS.toFixed(2)},mm/s`);
  }
  if (isEnabled('PA') && metrics.PA !== undefined) {
    lines.push(`PA,Plan Area,${metrics.PA.toFixed(2)},cm²`);
  }
  if (isEnabled('JA') && metrics.JA !== undefined) {
    lines.push(`JA,Jaw Area,${metrics.JA.toFixed(2)},cm²`);
  }
  if (isEnabled('PM') && metrics.PM !== undefined) {
    lines.push(`PM,Plan Modulation,${metrics.PM.toFixed(4)},`);
  }
  if (isEnabled('TG') && metrics.TG !== undefined) {
    lines.push(`TG,Tongue-and-Groove Index,${metrics.TG.toFixed(4)},`);
  }
  if (isEnabled('MD') && metrics.MD !== undefined) {
    lines.push(`MD,Modulation Degree,${metrics.MD.toFixed(4)},`);
  }
  if (isEnabled('MI') && metrics.MI !== undefined) {
    lines.push(`MI,Modulation Index,${metrics.MI.toFixed(4)},`);
  }
  lines.push('');
  
  // Build dynamic header for beam metrics
  const beamHeaders = ['Beam'];
  if (isEnabled('MCS')) beamHeaders.push('MCS');
  if (isEnabled('LSV')) beamHeaders.push('LSV');
  if (isEnabled('AAV')) beamHeaders.push('AAV');
  if (isEnabled('MFA')) beamHeaders.push('MFA (cm²)');
  if (isEnabled('LT')) beamHeaders.push('LT (mm)');
  if (isEnabled('LG')) beamHeaders.push('LG (mm)');
  if (isEnabled('MAD')) beamHeaders.push('MAD (mm)');
  if (isEnabled('EFS')) beamHeaders.push('EFS (mm)');
  if (isEnabled('psmall')) beamHeaders.push('psmall');
  if (isEnabled('beamMU')) beamHeaders.push('MU');
  if (isEnabled('numberOfControlPoints')) beamHeaders.push('Control Points');
  if (isEnabled('arcLength')) beamHeaders.push('Arc Length (°)');
  if (isEnabled('estimatedDeliveryTime')) beamHeaders.push('Est. Time (s)');
  if (isEnabled('MUCA')) beamHeaders.push('MUCA');
  if (isEnabled('LTMU')) beamHeaders.push('LTMU');
  if (isEnabled('GT')) beamHeaders.push('GT (°)');
  if (isEnabled('GS')) beamHeaders.push('GS (deg/s)');
  if (isEnabled('LS')) beamHeaders.push('LS (mm/s)');
  if (isEnabled('PA')) beamHeaders.push('PA (cm²)');
  if (isEnabled('JA')) beamHeaders.push('JA (cm²)');
  if (isEnabled('PM')) beamHeaders.push('PM');
  if (isEnabled('TG')) beamHeaders.push('TG');
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
    if (isEnabled('LG')) values.push(bm.LG?.toFixed(2) ?? '');
    if (isEnabled('MAD')) values.push(bm.MAD?.toFixed(2) ?? '');
    if (isEnabled('EFS')) values.push(bm.EFS?.toFixed(2) ?? '');
    if (isEnabled('psmall')) values.push(bm.psmall?.toFixed(4) ?? '');
    if (isEnabled('beamMU')) values.push(bm.beamMU.toFixed(1));
    if (isEnabled('numberOfControlPoints')) values.push(bm.numberOfControlPoints.toString());
    if (isEnabled('arcLength')) values.push(bm.arcLength?.toFixed(1) ?? '');
    if (isEnabled('estimatedDeliveryTime')) values.push(bm.estimatedDeliveryTime?.toFixed(1) ?? '');
    if (isEnabled('MUCA')) values.push(bm.MUCA?.toFixed(4) ?? '');
    if (isEnabled('LTMU')) values.push(bm.LTMU?.toFixed(4) ?? '');
    if (isEnabled('GT')) values.push(bm.GT?.toFixed(1) ?? '');
    if (isEnabled('GS')) values.push(bm.GS?.toFixed(2) ?? '');
    if (isEnabled('LS')) values.push(bm.LS?.toFixed(2) ?? '');
    if (isEnabled('PA')) values.push(bm.PA?.toFixed(2) ?? '');
    if (isEnabled('JA')) values.push(bm.JA?.toFixed(2) ?? '');
    if (isEnabled('PM')) values.push(bm.PM?.toFixed(4) ?? '');
    if (isEnabled('TG')) values.push(bm.TG?.toFixed(4) ?? '');
    if (isEnabled('SAS5')) values.push(bm.SAS5?.toFixed(4) ?? '');
    if (isEnabled('SAS10')) values.push(bm.SAS10?.toFixed(4) ?? '');
    if (isEnabled('EM')) values.push(bm.EM?.toFixed(4) ?? '');
    if (isEnabled('PI')) values.push(bm.PI?.toFixed(4) ?? '');
    if (isEnabled('collimatorAngle')) values.push(bm.collimatorAngleStart?.toFixed(1) ?? '');
    lines.push(values.join(','));
  }
  
  return lines.join('\n');
}
