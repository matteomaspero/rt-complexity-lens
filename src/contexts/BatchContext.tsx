import React, { createContext, useContext, useState, useCallback } from 'react';
import { parseRTPlan, calculatePlanMetrics } from '@/lib/dicom';
import type { RTPlan, PlanMetrics } from '@/lib/dicom/types';

export interface BatchPlan {
  id: string;
  fileName: string;
  uploadTime: Date;
  plan: RTPlan;
  metrics: PlanMetrics;
  status: 'pending' | 'parsing' | 'success' | 'error';
  error?: string;
  selected?: boolean;
}

interface BatchProgress {
  current: number;
  total: number;
}

interface BatchContextType {
  plans: BatchPlan[];
  addPlans: (files: File[]) => Promise<void>;
  removePlan: (id: string) => void;
  clearAll: () => void;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  selectedPlans: BatchPlan[];
  isProcessing: boolean;
  progress: BatchProgress;
}

const BatchContext = createContext<BatchContextType | undefined>(undefined);

export function BatchProvider({ children }: { children: React.ReactNode }) {
  const [plans, setPlans] = useState<BatchPlan[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress>({ current: 0, total: 0 });

  const addPlans = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: files.length });

    // Create pending entries for all files
    const pendingPlans: BatchPlan[] = files.map(file => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      uploadTime: new Date(),
      plan: {} as RTPlan,
      metrics: {} as PlanMetrics,
      status: 'pending' as const,
      selected: false,
    }));

    setPlans(prev => [...prev, ...pendingPlans]);

    // Process files sequentially to avoid overwhelming the browser
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
        // Parse error - user sees error status in batch list
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

  const toggleSelection = useCallback((id: string) => {
    setPlans(prev => prev.map(p => 
      p.id === id ? { ...p, selected: !p.selected } : p
    ));
  }, []);

  const selectAll = useCallback(() => {
    setPlans(prev => prev.map(p => 
      p.status === 'success' ? { ...p, selected: true } : p
    ));
  }, []);

  const deselectAll = useCallback(() => {
    setPlans(prev => prev.map(p => ({ ...p, selected: false })));
  }, []);

  const selectedPlans = plans.filter(p => p.selected && p.status === 'success');

  return (
    <BatchContext.Provider value={{
      plans,
      addPlans,
      removePlan,
      clearAll,
      toggleSelection,
      selectAll,
      deselectAll,
      selectedPlans,
      isProcessing,
      progress,
    }}>
      {children}
    </BatchContext.Provider>
  );
}

export function useBatch() {
  const context = useContext(BatchContext);
  if (!context) {
    throw new Error('useBatch must be used within a BatchProvider');
  }
  return context;
}
