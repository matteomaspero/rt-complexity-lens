
# Plan: Add Radiation Type and Beam Energy to RT Plan Data

## Overview

This plan addresses adding **beam radiation type** and **nominal beam energy** information throughout the application, following DICOM RT Plan standards. This data is critical for:
- Correlating complexity metrics with energy-specific dose rate limits
- Enabling energy-based filtering and clustering in cohort analysis
- Providing complete beam characterization in exports

## Technical Background

### DICOM Standard Nomenclature

According to the DICOM RT Plan standard:

| Attribute | Tag | Values |
|-----------|-----|--------|
| **Radiation Type** | (300A,00C6) | `PHOTON`, `ELECTRON`, `PROTON`, `NEUTRON`, `ION` |
| **Nominal Beam Energy** | (300A,0114) | Numeric value in MeV (per nucleon for ions) |

Energy notation convention used in clinical practice:
- Photons: `6X`, `10X`, `15X`, `6FFF`, `10FFF` (X = MV, FFF = Flattening Filter Free)
- Electrons: `6E`, `9E`, `12E`, `15E`, `18E` (E = MeV)
- Protons/Ions: Numeric MeV value

---

## Implementation Plan

### 1. Fix Existing Build Errors (Pre-requisite)

Before adding new fields, fix the existing TypeScript errors in test files:

**Files to update:**
- `src/test/clustering.test.ts` - Add missing `mlcLeafBoundaries` field to mock beams
- `src/test/metric-utils.test.ts` - Add missing `mlcLeafBoundaries` field to mock beams  
- `src/test/dicom-metrics.test.ts` - Cast vendor file strings properly using `as TestFileName`
- `src/test/export-metrics-json.test.ts` - Add proper type casting for `PlanMetrics`

### 2. Update TypeScript Types

**File: `src/lib/dicom/types.ts`**

Add `nominalBeamEnergy` to the `Beam` interface:

```text
interface Beam {
  // ... existing fields
  radiationType: string;  // Already exists: 'PHOTON' | 'ELECTRON' | 'PROTON' | etc
  nominalBeamEnergy?: number;     // NEW: Energy in MeV (e.g., 6, 10, 15 for photons)
  energyLabel?: string;           // NEW: Formatted label (e.g., '6X', '10FFF', '9E')
}
```

Add to `BeamMetrics` interface for export consistency:

```text
interface BeamMetrics {
  // ... existing fields
  radiationType?: string;         // NEW
  nominalBeamEnergy?: number;     // NEW
  energyLabel?: string;           // NEW
}
```

### 3. Update DICOM Parser

**File: `src/lib/dicom/parser.ts`**

Add parsing for `NominalBeamEnergy` (300A,0114) from the first control point:

```text
const TAGS = {
  // ... existing
  NominalBeamEnergy: 'x300a0114',
};

function parseBeam(beamDataSet): Beam {
  // Parse control points first
  // Extract NominalBeamEnergy from first control point
  // Generate energyLabel based on radiationType + energy value
}
```

Energy label generation logic:
- PHOTON + 6 MV → `'6X'`
- PHOTON + 6 MV + FFF mode → `'6FFF'` (detected from dose rate or beam name)
- ELECTRON + 9 MeV → `'9E'`
- PROTON → Numeric MeV value

### 4. Update Metrics Calculation

**File: `src/lib/dicom/metrics.ts`**

Pass radiation type and energy through to beam metrics:

```text
function calculateBeamMetrics(beam: Beam, ...): BeamMetrics {
  return {
    // ... existing metrics
    radiationType: beam.radiationType,
    nominalBeamEnergy: beam.nominalBeamEnergy,
    energyLabel: beam.energyLabel,
  };
}
```

### 5. Update UI Components

**File: `src/components/viewer/BeamSummaryCard.tsx`**

Display radiation type and energy in the beam info grid:

```text
<div>
  <span className="text-xs text-muted-foreground">Energy</span>
  <p className="font-mono font-semibold">
    {beam.energyLabel || beam.radiationType || '—'}
    {beam.nominalBeamEnergy && (
      <span className="ml-1 text-muted-foreground">
        ({beam.nominalBeamEnergy} MeV)
      </span>
    )}
  </p>
</div>
```

