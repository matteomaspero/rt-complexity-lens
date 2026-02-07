

# Plan: Machine ID to Preset Mapping System

## Summary

Add a system that automatically maps machine IDs/names from DICOM files to specific machine presets, enabling automatic preset selection when plans are loaded. This works across all analysis modes (Single, Batch, Compare, Cohort).

---

## Problem Statement

Currently, users must manually select a machine preset for each session. In clinical workflows:
- The same machine name appears consistently in DICOM files (e.g., "TrueBeam1", "Halcyon2")
- Different institutions may name their machines differently
- Even identical machine models may have site-specific configuration differences
- Users want automatic preset selection based on the machine in the plan

---

## Solution Architecture

```text
+----------------------+     +------------------------+     +------------------+
| DICOM File           |     | Machine Mapping Table  |     | Preset Config    |
|                      |     |                        |     |                  |
| treatmentMachineName |---->| "TrueBeam1" -> truebeam|---->| thresholds +     |
| manufacturer         |     | "Halcyon*"  -> halcyon |     | delivery params  |
+----------------------+     | "LinacA"    -> user_123|     +------------------+
                             +------------------------+
```

---

## Data Model

### New Type: MachineMappingEntry

```typescript
interface MachineMappingEntry {
  id: string;                    // Unique mapping ID
  pattern: string;               // Machine name pattern (exact or wildcard)
  matchType: 'exact' | 'prefix' | 'contains' | 'regex';
  presetId: string;              // Target preset ID (built-in or user)
  manufacturer?: string;         // Optional: only match if manufacturer matches
  priority: number;              // Higher priority wins on multiple matches
  enabled: boolean;              // Toggle mapping on/off
  createdAt: string;
  updatedAt: string;
}
```

### Extended Context State

```typescript
interface ThresholdConfigState {
  // ... existing fields ...
  machineMappings: MachineMappingEntry[];
  autoSelectEnabled: boolean;    // Global toggle for auto-selection
}
```

---

## UI Components

### 1. Machine Mapping Manager (new component)

Location: `src/components/settings/MachineMappingManager.tsx`

Features:
- Table showing current mappings (pattern, preset, priority)
- Add new mapping form
- Edit/delete existing mappings
- Drag-and-drop or manual priority ordering
- Test a machine name against current mappings
- Import/export mappings with presets

### 2. Integration Points

| Mode | Location | Behavior |
|------|----------|----------|
| Single Plan | `InteractiveViewer.tsx` | Auto-select preset when plan loads |
| Batch | `BatchContext.tsx` | Show detected machines, suggest presets |
| Compare | `ComparePlans.tsx` | Auto-select if both plans match same preset |
| Cohort | `CohortContext.tsx` | Group statistics by matched preset |

---

## Matching Algorithm

```text
function findMatchingPreset(machineName: string, manufacturer?: string):
    1. Filter mappings where enabled = true
    2. Sort by priority (descending)
    3. For each mapping:
        a. If manufacturer specified and doesn't match, skip
        b. Check pattern match based on matchType:
           - exact: machineName === pattern
           - prefix: machineName.startsWith(pattern)
           - contains: machineName.includes(pattern)
           - regex: new RegExp(pattern).test(machineName)
        c. If match found, return presetId
    4. Return null (no match, use current selection)
```

---

## User Workflow

### Setting Up Mappings

1. Open Preset Manager dialog
2. Click "Machine Mappings" tab
3. Click "Add Mapping"
4. Enter pattern (e.g., "TrueBeam", "Halcyon*")
5. Select target preset
6. Set priority (optional)
7. Save

### Automatic Selection in Action

1. User uploads DICOM file
2. Parser extracts `treatmentMachineName` (e.g., "TrueBeam1")
3. System checks mapping table
4. Match found: "TrueBeam*" -> "truebeam" preset
5. Preset auto-selected, threshold alerts use TrueBeam values
6. Toast notification: "Machine: TrueBeam1 - Using TrueBeam preset"

---

## Files to Create

| File | Description |
|------|-------------|
| `src/lib/machine-mapping.ts` | Mapping types, matching algorithm, localStorage schema |
| `src/components/settings/MachineMappingManager.tsx` | UI for managing mappings |
| `src/components/settings/MachineMappingEditor.tsx` | Form for editing single mapping |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/ThresholdConfigContext.tsx` | Add mappings state, auto-select logic |
| `src/lib/threshold-definitions.ts` | Export new types |
| `src/components/settings/PresetManager.tsx` | Add tab for machine mappings |
| `src/components/settings/index.ts` | Export new components |
| `src/components/viewer/InteractiveViewer.tsx` | Trigger auto-select on plan load |
| `src/contexts/BatchContext.tsx` | Add machine-based preset detection |
| `src/pages/ComparePlans.tsx` | Handle mixed-machine comparisons |
| `src/pages/CohortAnalysis.tsx` | Show machine distribution in clusters |

---

## Technical Implementation Details

### 1. Machine Mapping Types (src/lib/machine-mapping.ts)

```typescript
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

