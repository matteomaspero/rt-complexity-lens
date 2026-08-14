/**
 * RTSTRUCT-based conformality geometry.
 *
 * Projects a target structure into the Beam's Eye View (BEV) at the isocentre
 * plane following IEC 61217 (couch -> gantry -> collimator rotations, with
 * beam divergence), builds the true MLC + jaw aperture polygon, and derives
 * conformality quantities from polygon boolean operations.
 *
 * Educational tool: geometry is a documented approximation (per-control-point
 * convex hull of the projected contour cloud as the target silhouette) and is
 * not clinically validated.
 */
import polygonClipping from 'polygon-clipping';
import type { Beam, ControlPoint, RTPlan, Structure } from './types';

export type Point2D = [number, number];
export type Ring = Point2D[];
export type MultiPolygon = Ring[][];

/** Default source-to-axis distance (mm) when the plan does not declare one. */
export const DEFAULT_SAD = 1000;

export interface ConformalityResult {
  /** Fraction of the projected target blocked by MLC/jaws [0,1] (aperture modulation). */
  blockedFraction: number;
  /** Fraction of the projected target inside the aperture [0,1]. */
  coverage: number;
  /** Aperture area divided by projected target area (dimensionless). */
  apertureTargetRatio: number;
  /** Mean distance from aperture edge to the target outline (mm at isocentre). */
  marginMean: number;
  /** Minimum distance from aperture edge to the target outline (mm at isocentre). */
  marginMin: number;
  /** Aperture area (mm²) used for the ratio. */
  apertureArea: number;
  /** Projected target area (mm²). */
  targetArea: number;
}

// ---------------------------------------------------------------------------
// Polygon primitives
// ---------------------------------------------------------------------------

export function ringArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

export function multiPolygonArea(mp: MultiPolygon): number {
  let area = 0;
  for (const poly of mp) {
    poly.forEach((ring, index) => {
      const a = ringArea(ring);
      area += index === 0 ? a : -a; // subtract holes
    });
  }
  return Math.max(0, area);
}

/** Andrew's monotone chain convex hull. */
export function convexHull(points: Point2D[]): Ring {
  if (points.length < 3) return points.slice();
  const pts = points
    .slice()
    .sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));

  const cross = (o: Point2D, a: Point2D, b: Point2D) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const build = (input: Point2D[]): Point2D[] => {
    const stack: Point2D[] = [];
    for (const p of input) {
      while (stack.length >= 2 && cross(stack[stack.length - 2], stack[stack.length - 1], p) <= 0) {
        stack.pop();
      }
      stack.push(p);
    }
    return stack;
  };

  const lower = build(pts);
  const upper = build(pts.slice().reverse());
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function safeIntersectionArea(a: MultiPolygon, b: MultiPolygon): number {
  if (a.length === 0 || b.length === 0) return 0;
  try {
    return multiPolygonArea(polygonClipping.intersection(a as never, b as never) as MultiPolygon);
  } catch {
    return 0;
  }
}

function safeUnion(parts: MultiPolygon[]): MultiPolygon {
  const nonEmpty = parts.filter((p) => p.length > 0);
  if (nonEmpty.length === 0) return [];
  if (nonEmpty.length === 1) return nonEmpty[0];
  try {
    const [first, ...rest] = nonEmpty;
    return polygonClipping.union(first as never, ...(rest as never[])) as MultiPolygon;
  } catch {
    return nonEmpty[0];
  }
}

function distancePointToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function distancePointToRing(p: Point2D, ring: Ring): number {
  let min = Infinity;
  for (let i = 0, n = ring.length; i < n; i++) {
    const d = distancePointToSegment(p, ring[i], ring[(i + 1) % n]);
    if (d < min) min = d;
  }
  return min;
}

/** Sample points along the edges of a multipolygon at a fixed spacing (mm). */
function sampleEdges(mp: MultiPolygon, spacing = 2): Point2D[] {
  const samples: Point2D[] = [];
  for (const poly of mp) {
    for (const ring of poly) {
      for (let i = 0, n = ring.length; i < n; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % n];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const steps = Math.max(1, Math.ceil(len / spacing));
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          samples.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        }
      }
    }
  }
  return samples;
}

// ---------------------------------------------------------------------------
// BEV projection (IEC 61217)
// ---------------------------------------------------------------------------

/**
 * Project a patient-coordinate point (DICOM patient LPS, mm) to the BEV plane
 * at the isocentre, in MLC coordinates (x along leaf travel, y along the leaf
 * boundary axis).
 */
