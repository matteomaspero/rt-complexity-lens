

# Auto-Match Machine Preset from DICOM Metadata

## What This Solves

The DICOM RT Plan file already contains the treatment machine name (tag 300A,00B2) and manufacturer (0008,0070). The app has a complete machine mapping system (`findPresetForMachine`) that can match these to presets, but it is **never called** -- the user must always manually select a preset. This change wires up the auto-detection so that:

1. **Single Plan Viewer**: After loading a plan, the machine preset auto-switches to match the DICOM machine name (with a toast notification)
2. **Batch Analysis**: Each plan's machine name is displayed in the results table, and the global preset auto-switches to match the first loaded plan's machine (or shows a warning if plans have mixed machines)
3. **Machine name is read per-beam** (DICOM standard), stored on the `Beam` type, and the plan-level name uses the first beam's value

## Technical Changes

### 1. Parse Machine Name Per-Beam (DICOM Standard Fix)

**`src/lib/dicom/types.ts`**
- Add `treatmentMachineName?: string` to the `Beam` interface

**`src/lib/dicom/parser.ts`**
- In `parseBeam()`: read `TreatmentMachineName` from `beamDataSet` and include it in the returned `Beam` object
- Plan-level `treatmentMachineName` remains as-is (first beam's value) for backward compatibility

### 2. Auto-Select Preset on Single Plan Load

**`src/components/viewer/InteractiveViewer.tsx`**
- Import `useThresholdConfig`
- In `handlePlanLoaded`, call `findPresetForMachine(plan.treatmentMachineName, plan.manufacturer)`
- If a match is found, call `setPreset(matchedPresetId)` and `setEnabled(true)`
- Show a toast: "Machine detected: TrueBeam -- switched to Varian TrueBeam preset"
- Only auto-switch if `autoSelectEnabled` is true (respects user setting)

### 3. Show Machine Name in Batch Results + Auto-Select

**`src/components/batch/BatchResultsTable.tsx`**
- Add a "Machine" column showing `plan.treatmentMachineName` (or "---" if absent)
- Add machine name to the filter/sort options

**`src/pages/BatchDashboard.tsx`**
- After batch processing completes, check the first successful plan's `treatmentMachineName`
- Call `findPresetForMachine()` and auto-switch the global preset if a match is found
- If multiple distinct machine names exist in the batch, show an info toast: "Mixed machines detected -- using preset for [first machine]"

### 4. Show Detected Machine in Plan Info Areas

**`src/components/viewer/BeamSummaryCard.tsx`**
- Display the per-beam `treatmentMachineName` if present (useful when different beams are planned on different machines, which is rare but valid)

### 5. Comparison Mode Auto-Match

**`src/pages/ComparePlans.tsx`**
- When Plan A is loaded, auto-switch preset to match its machine (same logic as single plan)

## Files Modified

| File | Change |
|---|---|
| `src/lib/dicom/types.ts` | Add `treatmentMachineName` to `Beam` interface |
| `src/lib/dicom/parser.ts` | Read machine name per-beam in `parseBeam()` |
| `src/components/viewer/InteractiveViewer.tsx` | Auto-select preset on plan load via `findPresetForMachine` |
| `src/pages/BatchDashboard.tsx` | Auto-select preset from first plan's machine; mixed-machine warning |
| `src/components/batch/BatchResultsTable.tsx` | Add Machine column |
| `src/components/viewer/BeamSummaryCard.tsx` | Show per-beam machine name |
| `src/pages/ComparePlans.tsx` | Auto-select preset on Plan A load |

No new files, no new dependencies.

