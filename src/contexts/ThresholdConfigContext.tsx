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
import {
  type MachineMappingEntry,
  loadMachineMappings,
  saveMachineMappings,
  loadAutoSelectEnabled,
  saveAutoSelectEnabled,
  matchMachineToPreset,
  createDefaultMappings,
} from '@/lib/machine-mapping';

/**
 * Safe JSON parse with prototype pollution protection
 */
function safeParseJSON<T>(text: string): T {
  return JSON.parse(text, (key, value) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return undefined;
    }
    return value;
  });
}

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
  // Machine mapping state
  machineMappings: MachineMappingEntry[];
  autoSelectEnabled: boolean;
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
  // Machine mapping management
  setAutoSelectEnabled: (enabled: boolean) => void;
  addMachineMapping: (mapping: MachineMappingEntry) => void;
  updateMachineMapping: (id: string, mapping: MachineMappingEntry) => void;
  deleteMachineMapping: (id: string) => void;
  findPresetForMachine: (machineName?: string, manufacturer?: string) => string | null;
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
      const parsed = safeParseJSON<unknown>(stored);
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
      const parsed = safeParseJSON<unknown>(stored);
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
  const [machineMappings, setMachineMappings] = useState<MachineMappingEntry[]>(loadMachineMappings);
  const [autoSelectEnabled, setAutoSelectEnabledState] = useState<boolean>(loadAutoSelectEnabled);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  // Persist user presets
  useEffect(() => {
    saveUserPresets(userPresets);
  }, [userPresets]);

  // Persist machine mappings
  useEffect(() => {
    saveMachineMappings(machineMappings);
  }, [machineMappings]);

  // Persist auto-select setting
  useEffect(() => {
    saveAutoSelectEnabled(autoSelectEnabled);
  }, [autoSelectEnabled]);

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
    // Also remove any mappings referencing this preset
    setMachineMappings((prev) => prev.filter((m) => m.presetId !== id));
  }, []);

  // Machine mapping management
  const setAutoSelectEnabled = useCallback((enabled: boolean) => {
    setAutoSelectEnabledState(enabled);
  }, []);

  const addMachineMapping = useCallback((mapping: MachineMappingEntry) => {
    setMachineMappings((prev) => [...prev, mapping]);
  }, []);

  const updateMachineMapping = useCallback((id: string, mapping: MachineMappingEntry) => {
    setMachineMappings((prev) =>
      prev.map((m) => (m.id === id ? mapping : m))
    );
  }, []);

  const deleteMachineMapping = useCallback((id: string) => {
    setMachineMappings((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const findPresetForMachine = useCallback(
    (machineName?: string, manufacturer?: string): string | null => {
      if (!autoSelectEnabled) return null;
      
      const userPresetIds = userPresets.map((p) => p.id);
      return matchMachineToPreset(machineName, manufacturer, machineMappings, userPresetIds);
    },
    [autoSelectEnabled, machineMappings, userPresets]
  );

  const value: ThresholdConfigContextType = {
    enabled: state.enabled,
    selectedPreset: state.selectedPreset,
    customThresholds: state.customThresholds,
    customDeliveryParams: state.customDeliveryParams,
    userPresets,
    machineMappings,
    autoSelectEnabled,
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
    setAutoSelectEnabled,
    addMachineMapping,
    updateMachineMapping,
    deleteMachineMapping,
    findPresetForMachine,
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
