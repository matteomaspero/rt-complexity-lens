

# New Features: Plan Comparison & Batch Analysis Dashboard

## Overview

This plan introduces two major features:
1. **Plan Comparison Mode** - Side-by-side diff view of two RT plans with control point-level comparison
2. **Batch Analysis Dashboard** - Multi-plan analysis with import/export capabilities

---

## Feature 1: Plan Comparison Mode

### 1.1 Concept

Enable users to load two plans and compare them like a git diff, highlighting differences in:
- Plan-level metrics (MCS, LSV, AAV, etc.)
- Beam configuration (gantry angles, MU distribution)
- Control point-level differences (MLC positions, aperture shapes)

### 1.2 UI Design

```text
+-- Comparison Mode Header ----------------------------------+
| Plan A: VMAT_v1.dcm        vs        Plan B: VMAT_v2.dcm  |
| [Change Plan A]                      [Change Plan B]      |
+-----------------------------------------------------------+

+-- Summary Comparison Card ---------------------------------+
| Metric      | Plan A  | Plan B  | Diff    | Status        |
|-------------|---------|---------|---------|---------------|
| MCS         | 0.4521  | 0.3892  | -0.0629 | -13.9%  (-)   |
| LSV         | 0.9234  | 0.8876  | -0.0358 | -3.9%   (-)   |
| Total MU    | 324.5   | 351.2   | +26.7   | +8.2%   (+)   |
| Est. Time   | 0:52    | 0:58    | +6s     | +11.5%  (+)   |
+-----------------------------------------------------------+

+-- Beam Comparison -----------------------------------------+
| Beam       | CPs A | CPs B | MU A    | MU B    | Diff    |
|------------|-------|-------|---------|---------|---------|
| Arc1_CW    | 178   | 182   | 162.3   | 175.6   | +8.2%   |
| Arc2_CCW   | 178   | 182   | 162.2   | 175.6   | +8.3%   |
+-----------------------------------------------------------+

+-- Control Point Comparison --------------------------------+
| [Slider: CP 1-178]                                        |
|                                                           |
| +-- Plan A Aperture --+    +-- Plan B Aperture --+       |
| |  [MLC Viewer]       |    |  [MLC Viewer]       |       |
| |  Gantry: 181.0°     |    |  Gantry: 181.0°     |       |
| |  Area: 15.2 cm²     |    |  Area: 18.4 cm²     |       |
| +---------------------+    +---------------------+       |
|                                                           |
| Difference Overlay: [Highlight areas that differ]        |
+-----------------------------------------------------------+
```

### 1.3 Key Comparison Features

| Feature | Description |
|---------|-------------|
| **Metric Diff Table** | Side-by-side comparison with % change and direction indicators |
| **Beam Matching** | Match beams by name or gantry range for comparison |
| **CP Synchronization** | Linked scrubber to navigate both plans simultaneously |
| **MLC Overlay** | Overlay apertures from both plans with diff highlighting |
| **Chart Comparison** | Split or overlay charts showing both plans' data |

### 1.4 Diff Highlighting Logic

Color-code differences:
- **Green**: Plan B is better (lower complexity, shorter time)
- **Red**: Plan B is worse (higher complexity, longer time)
- **Yellow**: Significant structural change (different beam count, CPs)
- **Gray**: No meaningful difference (< 1%)

---

## Feature 2: Batch Analysis Dashboard

### 2.1 Concept

A dedicated dashboard for analyzing multiple plans at once, with:
- Bulk file import (drag multiple files)
- Summary statistics across all plans
- Sortable/filterable results table
- CSV/JSON export of all metrics
- Visual distribution charts

### 2.2 UI Design

