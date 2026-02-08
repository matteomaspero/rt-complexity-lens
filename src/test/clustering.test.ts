import { describe, it, expect } from 'vitest';
import { 
  assignCluster,
  generateClusters,
  generateMultiDimensionalClusters,
  getClusterPlans,
  getClusterPercentages,
  getParentClusters,
  CLUSTER_DIMENSIONS,
} from '@/lib/cohort/clustering';
import type { BatchPlan } from '@/contexts/BatchContext';
import type { RTPlan, PlanMetrics, Beam } from '@/lib/dicom/types';

// Helper to create mock batch plan
function createMockPlan(overrides: {
  id?: string;
  technique?: string;
  beamCount?: number;
  controlPoints?: number;
  deliveryTime?: number;
  mcs?: number;
  totalMU?: number;
  machineName?: string;
}): BatchPlan {
  const beams: Beam[] = Array.from({ length: overrides.beamCount || 1 }, (_, i) => ({
    beamNumber: i + 1,
    beamName: `Beam ${i + 1}`,
    beamType: 'DYNAMIC' as const,
    radiationType: 'PHOTON',
    treatmentDeliveryType: 'TREATMENT' as const,
    treatmentMachineName: overrides.machineName || 'Linac1',
    gantryAngle: 0,
    gantryAngleStart: 0,
    gantryAngleEnd: 180,
    collimatorAngle: 0,
    couchAngle: 0,
    numberOfControlPoints: overrides.controlPoints || 50,
    controlPoints: [],
    mlcLeafPositions: [],
    mlcLeafWidths: [],
    numberOfLeaves: 60,
    isArc: true,
    beamMetersetUnits: 'MU',
    finalCumulativeMetersetWeight: 1,
  }));

  return {
    id: overrides.id || 'plan-1',
    fileName: 'test.dcm',
    uploadTime: new Date(),
    status: 'success',
    plan: {
      patientId: 'PT001',
      patientName: 'Test Patient',
      planLabel: 'Test Plan',
      planName: 'Test Plan',
      rtPlanGeometry: 'PATIENT',
      technique: (overrides.technique as RTPlan['technique']) || 'VMAT',
      beams,
      fractionGroups: [],
      totalMU: overrides.totalMU ?? 800,
      treatmentMachineName: overrides.machineName || 'Linac1',
      parseDate: new Date(),
      fileSize: 1000,
      sopInstanceUID: '1.2.3.4.5',
    } as RTPlan,
    metrics: {
      planLabel: 'Test Plan',
      MCS: overrides.mcs ?? 0.5,
      LSV: 0.6,
      AAV: 0.7,
      MFA: 25,
      LT: 500,
      LTMCS: 250,
      totalMU: overrides.totalMU ?? 800,
      totalDeliveryTime: overrides.deliveryTime ?? 180,
      beamMetrics: [],
      calculationDate: new Date(),
    } as PlanMetrics,
  };
}

