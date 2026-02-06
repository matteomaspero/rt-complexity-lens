
# Plan: Machine Presets Enhancement, Metrics Consistency, and Documentation Update

## Summary
This plan addresses three key areas:
1. **Editable Machine Presets** - Allow users to modify, save, and import/export machine presets that work consistently across Single Plan Analysis, Batch Analysis, and Plan Comparison
2. **Display Preferences Consistency** - Ensure all metrics from `METRIC_DEFINITIONS` appear in Display Preferences and Help documentation
3. **Website and README Updates** - Update the page title, meta tags, and README to reflect the actual application

---

## Part 1: Editable Machine Presets with Import/Export

### Current State
- Machine presets are defined as constants in `src/lib/threshold-definitions.ts`
- Thresholds can only be modified when "Custom" preset is selected
- The preset configuration is stored in `ThresholdConfigContext` with localStorage persistence
- Batch analysis and Compare Plans pages do NOT use the threshold configuration

### Changes Required

#### 1.1 Extend Threshold Definitions
**File: `src/lib/threshold-definitions.ts`**
- Add a `UserPreset` interface for user-created presets
- Add functions for preset serialization/validation for import/export
- Include both threshold values AND machine delivery parameters in exports

#### 1.2 Enhance ThresholdConfigContext
**File: `src/contexts/ThresholdConfigContext.tsx`**
- Add `userPresets` state to store user-created/modified presets
- Add functions:
  - `saveCurrentAsPreset(name: string)` - Save current settings as a new preset
  - `updatePresetName(presetId: string, name: string)` - Rename a preset
  - `deleteUserPreset(presetId: string)` - Remove a user preset
  - `exportPresets()` - Export all presets (or selected) to JSON
  - `importPresets(json: string)` - Import presets from JSON file
  - `duplicatePreset(presetId: string)` - Clone a preset for editing
- Add `userPresets` to localStorage persistence
- Add machine delivery parameter editing for custom presets

#### 1.3 Create Preset Manager Component
**New File: `src/components/settings/PresetManager.tsx`**
- UI for managing user presets:
  - List of built-in and user presets
  - Edit button to modify preset thresholds AND delivery parameters
  - Duplicate/Clone preset
  - Delete user preset (built-ins cannot be deleted)
  - Rename user preset
- Import/Export buttons:
  - Export button: Downloads JSON file with selected presets
  - Import button: Opens file picker, validates JSON, adds presets

#### 1.4 Update ThresholdSettings Component
**File: `src/components/viewer/ThresholdSettings.tsx`**
- Add machine delivery parameters editor (dose rate, gantry speed, MLC speed)
- Add "Save as New Preset" button when modifying custom/user preset
- Add link/button to open full Preset Manager
- Show user presets in the preset selector dropdown

#### 1.5 Integrate with Batch Analysis
**File: `src/pages/BatchDashboard.tsx`**
- Add machine preset selector to the batch dashboard header
- Use selected preset's delivery parameters when calculating metrics

**File: `src/contexts/BatchContext.tsx`**
- Accept machine parameters when calling `calculatePlanMetrics`
- Re-calculate metrics when preset changes (optional - could just use for new uploads)

#### 1.6 Integrate with Plan Comparison
**File: `src/pages/ComparePlans.tsx`**
- Add machine preset selector to comparison header
- Show threshold status indicators in the metrics diff table

---

## Part 2: Display Preferences - All Metrics

### Current State
- `METRIC_DEFINITIONS` contains 20 metrics
- `MetricsSettings.tsx` shows all metrics via `getMetricsByCategory()`
- `MetricsPanel.tsx` shows a subset of metrics conditionally
- Help page shows all metrics from `METRIC_DEFINITIONS`

