# Plan: Align Visualization Order and Export with Plan+Beam Rows

## Overview

Three changes: (1) reorder metric visualizations across all modes to match the export column order (demographic, plan overview, Plan Info/Delivery first, then Geometric, Complexity, Deliverability); (2) expand the  comparison diff table to include ALL metrics; (3) change CSV export to include both plan-total and per-beam rows in a single file by default.

---

## 1. Reorder Metric Visualization Categories

The export uses this order: Plan Info, Prescription, Delivery, Geometric, Complexity (Primary), Complexity (Secondary), Deliverability. But the `MetricsPanel` displays: Primary Complexity, Secondary, Accuracy, Deliverability, Delivery (delivery parameters last).

### Changes

**File: `src/components/viewer/MetricsPanel.tsx**`

- Change `CATEGORY_ORDER` from `['primary', 'secondary', 'accuracy', 'deliverability', 'delivery']` to `['delivery', 'primary', 'accuracy', 'secondary', 'deliverability']`
- This puts delivery parameters (MU, time, dose rate, fractions, etc.) first, matching the export order

**File: `src/lib/metrics-definitions.ts**`

- Remap categories to align with export grouping:
  - `MFA`, `EFS`, `PA`, `JA`, `psmall` should be in a "geometric" style group shown early
  - Currently `MFA` is "primary", `EFS`/`psmall` are "accuracy", `PA`/`JA` are "deliverability" -- these are scattered. No structural change needed for the definitions file since the display order is controlled by `CATEGORY_ORDER`, but consider whether category labels need updating for consistency.

---

## 2. Expand Comparison MetricsDiffTable to All Metrics

Currently `MetricsDiffTable` hardcodes only 12 metrics. It should compare ALL available metrics, organized in the same category groups as the export.

### Changes

**File: `src/lib/comparison/diff-calculator.ts**`

- Replace the hardcoded list in `calculatePlanComparison` with a loop over ALL metric keys from `PLAN_COLUMNS` (imported from `export-utils.ts`) or from `METRIC_DEFINITIONS`
- For each numeric metric on `PlanMetrics`, create a `MetricDiff` entry
- Add missing metrics: GT, EFS, PA, JA, psmall, TG, PM, MD, MI, MUCA, LTMU, LTNLMU, LNA, LTAL, GS, mGSV, LS, mDRV, prescribedDose, dosePerFraction, numberOfFractions, MUperGy, MAD, LG

**File: `src/components/comparison/MetricsDiffTable.tsx**`

- Remove the hardcoded `primaryMetrics` / `secondaryMetrics` filter lists
- Instead, group the comparison results by category (matching the export column order): Plan Info, Prescription, Delivery, Geometric, Complexity (Primary), Complexity (Secondary), Deliverability
- Show all groups expanded (no "Show additional metrics" toggle needed since categories provide the organization)
- Each category gets its own section header row in the table

---

## 3. Combined Plan+Beam CSV Export

Currently the plan-level CSV has one row per plan, and beams go to a separate file. The user wants both in a single file: first a "Total" row with plan-level metrics, then individual beam rows.

### Changes

**File: `src/lib/export-utils.ts**`

Create a new function `planWithBeamsToCSV(plans)` that produces:

```text
Category Row: Plan Info,,,,,,...,Delivery,...,Geometric,...,Complexity,...
Header Row:   File,Patient ID,...,Beam,Level,...,Total MU,...,MFA,...,MCS,...
plan1.dcm,John,Head,...,ALL,Plan,450.0,...,12.3,...,0.234,...
plan1.dcm,John,Head,...,1-Arc1,Beam,225.0,...,14.1,...,0.245,...
plan1.dcm,John,Head,...,2-Arc2,Beam,225.0,...,10.5,...,0.223,...
plan2.dcm,Jane,Pelvis,...,ALL,Plan,380.0,...,18.2,...,0.312,...
plan2.dcm,Jane,Pelvis,...,1-Field1,Beam,190.0,...,20.1,...,0.298,...
...
```

Key design:

- Add two columns after plan metadata: "Beam" (value: "ALL" for plan total, or "1-BeamName" for beams) and "Level" (value: "Plan" or "Beam")
- For plan-total rows: use plan-level metrics from `PLAN_COLUMNS`
- For beam rows: use beam-level metrics, mapping to the same column positions (MCS column contains beam MCS, Total MU column contains beam MU, etc.)
- Beam-only columns (Gantry Range, Isocenter, Table Angle, Collimator, Table Position) are empty for plan-total rows
- Plan-only columns (Rx Dose, Fractions, MU/Gy) are empty for beam rows
- The two-row category+metric header is preserved

**File: `src/lib/export-utils.ts**`

- Make `planWithBeamsToCSV` the default CSV export function
- Remove the separate `beamsToCSV` approach (or keep as internal helper)
- Update `exportPlans` to always produce the combined format for CSV

**File: `src/lib/batch/batch-export.ts**`

- Remove `includeBeamBreakdown` option since beams are always included
- Simplify to just format selection

**File: `src/components/batch/BatchExportPanel.tsx**`

- Remove the "Include per-beam CSV" checkbox since beams are always in the same file
- Simplify UI

**File: `src/components/viewer/MetricsPanel.tsx**`

- Single-plan CSV export also uses the combined format (1 plan-total row + N beam rows)

**File: `src/components/cohort/CohortExportPanel.tsx**`

- Same: CSV uses combined format

---

## 4. Unified Column Definition for Combined Export

The combined CSV needs a unified column set that works for both plan and beam rows. The approach:

- Start with all plan metadata columns (File, Patient ID, Patient Name, Plan Label, Technique, Beam Count, CP Count, Radiation Type, Energy, Machine, Institution)
- Add "Beam" and "Level" identifier columns
- Add beam-specific info columns (Gantry Range, Collimator, Table Angle, Isocenter, Table Position) -- empty for plan rows
- Then all shared metric columns in order: Prescription, Delivery, Geometric, Complexity (Primary), Complexity (Secondary), Deliverability

For beam rows, the extractors pull from `BeamMetrics`; for plan rows, from `PlanMetrics`. The same column headers apply to both.

---

## Files Changed


| File                                             | Change                                                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `src/components/viewer/MetricsPanel.tsx`         | Reorder `CATEGORY_ORDER` to put delivery first                                                                              |
| `src/lib/comparison/diff-calculator.ts`          | Generate diffs for ALL metrics instead of 12 hardcoded ones                                                                 |
| `src/components/comparison/MetricsDiffTable.tsx` | Display all metrics grouped by category with section headers                                                                |
| `src/lib/export-utils.ts`                        | Add `planWithBeamsToCSV` combining plan-total + beam rows in one file; add "Beam" and "Level" columns; update `exportPlans` |
| `src/lib/batch/batch-export.ts`                  | Remove `includeBeamBreakdown` option, always export combined                                                                |
| `src/components/batch/BatchExportPanel.tsx`      | Remove per-beam checkbox                                                                                                    |
| `src/components/cohort/CohortExportPanel.tsx`    | Use combined export format                                                                                                  |
