/**
 * Threshold Definitions for RT Plan Complexity Metrics
 * Machine-specific presets for warning and critical thresholds
 */

export type ThresholdDirection = 'high' | 'low';
export type ThresholdStatus = 'normal' | 'warning' | 'critical';
export type MachinePreset = 'generic' | 'truebeam' | 'halcyon' | 'versa_hd' | 'custom' | string;

export interface ThresholdDefinition {
  metricKey: string;
  warningThreshold: number;
  criticalThreshold: number;
  direction: ThresholdDirection;
}

export type ThresholdSet = Record<string, ThresholdDefinition>;

// Energy-specific dose rate configuration
export interface EnergyDoseRate {
  energy: string; // e.g., "6X", "10X", "6FFF", "10FFF", "6e"
  maxDoseRate: number; // MU/min for this energy
  isDefault?: boolean; // Mark one as default for unknown energies
}

// Machine delivery parameters for time estimation
export interface MachineDeliveryParams {
  maxDoseRate: number; // MU/min (default/fallback)
  maxDoseRateFFF?: number; // MU/min for FFF beams (legacy support)
  energyDoseRates?: EnergyDoseRate[]; // Energy-specific rates
  maxGantrySpeed: number; // deg/s
  maxMLCSpeed: number; // mm/s
  mlcType: 'MLCX' | 'MLCY' | 'DUAL';
  mlcModel?: string; // Human-readable MLC model name (e.g., 'Agility', 'HD120', 'Millennium 120')
}

export interface MachinePresetConfig {
  id: string;
  name: string;
  description: string;
  thresholds: ThresholdSet;
  deliveryParams: MachineDeliveryParams;
  isBuiltIn?: boolean;
}

// User-created preset interface
export interface UserPreset extends MachinePresetConfig {
  createdAt: string;
  updatedAt: string;
}

// Export format for presets
export interface PresetExportFormat {
  version: string;
  exportDate: string;
  presets: UserPreset[];
}

// Generic / Conservative - Safe baseline for any modern linac
const GENERIC_THRESHOLDS: ThresholdSet = {
  MCS: { metricKey: 'MCS', warningThreshold: 0.25, criticalThreshold: 0.15, direction: 'low' },
  LSV: { metricKey: 'LSV', warningThreshold: 0.30, criticalThreshold: 0.20, direction: 'low' },
  AAV: { metricKey: 'AAV', warningThreshold: 0.30, criticalThreshold: 0.20, direction: 'low' },
  MFA: { metricKey: 'MFA', warningThreshold: 4, criticalThreshold: 2, direction: 'low' },
  LT: { metricKey: 'LT', warningThreshold: 20000, criticalThreshold: 30000, direction: 'high' },
  totalMU: { metricKey: 'totalMU', warningThreshold: 1500, criticalThreshold: 2500, direction: 'high' },
};

// Varian TrueBeam
const TRUEBEAM_THRESHOLDS: ThresholdSet = {
  MCS: { metricKey: 'MCS', warningThreshold: 0.30, criticalThreshold: 0.20, direction: 'low' },
  LSV: { metricKey: 'LSV', warningThreshold: 0.35, criticalThreshold: 0.25, direction: 'low' },
  AAV: { metricKey: 'AAV', warningThreshold: 0.35, criticalThreshold: 0.25, direction: 'low' },
  MFA: { metricKey: 'MFA', warningThreshold: 5, criticalThreshold: 2, direction: 'low' },
  LT: { metricKey: 'LT', warningThreshold: 15000, criticalThreshold: 25000, direction: 'high' },
  totalMU: { metricKey: 'totalMU', warningThreshold: 2000, criticalThreshold: 3000, direction: 'high' },
};

// Varian Halcyon - Stricter thresholds due to dual-layer MLC
const HALCYON_THRESHOLDS: ThresholdSet = {
  MCS: { metricKey: 'MCS', warningThreshold: 0.35, criticalThreshold: 0.25, direction: 'low' },
  LSV: { metricKey: 'LSV', warningThreshold: 0.40, criticalThreshold: 0.30, direction: 'low' },
  AAV: { metricKey: 'AAV', warningThreshold: 0.40, criticalThreshold: 0.30, direction: 'low' },
  MFA: { metricKey: 'MFA', warningThreshold: 4, criticalThreshold: 2, direction: 'low' },
  LT: { metricKey: 'LT', warningThreshold: 12000, criticalThreshold: 20000, direction: 'high' },
  totalMU: { metricKey: 'totalMU', warningThreshold: 1800, criticalThreshold: 2800, direction: 'high' },
};