export function projectPatientPointToBEV(
  point: readonly [number, number, number],
  options: {
    gantryAngle: number;
    collimatorAngle?: number;
    patientSupportAngle?: number;
    isocenter?: readonly [number, number, number];
    sad?: number;
  }
): Point2D {
  const iso = options.isocenter ?? [0, 0, 0];
  const sad = options.sad ?? DEFAULT_SAD;

  // DICOM patient (x=left, y=posterior, z=superior) -> IEC fixed (X=left, Y=cranial, Z=anterior)
  const dx = point[0] - iso[0];
  const dy = point[1] - iso[1];
  const dz = point[2] - iso[2];
  let X = dx;
  let Y = dz;
  let Z = -dy;

  // Couch rotation about the vertical (Y) axis
  const psi = ((options.patientSupportAngle ?? 0) * Math.PI) / 180;
  if (psi !== 0) {
    const cosP = Math.cos(-psi);
    const sinP = Math.sin(-psi);
    const Xr = X * cosP - Z * sinP;
    const Zr = X * sinP + Z * cosP;
    X = Xr;
    Z = Zr;
  }

  // Gantry rotation about Y: gantry 0 = source at +Z (anterior)
  const g = (options.gantryAngle * Math.PI) / 180;
  const cosG = Math.cos(g);
  const sinG = Math.sin(g);
  const xBev = X * cosG - Z * sinG;
  const yBev = Y;
  const depth = -(X * sinG + Z * cosG); // positive downstream of isocentre

  // Beam divergence: scale back to the isocentre plane
  const denom = sad + depth;
  const scale = Math.abs(denom) < 1e-6 ? 1 : sad / denom;
  let xIso = xBev * scale;
  let yIso = yBev * scale;

  // Collimator rotation (MLC frame)
  const theta = ((options.collimatorAngle ?? 0) * Math.PI) / 180;
  if (theta !== 0) {
    const cosT = Math.cos(-theta);
    const sinT = Math.sin(-theta);
    const xr = xIso * cosT - yIso * sinT;
    const yr = xIso * sinT + yIso * cosT;
    xIso = xr;
    yIso = yr;
  }

  return [xIso, yIso];
}

/**
 * Target silhouette in the BEV/MLC frame for one control point.
 * Approximation: convex hull of all projected contour points.
 */
export function projectTargetToBEV(
  structure: Structure,
  cp: ControlPoint,
  sad = DEFAULT_SAD
): MultiPolygon {
  const projected: Point2D[] = [];
  for (const contour of structure.contours) {
    for (const pt of contour.points) {
      projected.push(
        projectPatientPointToBEV(pt, {
          gantryAngle: cp.gantryAngle,
          collimatorAngle: cp.beamLimitingDeviceAngle,
          patientSupportAngle: cp.patientSupportAngle,
          isocenter: cp.isocenterPosition,
          sad,
        })
      );
    }
  }
  if (projected.length < 3) return [];
  const hull = convexHull(projected);
  return hull.length >= 3 ? [[hull]] : [];
}

/**
 * Aperture polygon (MLC frame) for one control point: the union of open leaf
 * pair rectangles clipped by the X and Y jaws. When both X jaws read 0 (e.g.
 * Monaco without ASYMX) no X clipping is applied, matching the area metrics.
 */
export function buildAperturePolygon(
  cp: ControlPoint,
  leafBoundaries: number[],
  leafWidths: number[]
): MultiPolygon {
  const { bankA, bankB } = cp.mlcPositions;
  const n = Math.min(bankA.length, bankB.length);
  if (n === 0) return [];

  let bounds = leafBoundaries;
  if (!bounds || bounds.length !== n + 1) {
    const widths = leafWidths?.length === n ? leafWidths : new Array(n).fill(5);
    const total = widths.reduce((s, w) => s + (w || 5), 0);
    bounds = [];
    let y = -total / 2;
    for (let i = 0; i <= n; i++) {
      bounds.push(y);
      if (i < n) y += widths[i] || 5;
    }
  }

  const { x1, x2, y1, y2 } = cp.jawPositions;
  const hasXJaw = x1 !== 0 || x2 !== 0;
  const hasYJaw = y1 !== 0 || y2 !== 0;

  const rects: MultiPolygon[] = [];
  for (let i = 0; i < n; i++) {
    const top = hasYJaw ? Math.max(bounds[i], y1) : bounds[i];
    const bottom = hasYJaw ? Math.min(bounds[i + 1], y2) : bounds[i + 1];
    if (bottom - top <= 0) continue;

    const a = hasXJaw ? Math.max(bankA[i], x1) : bankA[i];
    const b = hasXJaw ? Math.min(bankB[i], x2) : bankB[i];
    if (b - a <= 0) continue;

    rects.push([[[
      [a, top],
      [b, top],
      [b, bottom],
      [a, bottom],
    ] as Ring]]);
  }

  return safeUnion(rects);
}

// ---------------------------------------------------------------------------
// Conformality quantities
// ---------------------------------------------------------------------------

