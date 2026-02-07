

# Plan: Add New Machine Presets and Energy-Dependent Dose Rates

## Summary

Add three new built-in machine presets (Varian Ethos, Elekta Unity MR-Linac, Elekta Harmony) and extend the delivery parameters model to support energy-dependent dose rates, allowing users to configure different dose rate limits for different photon energies and beam modes.

---

## New Machine Presets

### 1. Varian Ethos

| Parameter | Value | Notes |
|-----------|-------|-------|
| Max Dose Rate (6 MV) | 800 MU/min | Standard 6 MV photon |
| Max Dose Rate (6 FFF) | 1400 MU/min | Flattening filter free |
| Max Gantry Speed | 6.0 deg/s | Fast rotation |
| Max MLC Speed | 25 mm/s | Millennium-style MLC |
| MLC Type | MLCX | Varian-style |

Thresholds: Similar to Halcyon (AI-driven adaptive, typically simpler plans)

### 2. Elekta Unity (MR-Linac)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Max Dose Rate (7 MV) | 425 MU/min | Only energy available |
| Max Gantry Speed | 6.0 deg/s | Full rotation |
| Max MLC Speed | 25 mm/s | Agility-style |
| MLC Type | MLCY | Elekta-style |

Thresholds: More conservative due to MR environment constraints

### 3. Elekta Harmony

| Parameter | Value | Notes |
|-----------|-------|-------|
| Max Dose Rate (6 MV) | 300 MU/min | Lower rate machine |
| Max Dose Rate (10 MV) | 300 MU/min | Optional energy |
| Max Gantry Speed | 6.0 deg/s | Standard |
| Max MLC Speed | 35 mm/s | Agility MLC |
| MLC Type | MLCY | Elekta-style |

Thresholds: Similar to Versa HD

---

## Energy-Dependent Dose Rates

### Current Limitation

The current model only supports:
```typescript
maxDoseRate: number;         // Single default rate
maxDoseRateFFF?: number;     // Optional FFF rate
```

This doesn't handle:
- Multiple photon energies (6X, 10X, 15X, 18X)
- Electron energies (6e, 9e, 12e, etc.)
- FFF variants per energy (6 FFF, 10 FFF)
- Different dose rates per energy/mode combination

### Proposed Model Extension

```typescript
interface EnergyDoseRate {
  energy: string;         // e.g., "6X", "10X", "6FFF", "10FFF", "6e"
  maxDoseRate: number;    // MU/min for this energy
  isDefault?: boolean;    // Mark one as default for unknown energies
}

interface MachineDeliveryParams {
  // Keep existing for backwards compatibility
  maxDoseRate: number;              // Default/fallback dose rate
  maxDoseRateFFF?: number;          // Legacy FFF support
  
  // New: Energy-specific rates (optional, overrides default)
  energyDoseRates?: EnergyDoseRate[];
  
  maxGantrySpeed: number;
  maxMLCSpeed: number;
  mlcType: 'MLCX' | 'MLCY' | 'DUAL';
}
```

### Energy Selection Logic

```text
function getDoseRateForBeam(beam, params):
    1. Extract energy from beam (e.g., "6", "10", "6FFF")
    2. Check if energyDoseRates exists and has matching entry
    3. If match found, return that rate
    4. If beam is FFF and maxDoseRateFFF exists, return that
    5. Fall back to maxDoseRate
```

---

## UI Changes

### PresetEditor.tsx Updates

Add a new section "Energy-Specific Dose Rates":

```text
+----------------------------------------------------------+
| Energy-Specific Dose Rates                     [+ Add]    |
|----------------------------------------------------------|
| Energy    | Max Dose Rate (MU/min)  | Default | Actions  |
|-----------|-------------------------|---------|----------|
| 6X        | 600                     | [x]     | [Del]    |
| 10X       | 600                     | [ ]     | [Del]    |
| 6FFF      | 1400                    | [ ]     | [Del]    |
| 10FFF     | 2400                    | [ ]     | [Del]    |
+----------------------------------------------------------+
```

Features:
- Add energy from dropdown or custom input
- Set dose rate per energy
- Mark one as default
- Remove individual entries
- Backwards compatible (empty list uses legacy fields)

### Common Energy Presets

Dropdown with common energies:
- Photon: 6X, 10X, 15X, 18X
- FFF: 6FFF, 10FFF
- Electron: 6e, 9e, 12e, 15e, 18e
- Custom: Allow free-text entry

---

## Default Energy Configurations

### Varian TrueBeam (Updated)

| Energy | Max Dose Rate |
|--------|---------------|
| 6X | 600 MU/min |
| 10X | 600 MU/min |
| 15X | 600 MU/min |
| 6FFF | 1400 MU/min |
| 10FFF | 2400 MU/min |

### Varian Ethos

| Energy | Max Dose Rate |
|--------|---------------|
| 6X | 800 MU/min |
| 6FFF | 1400 MU/min |

### Elekta Unity

| Energy | Max Dose Rate |
|--------|---------------|
| 7X | 425 MU/min |

(Single energy only)

### Elekta Harmony

| Energy | Max Dose Rate |
|--------|---------------|
| 6X | 300 MU/min |
| 10X | 300 MU/min |
| 15X | 300 MU/min |

---

## Default Machine Mappings (New)

Add to `createDefaultMappings()`:

| Pattern | Match Type | Preset |
|---------|------------|--------|
| Ethos | prefix | ethos |
| Unity | prefix | unity |
| Harmony | prefix | harmony |
| MRLinac | contains | unity |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/threshold-definitions.ts` | Add `EnergyDoseRate` type, 3 new preset configs, update `MachineDeliveryParams` |
| `src/components/settings/PresetEditor.tsx` | Add energy dose rate editor section |
| `src/lib/machine-mapping.ts` | Add default mappings for Ethos, Unity, Harmony |

---

## Technical Details

### New Types (threshold-definitions.ts)

```typescript
export interface EnergyDoseRate {
  energy: string;
  maxDoseRate: number;
  isDefault?: boolean;
}

