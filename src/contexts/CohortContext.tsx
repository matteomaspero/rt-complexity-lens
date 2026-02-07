import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { parseRTPlan, calculatePlanMetrics } from '@/lib/dicom';
import type { RTPlan, PlanMetrics } from '@/lib/dicom/types';
import { 
  generateClusters,
  generateMultiDimensionalClusters,
  calculateExtendedStatistics,
  calculateCorrelationMatrix,
  extractMetricValues,
  METRIC_GROUPS,
  type ClusterDimension,
  type ClusterGroup,
  type ClusterMode,
  type ExtendedStatistics,
  type CorrelationMatrix,
} from '@/lib/cohort';

export interface CohortPlan {
  id: string;
  fileName: string;
  uploadTime: Date;
  plan: RTPlan;
  metrics: PlanMetrics;
  status: 'pending' | 'parsing' | 'success' | 'error';
  error?: string;
}

interface CohortProgress {
  current: number;
  total: number;
}

// Extended stats for all metrics
export interface MetricExtendedStats {
  // Geometric
  MFA: ExtendedStatistics;
  EFS: ExtendedStatistics;
  PA: ExtendedStatistics;
  JA: ExtendedStatistics;
  psmall: ExtendedStatistics;
  
  // Beam
  totalMU: ExtendedStatistics;
  deliveryTime: ExtendedStatistics;
  GT: ExtendedStatistics;
  MUCA: ExtendedStatistics;
  beamCount: ExtendedStatistics;
  controlPointCount: ExtendedStatistics;
  
  // Complexity
  MCS: ExtendedStatistics;
  LSV: ExtendedStatistics;
  AAV: ExtendedStatistics;
  LT: ExtendedStatistics;
  LTMCS: ExtendedStatistics;
  SAS5: ExtendedStatistics;
  SAS10: ExtendedStatistics;
  EM: ExtendedStatistics;
  PI: ExtendedStatistics;
  LG: ExtendedStatistics;
  MAD: ExtendedStatistics;
  TG: ExtendedStatistics;
  PM: ExtendedStatistics;
}

interface CohortContextType {
  // Plans data
  plans: CohortPlan[];
  successfulPlans: CohortPlan[];
  addPlans: (files: File[]) => Promise<void>;
  removePlan: (id: string) => void;
  clearAll: () => void;
  isProcessing: boolean;
  progress: CohortProgress;
  
  // Clustering
  clusterMode: ClusterMode;
  setClusterMode: (mode: ClusterMode) => void;
  primaryDimension: ClusterDimension;
  setPrimaryDimension: (dim: ClusterDimension) => void;
  secondaryDimension: ClusterDimension;
  setSecondaryDimension: (dim: ClusterDimension) => void;
  clusters: ClusterGroup[];
  
  // Statistics
  extendedStats: MetricExtendedStats | null;
  correlationMatrix: CorrelationMatrix | null;
  
  // Per-cluster statistics
  clusterStats: Map<string, MetricExtendedStats>;
}

const CohortContext = createContext<CohortContextType | undefined>(undefined);

function calculateMetricStats(plans: CohortPlan[]): MetricExtendedStats {
  const extract = (key: string): number[] => extractMetricValues(plans, key);

  return {
    // Geometric
    MFA: calculateExtendedStatistics(extract('MFA')),
    EFS: calculateExtendedStatistics(extract('EFS')),
    PA: calculateExtendedStatistics(extract('PA')),
    JA: calculateExtendedStatistics(extract('JA')),
    psmall: calculateExtendedStatistics(extract('psmall')),
    
    // Beam
    totalMU: calculateExtendedStatistics(extract('totalMU')),
    deliveryTime: calculateExtendedStatistics(extract('totalDeliveryTime')),
    GT: calculateExtendedStatistics(extract('GT')),
    MUCA: calculateExtendedStatistics(extract('MUCA')),
    beamCount: calculateExtendedStatistics(extract('beamCount')),
    controlPointCount: calculateExtendedStatistics(extract('controlPointCount')),
    
    // Complexity
    MCS: calculateExtendedStatistics(extract('MCS')),
    LSV: calculateExtendedStatistics(extract('LSV')),
    AAV: calculateExtendedStatistics(extract('AAV')),
    LT: calculateExtendedStatistics(extract('LT')),
    LTMCS: calculateExtendedStatistics(extract('LTMCS')),
    SAS5: calculateExtendedStatistics(extract('SAS5')),
    SAS10: calculateExtendedStatistics(extract('SAS10')),
    EM: calculateExtendedStatistics(extract('EM')),
    PI: calculateExtendedStatistics(extract('PI')),
    LG: calculateExtendedStatistics(extract('LG')),
    MAD: calculateExtendedStatistics(extract('MAD')),
    TG: calculateExtendedStatistics(extract('TG')),
    PM: calculateExtendedStatistics(extract('PM')),
  };
}

