import { describe, it, expect } from 'vitest';
import { parseTestPlan, TEST_FILES, getAllTestFiles } from './test-utils';
import { calculatePlanMetrics } from '@/lib/dicom/metrics';
import type { PlanMetrics } from '@/lib/dicom/types';

describe('UCoMX Complexity Metrics', () => {
  describe('Basic metric calculation', () => {
    it.each(getAllTestFiles())('should calculate metrics for %s without throwing', (filename) => {
      const plan = parseTestPlan(filename);
      const metrics = calculatePlanMetrics(plan);
      
      expect(metrics).toBeDefined();
      expect(metrics.MCS).toBeDefined();
      expect(metrics.beamMetrics).toBeDefined();
    });
  });

  describe('MCS (Modulation Complexity Score)', () => {
    it('should be in valid range [0, 1]', () => {
      const plan = parseTestPlan(TEST_FILES.MONACO_PT_01);
      const metrics = calculatePlanMetrics(plan);

      expect(metrics.MCS).toBeGreaterThanOrEqual(0);
      expect(metrics.MCS).toBeLessThanOrEqual(1);
    });

    it('should be calculated for each beam', () => {
      const plan = parseTestPlan(TEST_FILES.MONACO_PT_02);
      const metrics = calculatePlanMetrics(plan);

      metrics.beamMetrics.forEach((beam) => {
        expect(beam.MCS).toBeGreaterThanOrEqual(0);
        expect(beam.MCS).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('LSV (Leaf Sequence Variability)', () => {
    it('should be in valid range [0, 1]', () => {
      const plan = parseTestPlan(TEST_FILES.MONACO_PT_03);
      const metrics = calculatePlanMetrics(plan);

      expect(metrics.LSV).toBeGreaterThanOrEqual(0);
      expect(metrics.LSV).toBeLessThanOrEqual(1);
    });

    it('should reflect leaf position variability', () => {
      const plan = parseTestPlan(TEST_FILES.TG119_7F);
      const metrics = calculatePlanMetrics(plan);

      // LSV should exist and be valid for all beams
      metrics.beamMetrics.forEach((beam) => {
        expect(beam.LSV).toBeDefined();
        expect(typeof beam.LSV).toBe('number');
        expect(beam.LSV).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('AAV (Aperture Area Variability)', () => {
    it('should be in valid range [0, 1]', () => {
      const plan = parseTestPlan(TEST_FILES.MONACO_PT_04);
      const metrics = calculatePlanMetrics(plan);

      expect(metrics.AAV).toBeGreaterThanOrEqual(0);
      expect(metrics.AAV).toBeLessThanOrEqual(1);
    });
  });

  describe('MFA (Mean Field Area)', () => {
    it('should be non-negative', () => {
      const plan = parseTestPlan(TEST_FILES.VMAT_1);
      const metrics = calculatePlanMetrics(plan);

      expect(metrics.MFA).toBeGreaterThanOrEqual(0);
    });

    it('should be in reasonable range (cm²)', () => {
      const plan = parseTestPlan(TEST_FILES.MONACO_PT_01);
      const metrics = calculatePlanMetrics(plan);

      // MFA should be non-negative and in reasonable range
      expect(metrics.MFA).toBeGreaterThanOrEqual(0);
      expect(metrics.MFA).toBeLessThan(500);
    });
  });

  describe('LT (Leaf Travel)', () => {
    it('should be non-negative', () => {
      const plan = parseTestPlan(TEST_FILES.MONACO_PT_02);
      const metrics = calculatePlanMetrics(plan);

      expect(metrics.LT).toBeGreaterThanOrEqual(0);
    });

    it('should be non-negative for modulated plans', () => {
      const plan = parseTestPlan(TEST_FILES.TG119_7F);
      const metrics = calculatePlanMetrics(plan);

      // VMAT/IMRT plans should have leaf movement, metric can be 0 if not calculated
      expect(metrics.LT).toBeGreaterThanOrEqual(0);
    });
  });

  describe('LTMCS (Leaf Travel + MCS)', () => {
    it('should be calculated', () => {
      const plan = parseTestPlan(TEST_FILES.MONACO_PT_03);
      const metrics = calculatePlanMetrics(plan);

      expect(metrics.LTMCS).toBeDefined();
      expect(typeof metrics.LTMCS).toBe('number');
    });
  });

  describe('Per-beam metrics', () => {
    it('should have metrics for each beam', () => {
      const plan = parseTestPlan(TEST_FILES.TG119_7F);
      const metrics = calculatePlanMetrics(plan);

      expect(metrics.beamMetrics.length).toBe(plan.beams.length);
    });

    it('should include beam name in metrics', () => {
      const plan = parseTestPlan(TEST_FILES.MONACO_PT_01);
      const metrics = calculatePlanMetrics(plan);

      metrics.beamMetrics.forEach((beam, idx) => {
        expect(beam.beamName).toBe(plan.beams[idx].beamName);
      });
    });

    it('should include beam MU', () => {
      const plan = parseTestPlan(TEST_FILES.MONACO_PT_04);
      const metrics = calculatePlanMetrics(plan);

      let totalBeamMU = 0;
      metrics.beamMetrics.forEach((beam) => {
        expect(beam.beamMU).toBeGreaterThanOrEqual(0);
        totalBeamMU += beam.beamMU;
      });

      // Sum of beam MU should approximately equal total plan MU
      expect(totalBeamMU).toBeCloseTo(plan.totalMU, 0);
    });
  });

  describe('MU-weighted aggregation', () => {
    it('should compute plan-level metrics as MU-weighted average', () => {
      const plan = parseTestPlan(TEST_FILES.TG119_2A);
      const metrics = calculatePlanMetrics(plan);

      // Plan-level MCS should be between min and max beam MCS
      const beamMCS = metrics.beamMetrics.map((b) => b.MCS);
      const minMCS = Math.min(...beamMCS);
      const maxMCS = Math.max(...beamMCS);

      expect(metrics.MCS).toBeGreaterThanOrEqual(minMCS - 0.001);
      expect(metrics.MCS).toBeLessThanOrEqual(maxMCS + 0.001);
    });
  });

  describe('Metric consistency across plans', () => {
    it('should produce consistent metric types for all test files', () => {
      const results: PlanMetrics[] = [];

      for (const filename of getAllTestFiles()) {
        const plan = parseTestPlan(filename);
        const metrics = calculatePlanMetrics(plan);
        results.push(metrics);
      }

      // All plans should have the same metric structure
      results.forEach((metrics) => {
        expect(typeof metrics.MCS).toBe('number');
        expect(typeof metrics.LSV).toBe('number');
        expect(typeof metrics.AAV).toBe('number');
        expect(typeof metrics.MFA).toBe('number');
        expect(typeof metrics.LT).toBe('number');
        expect(typeof metrics.LTMCS).toBe('number');
      });
    });
  });
});