// Elekta Versa HD - Agility MLC-specific thresholds
const VERSA_HD_THRESHOLDS: ThresholdSet = {
  MCS: { metricKey: 'MCS', warningThreshold: 0.28, criticalThreshold: 0.18, direction: 'low' },
  LSV: { metricKey: 'LSV', warningThreshold: 0.32, criticalThreshold: 0.22, direction: 'low' },
  AAV: { metricKey: 'AAV', warningThreshold: 0.32, criticalThreshold: 0.22, direction: 'low' },
  MFA: { metricKey: 'MFA', warningThreshold: 4.5, criticalThreshold: 2.5, direction: 'low' },
  LT: { metricKey: 'LT', warningThreshold: 18000, criticalThreshold: 28000, direction: 'high' },
  totalMU: { metricKey: 'totalMU', warningThreshold: 1800, criticalThreshold: 2800, direction: 'high' },
};

// Varian Ethos - AI-driven adaptive, typically simpler plans
const ETHOS_THRESHOLDS: ThresholdSet = {
  MCS: { metricKey: 'MCS', warningThreshold: 0.35, criticalThreshold: 0.25, direction: 'low' },
  LSV: { metricKey: 'LSV', warningThreshold: 0.40, criticalThreshold: 0.30, direction: 'low' },
  AAV: { metricKey: 'AAV', warningThreshold: 0.40, criticalThreshold: 0.30, direction: 'low' },
  MFA: { metricKey: 'MFA', warningThreshold: 4, criticalThreshold: 2, direction: 'low' },
  LT: { metricKey: 'LT', warningThreshold: 10000, criticalThreshold: 18000, direction: 'high' },
  totalMU: { metricKey: 'totalMU', warningThreshold: 1500, criticalThreshold: 2500, direction: 'high' },
};

// Elekta Unity (MR-Linac) - Conservative due to MR environment constraints
const UNITY_THRESHOLDS: ThresholdSet = {
  MCS: { metricKey: 'MCS', warningThreshold: 0.25, criticalThreshold: 0.15, direction: 'low' },
  LSV: { metricKey: 'LSV', warningThreshold: 0.30, criticalThreshold: 0.20, direction: 'low' },
  AAV: { metricKey: 'AAV', warningThreshold: 0.30, criticalThreshold: 0.20, direction: 'low' },
  MFA: { metricKey: 'MFA', warningThreshold: 4, criticalThreshold: 2, direction: 'low' },
  LT: { metricKey: 'LT', warningThreshold: 25000, criticalThreshold: 40000, direction: 'high' },
  totalMU: { metricKey: 'totalMU', warningThreshold: 2000, criticalThreshold: 3500, direction: 'high' },
};

// Elekta Harmony - Similar to Versa HD
const HARMONY_THRESHOLDS: ThresholdSet = {
  MCS: { metricKey: 'MCS', warningThreshold: 0.28, criticalThreshold: 0.18, direction: 'low' },
  LSV: { metricKey: 'LSV', warningThreshold: 0.32, criticalThreshold: 0.22, direction: 'low' },
  AAV: { metricKey: 'AAV', warningThreshold: 0.32, criticalThreshold: 0.22, direction: 'low' },
  MFA: { metricKey: 'MFA', warningThreshold: 4.5, criticalThreshold: 2.5, direction: 'low' },
  LT: { metricKey: 'LT', warningThreshold: 22000, criticalThreshold: 35000, direction: 'high' },
  totalMU: { metricKey: 'totalMU', warningThreshold: 1800, criticalThreshold: 2800, direction: 'high' },
};

// Machine delivery parameters
export const DEFAULT_MACHINE_PARAMS: MachineDeliveryParams = {
  maxDoseRate: 600,
  maxGantrySpeed: 4.8,
  maxMLCSpeed: 25,
  mlcType: 'MLCX',
};

