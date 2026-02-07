

# Plan: Add Demo Data Loading to All Modes

## Summary

Extend the demo data loading functionality (currently only in Single Plan mode) to work across all analysis modes: **Batch**, **Compare**, and **Cohort**. This allows users to quickly test functionality without needing their own DICOM files.

---

## Current State

The existing `DemoLoader` component in Single Plan mode:
- Has 8 test files available in `/public/test-data/`
- Loads a single plan on click with a "Load Demo Plan" button
- Has an expandable section showing all available test files

### Available Demo Files

| Name | File | Type |
|------|------|------|
| VMAT Complex | RP1.2.752.243.1.1.20230623170950828.2520.26087.dcm | VMAT |
| Monaco PT 01 | RTPLAN_MO_PT_01.dcm | Monaco |
| Monaco PT 02 | RTPLAN_MO_PT_02.dcm | Monaco |
| Monaco PT 03 | RTPLAN_MO_PT_03.dcm | Monaco |
| Monaco PT 04 | RTPLAN_MO_PT_04.dcm | Monaco |
| Monaco Penalty | RTPLAN_MR_PT_01_PENALTY.dcm | Monaco |
| TG-119 7F | RP.TG119.PR_ETH_7F.dcm | Test |
| TG-119 2A | RP.TG119.PR_ETH_2A_2.dcm | Test |

---

## Solution Design

### 1. Create Shared Demo Data Module

Create a centralized module with demo file definitions and loading utilities that can be reused across all modes.

**New file**: `src/lib/demo-data.ts`

```typescript
export const DEMO_FILES = [
  { name: 'VMAT Complex', file: 'RP1.2.752...dcm', category: 'vmat' },
  { name: 'Monaco PT 01', file: 'RTPLAN_MO_PT_01.dcm', category: 'monaco' },
  // ... all 8 files with categories
];

export async function loadDemoFile(filename: string): Promise<SessionPlan>;
export async function loadAllDemoFiles(): Promise<SessionPlan[]>;
export async function loadDemoFilesByCategory(category: string): Promise<SessionPlan[]>;
```

### 2. Mode-Specific Demo Loaders

#### Batch Mode: BatchDemoLoader

- **Quick Load All**: Button to load all 8 demo plans at once
- **Category Selection**: Load only Monaco plans, or only TG-119 plans
- Integrates with existing `BatchUploadZone` component

#### Compare Mode: ComparisonDemoLoader  

- **Plan Pair Selection**: Dropdown or grid to select which two plans to compare
- **Suggested Pairs**: Pre-configured interesting comparisons:
  - Monaco PT 01 vs PT 02 (same system, different optimization)
  - TG-119 7F vs 2A (different techniques)
  - Monaco vs TG-119 (cross-system)

#### Cohort Mode: CohortDemoLoader

- **Load All**: Button to load all 8 plans for cohort analysis
- **Load by Group**: Monaco plans only (4), TG-119 plans only (2)
- Shows count of plans being loaded

---

## UI Mockups

### Batch Mode

```text
+----------------------------------------------------------+
| [Drop DICOM files here or click to browse]               |
|----------------------------------------------------------|
|                                                           |
| Or try with demo data:                                   |
| [Load All 8 Demo Plans]  [Monaco Only (4)]  [TG-119 (2)] |
+----------------------------------------------------------+
```

### Compare Mode

```text
+------------------------+    +------------------------+
| Plan A (Reference)     |    | Plan B (Comparison)    |
|                        |    |                        |
| [Drop file...]         |    | [Drop file...]         |
|                        |    |                        |
| [Use Demo ▼]           |    | [Use Demo ▼]           |
+------------------------+    +------------------------+
         ↓                              ↓
   Dropdown with all          Dropdown with all
   8 demo plans               8 demo plans
```

### Cohort Mode

```text
+----------------------------------------------------------+
| [Drop DICOM files or ZIP archives here]                  |
|----------------------------------------------------------|
| Or load demo data for testing:                           |
|                                                           |
| [Load All 8 Plans]                                       |
|                                                           |
| Load by category:                                        |
| [Monaco (4 plans)]  [TG-119 (2 plans)]  [VMAT (1 plan)]  |
+----------------------------------------------------------+
```

---

## Files to Create

| File | Description |
|------|-------------|
| `src/lib/demo-data.ts` | Shared demo file definitions and loading utilities |
| `src/components/batch/BatchDemoLoader.tsx` | Demo loader for batch mode |
| `src/components/comparison/ComparisonDemoSelect.tsx` | Demo plan selector dropdown for compare mode |
| `src/components/cohort/CohortDemoLoader.tsx` | Demo loader for cohort mode |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/viewer/DemoLoader.tsx` | Refactor to use shared `demo-data.ts` |
| `src/components/batch/BatchUploadZone.tsx` | Add demo loader section |
| `src/components/batch/index.ts` | Export new component |
| `src/components/comparison/ComparisonUploadZone.tsx` | Add demo plan selector dropdown |
| `src/components/comparison/index.ts` | Export new component |
| `src/components/cohort/CohortUploadZone.tsx` | Add demo loader section |
| `src/components/cohort/index.ts` | Export new component |

---

## Technical Implementation

### 1. Shared Demo Data Module (src/lib/demo-data.ts)

```typescript
import { parseRTPlan, calculatePlanMetrics } from '@/lib/dicom';
import type { SessionPlan } from '@/lib/dicom/types';