**File: `src/components/comparison/BeamComparisonTable.tsx`**

Add energy column to beam comparison table.

### 6. Update Export Functions

**File: `src/lib/batch/batch-export.ts`**

Include radiation type and energy in CSV/JSON exports:

```text
// CSV headers
headers.push('Radiation Type', 'Energy');

// JSON beam metrics
{
  beamName: b.beamName,
  radiationType: b.radiationType,
  nominalBeamEnergy: b.nominalBeamEnergy,
  energyLabel: b.energyLabel,
  // ... existing fields
}
```

**File: `src/test/export-metrics-json.test.ts`**

Update reference data export to include new fields.

### 7. Update Python Toolkit

**File: `python/rtplan_complexity/types.py`**

Add corresponding fields to Python dataclasses:

```text
@dataclass
class Beam:
    # ... existing
    radiation_type: str = "PHOTON"
    nominal_beam_energy: Optional[float] = None
    energy_label: Optional[str] = None
```

**File: `python/rtplan_complexity/parser.py`**

Parse `NominalBeamEnergy` from control points using pydicom:

```text
def _parse_beam(beam_ds: Dataset) -> Beam:
    # Get energy from first control point
    cp_seq = getattr(beam_ds, "ControlPointSequence", None)
    energy = None
    if cp_seq:
        energy = _get_float(cp_seq[0], "NominalBeamEnergy")
    
    return Beam(
        # ... existing
        radiation_type=_get_string(beam_ds, "RadiationType", "PHOTON"),
        nominal_beam_energy=energy,
        energy_label=_generate_energy_label(radiation_type, energy),
    )
```

### 8. Add Cohort Clustering Dimension

**File: `src/lib/cohort/clustering.ts`**

Add energy-based clustering dimension:

```text
{
  id: 'energy',
  name: 'Beam Energy',
  description: 'Cluster by radiation energy',
  assign: (plan) => {
    const energies = plan.plan.beams.map(b => b.energyLabel).filter(Boolean);
    const unique = [...new Set(energies)];
    return unique.length === 1 ? unique[0] : 'Mixed';
  }
}
```

### 9. Update Tests

**New test file: `src/test/beam-energy.test.ts`**

```text
describe('Beam Energy Parsing', () => {
  it('should extract nominal beam energy from test plans', () => {
    const plan = parseTestPlan(TEST_FILES.TRUEBEAM_PLAN);
    expect(plan.beams[0].nominalBeamEnergy).toBeDefined();
  });

  it('should generate correct energy labels', () => {
    // Test various radiation type + energy combinations
  });
});
```

Update existing test mocks to include new required fields.

---

## Files Changed Summary

| File | Change Type |
|------|-------------|
| `src/lib/dicom/types.ts` | Add energy fields to Beam and BeamMetrics |
| `src/lib/dicom/parser.ts` | Parse NominalBeamEnergy from control points |
| `src/lib/dicom/metrics.ts` | Pass energy info to beam metrics |
| `src/components/viewer/BeamSummaryCard.tsx` | Display energy in UI |
| `src/components/comparison/BeamComparisonTable.tsx` | Add energy column |
| `src/lib/batch/batch-export.ts` | Include energy in exports |
| `src/lib/cohort/clustering.ts` | Add energy clustering dimension |
| `python/rtplan_complexity/types.py` | Add Python type fields |
| `python/rtplan_complexity/parser.py` | Parse energy with pydicom |
| `src/test/clustering.test.ts` | Fix mock beam type + add energy |
| `src/test/metric-utils.test.ts` | Fix mock beam type + add energy |
| `src/test/dicom-metrics.test.ts` | Fix type assertions |
| `src/test/export-metrics-json.test.ts` | Fix type casting |

---

## Testing Strategy

1. **Unit Tests**: Verify energy parsing from test DICOM files
2. **Export Tests**: Confirm energy fields appear in CSV/JSON output
3. **UI Verification**: Check BeamSummaryCard displays energy correctly
4. **Python Parity**: Run cross-validation to ensure TS↔Python consistency