describe('Clustering Logic', () => {
  describe('CLUSTER_DIMENSIONS', () => {
    it('should have all expected dimensions', () => {
      const dimensionIds = CLUSTER_DIMENSIONS.map(d => d.id);
      
      expect(dimensionIds).toContain('technique');
      expect(dimensionIds).toContain('beamCount');
      expect(dimensionIds).toContain('controlPoints');
      expect(dimensionIds).toContain('deliveryTime');
      expect(dimensionIds).toContain('complexity');
      expect(dimensionIds).toContain('totalMU');
      expect(dimensionIds).toContain('machine');
    });

    it('should have name and description for each dimension', () => {
      for (const dim of CLUSTER_DIMENSIONS) {
        expect(dim.name).toBeTruthy();
        expect(dim.description).toBeTruthy();
      }
    });
  });

  describe('assignCluster', () => {
    describe('technique dimension', () => {
      it('should cluster by technique', () => {
        const vmatPlan = createMockPlan({ technique: 'VMAT' });
        const imrtPlan = createMockPlan({ technique: 'IMRT' });

        expect(assignCluster(vmatPlan, 'technique')).toBe('VMAT');
        expect(assignCluster(imrtPlan, 'technique')).toBe('IMRT');
      });

      it('should return UNKNOWN for missing technique', () => {
        const plan = createMockPlan({ technique: undefined });
        plan.plan.technique = undefined;
        expect(assignCluster(plan, 'technique')).toBe('UNKNOWN');
      });
    });

    describe('beamCount dimension', () => {
      it('should cluster single beam', () => {
        const plan = createMockPlan({ beamCount: 1 });
        expect(assignCluster(plan, 'beamCount')).toBe('1 beam');
      });

      it('should cluster 2 beams', () => {
        const plan = createMockPlan({ beamCount: 2 });
        expect(assignCluster(plan, 'beamCount')).toBe('2 beams');
      });

      it('should cluster 3-4 beams', () => {
        expect(assignCluster(createMockPlan({ beamCount: 3 }), 'beamCount')).toBe('3-4 beams');
        expect(assignCluster(createMockPlan({ beamCount: 4 }), 'beamCount')).toBe('3-4 beams');
      });

      it('should cluster 5+ beams', () => {
        expect(assignCluster(createMockPlan({ beamCount: 5 }), 'beamCount')).toBe('5+ beams');
        expect(assignCluster(createMockPlan({ beamCount: 10 }), 'beamCount')).toBe('5+ beams');
      });
    });

    describe('controlPoints dimension', () => {
      it('should cluster low CPs (<50)', () => {
        const plan = createMockPlan({ controlPoints: 30 });
        expect(assignCluster(plan, 'controlPoints')).toBe('Low (<50 CPs)');
      });

      it('should cluster medium CPs (50-100)', () => {
        const plan = createMockPlan({ controlPoints: 75 });
        expect(assignCluster(plan, 'controlPoints')).toBe('Medium (50-100 CPs)');
      });

      it('should cluster high CPs (>100)', () => {
        const plan = createMockPlan({ controlPoints: 150 });
        expect(assignCluster(plan, 'controlPoints')).toBe('High (>100 CPs)');
      });
    });

    describe('deliveryTime dimension', () => {
      it('should cluster short delivery (<3 min)', () => {
        const plan = createMockPlan({ deliveryTime: 120 }); // 2 min
        expect(assignCluster(plan, 'deliveryTime')).toBe('Short (<3 min)');
      });

      it('should cluster medium delivery (3-6 min)', () => {
        const plan = createMockPlan({ deliveryTime: 300 }); // 5 min
        expect(assignCluster(plan, 'deliveryTime')).toBe('Medium (3-6 min)');
      });

      it('should cluster long delivery (>6 min)', () => {
        const plan = createMockPlan({ deliveryTime: 480 }); // 8 min
        expect(assignCluster(plan, 'deliveryTime')).toBe('Long (>6 min)');
      });
    });

    describe('complexity dimension', () => {
      it('should cluster low complexity (MCS > 0.4)', () => {
        const plan = createMockPlan({ mcs: 0.5 });
        expect(assignCluster(plan, 'complexity')).toBe('Low (MCS > 0.4)');
      });

      it('should cluster medium complexity (0.2 < MCS ≤ 0.4)', () => {
        const plan = createMockPlan({ mcs: 0.3 });
        expect(assignCluster(plan, 'complexity')).toBe('Medium (0.2 < MCS ≤ 0.4)');
      });

      it('should cluster high complexity (MCS ≤ 0.2)', () => {
        const plan = createMockPlan({ mcs: 0.15 });
        expect(assignCluster(plan, 'complexity')).toBe('High (MCS ≤ 0.2)');
      });
    });

    describe('totalMU dimension', () => {
      it('should cluster low MU (<500)', () => {
        const plan = createMockPlan({ totalMU: 300 });
        expect(assignCluster(plan, 'totalMU')).toBe('Low (<500 MU)');
      });

      it('should cluster medium MU (500-1000)', () => {
        const plan = createMockPlan({ totalMU: 750 });
        expect(assignCluster(plan, 'totalMU')).toBe('Medium (500-1000 MU)');
      });

      it('should cluster high MU (>1000)', () => {
        const plan = createMockPlan({ totalMU: 1500 });
        expect(assignCluster(plan, 'totalMU')).toBe('High (>1000 MU)');
      });
    });

    describe('machine dimension', () => {
      it('should cluster by machine name', () => {
        const plan = createMockPlan({ machineName: 'TrueBeam' });
        expect(assignCluster(plan, 'machine')).toBe('TrueBeam');
      });
    });
  });

  describe('generateClusters', () => {
    it('should generate clusters from plans', () => {
      const plans = [
        createMockPlan({ id: '1', technique: 'VMAT' }),
        createMockPlan({ id: '2', technique: 'VMAT' }),
        createMockPlan({ id: '3', technique: 'IMRT' }),
      ];

      const clusters = generateClusters(plans, 'technique');

      expect(clusters.length).toBe(2);
      
      const vmatCluster = clusters.find(c => c.name === 'VMAT');
      const imrtCluster = clusters.find(c => c.name === 'IMRT');
      
      expect(vmatCluster?.planIds).toHaveLength(2);
      expect(imrtCluster?.planIds).toHaveLength(1);
    });

    it('should skip non-successful plans', () => {
      const plans: BatchPlan[] = [
        createMockPlan({ id: '1', technique: 'VMAT' }),
        { ...createMockPlan({ id: '2', technique: 'VMAT' }), status: 'error' },
      ];

      const clusters = generateClusters(plans, 'technique');
      
      expect(clusters[0].planIds).toHaveLength(1);
    });

    it('should assign colors to clusters', () => {
      const plans = [
        createMockPlan({ id: '1', technique: 'VMAT' }),
        createMockPlan({ id: '2', technique: 'IMRT' }),
      ];

      const clusters = generateClusters(plans, 'technique');
      
      for (const cluster of clusters) {
        expect(cluster.color).toMatch(/hsl\(/);
      }
    });

    it('should include dimension info in clusters', () => {
      const plans = [createMockPlan({ technique: 'VMAT' })];
      const clusters = generateClusters(plans, 'technique');
      
      expect(clusters[0].dimensions?.technique).toBe('VMAT');
    });
  });

  describe('generateMultiDimensionalClusters', () => {
    it('should create compound clusters', () => {
      const plans = [
        createMockPlan({ id: '1', technique: 'VMAT', mcs: 0.5 }),
        createMockPlan({ id: '2', technique: 'VMAT', mcs: 0.15 }),
        createMockPlan({ id: '3', technique: 'IMRT', mcs: 0.5 }),
      ];

      const clusters = generateMultiDimensionalClusters(plans, 'technique', 'complexity');

      // Should have unique combinations
      expect(clusters.length).toBe(3);
      
      // Check compound names
      const clusterNames = clusters.map(c => c.name);
      expect(clusterNames.some(n => n.includes('VMAT') && n.includes('Low'))).toBe(true);
      expect(clusterNames.some(n => n.includes('VMAT') && n.includes('High'))).toBe(true);
      expect(clusterNames.some(n => n.includes('IMRT') && n.includes('Low'))).toBe(true);
    });

    it('should set parent cluster', () => {
      const plans = [
        createMockPlan({ technique: 'VMAT', mcs: 0.5 }),
        createMockPlan({ technique: 'VMAT', mcs: 0.15 }),
      ];

      const clusters = generateMultiDimensionalClusters(plans, 'technique', 'complexity');
      
      // All should have VMAT as parent
      for (const cluster of clusters) {
        expect(cluster.parentCluster).toBe('VMAT');
      }
    });
  });

  describe('getClusterPlans', () => {
    it('should return plans belonging to cluster', () => {
      const plans = [
        createMockPlan({ id: '1' }),
        createMockPlan({ id: '2' }),
        createMockPlan({ id: '3' }),
      ];

      const cluster = {
        id: 'test',
        name: 'Test',
        description: '',
        planIds: ['1', '3'],
        color: 'hsl(0, 0%, 50%)',
      };

      const clusterPlans = getClusterPlans(plans, cluster);
      
      expect(clusterPlans).toHaveLength(2);
      expect(clusterPlans.map(p => p.id)).toContain('1');
      expect(clusterPlans.map(p => p.id)).toContain('3');
      expect(clusterPlans.map(p => p.id)).not.toContain('2');
    });
  });

  describe('getClusterPercentages', () => {
    it('should calculate correct percentages', () => {
      const clusters = [
        { id: 'A', name: 'A', description: '', planIds: ['1', '2'], color: '' },
        { id: 'B', name: 'B', description: '', planIds: ['3', '4', '5'], color: '' },
      ];

      const percentages = getClusterPercentages(clusters, 5);
      
      expect(percentages.get('A')).toBe(40);
      expect(percentages.get('B')).toBe(60);
    });

    it('should handle zero total plans', () => {
      const clusters = [
        { id: 'A', name: 'A', description: '', planIds: [], color: '' },
      ];

      const percentages = getClusterPercentages(clusters, 0);
      
      expect(percentages.get('A')).toBe(0);
    });
  });

  describe('getParentClusters', () => {
    it('should return unique parent cluster names', () => {
      const clusters = [
        { id: '1', name: 'A + X', description: '', planIds: [], color: '', parentCluster: 'A' },
        { id: '2', name: 'A + Y', description: '', planIds: [], color: '', parentCluster: 'A' },
        { id: '3', name: 'B + X', description: '', planIds: [], color: '', parentCluster: 'B' },
      ];

      const parents = getParentClusters(clusters);
      
      expect(parents).toHaveLength(2);
      expect(parents).toContain('A');
      expect(parents).toContain('B');
    });

    it('should return sorted parents', () => {
      const clusters = [
        { id: '1', name: '', description: '', planIds: [], color: '', parentCluster: 'Z' },
        { id: '2', name: '', description: '', planIds: [], color: '', parentCluster: 'A' },
        { id: '3', name: '', description: '', planIds: [], color: '', parentCluster: 'M' },
      ];

      const parents = getParentClusters(clusters);
      
      expect(parents).toEqual(['A', 'M', 'Z']);
    });

    it('should handle clusters without parents', () => {
      const clusters = [
        { id: '1', name: 'A', description: '', planIds: [], color: '' },
      ];

      const parents = getParentClusters(clusters);
      
      expect(parents).toHaveLength(0);
    });
  });
});
