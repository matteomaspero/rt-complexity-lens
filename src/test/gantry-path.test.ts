import { describe, it, expect } from 'vitest';
import { unwrapGantryPath, clampGantry, toIecAngle } from '@/lib/dicom/gantry-path';

describe('unwrapGantryPath', () => {
  it('179 -> 181 CW uses the short overtravel past 180', () => {
    const p = unwrapGantryPath([179, 181], ['CW', 'NONE']);
    expect(p.angles).toEqual([179, 181]);
    expect(p.exceedsLimits).toBe(false);
  });

  it('CW full arc 181 -> 179 travels through 0, never under the couch', () => {
    const p = unwrapGantryPath([181, 270, 0, 90, 179], ['CW', 'CW', 'CW', 'CW', 'NONE']);
    expect(p.angles).toEqual([-179, -90, 0, 90, 179]);
    expect(p.exceedsLimits).toBe(false);
  });

  it('CCW return arc 179 -> 181 reverses back through 0', () => {
    const p = unwrapGantryPath([179, 0, 181], ['CCW', 'CCW', 'NONE']);
    expect(p.angles).toEqual([179, 0, -179]);
  });

  it('flags a path that would exceed the travel limits', () => {
    const p = unwrapGantryPath([170, 100, 0, 270, 190], ['CCW', 'CCW', 'CCW', 'CCW', 'NONE'].slice(0, 5) as never);
    expect(p.exceedsLimits).toBe(true);
  });

  it('clamps manual gantry motion to ±185', () => {
    expect(clampGantry(200)).toBe(185);
    expect(clampGantry(-190)).toBe(-185);
    expect(toIecAngle(-90)).toBe(270);
  });
});
