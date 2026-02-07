/**
 * Machine Mapping System
 * Maps machine IDs/names from DICOM files to specific presets
 */

import { z } from 'zod';
import { BUILTIN_PRESETS } from './threshold-definitions';

// Match types for machine name patterns
export type MappingMatchType = 'exact' | 'prefix' | 'contains' | 'regex';

export interface MachineMappingEntry {
  id: string;
  pattern: string;
  matchType: MappingMatchType;
  presetId: string;
  manufacturer?: string;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// Zod schema for validation
export const MachineMappingEntrySchema = z.object({
  id: z.string(),
  pattern: z.string(),
  matchType: z.enum(['exact', 'prefix', 'contains', 'regex']),
  presetId: z.string(),
  manufacturer: z.string().optional(),
  priority: z.number(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const MachineMappingsArraySchema = z.array(MachineMappingEntrySchema);

// Storage key for localStorage
export const MACHINE_MAPPINGS_STORAGE_KEY = 'rtplan-machine-mappings';
export const AUTO_SELECT_STORAGE_KEY = 'rtplan-auto-select-enabled';

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

/**
 * Load machine mappings from localStorage
 */
export function loadMachineMappings(): MachineMappingEntry[] {
  try {
    const stored = localStorage.getItem(MACHINE_MAPPINGS_STORAGE_KEY);
    if (stored) {
      const parsed = safeParseJSON<unknown>(stored);
      const validated = MachineMappingsArraySchema.parse(parsed);
      return validated as MachineMappingEntry[];
    }
  } catch {
    // Invalid data or storage error - use defaults
  }
  return createDefaultMappings();
}

/**
 * Save machine mappings to localStorage
 */
export function saveMachineMappings(mappings: MachineMappingEntry[]): void {
  try {
    localStorage.setItem(MACHINE_MAPPINGS_STORAGE_KEY, JSON.stringify(mappings));
  } catch {
    // localStorage unavailable
  }
}

/**
 * Load auto-select setting from localStorage
 */
export function loadAutoSelectEnabled(): boolean {
  try {
    const stored = localStorage.getItem(AUTO_SELECT_STORAGE_KEY);
    if (stored !== null) {
      return stored === 'true';
    }
  } catch {
    // Storage error
  }
  return true; // Default to enabled
}

/**
 * Save auto-select setting to localStorage
 */
export function saveAutoSelectEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_SELECT_STORAGE_KEY, String(enabled));
  } catch {
    // localStorage unavailable
  }
}

/**
 * Create default machine mappings based on common machine naming patterns
 */
export function createDefaultMappings(): MachineMappingEntry[] {
  const now = new Date().toISOString();
  
  return [
    {
      id: 'default_truebeam',
      pattern: 'TrueBeam',
      matchType: 'prefix',
      presetId: 'truebeam',
      priority: 100,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'default_halcyon',
      pattern: 'Halcyon',
      matchType: 'prefix',
      presetId: 'halcyon',
      priority: 100,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'default_versahd',
      pattern: 'VersaHD',
      matchType: 'prefix',
      presetId: 'versa_hd',
      priority: 100,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'default_versa',
      pattern: 'Versa',
      matchType: 'prefix',
      presetId: 'versa_hd',
      priority: 90,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'default_agility',
      pattern: 'Agility',
      matchType: 'contains',
      presetId: 'versa_hd',
      priority: 80,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * Create a new mapping entry
 */
export function createMappingEntry(
  pattern: string,
  presetId: string,
  matchType: MappingMatchType = 'prefix',
  priority: number = 100
): MachineMappingEntry {
  const now = new Date().toISOString();
  return {
    id: `mapping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    pattern,
    matchType,
    presetId,
    priority,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Test if a pattern matches a machine name
 */
function testPatternMatch(
  machineName: string,
  pattern: string,
  matchType: MappingMatchType
): boolean {
  const normalizedName = machineName.toLowerCase();
  const normalizedPattern = pattern.toLowerCase();

  switch (matchType) {
    case 'exact':
      return normalizedName === normalizedPattern;
    case 'prefix':
      return normalizedName.startsWith(normalizedPattern);
    case 'contains':
      return normalizedName.includes(normalizedPattern);
    case 'regex':
      try {
        const regex = new RegExp(pattern, 'i');
        return regex.test(machineName);
      } catch {
        // Invalid regex - treat as no match
        return false;
      }
    default:
      return false;
  }
}

/**
 * Find matching preset for a machine name
 * Returns preset ID if found, null otherwise
 */
export function matchMachineToPreset(
  machineName: string | undefined,
  manufacturer: string | undefined,
  mappings: MachineMappingEntry[],
  availablePresetIds: string[]
): string | null {
  if (!machineName) return null;

  // Filter enabled mappings and sort by priority (descending)
  const activeMappings = mappings
    .filter((m) => m.enabled)
    .sort((a, b) => b.priority - a.priority);

  for (const mapping of activeMappings) {
    // Check manufacturer filter if specified
    if (mapping.manufacturer) {
      const normalizedManufacturer = manufacturer?.toLowerCase() || '';
      const normalizedFilter = mapping.manufacturer.toLowerCase();
      if (!normalizedManufacturer.includes(normalizedFilter)) {
        continue;
      }
    }

    // Test pattern match
    if (testPatternMatch(machineName, mapping.pattern, mapping.matchType)) {
      // Verify preset still exists
      const presetExists =
        mapping.presetId in BUILTIN_PRESETS ||
        availablePresetIds.includes(mapping.presetId);

      if (presetExists) {
        return mapping.presetId;
      }
    }
  }

  return null;
}

/**
 * Test a machine name against all mappings and return matching results
 */
export function testMachineMapping(
  machineName: string,
  manufacturer: string | undefined,
  mappings: MachineMappingEntry[],
  availablePresetIds: string[]
): { matchedPresetId: string | null; matchedMapping: MachineMappingEntry | null } {
  if (!machineName) {
    return { matchedPresetId: null, matchedMapping: null };
  }

  const activeMappings = mappings
    .filter((m) => m.enabled)
    .sort((a, b) => b.priority - a.priority);

  for (const mapping of activeMappings) {
    if (mapping.manufacturer) {
      const normalizedManufacturer = manufacturer?.toLowerCase() || '';
      const normalizedFilter = mapping.manufacturer.toLowerCase();
      if (!normalizedManufacturer.includes(normalizedFilter)) {
        continue;
      }
    }

    if (testPatternMatch(machineName, mapping.pattern, mapping.matchType)) {
      const presetExists =
        mapping.presetId in BUILTIN_PRESETS ||
        availablePresetIds.includes(mapping.presetId);

      if (presetExists) {
        return { matchedPresetId: mapping.presetId, matchedMapping: mapping };
      }
    }
  }

  return { matchedPresetId: null, matchedMapping: null };
}

/**
 * Get all available preset IDs (built-in + user)
 */
export function getAllPresetIds(userPresetIds: string[]): string[] {
  return [...Object.keys(BUILTIN_PRESETS), ...userPresetIds];
}

/**
 * Validate that all mappings reference valid presets
 * Returns mappings with invalid references marked
 */
export function validateMappingPresets(
  mappings: MachineMappingEntry[],
  availablePresetIds: string[]
): Array<MachineMappingEntry & { isValid: boolean }> {
  return mappings.map((mapping) => ({
    ...mapping,
    isValid:
      mapping.presetId in BUILTIN_PRESETS ||
      availablePresetIds.includes(mapping.presetId),
  }));
}

/**
 * Remove mappings that reference a deleted preset
 */
export function cleanupMappingsForDeletedPreset(
  mappings: MachineMappingEntry[],
  deletedPresetId: string
): MachineMappingEntry[] {
  return mappings.filter((m) => m.presetId !== deletedPresetId);
}

// Export format including mappings
export interface MappingExportFormat {
  version: string;
  exportDate: string;
  machineMappings: MachineMappingEntry[];
  autoSelectEnabled: boolean;
}

/**
 * Export mappings to JSON string
 */
export function exportMappingsToJSON(
  mappings: MachineMappingEntry[],
  autoSelectEnabled: boolean
): string {
  const exportData: MappingExportFormat = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    machineMappings: mappings,
    autoSelectEnabled,
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Import mappings from JSON string
 */
export function importMappingsFromJSON(json: string): {
  mappings: MachineMappingEntry[];
  autoSelectEnabled?: boolean;
} {
  try {
    const data = safeParseJSON<unknown>(json);
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid mapping format');
    }

    const obj = data as Record<string, unknown>;
    
    // Handle both formats: array or wrapped object
    let mappings: unknown[];
    let autoSelectEnabled: boolean | undefined;

    if (Array.isArray(obj)) {
      mappings = obj;
    } else if (obj.machineMappings && Array.isArray(obj.machineMappings)) {
      mappings = obj.machineMappings;
      autoSelectEnabled = typeof obj.autoSelectEnabled === 'boolean' 
        ? obj.autoSelectEnabled 
        : undefined;
    } else {
      throw new Error('Invalid mapping format');
    }

    // Validate mappings
    const validated = MachineMappingsArraySchema.parse(mappings) as MachineMappingEntry[];
    
    // Assign new IDs to avoid conflicts
    const now = new Date().toISOString();
    const importedMappings: MachineMappingEntry[] = validated.map((m, index) => ({
      ...m,
      id: `imported_${Date.now()}_${index}`,
      updatedAt: now,
    }));

    return { mappings: importedMappings, autoSelectEnabled };
  } catch {
    throw new Error('Invalid mapping file format');
  }
}
