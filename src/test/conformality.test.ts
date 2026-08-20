/**
 * RTSTRUCT conformality geometry tests.
 *
 * Mirrors python/tests/test_pam.py: the same analytic cases are asserted on
 * both sides so TypeScript and Python geometry stay in lockstep.
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SAD,
  buildAperturePolygon,
  calculateBeamConformality,
  computeConformality,
  pickDefaultTargetIndex,
  projectPatientPointToBEV,
  projectTargetToBEV,
  multiPolygonArea,
  type MultiPolygon,
} from '@/lib/dicom/conformality';
import type { Beam, ControlPoint, Structure } from '@/lib/dicom/types';

const square = (cx: number, cy: number, half: number): MultiPolygon => [[[
  [cx - half, cy - half],
  [cx + half, cy - half],
  [cx + half, cy + half],
  [cx - half, cy + half],
]]];

const makeCP = (over: Partial<ControlPoint> = {}): ControlPoint => ({
  index: 0,
  gantryAngle: 0,
  gantryRotationDirection: 'NONE',
  beamLimitingDeviceAngle: 0,
  cumulativeMetersetWeight: 1,
  mlcPositions: { bankA: [-30], bankB: [30] },
  jawPositions: { x1: -40, x2: 40, y1: -30, y2: 30 },
  ...over,
});

const makeStructure = (): Structure => ({
  name: 'PTV',
  number: 1,
  contours: [-10, 10].map((z) => ({
    points: [
      [-10, -10, z],
      [10, -10, z],
      [10, 10, z],
      [-10, 10, z],
    ] as [number, number, number][],
    numberOfPoints: 4,
  })),
});

const makeBeam = (bankA = -30, bankB = 30): Beam => ({
  beamNumber: 1,
  beamName: 'B1',
  beamType: 'STATIC',
  radiationType: 'PHOTON',
  treatmentDeliveryType: 'TREATMENT',
  numberOfControlPoints: 2,
  controlPoints: [0, 1].map((i) =>
    makeCP({
      index: i,
      cumulativeMetersetWeight: i,
      mlcPositions: { bankA: [bankA], bankB: [bankB] },
    })
  ),
  beamMetersetUnits: 'MU',
  finalCumulativeMetersetWeight: 1,
  gantryAngleStart: 0,
  gantryAngleEnd: 0,
  isArc: false,
  mlcLeafWidths: [60],
  mlcLeafBoundaries: [-30, 30],
  numberOfLeaves: 1,
});

describe('BEV projection (IEC 61217)', () => {
  it('maps the isocentre to the origin', () => {
    expect(projectPatientPointToBEV([0, 0, 0], { gantryAngle: 0 })).toEqual([0, 0]);
  });

  it('projects an in-plane point without divergence scaling', () => {
    const [x, y] = projectPatientPointToBEV([10, 0, 20], { gantryAngle: 0 });
    expect(x).toBeCloseTo(10, 9);
    expect(y).toBeCloseTo(20, 9);
  });

  it('scales points upstream of the isocentre by divergence', () => {
    const [x, y] = projectPatientPointToBEV([10, -100, 0], { gantryAngle: 0 });
    expect(x).toBeCloseTo((10 * DEFAULT_SAD) / 900, 6);
    expect(y).toBeCloseTo(0, 9);
  });

  it('handles a 90 degree gantry angle', () => {
    const [x, y] = projectPatientPointToBEV([10, 0, 20], { gantryAngle: 90 });
    const scale = DEFAULT_SAD / 990;
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(20 * scale, 6);
  });

  it('rotates into the MLC frame for a 90 degree collimator angle', () => {
    const [x, y] = projectPatientPointToBEV([10, 0, 20], {
      gantryAngle: 0,
      collimatorAngle: 90,
    });
    expect(x).toBeCloseTo(20, 6);
    expect(y).toBeCloseTo(-10, 6);
  });
});

describe('target silhouette', () => {
  it('projects a 20 mm cube to roughly a 20 x 20 outline', () => {
    const mp = projectTargetToBEV(makeStructure(), makeCP());
    expect(multiPolygonArea(mp)).toBeGreaterThan(380);
    expect(multiPolygonArea(mp)).toBeLessThan(420);
  });

  it('returns nothing for fewer than three points', () => {
    const s: Structure = {
      name: 'X',
      number: 1,
      contours: [{ points: [[0, 0, 0], [1, 0, 0]], numberOfPoints: 2 }],
    };
    expect(projectTargetToBEV(s, makeCP())).toEqual([]);
  });
});

describe('aperture polygon', () => {
  it('unions two symmetric leaf pairs', () => {
    const cp = makeCP({
      mlcPositions: { bankA: [-10, -10], bankB: [10, 10] },
      jawPositions: { x1: -50, x2: 50, y1: -10, y2: 10 },
    });
    const area = multiPolygonArea(buildAperturePolygon(cp, [-10, 0, 10], [10, 10]));
    expect(area).toBeCloseTo(400, 6);
  });

  it('returns an empty aperture for closed leaves', () => {
    const cp = makeCP({
      mlcPositions: { bankA: [0], bankB: [0] },
      jawPositions: { x1: -50, x2: 50, y1: -10, y2: 10 },
    });
    expect(buildAperturePolygon(cp, [-10, 10], [20])).toEqual([]);
  });

  it('clips the aperture to the Y jaws', () => {
    const cp = makeCP({
      mlcPositions: { bankA: [-20], bankB: [20] },
      jawPositions: { x1: -50, x2: 50, y1: -5, y2: 5 },
    });
    const area = multiPolygonArea(buildAperturePolygon(cp, [-20, 20], [40]));
    expect(area).toBeCloseTo(400, 6);
  });
});

describe('conformality quantities', () => {
  it('handles concentric squares', () => {
    const res = computeConformality(square(0, 0, 30), square(0, 0, 20));
    expect(res).toBeDefined();
    expect(res!.coverage).toBeCloseTo(1, 9);
    expect(res!.blockedFraction).toBeCloseTo(0, 9);
    expect(res!.apertureTargetRatio).toBeCloseTo(3600 / 1600, 9);
    expect(res!.marginMin).toBeCloseTo(10, 6);
    expect(res!.marginMean).toBeGreaterThanOrEqual(res!.marginMin);
  });

  it('reports half coverage for a half-overlapping aperture', () => {
    const aperture: MultiPolygon = [[[
      [0, -20],
      [40, -20],
      [40, 20],
      [0, 20],
    ]]];
    const res = computeConformality(aperture, square(0, 0, 20));
    expect(res!.coverage).toBeCloseTo(0.5, 9);
    expect(res!.apertureTargetRatio).toBeCloseTo(1, 9);
  });

  it('returns undefined without a target', () => {
    expect(computeConformality(square(0, 0, 30), [])).toBeUndefined();
  });

  it('treats an empty aperture as fully blocking', () => {
    const res = computeConformality([], square(0, 0, 20));
    expect(res!.coverage).toBeCloseTo(0, 9);
    expect(res!.blockedFraction).toBeCloseTo(1, 9);
    expect(res!.apertureTargetRatio).toBeCloseTo(0, 9);
  });
});

describe('beam aggregation', () => {
  it('covers the target with an open aperture', () => {
    const conf = calculateBeamConformality(makeBeam(), makeStructure());
    expect(conf).toBeDefined();
    expect(conf!.TCOV).toBeCloseTo(1, 6);
    expect(conf!.BAM).toBeCloseTo(0, 6);
    expect(conf!.ATR).toBeGreaterThan(1);
    expect(conf!.MARGMIN).toBeGreaterThan(0);
  });

  it('blocks the target with a closed aperture', () => {
    const conf = calculateBeamConformality(makeBeam(0, 0), makeStructure());
    expect(conf!.TCOV).toBeCloseTo(0, 9);
    expect(conf!.BAM).toBeCloseTo(1, 9);
  });

  it('returns undefined without a structure', () => {
    expect(calculateBeamConformality(makeBeam(), undefined)).toBeUndefined();
  });
});

describe('default target pick', () => {
  it('prefers PTV, then CTV, then GTV', () => {
    const mk = (name: string, n: number): Structure => ({
      name,
      number: n,
      contours: [{ points: [[0, 0, 0]], numberOfPoints: 1 }],
    });
    const structures = [mk('Bladder', 1), mk('CTV_1', 2), mk('PTV_high', 3)];
    expect(pickDefaultTargetIndex(structures)).toBe(2);
    expect(pickDefaultTargetIndex(structures.slice(0, 2))).toBe(1);
    expect(pickDefaultTargetIndex([])).toBe(-1);
  });
});
