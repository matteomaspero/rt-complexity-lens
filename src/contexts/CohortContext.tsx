import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { parseRTPlan, calculatePlanMetrics } from '@/lib/dicom';
import type { RTPlan, PlanMetrics } from '@/lib/dicom/types';
import { 
  generateClusters, 
  calculateExtendedStatistics,
  calculateCorrelationMatrix,
  type ClusterDimension,
  type ClusterGroup,
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

export interface MetricExtendedStats {
  MCS: ExtendedStatistics;
  LSV: ExtendedStatistics;
  AAV: ExtendedStatistics;
  MFA: ExtendedStatistics;
  LT: ExtendedStatistics;
  totalMU: ExtendedStatistics;
  deliveryTime: ExtendedStatistics;
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
  primaryDimension: ClusterDimension;
  setPrimaryDimension: (dim: ClusterDimension) => void;
  clusters: ClusterGroup[];
  
  // Statistics
  extendedStats: MetricExtendedStats | null;
  correlationMatrix: CorrelationMatrix | null;
  
  // Per-cluster statistics
  clusterStats: Map<string, MetricExtendedStats>;
}

const CohortContext = createContext<CohortContextType | undefined>(undefined);

function calculateMetricStats(plans: CohortPlan[]): MetricExtendedStats {
  const metrics = plans.map(p => p.metrics);
  
  const extractValues = (key: keyof PlanMetrics): number[] => {
    return metrics
      .map(m => m[key])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));
  };

  return {
    MCS: calculateExtendedStatistics(extractValues('MCS')),
    LSV: calculateExtendedStatistics(extractValues('LSV')),
    AAV: calculateExtendedStatistics(extractValues('AAV')),
    MFA: calculateExtendedStatistics(extractValues('MFA')),
    LT: calculateExtendedStatistics(extractValues('LT')),
    totalMU: calculateExtendedStatistics(extractValues('totalMU')),
    deliveryTime: calculateExtendedStatistics(
      metrics
        .map(m => m.totalDeliveryTime)
        .filter((v): v is number => typeof v === 'number' && !isNaN(v))
    ),
  };
}

export function CohortProvider({ children }: { children: React.ReactNode }) {
  const [plans, setPlans] = useState<CohortPlan[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<CohortProgress>({ current: 0, total: 0 });
  const [primaryDimension, setPrimaryDimension] = useState<ClusterDimension>('technique');

  // Get only successful plans
  const successfulPlans = useMemo(() => 
    plans.filter(p => p.status === 'success'),
    [plans]
  );

  // Generate clusters based on primary dimension
  const clusters = useMemo(() => {
    if (successfulPlans.length === 0) return [];
    // Convert CohortPlan to BatchPlan-like structure for clustering
    const batchLikePlans = successfulPlans.map(p => ({
      ...p,
      selected: false,
    }));
    return generateClusters(batchLikePlans, primaryDimension);
  }, [successfulPlans, primaryDimension]);

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
      primaryDimension,
      setPrimaryDimension,
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