const GENERIC_DELIVERY: MachineDeliveryParams = { ...DEFAULT_MACHINE_PARAMS, mlcModel: 'Generic' };

const TRUEBEAM_DELIVERY: MachineDeliveryParams = {
  maxDoseRate: 600,
  maxDoseRateFFF: 1400,
  energyDoseRates: [
    { energy: '6X', maxDoseRate: 600, isDefault: true },
    { energy: '10X', maxDoseRate: 600 },
    { energy: '15X', maxDoseRate: 600 },
    { energy: '18X', maxDoseRate: 600 },
    { energy: '6FFF', maxDoseRate: 1400 },
    { energy: '10FFF', maxDoseRate: 2400 },
    { energy: '6e', maxDoseRate: 1000 },
    { energy: '9e', maxDoseRate: 1000 },
    { energy: '12e', maxDoseRate: 1000 },
    { energy: '15e', maxDoseRate: 1000 },
    { energy: '18e', maxDoseRate: 1000 },
    { energy: '20e', maxDoseRate: 1000 },
  ],
  maxGantrySpeed: 6.0,
  maxMLCSpeed: 25,
  mlcType: 'MLCX',
  mlcModel: 'Millennium 120',
};

const HALCYON_DELIVERY: MachineDeliveryParams = {
  maxDoseRate: 800,
  energyDoseRates: [
    { energy: '6X', maxDoseRate: 800, isDefault: true },
    { energy: '6FFF', maxDoseRate: 800 },
  ],
  maxGantrySpeed: 4.0,
  maxMLCSpeed: 50,
  mlcType: 'DUAL',
  mlcModel: 'SX2 Dual-Layer',
};

const VERSA_HD_DELIVERY: MachineDeliveryParams = {
  maxDoseRate: 600,
  maxDoseRateFFF: 1400,
  energyDoseRates: [
    { energy: '6X', maxDoseRate: 600, isDefault: true },
    { energy: '10X', maxDoseRate: 600 },
    { energy: '15X', maxDoseRate: 600 },
    { energy: '18X', maxDoseRate: 600 },
    { energy: '6FFF', maxDoseRate: 1400 },
    { energy: '10FFF', maxDoseRate: 2400 },
    { energy: '4e', maxDoseRate: 1000 },
    { energy: '6e', maxDoseRate: 1000 },
    { energy: '8e', maxDoseRate: 1000 },
    { energy: '10e', maxDoseRate: 1000 },
    { energy: '12e', maxDoseRate: 1000 },
    { energy: '15e', maxDoseRate: 1000 },
    { energy: '18e', maxDoseRate: 1000 },
  ],
  maxGantrySpeed: 6.0,
  maxMLCSpeed: 35,
  mlcType: 'MLCX',
  mlcModel: 'Agility',
};

const ETHOS_DELIVERY: MachineDeliveryParams = {
  maxDoseRate: 800,
  maxDoseRateFFF: 1400,
  energyDoseRates: [
    { energy: '6X', maxDoseRate: 800, isDefault: true },
    { energy: '6FFF', maxDoseRate: 1400 },
    { energy: '10FFF', maxDoseRate: 2400 },
  ],
  maxGantrySpeed: 6.0,
  maxMLCSpeed: 25,
  mlcType: 'MLCX',
  mlcModel: 'HD120',
};

const UNITY_DELIVERY: MachineDeliveryParams = {
  maxDoseRate: 425,
  energyDoseRates: [
    { energy: '7X', maxDoseRate: 425, isDefault: true },
  ],
  maxGantrySpeed: 6.0,
  maxMLCSpeed: 25,
  mlcType: 'MLCX',
  mlcModel: 'Agility 160',
};

const HARMONY_DELIVERY: MachineDeliveryParams = {
  maxDoseRate: 600,
  energyDoseRates: [
    { energy: '6X', maxDoseRate: 600, isDefault: true },
    { energy: '10X', maxDoseRate: 600 },
    { energy: '15X', maxDoseRate: 600 },
  ],
  maxGantrySpeed: 6.0,
  maxMLCSpeed: 35,
  mlcType: 'MLCX',
  mlcModel: 'MLCi2',
};

