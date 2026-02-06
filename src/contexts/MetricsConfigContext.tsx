import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { getAllMetricKeys } from '@/lib/metrics-definitions';

const STORAGE_KEY = 'rtplan-metrics-config';

interface MetricsConfig {
  enabledMetrics: Set<string>;
  toggleMetric: (key: string) => void;
  setAllMetrics: (enabled: boolean) => void;
  isMetricEnabled: (key: string) => boolean;
  getEnabledMetricKeys: () => string[];
}

const MetricsConfigContext = createContext<MetricsConfig | null>(null);

function loadFromStorage(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch {
    // Ignore storage errors
  }
  // Default: all metrics enabled
  return new Set(getAllMetricKeys());
}

function saveToStorage(enabledMetrics: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...enabledMetrics]));
  } catch {
    // Ignore storage errors
  }
}

export function MetricsConfigProvider({ children }: { children: ReactNode }) {
  const [enabledMetrics, setEnabledMetrics] = useState<Set<string>>(() => loadFromStorage());

  useEffect(() => {
    saveToStorage(enabledMetrics);
  }, [enabledMetrics]);

  const toggleMetric = useCallback((key: string) => {
    setEnabledMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const setAllMetrics = useCallback((enabled: boolean) => {
    if (enabled) {
      setEnabledMetrics(new Set(getAllMetricKeys()));
    } else {
      setEnabledMetrics(new Set());
    }
  }, []);

  const isMetricEnabled = useCallback(
    (key: string) => enabledMetrics.has(key),
    [enabledMetrics]
  );

  const getEnabledMetricKeys = useCallback(
    () => [...enabledMetrics],
    [enabledMetrics]
  );

  return (
    <MetricsConfigContext.Provider
      value={{
        enabledMetrics,
        toggleMetric,
        setAllMetrics,
        isMetricEnabled,
        getEnabledMetricKeys,
      }}
    >
      {children}
    </MetricsConfigContext.Provider>
  );
}

export function useMetricsConfig(): MetricsConfig {
  const context = useContext(MetricsConfigContext);
  if (!context) {
    throw new Error('useMetricsConfig must be used within MetricsConfigProvider');
  }
  return context;
}