```text
+-- Batch Analysis Dashboard --------------------------------+
| [Import Plans]                    [Clear All] [Export All]|
+-----------------------------------------------------------+

+-- Import Zone ---------------------------------------------+
| +-------------------------------------------------------+ |
| |  Drop multiple DICOM-RT Plan files here               | |
| |  or click to browse (supports 10+ files)              | |
| +-------------------------------------------------------+ |
|                                                           |
| Processing: [=====>        ] 5/12 plans                   |
+-----------------------------------------------------------+

+-- Summary Statistics --------------------------------------+
| Plans Analyzed: 12                                        |
|                                                           |
| +-- Metric Ranges --+  +-- Distribution Chart --+        |
| | MCS: 0.28 - 0.52  |  | [Box plot or histogram] |       |
| | LSV: 0.78 - 0.96  |  |                         |        |
| | MU:  285 - 412    |  |                         |        |
| +-------------------+  +-------------------------+        |
+-----------------------------------------------------------+

+-- Results Table -------------------------------------------+
| [Search: ________]  [Filter: Technique v] [Sort: MCS v]  |
|                                                           |
| | File         | Label    | Tech  | MCS   | LSV   | MU   ||
| |--------------|----------|-------|-------|-------|------||
| | plan_01.dcm  | VMAT_1   | VMAT  | 0.421 | 0.912 | 324  ||
| | plan_02.dcm  | IMRT_HN  | IMRT  | 0.382 | 0.887 | 512  ||
| | plan_03.dcm  | VMAT_2   | VMAT  | 0.456 | 0.934 | 298  ||
| [Select rows to compare or export]                        |
+-----------------------------------------------------------+

+-- Export Options ------------------------------------------+
| Format: [CSV v] [JSON] [Summary PDF]                      |
| Include: [x] Plan metrics  [x] Beam metrics               |
|          [ ] Control point data                           |
| [Download Selected] [Download All]                        |
+-----------------------------------------------------------+
```

### 2.3 Key Dashboard Features

| Feature | Description |
|---------|-------------|
| **Multi-file Upload** | Drop/select multiple DICOM files at once |
| **Progress Indicator** | Show parsing progress for large batches |
| **Summary Stats** | Min, max, mean, std dev for each metric |
| **Distribution Charts** | Histograms or box plots for metric distributions |
| **Sortable Table** | Click column headers to sort |
| **Filtering** | Filter by technique (VMAT/IMRT), date, MU range |
| **Row Selection** | Select specific plans to compare or export |
| **Export Formats** | CSV (detailed), JSON (programmable), PDF (summary) |

---

## Architecture

### 3.1 New Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `Index` | Single plan viewer (existing) |
| `/compare` | `ComparePlans` | Two-plan comparison mode |
| `/batch` | `BatchDashboard` | Multi-plan analysis dashboard |

### 3.2 New Files

```text
src/
  pages/
    ComparePlans.tsx          # Comparison page
    BatchDashboard.tsx        # Batch analysis page
  
  components/
    comparison/
      ComparisonHeader.tsx    # Plan A vs Plan B header
      MetricsDiffTable.tsx    # Side-by-side metrics table
      BeamComparisonTable.tsx # Beam-level comparison
      CPComparisonViewer.tsx  # Synced control point viewers
      ApertureDiffOverlay.tsx # MLC difference overlay
      ComparisonCharts.tsx    # Overlay/split charts
    
    batch/
      BatchUploadZone.tsx     # Multi-file uploader
      BatchProgressBar.tsx    # Parsing progress
      BatchSummaryStats.tsx   # Aggregate statistics
      BatchResultsTable.tsx   # Sortable results table
      BatchDistributionChart.tsx # Metric distributions
      BatchExportPanel.tsx    # Export controls
  
  lib/
    comparison/
      diff-calculator.ts      # Calculate metric differences
      beam-matcher.ts         # Match beams between plans
      cp-aligner.ts           # Align control points for comparison
    
    batch/
      batch-processor.ts      # Process multiple files
      batch-export.ts         # Export to CSV/JSON/PDF
      batch-statistics.ts     # Calculate summary stats
  
  contexts/
    BatchContext.tsx          # Store multiple analyzed plans
```

### 3.3 Shared State for Batch Plans

```typescript
// BatchContext.tsx
interface BatchPlan {
  id: string;
  fileName: string;
  uploadTime: Date;
  plan: RTPlan;
  metrics: PlanMetrics;
  status: 'pending' | 'parsing' | 'success' | 'error';
  error?: string;
}

interface BatchContextType {
  plans: BatchPlan[];
  addPlans: (files: File[]) => Promise<void>;
  removePlan: (id: string) => void;
  clearAll: () => void;
  isProcessing: boolean;
  progress: { current: number; total: number };
}
```

