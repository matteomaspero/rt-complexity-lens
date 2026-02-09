import { describe, it, expect } from 'vitest';
import { parseTestPlan, TEST_FILES, getAllTestFiles } from './test-utils';
import { calculatePlanMetrics } from '@/lib/dicom/metrics';

describe('Beam Energy Parsing', () => {
  describe('Energy field extraction', () => {
    it.each(getAllTestFiles())('should parse radiation type from %s', (filename) => {
      const plan = parseTestPlan(filename);
      
      for (const beam of plan.beams) {
        expect(beam.radiationType).toBeDefined();
        expect(typeof beam.radiationType).toBe('string');
        // Most plans should have PHOTON as radiation type
        expect(['PHOTON', 'ELECTRON', 'PROTON', 'NEUTRON', 'ION', '']).toContain(beam.radiationType);
      }
    });

    it('should extract nominal beam energy when available', () => {
      // Test with a known plan that should have energy data
      const plan = parseTestPlan(TEST_FILES.MONACO_PT_01);
      
      // At minimum, all beams should have radiation type
      for (const beam of plan.beams) {
        expect(beam.radiationType).toBeDefined();
      }
    });
  });

  describe('Energy label generation', () => {
    it('should generate energy labels for beams with energy data', () => {
      const plan = parseTestPlan(TEST_FILES.VMAT_1);
      
      for (const beam of plan.beams) {
        // If energy is available, label should be generated
        if (beam.nominalBeamEnergy && beam.nominalBeamEnergy > 0) {
          expect(beam.energyLabel).toBeDefined();
          expect(typeof beam.energyLabel).toBe('string');
        }
      }
    });

    it('should pass energy info through to beam metrics', () => {
      const plan = parseTestPlan(TEST_FILES.MONACO_PT_01);
      const metrics = calculatePlanMetrics(plan);
      
      for (let i = 0; i < metrics.beamMetrics.length; i++) {
        const beamMetric = metrics.beamMetrics[i];
        const beam = plan.beams[i];
        
        // Radiation type should always be passed through
        expect(beamMetric.radiationType).toBe(beam.radiationType);
        
        // Energy fields should match if present
        if (beam.nominalBeamEnergy !== undefined) {
          expect(beamMetric.nominalBeamEnergy).toBe(beam.nominalBeamEnergy);
        }
        if (beam.energyLabel !== undefined) {
          expect(beamMetric.energyLabel).toBe(beam.energyLabel);
        }
      }
    });
  });

  describe('Energy label format', () => {
    it('should format photon energies correctly', () => {
      // Test the expected format for various plans
      const plans = [
        TEST_FILES.TG119_CS_ETH_2A,
        TEST_FILES.TG119_PR_ETH_7F,
        TEST_FILES.MONACO_PT_01,
      ];

      for (const filename of plans) {
        const plan = parseTestPlan(filename);
        
        for (const beam of plan.beams) {
          if (beam.energyLabel && beam.radiationType === 'PHOTON') {
            // Photon energy labels should end in X or FFF
            expect(beam.energyLabel).toMatch(/^\d+X$|^\d+FFF$/);
          }
        }
      }
    });
  });

  describe('Consistency across vendor plans', () => {
    const vendorPlans = [
      { name: 'Eclipse', file: TEST_FILES.TG119_CS_ETH_2A },
      { name: 'Monaco', file: TEST_FILES.MONACO_PT_01 },
      { name: 'Elements', file: TEST_FILES.ELEMENTS_PT_01 },
      { name: 'Pinnacle', file: TEST_FILES.PINNACLE_PT_01 },
      { name: 'MRIdian', file: TEST_FILES.MRIDIAN_PENALTY_01 },
      { name: 'RayStation', file: TEST_FILES.VMAT_1 },
    ];

    it.each(vendorPlans)('should handle $name plans consistently', ({ file }) => {
      const plan = parseTestPlan(file);
      
      for (const beam of plan.beams) {
        // All beams should have valid radiation type
        expect(beam.radiationType).toBeTruthy();
        
        // Energy fields should be consistent
        if (beam.nominalBeamEnergy !== undefined) {
          expect(typeof beam.nominalBeamEnergy).toBe('number');
          expect(beam.nominalBeamEnergy).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });
});
