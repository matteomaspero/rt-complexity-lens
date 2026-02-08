import { describe, it, expect } from 'vitest';
import {
  METRIC_GROUPS,
  METRIC_DEFINITIONS,
  getAllMetrics,
  getMetricsForGroup,
  extractMetricValue,
  extractMetricValues,
  getMetricInfo,
  formatMetricValue,
  getMetricColor,
  METRIC_COLORS,
} from '@/lib/cohort/metric-utils';
import type { CohortPlan } from '@/contexts/CohortContext';
import type { RTPlan, PlanMetrics, Beam } from '@/lib/dicom/types';

// Helper to create mock cohort plan
function createMockCohortPlan(metrics: Partial<PlanMetrics>, beamCount = 2): CohortPlan {
  const beams: Beam[] = Array.from({ length: beamCount }, (_, i) => ({
    beamNumber: i + 1,
    beamName: `Beam ${i + 1}`,
    beamType: 'DYNAMIC' as const,
    radiationType: 'PHOTON',
    treatmentDeliveryType: 'TREATMENT' as const,
    treatmentMachineName: 'Linac1',
    gantryAngle: 0,
    gantryAngleStart: 0,
    gantryAngleEnd: 180,
    collimatorAngle: 0,
    couchAngle: 0,
    numberOfControlPoints: 50,
    controlPoints: [],
    mlcLeafPositions: [],
    mlcLeafWidths: [],
    numberOfLeaves: 60,
    isArc: true,
    beamMetersetUnits: 'MU',
    finalCumulativeMetersetWeight: 1,
  }));

  return {
    id: 'plan-1',
    fileName: 'test.dcm',
    uploadTime: new Date(),
    status: 'success',
    plan: {
      patientId: 'PT001',
      patientName: 'Test Patient',
      planLabel: 'Test Plan',
      planName: 'Test Plan',
      rtPlanGeometry: 'PATIENT',
      technique: 'VMAT',
      beams,
      fractionGroups: [],
      totalMU: 1000,
      parseDate: new Date(),
      fileSize: 1000,
      sopInstanceUID: '1.2.3.4.5',
    } as RTPlan,
    metrics: {
      planLabel: 'Test Plan',
      MCS: 0.5,
      LSV: 0.6,
      AAV: 0.7,
      MFA: 25,
      LT: 500,
      LTMCS: 250,
      totalMU: 1000,
      totalDeliveryTime: 300,
      beamMetrics: [],
      calculationDate: new Date(),
      ...metrics,
    } as PlanMetrics,
  };
}