export function matchMachineToPreset(
  machineName: string | undefined,
  manufacturer: string | undefined,
  mappings: MachineMappingEntry[],
  availablePresetIds: string[]
): string | null;

export function createDefaultMappings(): MachineMappingEntry[];
```

### 2. Context Updates (ThresholdConfigContext.tsx)

New state:
```typescript
machineMappings: MachineMappingEntry[]
autoSelectEnabled: boolean
```

New methods:
```typescript
addMachineMapping(mapping: MachineMappingEntry): void
updateMachineMapping(id: string, mapping: MachineMappingEntry): void
deleteMachineMapping(id: string): void
reorderMachineMappings(ids: string[]): void
findPresetForMachine(machineName?: string, manufacturer?: string): string | null
```

### 3. Auto-Selection Integration

When a plan loads in any mode:
```typescript
const handlePlanLoaded = useCallback((plan: SessionPlan) => {
  // Existing logic...
  
  // Auto-select preset based on machine
  if (autoSelectEnabled) {
    const matchedPreset = findPresetForMachine(
      plan.plan.treatmentMachineName,
      plan.plan.manufacturer
    );
    if (matchedPreset) {
      setPreset(matchedPreset);
      toast({
        title: `Machine: ${plan.plan.treatmentMachineName}`,
        description: `Using ${getPresetName(matchedPreset)} preset`
      });
    }
  }
}, [autoSelectEnabled, findPresetForMachine, setPreset]);
```

### 4. Batch Mode Enhancement

Show detected machines summary:
```typescript
interface BatchMachineSummary {
  machineName: string;
  count: number;
  matchedPreset: string | null;
}
```

Display in BatchSummaryStats:
- "3 machines detected: TrueBeam1 (45 plans), Halcyon2 (12 plans), Unknown (3 plans)"
- Button to apply matched preset to all plans from that machine

---

## Storage Schema

```typescript
const MachineMappingsSchema = z.array(z.object({
  id: z.string(),
  pattern: z.string(),
  matchType: z.enum(['exact', 'prefix', 'contains', 'regex']),
  presetId: z.string(),
  manufacturer: z.string().optional(),
  priority: z.number(),
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
}));

const STORAGE_KEY = 'rtplan-machine-mappings';
```

---

## UI Mockup: Machine Mapping Manager

```text
+----------------------------------------------------------+
| Machine Mappings                                          |
|----------------------------------------------------------|
| [x] Enable auto-select preset based on machine name       |
|                                                           |
| Pattern        | Match Type | Preset      | Actions       |
|----------------|------------|-------------|---------------|
| TrueBeam       | Prefix     | TrueBeam    | [Edit][Del]   |
| Halcyon        | Prefix     | Halcyon     | [Edit][Del]   |
| LINAC-A        | Exact      | My Custom   | [Edit][Del]   |
| VersaHD.*      | Regex      | Versa HD    | [Edit][Del]   |
|                                                           |
| [+ Add Mapping]                                           |
|                                                           |
| Test: [Enter machine name    ] -> Matches: TrueBeam       |
+----------------------------------------------------------+
```

---

## Export/Import Integration

Extend preset export to include mappings:
```json
{
  "version": "1.1",
  "exportDate": "2026-02-07T...",
  "presets": [...],
  "machineMappings": [
    {
      "pattern": "TrueBeam",
      "matchType": "prefix",
      "presetId": "truebeam",
      "priority": 100,
      "enabled": true
    }
  ]
}
```

---

## Default Mappings

Pre-configured suggestions (user can modify):

| Pattern | Match Type | Preset |
|---------|------------|--------|
| TrueBeam | prefix | truebeam |
| Halcyon | prefix | halcyon |
| VersaHD | prefix | versa_hd |
| VERSA | prefix | versa_hd |
| Agility | contains | versa_hd |

---

## Edge Cases Handled

1. **No machine name in DICOM**: Skip auto-selection, show info message
2. **Multiple matches**: Use highest priority mapping
3. **Deleted preset reference**: Fall back to generic, show warning
4. **User preset deleted**: Remove associated mappings or warn
5. **Regex errors**: Catch and treat as no-match
6. **Mixed machines in batch**: Show summary, let user choose per-machine or global preset

---

## Estimated Changes

| File | Lines Added/Modified |
|------|---------------------|
| `src/lib/machine-mapping.ts` | ~120 lines (new) |
| `src/components/settings/MachineMappingManager.tsx` | ~200 lines (new) |
| `src/components/settings/MachineMappingEditor.tsx` | ~150 lines (new) |
| `src/contexts/ThresholdConfigContext.tsx` | ~60 lines |
| `src/components/settings/PresetManager.tsx` | ~30 lines |
| `src/components/viewer/InteractiveViewer.tsx` | ~15 lines |
| `src/contexts/BatchContext.tsx` | ~40 lines |
| Other mode files | ~30 lines each |

**Total: ~650 lines across 10+ files**