---

## Technical Details

### 4.1 Plan Comparison Logic

```typescript
// diff-calculator.ts
interface MetricDiff {
  metric: string;
  planA: number;
  planB: number;
  absoluteDiff: number;
  percentDiff: number;
  direction: 'increase' | 'decrease' | 'same';
  significance: 'minor' | 'moderate' | 'major';
}

function calculatePlanDiff(
  planA: SessionPlan, 
  planB: SessionPlan
): PlanComparison {
  // Compare plan-level metrics
  // Match beams by name or angle
  // Align control points for per-CP comparison
}
```

### 4.2 Beam Matching Algorithm

For comparing beams between plans:

```text
1. Try exact name match (Arc1_CW == Arc1_CW)
2. Try gantry range match (181-179 CW == 181-179 CW)
3. Try MU-weighted similarity
4. Flag unmatched beams as "Added" or "Removed"
```

### 4.3 Control Point Alignment

Two options for CP comparison:
1. **Index-based**: CP 45 in Plan A vs CP 45 in Plan B
2. **Gantry-based**: CP at 90° in Plan A vs CP at 90° in Plan B

### 4.4 Batch Export Formats

**CSV Export:**
```csv
File,Plan Label,Technique,Beams,Total MU,MCS,LSV,AAV,MFA,LT,Est Time
plan_01.dcm,VMAT_1,VMAT,2,324.5,0.4521,0.9234,0.3421,24.5,12450,52
plan_02.dcm,IMRT_HN,IMRT,7,512.3,0.3829,0.8876,0.4102,18.2,28340,124
```

**JSON Export:**
```json
{
  "exportDate": "2025-02-06T...",
  "plans": [
    {
      "fileName": "plan_01.dcm",
      "planLabel": "VMAT_1",
      "metrics": { "MCS": 0.4521, ... },
      "beamMetrics": [...]
    }
  ],
  "summary": {
    "MCS": { "min": 0.28, "max": 0.52, "mean": 0.41, "std": 0.08 }
  }
}
```

---

## Navigation Integration

### 5.1 Updated Landing Page

Add mode selection to the initial upload screen:

```text
+-- RT Plan Complexity Analyzer -----------------------------+
|                                                            |
|  [===========================================]             |
|  [  Drop DICOM-RT Plan file here            ]             |
|  [  or click to browse                      ]             |
|  [===========================================]             |
|                                                            |
|  -------------- or select a mode ---------------          |
|                                                            |
|  [ Compare Two Plans ]    [ Batch Analysis ]              |
|                                                            |
+------------------------------------------------------------+
```

### 5.2 Header Navigation

Add navigation between modes when a plan is loaded:

```text
+-- Header --------------------------------------------------+
| RT Plan Analyzer  | Single | Compare | Batch |    [Help]  |
+------------------------------------------------------------+
```

---

## Implementation Phases

### Phase 1: Batch Analysis (Simpler, More Utility)
1. Create `/batch` route and `BatchDashboard` page
2. Build `BatchUploadZone` for multi-file upload
3. Create `BatchContext` for storing multiple plans
4. Build results table with sorting/filtering
5. Add CSV/JSON export functionality
6. Add summary statistics and distribution charts

### Phase 2: Plan Comparison
1. Create `/compare` route and `ComparePlans` page
2. Build comparison header with dual upload zones
3. Implement metric diff calculation
4. Build beam matching algorithm
5. Create synchronized CP viewer with MLC overlay
6. Add comparison charts

---

## Success Criteria

### Batch Analysis
- Upload and parse 10+ plans without browser freeze
- Sort table by any metric column
- Filter by technique type
- Export selected or all plans to CSV
- Show min/max/mean for each metric

### Plan Comparison
- Load two plans side-by-side
- Show metric differences with % change
- Match beams automatically or manually
- Synchronized control point scrubbing
- Visual MLC aperture difference overlay