describe('Metric Utils', () => {
  describe('METRIC_GROUPS', () => {
    it('should have geometric, beam, and complexity groups', () => {
      expect(METRIC_GROUPS.geometric).toBeDefined();
      expect(METRIC_GROUPS.beam).toBeDefined();
      expect(METRIC_GROUPS.complexity).toBeDefined();
    });

    it('should have expected geometric metrics', () => {
      expect(METRIC_GROUPS.geometric).toContain('MFA');
      expect(METRIC_GROUPS.geometric).toContain('EFS');
      expect(METRIC_GROUPS.geometric).toContain('PA');
    });

    it('should have expected beam metrics', () => {
      expect(METRIC_GROUPS.beam).toContain('totalMU');
      expect(METRIC_GROUPS.beam).toContain('totalDeliveryTime');
      expect(METRIC_GROUPS.beam).toContain('beamCount');
      expect(METRIC_GROUPS.beam).toContain('controlPointCount');
    });

    it('should have expected complexity metrics', () => {
      expect(METRIC_GROUPS.complexity).toContain('MCS');
      expect(METRIC_GROUPS.complexity).toContain('LSV');
      expect(METRIC_GROUPS.complexity).toContain('AAV');
      expect(METRIC_GROUPS.complexity).toContain('LT');
    });
  });

  describe('METRIC_DEFINITIONS', () => {
    it('should have definition for each metric in groups', () => {
      const allGroupMetrics = [
        ...METRIC_GROUPS.geometric,
        ...METRIC_GROUPS.beam,
        ...METRIC_GROUPS.complexity,
      ];

      for (const metric of allGroupMetrics) {
        expect(METRIC_DEFINITIONS[metric]).toBeDefined();
        expect(METRIC_DEFINITIONS[metric].key).toBe(metric);
        expect(METRIC_DEFINITIONS[metric].name).toBeTruthy();
        expect(METRIC_DEFINITIONS[metric].shortName).toBeTruthy();
        expect(METRIC_DEFINITIONS[metric].group).toBeTruthy();
      }
    });

    it('should have correct group assignments', () => {
      for (const metric of METRIC_GROUPS.geometric) {
        expect(METRIC_DEFINITIONS[metric].group).toBe('geometric');
      }
      for (const metric of METRIC_GROUPS.beam) {
        expect(METRIC_DEFINITIONS[metric].group).toBe('beam');
      }
      for (const metric of METRIC_GROUPS.complexity) {
        expect(METRIC_DEFINITIONS[metric].group).toBe('complexity');
      }
    });
  });

  describe('getAllMetrics', () => {
    it('should return all metric definitions', () => {
      const allMetrics = getAllMetrics();
      
      expect(allMetrics.length).toBeGreaterThan(0);
      expect(allMetrics.every(m => m.key && m.name)).toBe(true);
    });
  });

  describe('getMetricsForGroup', () => {
    it('should return metrics for geometric group', () => {
      const metrics = getMetricsForGroup('geometric');
      
      expect(metrics.length).toBe(METRIC_GROUPS.geometric.length);
      expect(metrics.every(m => m.group === 'geometric')).toBe(true);
    });

    it('should return metrics for beam group', () => {
      const metrics = getMetricsForGroup('beam');
      
      expect(metrics.length).toBe(METRIC_GROUPS.beam.length);
      expect(metrics.every(m => m.group === 'beam')).toBe(true);
    });

    it('should return metrics for complexity group', () => {
      const metrics = getMetricsForGroup('complexity');
      
      expect(metrics.length).toBe(METRIC_GROUPS.complexity.length);
      expect(metrics.every(m => m.group === 'complexity')).toBe(true);
    });
  });

  describe('extractMetricValue', () => {
    it('should extract standard metrics', () => {
      const plan = createMockCohortPlan({ MCS: 0.75 });
      
      expect(extractMetricValue(plan, 'MCS')).toBe(0.75);
    });

    it('should compute beamCount from beams array', () => {
      const plan = createMockCohortPlan({}, 3);
      
      expect(extractMetricValue(plan, 'beamCount')).toBe(3);
    });

    it('should compute controlPointCount from beams', () => {
      const plan = createMockCohortPlan({}, 2);
      // Each beam has 50 CPs
      expect(extractMetricValue(plan, 'controlPointCount')).toBe(100);
    });

    it('should return undefined for non-existent metrics', () => {
      const plan = createMockCohortPlan({});
      
      expect(extractMetricValue(plan, 'nonExistentMetric')).toBeUndefined();
    });

    it('should handle missing metrics gracefully', () => {
      const plan = createMockCohortPlan({});
      plan.metrics = {} as PlanMetrics;
      
      expect(extractMetricValue(plan, 'MCS')).toBeUndefined();
    });
  });

  describe('extractMetricValues', () => {
    it('should extract values from multiple plans', () => {
      const plans = [
        createMockCohortPlan({ MCS: 0.3 }),
        createMockCohortPlan({ MCS: 0.5 }),
        createMockCohortPlan({ MCS: 0.7 }),
      ];

      const values = extractMetricValues(plans, 'MCS');
      
      expect(values).toEqual([0.3, 0.5, 0.7]);
    });

    it('should filter out NaN and undefined values', () => {
      const plans = [
        createMockCohortPlan({ MCS: 0.3 }),
        createMockCohortPlan({ MCS: NaN }),
        createMockCohortPlan({}),
      ];
      plans[2].metrics = {} as PlanMetrics;

      const values = extractMetricValues(plans, 'MCS');
      
      expect(values).toEqual([0.3]);
    });

    it('should extract computed metrics', () => {
      const plans = [
        createMockCohortPlan({}, 2),
        createMockCohortPlan({}, 3),
        createMockCohortPlan({}, 4),
      ];

      const values = extractMetricValues(plans, 'beamCount');
      
      expect(values).toEqual([2, 3, 4]);
    });
  });

  describe('getMetricInfo', () => {
    it('should return info for known metrics', () => {
      const info = getMetricInfo('MCS');
      
      expect(info).toBeDefined();
      expect(info?.key).toBe('MCS');
      expect(info?.name).toBe('Modulation Complexity Score');
    });

    it('should return undefined for unknown metrics', () => {
      expect(getMetricInfo('unknownMetric')).toBeUndefined();
    });
  });

  describe('formatMetricValue', () => {
    it('should format values according to metric definition', () => {
      // MCS has 3 decimals
      expect(formatMetricValue(0.12345, 'MCS')).toBe('0.123');
      
      // totalMU has 0 decimals
      expect(formatMetricValue(1234.5, 'totalMU')).toBe('1235');
    });

    it('should handle percentage formatting for psmall', () => {
      const formatted = formatMetricValue(0.25, 'psmall');
      expect(formatted).toBe('25.0%');
    });

    it('should return N/A for undefined or NaN', () => {
      expect(formatMetricValue(undefined, 'MCS')).toBe('N/A');
      expect(formatMetricValue(NaN, 'MCS')).toBe('N/A');
    });

    it('should use 2 decimals as default for unknown metrics', () => {
      expect(formatMetricValue(1.2345, 'unknownMetric')).toBe('1.23');
    });
  });

  describe('METRIC_COLORS', () => {
    it('should have colors for main metrics', () => {
      const mainMetrics = ['MCS', 'LSV', 'AAV', 'MFA', 'LT', 'totalMU'];
      
      for (const metric of mainMetrics) {
        expect(METRIC_COLORS[metric]).toBeDefined();
        expect(METRIC_COLORS[metric]).toMatch(/hsl\(/);
      }
    });
  });

  describe('getMetricColor', () => {
    it('should return color for known metrics', () => {
      const color = getMetricColor('MCS');
      expect(color).toMatch(/hsl\(/);
    });

    it('should return default color for unknown metrics', () => {
      const color = getMetricColor('unknownMetric');
      expect(color).toBe('hsl(var(--chart-1))');
    });
  });
});