export interface MachineDeliveryParams {
  maxDoseRate: number;
  maxDoseRateFFF?: number;
  energyDoseRates?: EnergyDoseRate[];  // NEW
  maxGantrySpeed: number;
  maxMLCSpeed: number;
  mlcType: 'MLCX' | 'MLCY' | 'DUAL';
}
```

### New Built-in Presets

```typescript
// Varian Ethos
const ETHOS_THRESHOLDS: ThresholdSet = {
  MCS: { metricKey: 'MCS', warningThreshold: 0.35, criticalThreshold: 0.25, direction: 'low' },
  LSV: { metricKey: 'LSV', warningThreshold: 0.40, criticalThreshold: 0.30, direction: 'low' },
  AAV: { metricKey: 'AAV', warningThreshold: 0.40, criticalThreshold: 0.30, direction: 'low' },
  MFA: { metricKey: 'MFA', warningThreshold: 4, criticalThreshold: 2, direction: 'low' },
  LT: { metricKey: 'LT', warningThreshold: 10000, criticalThreshold: 18000, direction: 'high' },
  totalMU: { metricKey: 'totalMU', warningThreshold: 1500, criticalThreshold: 2500, direction: 'high' },
};

const ETHOS_DELIVERY: MachineDeliveryParams = {
  maxDoseRate: 800,
  maxDoseRateFFF: 1400,
  energyDoseRates: [
    { energy: '6X', maxDoseRate: 800, isDefault: true },
    { energy: '6FFF', maxDoseRate: 1400 },
  ],
  maxGantrySpeed: 6.0,
  maxMLCSpeed: 25,
  mlcType: 'MLCX',
};

// Elekta Unity (MR-Linac)
const UNITY_THRESHOLDS: ThresholdSet = {
  MCS: { metricKey: 'MCS', warningThreshold: 0.25, criticalThreshold: 0.15, direction: 'low' },
  LSV: { metricKey: 'LSV', warningThreshold: 0.30, criticalThreshold: 0.20, direction: 'low' },
  AAV: { metricKey: 'AAV', warningThreshold: 0.30, criticalThreshold: 0.20, direction: 'low' },
  MFA: { metricKey: 'MFA', warningThreshold: 4, criticalThreshold: 2, direction: 'low' },
  LT: { metricKey: 'LT', warningThreshold: 25000, criticalThreshold: 40000, direction: 'high' },
  totalMU: { metricKey: 'totalMU', warningThreshold: 2000, criticalThreshold: 3500, direction: 'high' },
};

const UNITY_DELIVERY: MachineDeliveryParams = {
  maxDoseRate: 425,
  energyDoseRates: [
    { energy: '7X', maxDoseRate: 425, isDefault: true },
  ],
  maxGantrySpeed: 6.0,
  maxMLCSpeed: 25,
  mlcType: 'MLCY',
};

// Elekta Harmony
const HARMONY_THRESHOLDS: ThresholdSet = {
  MCS: { metricKey: 'MCS', warningThreshold: 0.28, criticalThreshold: 0.18, direction: 'low' },
  LSV: { metricKey: 'LSV', warningThreshold: 0.32, criticalThreshold: 0.22, direction: 'low' },
  AAV: { metricKey: 'AAV', warningThreshold: 0.32, criticalThreshold: 0.22, direction: 'low' },
  MFA: { metricKey: 'MFA', warningThreshold: 4.5, criticalThreshold: 2.5, direction: 'low' },
  LT: { metricKey: 'LT', warningThreshold: 22000, criticalThreshold: 35000, direction: 'high' },
  totalMU: { metricKey: 'totalMU', warningThreshold: 1800, criticalThreshold: 2800, direction: 'high' },
};

const HARMONY_DELIVERY: MachineDeliveryParams = {
  maxDoseRate: 300,
  energyDoseRates: [
    { energy: '6X', maxDoseRate: 300, isDefault: true },
    { energy: '10X', maxDoseRate: 300 },
    { energy: '15X', maxDoseRate: 300 },
  ],
  maxGantrySpeed: 6.0,
  maxMLCSpeed: 35,
  mlcType: 'MLCY',
};
```

### Dose Rate Resolution Function

```typescript
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
```

---

## PresetEditor Energy Section

New component section with:

1. **Table of configured energies**
   - Energy name (editable or dropdown)
   - Max dose rate input
   - Default checkbox (only one can be default)
   - Delete button

2. **Add energy row**
   - Dropdown with common energies
   - "Custom" option for free text
   - Initial dose rate value

3. **Backwards compatibility**
   - If no energyDoseRates, show simple legacy fields
   - Migration: "Convert to energy-specific rates" button

---

## Estimated Changes

| File | Lines Added/Modified |
|------|---------------------|
| `src/lib/threshold-definitions.ts` | ~120 lines (new presets + types) |
| `src/components/settings/PresetEditor.tsx` | ~100 lines (energy editor UI) |
| `src/lib/machine-mapping.ts` | ~25 lines (new default mappings) |

**Total: ~245 lines across 3 files**

---

## Summary of Changes

1. **3 new built-in presets**: Ethos, Unity, Harmony
2. **New EnergyDoseRate type**: Allows per-energy dose rate configuration
3. **Extended MachineDeliveryParams**: Optional energyDoseRates array
4. **PresetEditor enhancement**: UI to add/edit energy-specific rates
5. **New default mappings**: Auto-detect Ethos, Unity, Harmony machines
6. **Dose rate resolver function**: Smart lookup with fallback logic