export const BUILTIN_PRESETS: Record<string, MachinePresetConfig> = {
  generic: {
    id: 'generic',
    name: 'Generic (Conservative)',
    description: 'Safe baseline values for any modern linac',
    thresholds: GENERIC_THRESHOLDS,
    deliveryParams: GENERIC_DELIVERY,
    isBuiltIn: true,
  },
  truebeam: {
    id: 'truebeam',
    name: 'Varian TrueBeam',
    description: 'Optimized for TrueBeam with Millennium 120 MLC',
    thresholds: TRUEBEAM_THRESHOLDS,
    deliveryParams: TRUEBEAM_DELIVERY,
    isBuiltIn: true,
  },
  halcyon: {
    id: 'halcyon',
    name: 'Varian Halcyon',
    description: 'Stricter thresholds for SX2 dual-layer MLC',
    thresholds: HALCYON_THRESHOLDS,
    deliveryParams: HALCYON_DELIVERY,
    isBuiltIn: true,
  },
  versa_hd: {
    id: 'versa_hd',
    name: 'Elekta Versa HD',
    description: 'Optimized for Agility 160-leaf MLC',
    thresholds: VERSA_HD_THRESHOLDS,
    deliveryParams: VERSA_HD_DELIVERY,
    isBuiltIn: true,
  },
  ethos: {
    id: 'ethos',
    name: 'Varian Ethos',
    description: 'AI-driven adaptive therapy with HD120 MLC',
    thresholds: ETHOS_THRESHOLDS,
    deliveryParams: ETHOS_DELIVERY,
    isBuiltIn: true,
  },
  unity: {
    id: 'unity',
    name: 'Elekta Unity (MR-Linac)',
    description: 'MR-guided RT with Agility 160-leaf MLC',
    thresholds: UNITY_THRESHOLDS,
    deliveryParams: UNITY_DELIVERY,
    isBuiltIn: true,
  },
  harmony: {
    id: 'harmony',
    name: 'Elekta Harmony',
    description: 'Essential linac with MLCi2 80-leaf MLC',
    thresholds: HARMONY_THRESHOLDS,
    deliveryParams: HARMONY_DELIVERY,
    isBuiltIn: true,
  },
};

// Legacy export for backwards compatibility
export const MACHINE_PRESETS = BUILTIN_PRESETS;

/**
 * Get the threshold status for a given metric value
 */
export function getThresholdStatus(
  value: number,
  threshold: ThresholdDefinition | undefined
): ThresholdStatus {
  if (!threshold) return 'normal';

  if (threshold.direction === 'low') {
    // Lower values are concerning (e.g., MCS, LSV, AAV, MFA)
    if (value < threshold.criticalThreshold) return 'critical';
    if (value < threshold.warningThreshold) return 'warning';
  } else {
    // Higher values are concerning (e.g., LT, totalMU)
    if (value > threshold.criticalThreshold) return 'critical';
    if (value > threshold.warningThreshold) return 'warning';
  }

  return 'normal';
}

/**
 * Format threshold for display in tooltips
 */
export function formatThresholdInfo(
  threshold: ThresholdDefinition,
  presetName: string
): string {
  const directionText = threshold.direction === 'low' ? '<' : '>';
  return `${presetName} thresholds: Warning ${directionText} ${threshold.warningThreshold}, Critical ${directionText} ${threshold.criticalThreshold}`;
}

/**
 * Get default custom thresholds (copy of generic)
 */
export function getDefaultCustomThresholds(): ThresholdSet {
  return JSON.parse(JSON.stringify(GENERIC_THRESHOLDS));
}

/**
 * Get default delivery params (copy of generic)
 */
export function getDefaultDeliveryParams(): MachineDeliveryParams {
  return JSON.parse(JSON.stringify(DEFAULT_MACHINE_PARAMS));
}

/**
 * Validate an imported preset
 */
export function validatePreset(preset: unknown): preset is UserPreset {
  if (!preset || typeof preset !== 'object') return false;
  const p = preset as Record<string, unknown>;
  
  if (typeof p.id !== 'string' || !p.id) return false;
  if (typeof p.name !== 'string' || !p.name) return false;
  if (!p.thresholds || typeof p.thresholds !== 'object') return false;
  if (!p.deliveryParams || typeof p.deliveryParams !== 'object') return false;
  
  return true;
}

