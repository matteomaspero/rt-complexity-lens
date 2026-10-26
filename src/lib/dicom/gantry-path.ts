export type RotationDirection = 'CW' | 'CCW' | 'NONE';

export interface GantryLimits {
  /** Minimum continuous angle (deg). IEC 0° = source above; ±180° = under the couch. */
  min: number;
  max: number;
}

export const DEFAULT_GANTRY_LIMITS: GantryLimits = { min: -185, max: 185 };

export interface GantryPath {
  /** Continuous (unwrapped) angles; never jump across ±180° under the couch. */
  angles: number[];
  /** True if no start branch keeps the path inside the limits. */
  exceedsLimits: boolean;
}

export function toSignedAngle(angle: number): number {
  const a = ((angle % 360) + 360) % 360;
  return a > 180 ? a - 360 : a;
}

export function toIecAngle(continuous: number): number {
  return ((continuous % 360) + 360) % 360;
}

function stepDelta(from: number, to: number, direction: RotationDirection): number {
  const cw = (((to - from) % 360) + 360) % 360;
  if (direction === 'CW') return cw;
  if (direction === 'CCW') return cw === 0 ? 0 : cw - 360;
  return cw > 180 ? cw - 360 : cw;
}

function buildPath(start: number, angles: number[], directions: RotationDirection[]): number[] {
  const out = [start];
  for (let i = 1; i < angles.length; i++) {
    // DICOM: direction of a CP applies to the segment that starts at it.
    const dir = directions[i - 1] ?? 'NONE';
    out.push(out[i - 1] + stepDelta(angles[i - 1], angles[i], dir));
  }
  return out;
}

const within = (path: number[], l: GantryLimits) => path.every((a) => a >= l.min - 1e-6 && a <= l.max + 1e-6);

/**
 * Unwraps IEC gantry angles into a continuous travel that respects the
 * mechanical stop under the couch (the gantry reverses instead of passing 180°).
 */
export function unwrapGantryPath(
  angles: number[],
  directions: RotationDirection[],
  limits: GantryLimits = DEFAULT_GANTRY_LIMITS
): GantryPath {
  if (angles.length === 0) return { angles: [], exceedsLimits: false };
  const base = toSignedAngle(angles[0]);
  const candidates = [base, base - 360, base + 360].map((s) => buildPath(s, angles, directions));
  const valid = candidates.find((p) => within(p, limits));
  if (valid) return { angles: valid, exceedsLimits: false };
  return { angles: candidates[0], exceedsLimits: true };
}

export function clampGantry(angle: number, limits: GantryLimits = DEFAULT_GANTRY_LIMITS): number {
  return Math.min(limits.max, Math.max(limits.min, angle));
}
