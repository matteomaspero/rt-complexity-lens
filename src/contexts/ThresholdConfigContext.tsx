import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  type MachinePreset,
  type ThresholdSet,
  type ThresholdStatus,
  type ThresholdDefinition,
  MACHINE_PRESETS,
  getThresholdStatus as calculateThresholdStatus,
  getDefaultCustomThresholds,
} from '@/lib/threshold-definitions';

interface ThresholdConfigState {
  enabled: boolean;
  selectedPreset: MachinePreset;
  customThresholds: ThresholdSet;
}

interface ThresholdConfigContextType {
  enabled: boolean;
  selectedPreset: MachinePreset;
  customThresholds: ThresholdSet;
  setEnabled: (enabled: boolean) => void;
  setPreset: (preset: MachinePreset) => void;
  updateCustomThreshold: (metricKey: string, values: Partial<ThresholdDefinition>) => void;
  getThresholdStatus: (metricKey: string, value: number) => ThresholdStatus;
  getCurrentThresholds: () => ThresholdSet;
  getPresetName: () => string;
}

const STORAGE_KEY = 'rtplan-threshold-config';

const defaultState: ThresholdConfigState = {
  enabled: false,
  selectedPreset: 'generic',
  customThresholds: getDefaultCustomThresholds(),
};

function loadFromStorage(): ThresholdConfigState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        enabled: parsed.enabled ?? defaultState.enabled,
        selectedPreset: parsed.selectedPreset ?? defaultState.selectedPreset,
        customThresholds: parsed.customThresholds ?? getDefaultCustomThresholds(),
      };
    }
  } catch (e) {
    console.warn('Failed to load threshold config from localStorage:', e);
  }
  return defaultState;
}

function saveToStorage(state: ThresholdConfigState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save threshold config to localStorage:', e);
  }
}

const ThresholdConfigContext = createContext<ThresholdConfigContextType | undefined>(undefined);

export function ThresholdConfigProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThresholdConfigState>(loadFromStorage);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const setEnabled = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, enabled }));
  }, []);

  const setPreset = useCallback((selectedPreset: MachinePreset) => {
    setState((prev) => ({ ...prev, selectedPreset }));
  }, []);

  const updateCustomThreshold = useCallback(
    (metricKey: string, values: Partial<ThresholdDefinition>) => {
      setState((prev) => ({
        ...prev,
        customThresholds: {
          ...prev.customThresholds,
          [metricKey]: {
            ...prev.customThresholds[metricKey],
            ...values,
          },
        },
      }));
    },
    []
  );

  const getCurrentThresholds = useCallback((): ThresholdSet => {
    if (state.selectedPreset === 'custom') {
      return state.customThresholds;
    }
    return MACHINE_PRESETS[state.selectedPreset].thresholds;
  }, [state.selectedPreset, state.customThresholds]);

  const getThresholdStatus = useCallback(
    (metricKey: string, value: number): ThresholdStatus => {
      if (!state.enabled) return 'normal';
      
      const thresholds = getCurrentThresholds();
      const threshold = thresholds[metricKey];
      return calculateThresholdStatus(value, threshold);
    },
    [state.enabled, getCurrentThresholds]
  );

  const getPresetName = useCallback((): string => {
    return MACHINE_PRESETS[state.selectedPreset].name;
  }, [state.selectedPreset]);

  const value: ThresholdConfigContextType = {
    enabled: state.enabled,
    selectedPreset: state.selectedPreset,
    customThresholds: state.customThresholds,
    setEnabled,
    setPreset,
    updateCustomThreshold,
    getThresholdStatus,
    getCurrentThresholds,
    getPresetName,
  };

  return (
    <ThresholdConfigContext.Provider value={value}>
      {children}
    </ThresholdConfigContext.Provider>
  );
}

export function useThresholdConfig(): ThresholdConfigContextType {
  const context = useContext(ThresholdConfigContext);
  if (!context) {
    throw new Error('useThresholdConfig must be used within a ThresholdConfigProvider');
  }
  return context;
}
