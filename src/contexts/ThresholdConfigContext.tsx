import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  type MachinePreset,
  type ThresholdSet,
  type ThresholdStatus,
  type ThresholdDefinition,
  type UserPreset,
  type MachineDeliveryParams,
  BUILTIN_PRESETS,
  getThresholdStatus as calculateThresholdStatus,
  getDefaultCustomThresholds,
  getDefaultDeliveryParams,
} from '@/lib/threshold-definitions';

interface ThresholdConfigState {
  enabled: boolean;
  selectedPreset: MachinePreset;
  customThresholds: ThresholdSet;
  customDeliveryParams: MachineDeliveryParams;
}

interface ThresholdConfigContextType {
  enabled: boolean;
  selectedPreset: MachinePreset;
  customThresholds: ThresholdSet;
  customDeliveryParams: MachineDeliveryParams;
  userPresets: UserPreset[];
  setEnabled: (enabled: boolean) => void;
  setPreset: (preset: MachinePreset) => void;
  updateCustomThreshold: (metricKey: string, values: Partial<ThresholdDefinition>) => void;
  updateCustomDeliveryParams: (values: Partial<MachineDeliveryParams>) => void;
  getThresholdStatus: (metricKey: string, value: number) => ThresholdStatus;
  getCurrentThresholds: () => ThresholdSet;
  getCurrentDeliveryParams: () => MachineDeliveryParams;
  getPresetName: () => string;
  // User preset management
  addUserPreset: (preset: UserPreset) => void;
  updateUserPreset: (id: string, preset: UserPreset) => void;
  deleteUserPreset: (id: string) => void;
}

const STORAGE_KEY = 'rtplan-threshold-config';
const USER_PRESETS_KEY = 'rtplan-user-presets';

const defaultState: ThresholdConfigState = {
  enabled: false,
  selectedPreset: 'generic',
  customThresholds: getDefaultCustomThresholds(),
  customDeliveryParams: getDefaultDeliveryParams(),
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
        customDeliveryParams: parsed.customDeliveryParams ?? getDefaultDeliveryParams(),
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

function loadUserPresets(): UserPreset[] {
  try {
    const stored = localStorage.getItem(USER_PRESETS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load user presets from localStorage:', e);
  }
  return [];
}

function saveUserPresets(presets: UserPreset[]): void {
  try {
    localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(presets));
  } catch (e) {
    console.warn('Failed to save user presets to localStorage:', e);
  }
}

const ThresholdConfigContext = createContext<ThresholdConfigContextType | undefined>(undefined);

export function ThresholdConfigProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThresholdConfigState>(loadFromStorage);
  const [userPresets, setUserPresets] = useState<UserPreset[]>(loadUserPresets);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  // Persist user presets
  useEffect(() => {
    saveUserPresets(userPresets);
  }, [userPresets]);

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

  const updateCustomDeliveryParams = useCallback(
    (values: Partial<MachineDeliveryParams>) => {
      setState((prev) => ({
        ...prev,
        customDeliveryParams: {
          ...prev.customDeliveryParams,
          ...values,
        },
      }));
    },
    []
  );

  const getCurrentThresholds = useCallback((): ThresholdSet => {
    // Check if it's a user preset
    const userPreset = userPresets.find(p => p.id === state.selectedPreset);
    if (userPreset) {
      return userPreset.thresholds;
    }
    
    // Check if it's a built-in preset
    if (state.selectedPreset in BUILTIN_PRESETS) {
      return BUILTIN_PRESETS[state.selectedPreset].thresholds;
    }
    
    // Fall back to custom thresholds
    return state.customThresholds;
  }, [state.selectedPreset, state.customThresholds, userPresets]);

  const getCurrentDeliveryParams = useCallback((): MachineDeliveryParams => {
    // Check if it's a user preset
    const userPreset = userPresets.find(p => p.id === state.selectedPreset);
    if (userPreset) {
      return userPreset.deliveryParams;
    }
    
    // Check if it's a built-in preset
    if (state.selectedPreset in BUILTIN_PRESETS) {
      return BUILTIN_PRESETS[state.selectedPreset].deliveryParams;
    }
    
    // Fall back to custom delivery params
    return state.customDeliveryParams;
  }, [state.selectedPreset, state.customDeliveryParams, userPresets]);

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
    // Check if it's a user preset
    const userPreset = userPresets.find(p => p.id === state.selectedPreset);
    if (userPreset) {
      return userPreset.name;
    }
    
    // Check if it's a built-in preset
    if (state.selectedPreset in BUILTIN_PRESETS) {
      return BUILTIN_PRESETS[state.selectedPreset].name;
    }
    
    return 'Custom';
  }, [state.selectedPreset, userPresets]);

  // User preset management
  const addUserPreset = useCallback((preset: UserPreset) => {
    setUserPresets((prev) => [...prev, preset]);
  }, []);

  const updateUserPreset = useCallback((id: string, preset: UserPreset) => {
    setUserPresets((prev) =>
      prev.map((p) => (p.id === id ? preset : p))
    );
  }, []);

  const deleteUserPreset = useCallback((id: string) => {
    setUserPresets((prev) => prev.filter((p) => p.id !== id));
    // If the deleted preset was selected, reset to generic
    setState((prev) => 
      prev.selectedPreset === id 
        ? { ...prev, selectedPreset: 'generic' } 
        : prev
    );
  }, []);

  const value: ThresholdConfigContextType = {
    enabled: state.enabled,
    selectedPreset: state.selectedPreset,
    customThresholds: state.customThresholds,
    customDeliveryParams: state.customDeliveryParams,
    userPresets,
    setEnabled,
    setPreset,
    updateCustomThreshold,
    updateCustomDeliveryParams,
    getThresholdStatus,
    getCurrentThresholds,
    getCurrentDeliveryParams,
    getPresetName,
    addUserPreset,
    updateUserPreset,
    deleteUserPreset,
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