### Issue Found
The MetricsPanel component doesn't display all available metrics for beam-level data. Some metrics like:
- `SAS5`, `SAS10` (shown at plan level but not beam)
- `EM`, `PI` (shown at plan level but not beam)
- `estimatedDeliveryTime`, `MUperDegree`, `avgDoseRate`, `avgMLCSpeed` (beam-level, not shown)
- `collimatorAngle` (defined but not shown)

### Changes Required

#### 2.1 Update MetricsPanel
**File: `src/components/viewer/MetricsPanel.tsx`**
- Add missing beam-level metrics when enabled:
  - `LT`, `LTMCS` for beam
  - `SAS5`, `SAS10`, `EM`, `PI` for beam
  - `estimatedDeliveryTime`, `MUperDegree`, `avgDoseRate`, `avgMLCSpeed`
  - `collimatorAngle` (start/end values)

---

## Part 3: Website and README Updates

### Changes Required

#### 3.1 Update index.html
**File: `index.html`**
- Change `<title>` from "Lovable App" to "RT Plan Complexity Analyzer"
- Update `og:title` to "RT Plan Complexity Analyzer"
- Update `og:description` to "Browser-based DICOM-RT Plan complexity analysis using UCoMX metrics"
- Update `meta description` for SEO

#### 3.2 Update README.md
**File: `README.md`**
Replace the generic Lovable template with project-specific documentation:
- Project name and description
- Features overview:
  - Single plan analysis with MLC visualization
  - Batch analysis with ZIP support
  - Plan comparison with side-by-side diff
  - Configurable machine presets
  - CSV export
- UCoMX metrics overview
- Technology stack
- How to use
- References (UCoMX, key publications)
- License/disclaimer

---

## Technical Implementation Details

### Preset Export/Import Format (JSON Schema)
```text
+------------------------------------------+
| RT Plan Analyzer Preset Export           |
+------------------------------------------+
| {                                        |
|   version: "1.0",                        |
|   exportDate: "2026-02-06T...",          |
|   presets: [                             |
|     {                                    |
|       id: "user_preset_1",               |
|       name: "My TrueBeam",               |
|       description: "...",                |
|       thresholds: { MCS: {...}, ... },   |
|       deliveryParams: {                  |
|         maxDoseRate: 600,                |
|         maxGantrySpeed: 6.0,             |
|         maxMLCSpeed: 25,                 |
|         mlcType: "MLCX"                  |
|       }                                  |
|     }                                    |
|   ]                                      |
| }                                        |
+------------------------------------------+
```

### New File Structure
```text
src/
├── components/
│   └── settings/
│       ├── PresetManager.tsx         # Full preset management UI
│       ├── PresetEditor.tsx          # Edit thresholds + delivery params
│       ├── PresetExportImport.tsx    # Export/Import dialogs
│       └── index.ts
├── contexts/
│   └── ThresholdConfigContext.tsx    # Enhanced with user presets
└── lib/
    └── threshold-definitions.ts      # Extended with export/import utils
```

### localStorage Keys
- `rtplan-threshold-config` - Current selection and custom thresholds (existing)
- `rtplan-user-presets` - Array of user-created presets (new)

---

## Files to Create
1. `src/components/settings/PresetManager.tsx`
2. `src/components/settings/PresetEditor.tsx`
3. `src/components/settings/PresetExportImport.tsx`
4. `src/components/settings/index.ts`

## Files to Modify
1. `src/lib/threshold-definitions.ts` - Add export/import utilities
2. `src/contexts/ThresholdConfigContext.tsx` - Add user preset management
3. `src/components/viewer/ThresholdSettings.tsx` - Add delivery params, preset actions
4. `src/components/viewer/MetricsPanel.tsx` - Show all enabled beam metrics
5. `src/pages/BatchDashboard.tsx` - Add preset selector, use delivery params
6. `src/contexts/BatchContext.tsx` - Accept machine params for calculations
7. `src/pages/ComparePlans.tsx` - Add preset selector
8. `index.html` - Update title and meta tags
9. `README.md` - Complete rewrite with project documentation
