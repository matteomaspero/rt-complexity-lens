import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { z } from 'zod';
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

// Zod schemas for localStorage validation
const ThresholdDefinitionSchema = z.object({
  metricKey: z.string(),
  warningThreshold: z.number(),
  criticalThreshold: z.number(),
  direction: z.enum(['high', 'low']),
});

const MachineDeliveryParamsSchema = z.object({
  maxDoseRate: z.number(),
  maxDoseRateFFF: z.number().optional(),
  maxGantrySpeed: z.number(),
  maxMLCSpeed: z.number(),
  mlcType: z.enum(['MLCX', 'MLCY', 'DUAL']),
});

const ThresholdConfigStateSchema = z.object({
  enabled: z.boolean(),
  selectedPreset: z.string(),
  customThresholds: z.record(ThresholdDefinitionSchema),
  customDeliveryParams: MachineDeliveryParamsSchema,
});

const UserPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  thresholds: z.record(ThresholdDefinitionSchema),
  deliveryParams: MachineDeliveryParamsSchema,
  isBuiltIn: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const UserPresetsArraySchema = z.array(UserPresetSchema);

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
      const validated = ThresholdConfigStateSchema.parse(parsed);
      return {
        enabled: validated.enabled,
        selectedPreset: validated.selectedPreset,
        customThresholds: validated.customThresholds as ThresholdSet,
        customDeliveryParams: validated.customDeliveryParams as MachineDeliveryParams,
      };
    }
  } catch {
    // Invalid data or storage error - use defaults
  }
  return defaultState;
}

function saveToStorage(state: ThresholdConfigState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable - settings won't persist
  }
}

function loadUserPresets(): UserPreset[] {
  try {
    const stored = localStorage.getItem(USER_PRESETS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const validated = UserPresetsArraySchema.parse(parsed);
      return validated as UserPreset[];
    }
  } catch {
    // Invalid data or storage error - use empty list
  }
  return [];
}

function saveUserPresets(presets: UserPreset[]): void {
  try {
    localStorage.setItem(USER_PRESETS_KEY, JSON.stringify(presets));
  } catch {
    // localStorage unavailable - presets won't persist
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