export function CohortProvider({ children }: { children: React.ReactNode }) {
  const [plans, setPlans] = useState<CohortPlan[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<CohortProgress>({ current: 0, total: 0 });
  const [clusterMode, setClusterMode] = useState<ClusterMode>('single');
  const [primaryDimension, setPrimaryDimension] = useState<ClusterDimension>('technique');
  const [secondaryDimension, setSecondaryDimension] = useState<ClusterDimension>('complexity');

  // Get only successful plans
  const successfulPlans = useMemo(() => 
    plans.filter(p => p.status === 'success'),
    [plans]
  );

  // Generate clusters based on mode and dimensions
  const clusters = useMemo(() => {
    if (successfulPlans.length === 0) return [];
    
    // Convert CohortPlan to BatchPlan-like structure for clustering
    const batchLikePlans = successfulPlans.map(p => ({
      ...p,
      selected: false,
    }));
    
    if (clusterMode === 'combined') {
      return generateMultiDimensionalClusters(batchLikePlans, primaryDimension, secondaryDimension);
    }
    
    return generateClusters(batchLikePlans, primaryDimension);
  }, [successfulPlans, clusterMode, primaryDimension, secondaryDimension]);

  // Calculate extended statistics for all plans
  const extendedStats = useMemo(() => {
    if (successfulPlans.length === 0) return null;
    return calculateMetricStats(successfulPlans);
  }, [successfulPlans]);

  // Calculate correlation matrix
  const correlationMatrix = useMemo(() => {
    if (successfulPlans.length < 2) return null;
    return calculateCorrelationMatrix(successfulPlans.map(p => p.metrics));
  }, [successfulPlans]);

  // Calculate per-cluster statistics
  const clusterStats = useMemo(() => {
    const stats = new Map<string, MetricExtendedStats>();
    
    for (const cluster of clusters) {
      const clusterPlans = successfulPlans.filter(p => 
        cluster.planIds.includes(p.id)
      );
      if (clusterPlans.length > 0) {
        stats.set(cluster.id, calculateMetricStats(clusterPlans));
      }
    }
    
    return stats;
  }, [clusters, successfulPlans]);

  const addPlans = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: files.length });

    // Create pending entries for all files
    const pendingPlans: CohortPlan[] = files.map(file => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      uploadTime: new Date(),
      plan: {} as RTPlan,
      metrics: {} as PlanMetrics,
      status: 'pending' as const,
    }));

    setPlans(prev => [...prev, ...pendingPlans]);

    // Process files sequentially
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const planId = pendingPlans[i].id;

      // Update status to parsing
      setPlans(prev => prev.map(p => 
        p.id === planId ? { ...p, status: 'parsing' as const } : p
      ));

      try {
        const arrayBuffer = await file.arrayBuffer();
        const plan = parseRTPlan(arrayBuffer, file.name);
        const metrics = calculatePlanMetrics(plan);

        setPlans(prev => prev.map(p => 
          p.id === planId 
            ? { ...p, plan, metrics, status: 'success' as const }
            : p
        ));
      } catch (err) {
        setPlans(prev => prev.map(p => 
          p.id === planId 
            ? { 
                ...p, 
                status: 'error' as const, 
                error: err instanceof Error ? err.message : 'Parse failed'
              }
            : p
        ));
      }

      setProgress({ current: i + 1, total: files.length });
    }

    setIsProcessing(false);
  }, []);

  const removePlan = useCallback((id: string) => {
    setPlans(prev => prev.filter(p => p.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setPlans([]);
    setProgress({ current: 0, total: 0 });
  }, []);

  return (
    <CohortContext.Provider value={{
      plans,
      successfulPlans,
      addPlans,
      removePlan,
      clearAll,
      isProcessing,
      progress,
      clusterMode,
      setClusterMode,
      primaryDimension,
      setPrimaryDimension,
      secondaryDimension,
      setSecondaryDimension,
      clusters,
      extendedStats,
      correlationMatrix,
      clusterStats,
    }}>
      {children}
    </CohortContext.Provider>
  );
}

export function useCohort() {
  const context = useContext(CohortContext);
  if (!context) {
    throw new Error('useCohort must be used within a CohortProvider');
  }
  return context;
}