export interface DemoFile {
  name: string;
  file: string;
  category: 'vmat' | 'monaco' | 'tg119';
  description?: string;
}

export const DEMO_FILES: DemoFile[] = [
  { name: 'VMAT Complex', file: 'RP1.2.752...dcm', category: 'vmat' },
  { name: 'Monaco PT 01', file: 'RTPLAN_MO_PT_01.dcm', category: 'monaco' },
  { name: 'Monaco PT 02', file: 'RTPLAN_MO_PT_02.dcm', category: 'monaco' },
  { name: 'Monaco PT 03', file: 'RTPLAN_MO_PT_03.dcm', category: 'monaco' },
  { name: 'Monaco PT 04', file: 'RTPLAN_MO_PT_04.dcm', category: 'monaco' },
  { name: 'Monaco Penalty', file: 'RTPLAN_MR_PT_01_PENALTY.dcm', category: 'monaco' },
  { name: 'TG-119 7F', file: 'RP.TG119.PR_ETH_7F.dcm', category: 'tg119' },
  { name: 'TG-119 2A', file: 'RP.TG119.PR_ETH_2A_2.dcm', category: 'tg119' },
];

export async function loadDemoFile(demoFile: DemoFile): Promise<SessionPlan> {
  const response = await fetch(`/test-data/${demoFile.file}`);
  const arrayBuffer = await response.arrayBuffer();
  const plan = parseRTPlan(arrayBuffer, demoFile.file);
  const metrics = calculatePlanMetrics(plan);
  
  return {
    id: crypto.randomUUID(),
    fileName: demoFile.file,
    uploadTime: new Date(),
    plan,
    metrics,
  };
}

export async function loadMultipleDemoFiles(
  files: DemoFile[],
  onProgress?: (loaded: number, total: number) => void
): Promise<SessionPlan[]> {
  const results: SessionPlan[] = [];
  for (let i = 0; i < files.length; i++) {
    const plan = await loadDemoFile(files[i]);
    results.push(plan);
    onProgress?.(i + 1, files.length);
  }
  return results;
}

export function getDemoFilesByCategory(category: DemoFile['category']): DemoFile[] {
  return DEMO_FILES.filter(f => f.category === category);
}
```

### 2. Batch Mode Demo Loader

Adds a section below the upload zone with category buttons:
- "Load All (8)" - loads all demo files
- "Monaco (5)" - loads Monaco category
- "TG-119 (2)" - loads TG-119 category

Uses the batch context's `addPlans` but with pre-loaded SessionPlans instead of Files.

### 3. Compare Mode Demo Selector

Adds a dropdown inside each ComparisonUploadZone:
- Trigger: "Use Demo" button below upload area
- Content: List of all 8 demo files
- On select: Loads that plan into the slot

### 4. Cohort Mode Demo Loader

Similar to Batch mode but integrated into CohortUploadZone:
- Quick load buttons for categories
- Progress indicator during batch load

---

## User Experience

### Batch Mode Flow

1. User navigates to Batch Analysis
2. Sees upload zone with "Or try with demo data:" section
3. Clicks "Load All 8 Demo Plans"
4. Progress bar shows loading (already exists)
5. All demo plans appear in results table

### Compare Mode Flow

1. User navigates to Compare Plans
2. Each upload zone has a "Use Demo" dropdown
3. User selects "Monaco PT 01" for Plan A
4. User selects "Monaco PT 02" for Plan B
5. Comparison view populates automatically

### Cohort Mode Flow

1. User navigates to Cohort Analysis
2. Sees upload zone with demo options below
3. Clicks "Load All 8 Plans" or a category
4. Plans load with progress indicator
5. Clustering and statistics appear

---

## Estimated Changes

| File | Lines Added/Modified |
|------|---------------------|
| `src/lib/demo-data.ts` | ~60 lines (new) |
| `src/components/batch/BatchDemoLoader.tsx` | ~80 lines (new) |
| `src/components/comparison/ComparisonDemoSelect.tsx` | ~70 lines (new) |
| `src/components/cohort/CohortDemoLoader.tsx` | ~80 lines (new) |
| `src/components/viewer/DemoLoader.tsx` | ~20 lines (refactor) |
| `src/components/batch/BatchUploadZone.tsx` | ~15 lines |
| `src/components/comparison/ComparisonUploadZone.tsx` | ~20 lines |
| `src/components/cohort/CohortUploadZone.tsx` | ~15 lines |
| Index files (3) | ~6 lines |

**Total: ~366 lines across 10 files**

---

## Edge Cases

1. **Loading in progress**: Disable demo buttons while plans are being processed
2. **Mixed demo and user files**: Demo plans can be added alongside user uploads
3. **Error handling**: Show toast if demo file fails to load
4. **Compare mode reset**: Selecting new demo replaces current plan in that slot

