/**
 * Threshold Definitions for RT Plan Complexity Metrics
 * Machine-specific presets for warning and critical thresholds
 */

export type ThresholdDirection = 'high' | 'low';
export type ThresholdStatus = 'normal' | 'warning' | 'critical';
export type MachinePreset = 'generic' | 'truebeam' | 'halcyon' | 'versa_hd' | 'custom';

export interface ThresholdDefinition {
  metricKey: string;
  warningThreshold: number;
  criticalThreshold: number;
  direction: ThresholdDirection;
}

export type ThresholdSet = Record<string, ThresholdDefinition>;

// Machine delivery parameters for time estimation
export interface MachineDeliveryParams {
  maxDoseRate: number; // MU/min
  maxDoseRateFFF?: number; // MU/min for FFF beams
  maxGantrySpeed: number; // deg/s
  maxMLCSpeed: number; // mm/s
  mlcType: 'MLCX' | 'MLCY' | 'DUAL';
}

export interface MachinePresetConfig {
  id: MachinePreset;
  name: string;
  description: string;
  thresholds: ThresholdSet;
  deliveryParams: MachineDeliveryParams;
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

// Machine delivery parameters
const GENERIC_DELIVERY: MachineDeliveryParams = {
  maxDoseRate: 600,
  maxGantrySpeed: 4.8,
  maxMLCSpeed: 25,
  mlcType: 'MLCX',
};

const TRUEBEAM_DELIVERY: MachineDeliveryParams = {
  maxDoseRate: 600,
  maxDoseRateFFF: 1400,
  maxGantrySpeed: 6.0,
  maxMLCSpeed: 25,
  mlcType: 'MLCX',
};

const HALCYON_DELIVERY: MachineDeliveryParams = {
  maxDoseRate: 800,
  maxGantrySpeed: 4.0,
  maxMLCSpeed: 50,
  mlcType: 'DUAL',
};

const VERSA_HD_DELIVERY: MachineDeliveryParams = {
  maxDoseRate: 600,
  maxGantrySpeed: 6.0,
  maxMLCSpeed: 35,
  mlcType: 'MLCY',
};

export const MACHINE_PRESETS: Record<MachinePreset, MachinePresetConfig> = {
  generic: {
    id: 'generic',
    name: 'Generic (Conservative)',
    description: 'Safe baseline values for any modern linac',
    thresholds: GENERIC_THRESHOLDS,
    deliveryParams: GENERIC_DELIVERY,
  },
  truebeam: {
    id: 'truebeam',
    name: 'Varian TrueBeam',
    description: 'Optimized for TrueBeam with Millennium MLC',
    thresholds: TRUEBEAM_THRESHOLDS,
    deliveryParams: TRUEBEAM_DELIVERY,
  },
  halcyon: {
    id: 'halcyon',
    name: 'Varian Halcyon',
    description: 'Stricter thresholds for dual-layer MLC',
    thresholds: HALCYON_THRESHOLDS,
    deliveryParams: HALCYON_DELIVERY,
  },
  versa_hd: {
    id: 'versa_hd',
    name: 'Elekta Versa HD',
    description: 'Optimized for Agility MLC',
    thresholds: VERSA_HD_THRESHOLDS,
    deliveryParams: VERSA_HD_DELIVERY,
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'User-defined threshold values',
    thresholds: { ...GENERIC_THRESHOLDS },
    deliveryParams: GENERIC_DELIVERY,
  },
};

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