/**
 * Export presets to JSON string
 */
export function exportPresetsToJSON(presets: UserPreset[]): string {
  const exportData: PresetExportFormat = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    presets,
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Import presets from JSON string
 */
export function importPresetsFromJSON(json: string): UserPreset[] {
  try {
    const data = JSON.parse(json);
    
    // Handle both formats: array or wrapped object
    let presets: unknown[];
    if (Array.isArray(data)) {
      presets = data;
    } else if (data.presets && Array.isArray(data.presets)) {
      presets = data.presets;
    } else {
      throw new Error('Invalid preset format');
    }
    
    // Validate and map presets
    const validPresets: UserPreset[] = [];
    for (const preset of presets) {
      if (validatePreset(preset)) {
        // Ensure timestamps exist
        const now = new Date().toISOString();
        validPresets.push({
          ...preset,
          createdAt: preset.createdAt || now,
          updatedAt: preset.updatedAt || now,
        });
      }
    }
    
    return validPresets;
  } catch {
    throw new Error('Invalid preset file format');
  }
}

/**
 * Create a new user preset from a built-in preset
 */
export function duplicateBuiltInPreset(builtInId: string, newName: string): UserPreset {
  const builtIn = BUILTIN_PRESETS[builtInId];
  if (!builtIn) {
    throw new Error(`Built-in preset "${builtInId}" not found`);
  }
  
  const now = new Date().toISOString();
  return {
    id: `user_${Date.now()}`,
    name: newName,
    description: `Based on ${builtIn.name}`,
    thresholds: JSON.parse(JSON.stringify(builtIn.thresholds)),
    deliveryParams: JSON.parse(JSON.stringify(builtIn.deliveryParams)),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a new empty user preset
 */
export function createEmptyUserPreset(name: string): UserPreset {
  const now = new Date().toISOString();
  return {
    id: `user_${Date.now()}`,
    name,
    description: 'Custom machine preset',
    thresholds: getDefaultCustomThresholds(),
    deliveryParams: getDefaultDeliveryParams(),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get dose rate for a specific energy from machine params
 */
export function getDoseRateForEnergy(
  params: MachineDeliveryParams,
  energy?: string,
  isFFF?: boolean
): number {
  // Check energy-specific rates first
  if (params.energyDoseRates && energy) {
    const normalizedEnergy = energy.toUpperCase();
    const match = params.energyDoseRates.find(
      (e) => e.energy.toUpperCase() === normalizedEnergy
    );
    if (match) return match.maxDoseRate;
    
    // Check for default in energy list
    const defaultEnergy = params.energyDoseRates.find((e) => e.isDefault);
    if (defaultEnergy) return defaultEnergy.maxDoseRate;
  }
  
  // Legacy FFF fallback
  if (isFFF && params.maxDoseRateFFF) {
    return params.maxDoseRateFFF;
  }
  
  // Default rate
  return params.maxDoseRate;
}

/**
 * Common energy presets for dropdown
 */
export const COMMON_ENERGIES = [
  { value: '6X', label: '6 MV', category: 'Photon' },
  { value: '10X', label: '10 MV', category: 'Photon' },
  { value: '15X', label: '15 MV', category: 'Photon' },
  { value: '18X', label: '18 MV', category: 'Photon' },
  { value: '20X', label: '20 MV', category: 'Photon' },
  { value: '6FFF', label: '6 MV FFF', category: 'FFF' },
  { value: '10FFF', label: '10 MV FFF', category: 'FFF' },
  { value: '7X', label: '7 MV (Unity)', category: 'Photon' },
  { value: '4e', label: '4 MeV', category: 'Electron' },
  { value: '6e', label: '6 MeV', category: 'Electron' },
  { value: '8e', label: '8 MeV', category: 'Electron' },
  { value: '9e', label: '9 MeV', category: 'Electron' },
  { value: '10e', label: '10 MeV', category: 'Electron' },
  { value: '12e', label: '12 MeV', category: 'Electron' },
  { value: '15e', label: '15 MeV', category: 'Electron' },
  { value: '18e', label: '18 MeV', category: 'Electron' },
  { value: '20e', label: '20 MeV', category: 'Electron' },
];