export function computeConformality(
  aperture: MultiPolygon,
  target: MultiPolygon
): ConformalityResult | undefined {
  const targetArea = multiPolygonArea(target);
  const apertureArea = multiPolygonArea(aperture);
  if (targetArea <= 0) return undefined;

  const inside = safeIntersectionArea(aperture, target);
  const coverage = Math.min(1, Math.max(0, inside / targetArea));

  const apertureSamples = sampleEdges(aperture, 3);
  const targetRings: Ring[] = target.flatMap((poly) => poly);
  let marginSum = 0;
  let marginMin = Infinity;
  for (const sample of apertureSamples) {
    let d = Infinity;
    for (const ring of targetRings) {
      const rd = distancePointToRing(sample, ring);
      if (rd < d) d = rd;
    }
    if (Number.isFinite(d)) {
      marginSum += d;
      if (d < marginMin) marginMin = d;
    }
  }
  const nSamples = apertureSamples.length;

  return {
    blockedFraction: 1 - coverage,
    coverage,
    apertureTargetRatio: apertureArea / targetArea,
    marginMean: nSamples > 0 ? marginSum / nSamples : 0,
    marginMin: Number.isFinite(marginMin) ? marginMin : 0,
    apertureArea,
    targetArea,
  };
}

export interface BeamConformality {
  BAM: number;
  TCOV: number;
  ATR: number;
  MARG: number;
  MARGMIN: number;
  perControlPoint: Array<ConformalityResult | undefined>;
}

/** MU-weighted beam-level conformality for a target structure. */
export function calculateBeamConformality(
  beam: Beam,
  structure?: Structure,
  sad = DEFAULT_SAD
): BeamConformality | undefined {
  if (!structure || !structure.contours?.length || beam.controlPoints.length === 0) {
    return undefined;
  }

  const perControlPoint: Array<ConformalityResult | undefined> = [];
  let weight = 0;
  let wBlocked = 0;
  let wCoverage = 0;
  let wRatio = 0;
  let wMargin = 0;
  let minMargin = Infinity;

  for (let i = 0; i < beam.controlPoints.length; i++) {
    const cp = beam.controlPoints[i];
    const target = projectTargetToBEV(structure, cp, sad);
    const aperture = buildAperturePolygon(cp, beam.mlcLeafBoundaries, beam.mlcLeafWidths);
    const result = computeConformality(aperture, target);
    perControlPoint.push(result);
    if (!result) continue;

    const prev = i === 0 ? 0 : beam.controlPoints[i - 1].cumulativeMetersetWeight;
    const dMU = Math.max(0, cp.cumulativeMetersetWeight - prev);
    // Static beams carry all weight on the last CP; fall back to uniform weighting
    const w = dMU > 1e-9 ? dMU : 1 / beam.controlPoints.length;

    weight += w;
    wBlocked += result.blockedFraction * w;
    wCoverage += result.coverage * w;
    wRatio += result.apertureTargetRatio * w;
    wMargin += result.marginMean * w;
    if (result.marginMin < minMargin) minMargin = result.marginMin;
  }

  if (weight <= 0) return undefined;

  return {
    BAM: wBlocked / weight,
    TCOV: wCoverage / weight,
    ATR: wRatio / weight,
    MARG: wMargin / weight,
    MARGMIN: Number.isFinite(minMargin) ? minMargin : 0,
    perControlPoint,
  };
}

export interface PlanConformality {
  PAM: number;
  TCOV: number;
  ATR: number;
  MARG: number;
  MARGMIN: number;
}

/** MU-weighted plan-level conformality across beams. */
export function calculatePlanConformality(
  plan: RTPlan,
  beamResults: Array<{ beamMU: number; conformality?: BeamConformality }>
): PlanConformality | undefined {
  let weight = 0;
  let pam = 0;
  let tcov = 0;
  let atr = 0;
  let marg = 0;
  let margMin = Infinity;

  for (const { beamMU, conformality } of beamResults) {
    if (!conformality) continue;
    const w = beamMU > 0 ? beamMU : 1;
    weight += w;
    pam += conformality.BAM * w;
    tcov += conformality.TCOV * w;
    atr += conformality.ATR * w;
    marg += conformality.MARG * w;
    if (conformality.MARGMIN < margMin) margMin = conformality.MARGMIN;
  }

  if (weight <= 0 || plan.beams.length === 0) return undefined;

  return {
    PAM: pam / weight,
    TCOV: tcov / weight,
    ATR: atr / weight,
    MARG: marg / weight,
    MARGMIN: Number.isFinite(margMin) ? margMin : 0,
  };
}

/** Heuristic pick of the most likely target ROI (PTV > CTV > GTV > largest). */
export function pickDefaultTargetIndex(structures: Structure[]): number {
  if (structures.length === 0) return -1;
  const score = (name: string): number => {
    const n = name.toUpperCase();
    if (n.includes('PTV')) return 3;
    if (n.includes('CTV')) return 2;
    if (n.includes('GTV')) return 1;
    return 0;
  };
  let best = 0;
  let bestScore = -1;
  structures.forEach((s, i) => {
    const sc = score(s.name) * 1000 + s.contours.length;
    if (sc > bestScore) {
      bestScore = sc;
      best = i;
    }
  });
  return best;
}
