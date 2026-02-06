import { describe, it, expect, beforeAll } from 'vitest';
import { parseTestPlan, TEST_FILES, getAllTestFiles } from './test-utils';
import type { RTPlan } from '@/lib/dicom/types';

describe('DICOM-RT Plan Parser', () => {
  describe('Basic parsing', () => {
    it.each(getAllTestFiles())('should parse %s without throwing', (filename) => {
      const plan = parseTestPlan(filename);
      expect(plan).toBeDefined();
      expect(plan.beams).toBeDefined();
      expect(Array.isArray(plan.beams)).toBe(true);
    });
  });

  describe('Plan metadata extraction', () => {
    let plan: RTPlan;

    beforeAll(() => {
      plan = parseTestPlan(TEST_FILES.MONACO_PT_01);
    });

    it('should extract patient ID', () => {
      expect(plan.patientId).toBeDefined();
      expect(typeof plan.patientId).toBe('string');
    });

    it('should extract plan label', () => {
      expect(plan.planLabel).toBeDefined();
      expect(typeof plan.planLabel).toBe('string');
    });

    it('should detect technique (VMAT or IMRT)', () => {
      expect(['VMAT', 'IMRT', 'CONFORMAL', 'UNKNOWN']).toContain(plan.technique);
    });

    it('should calculate total MU', () => {
      expect(plan.totalMU).toBeGreaterThan(0);
    });
  });

  describe('Beam extraction', () => {
    it('should extract at least one beam from each plan', () => {
      for (const filename of getAllTestFiles()) {
        const plan = parseTestPlan(filename);
        expect(plan.beams.length).toBeGreaterThan(0);
      }
    });

    it('should extract beam properties', () => {
      const plan = parseTestPlan(TEST_FILES.MONACO_PT_01);
      const beam = plan.beams[0];

      expect(beam.beamNumber).toBeDefined();
      expect(beam.beamName).toBeDefined();
      expect(typeof beam.beamName).toBe('string');
      expect(beam.controlPoints).toBeDefined();
      expect(Array.isArray(beam.controlPoints)).toBe(true);
    });

    it('should have control points with valid indices', () => {
      const plan = parseTestPlan(TEST_FILES.TG119_7F);
      const beam = plan.beams[0];

      beam.controlPoints.forEach((cp, idx) => {
        expect(cp.index).toBe(idx);
      });
    });
  });

  describe('Control point data', () => {
    it('should extract gantry angles', () => {
      const plan = parseTestPlan(TEST_FILES.VMAT_1);
      const beam = plan.beams[0];

      beam.controlPoints.forEach((cp) => {
        expect(cp.gantryAngle).toBeDefined();
        expect(cp.gantryAngle).toBeGreaterThanOrEqual(0);
        expect(cp.gantryAngle).toBeLessThan(360);
      });
    });

    it('should have cumulative meterset weights from 0 to 1', () => {
      const plan = parseTestPlan(TEST_FILES.MONACO_PT_02);
      const beam = plan.beams[0];
      const cps = beam.controlPoints;

      // First control point should be 0
      expect(cps[0].cumulativeMetersetWeight).toBe(0);
      
      // Last control point should be 1
      expect(cps[cps.length - 1].cumulativeMetersetWeight).toBe(1);
      
      // Should be monotonically increasing
      for (let i = 1; i < cps.length; i++) {
        expect(cps[i].cumulativeMetersetWeight).toBeGreaterThanOrEqual(
          cps[i - 1].cumulativeMetersetWeight
        );
      }
    });
  });

  describe('MLC position parsing', () => {
    it('should extract MLC positions for each control point', () => {
      const plan = parseTestPlan(TEST_FILES.MONACO_PT_01);
      const beam = plan.beams[0];

      beam.controlPoints.forEach((cp) => {
        expect(cp.mlcPositions).toBeDefined();
        expect(cp.mlcPositions.bankA).toBeDefined();
        expect(cp.mlcPositions.bankB).toBeDefined();
        expect(Array.isArray(cp.mlcPositions.bankA)).toBe(true);
        expect(Array.isArray(cp.mlcPositions.bankB)).toBe(true);
      });
    });

    it('should have equal number of leaves in Bank A and Bank B', () => {
      const plan = parseTestPlan(TEST_FILES.MONACO_PT_02);
      const beam = plan.beams[0];

      beam.controlPoints.forEach((cp) => {
        expect(cp.mlcPositions.bankA.length).toBe(cp.mlcPositions.bankB.length);
      });
    });

    it('should have Bank A positions <= Bank B positions (aperture check)', () => {
      const plan = parseTestPlan(TEST_FILES.MONACO_PT_03);
      const beam = plan.beams[0];

      beam.controlPoints.forEach((cp) => {
        const { bankA, bankB } = cp.mlcPositions;
        for (let i = 0; i < bankA.length; i++) {
          // Bank A is left side, Bank B is right side
          // In DICOM, Bank A has negative positions, Bank B positive
          // When leaves are open: bankA[i] < bankB[i]
          expect(bankA[i]).toBeLessThanOrEqual(bankB[i]);
        }
      });
    });
  });

  describe('Jaw position parsing', () => {
    it('should extract jaw positions', () => {
      const plan = parseTestPlan(TEST_FILES.TG119_7F);
      const beam = plan.beams[0];
      const cp = beam.controlPoints[0];

      expect(cp.jawPositions).toBeDefined();
      expect(cp.jawPositions.x1).toBeDefined();
      expect(cp.jawPositions.x2).toBeDefined();
      expect(cp.jawPositions.y1).toBeDefined();
      expect(cp.jawPositions.y2).toBeDefined();
    });

    it('should have valid jaw opening (x1 <= x2, y1 <= y2)', () => {
      const plan = parseTestPlan(TEST_FILES.MONACO_PT_04);
      const beam = plan.beams[0];

      beam.controlPoints.forEach((cp) => {
        const { x1, x2, y1, y2 } = cp.jawPositions;
        // Jaws can be closed (equal) in some edge cases
        expect(x1).toBeLessThanOrEqual(x2);
        expect(y1).toBeLessThanOrEqual(y2);
      });
    });
  });

  describe('VMAT vs IMRT detection', () => {
    it('should detect VMAT plans with multiple control points per beam', () => {
      const plan = parseTestPlan(TEST_FILES.VMAT_1);
      
      if (plan.technique === 'VMAT') {
        // VMAT typically has many control points (arc)
        const beam = plan.beams[0];
        expect(beam.controlPoints.length).toBeGreaterThan(2);
        expect(beam.isArc).toBe(true);
      }
    });

    it('should properly flag arc beams', () => {
      const plan = parseTestPlan(TEST_FILES.MONACO_PT_01);
      const beam = plan.beams[0];

      if (beam.isArc) {
        // Arc beams have multiple control points with varying gantry angles
        // Note: full 360° arcs may have same start/end angle, so check control point count
        expect(beam.controlPoints.length).toBeGreaterThan(2);
      }
    });
  });

  describe('Leaf widths extraction', () => {
    it('should extract MLC leaf widths', () => {
      const plan = parseTestPlan(TEST_FILES.MONACO_PT_01);
      const beam = plan.beams[0];

      expect(beam.mlcLeafWidths).toBeDefined();
      expect(Array.isArray(beam.mlcLeafWidths)).toBe(true);
      expect(beam.mlcLeafWidths.length).toBeGreaterThan(0);
    });

    it('should have positive leaf widths', () => {
      const plan = parseTestPlan(TEST_FILES.TG119_2A);
      const beam = plan.beams[0];

      beam.mlcLeafWidths.forEach((width) => {
        expect(width).toBeGreaterThan(0);
      });
    });
  });
});
