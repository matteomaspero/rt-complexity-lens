# Plan: Unified CSV/JSON Export Format

## Problem

There are three completely different CSV export implementations, each with its own format and metric coverage:

1. **Single Plan** (`metricsToCSV` in `metrics.ts`): Vertical layout (one metric per row with columns: Metric, Full Name, Value, Unit). Not tabular -- cannot be combined with other exports or imported into spreadsheets for multi-plan analysis.
2. **Batch** (`exportToCSV` in `batch-export.ts`): Tabular (one plan per row) but crams all beam details into a single text cell (e.g., `"Beam1: 200 MU, 6X | Beam2: 150 MU, 10X"`). Only exports ~24 of 30+ available metrics. Missing radiation type, energy columns.
3. **Cohort** (`handleExportCSV` in `CohortExportPanel.tsx`): Mixes four different data sections (statistics, clusters, correlation matrix, individual plans) into one CSV file separated by `#` comment lines. This breaks standard CSV parsers.

## Solution

Create a single shared export utility (`src/lib/export-utils.ts`) that all modes use. The format will be a clean, standard tabular CSV: **one row per plan, one column per metric**, easily importable in Excel, R, Python, etc. Consider making multiple rows for different beams

---

## New Unified CSV Format

```text
File,Plan Label,Technique,Beam Count,CP Count,Radiation Type,Energy,MFA (cm2),EFS (mm),PA (cm2),JA (cm2),psmall,Total MU,Delivery Time (s),GT (deg),MUCA (MU/CP),MCS,LSV,AAV,LT (mm),LTMCS,SAS5,SAS10,EM,PI,LG (mm),MAD (mm),TG,PM,LTMU,GS,LS,mDRV
plan1.dcm,Head,VMAT,2,178,PHOTON,6X,12.34,45.6,120.5,200.3,0.12,450.0,120.5,358.0,2.53,0.234,0.456,0.789,1234.5,288.9,0.045,0.123,0.067,1.23,4.56,2.34,0.089,0.766,0.45,4.2,12.3,45.6
plan2.dcm,Pelvis,IMRT,7,49,PHOTON,10X,...
```

Key design decisions:

- No `#` comment lines (breaks CSV parsers). Metadata goes into a separate `_meta` sheet or is omitted from CSV (kept in JSON only).
- All 30+ metrics always present as columns. Empty cell if metric is not applicable.
- Radiation type and energy are derived from the dominant beam (or "Mixed" if multiple energies).
- Per-beam breakdown is a separate CSV file (not crammed into one column).

---

## Technical Details

### 1. Create shared export utility

**New file: `src/lib/export-utils.ts**`

This module defines:

- `ALL_EXPORT_COLUMNS`: ordered list of all column definitions (key, header label, decimals, extractor function)
- `planToRow(plan, metrics)`: converts any plan+metrics pair to a flat row object
- `rowsToCSV(rows, columns)`: converts row objects to clean CSV string
- `rowsToJSON(rows, meta)`: converts to branded JSON with summary statistics
- `beamsToCSV(plans)`: separate per-beam CSV with one row per beam
- `downloadFile(content, filename, mimeType)`: shared download helper (moved from batch-export.ts)

The column list will include all metrics from `METRIC_DEFINITIONS` plus metadata columns (file name, plan label, technique, beam count, CP count, radiation type, energy label).

### 2. Update Single Plan export

**File: `src/components/viewer/MetricsPanel.tsx**`

Replace the current vertical CSV export with the new tabular format. A single-plan export produces a CSV with one header row and one data row -- same columns as batch, so files can be concatenated.

**File: `src/lib/dicom/metrics.ts**`

Remove the old `metricsToCSV` function (lines 1317-1514). Replace with a thin wrapper that calls the shared utility.

### 3. Update Batch export

**File: `src/lib/batch/batch-export.ts**`

Rewrite `exportToCSV` to use the shared `planToRow` + `rowsToCSV`. Remove the custom metric lists (`GEOMETRIC_METRICS`, `BEAM_METRICS`, `COMPLEXITY_METRICS`) since the shared utility handles all columns.

For "per-beam breakdown", export a second CSV file using `beamsToCSV` instead of cramming beam details into one text column.

**File: `src/components/batch/BatchExportPanel.tsx**`

Update the "Per-beam breakdown" checkbox to trigger a separate beam-level CSV download alongside the plan-level CSV (two files downloaded).

### 4. Update Cohort export

**File: `src/components/cohort/CohortExportPanel.tsx**`

Replace `handleExportCSV` to use the shared utility for the individual plan data section. Statistics and correlation data will only be included in JSON exports (where nested structures are natural) -- not mixed into the CSV.

The CSV will be purely tabular: one row per plan, same columns as batch.

### 5. Per-beam CSV format

When "per-beam breakdown" is selected, a separate file is exported:

```text
File,Plan Label,Beam Number,Beam Name,Radiation Type,Energy,Beam MU,Arc Length (deg),CPs,Est Time (s),MCS,LSV,AAV,MFA (cm2),LT (mm),LG (mm),MAD (mm),EFS (mm),SAS5,SAS10,EM,PI,PA (cm2),JA (cm2),TG,PM
plan1.dcm,Head,1,Arc1,PHOTON,6X,225.0,358.0,89,60.2,0.234,...
plan1.dcm,Head,2,Arc2,PHOTON,6X,225.0,358.0,89,60.3,0.245,...
```

### 6. JSON export consistency

All three modes will produce JSON with the same top-level structure:

```json
{
  "tool": "RTp-lens",
  "toolUrl": "https://rt-complexity-lens.lovable.app",
  "exportDate": "...",
  "exportType": "single|batch|cohort",
  "planCount": 1,
  "plans": [ { "fileName": "...", "metrics": {...}, "beamMetrics": [...] } ],
  "summary": { ... },
  "cohortData": { "clusters": [...], "correlation": {...} }
}
```

Cohort-specific data (clusters, correlation, extended stats) goes into `cohortData`. This field is absent for single/batch exports.

---

## Files Changed


| File                                          | Change                                                                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/lib/export-utils.ts`                     | **NEW** -- shared export utility with column definitions, row conversion, CSV/JSON generators                    |
| `src/lib/dicom/metrics.ts`                    | Remove old `metricsToCSV` function (~200 lines deleted)                                                          |
| `src/lib/dicom/index.ts`                      | Remove `metricsToCSV` from barrel export                                                                         |
| `src/components/viewer/MetricsPanel.tsx`      | Use new shared export for single-plan CSV                                                                        |
| `src/lib/batch/batch-export.ts`               | Rewrite to use shared utility; remove duplicate metric lists                                                     |
| `src/components/batch/BatchExportPanel.tsx`   | Simplify options (remove category checkboxes since all metrics always included); per-beam triggers separate file |
| `src/components/cohort/CohortExportPanel.tsx` | Use shared utility for CSV; keep cohort stats in JSON only                                                       |


---

## What Gets Exported (Complete Column List)

**Plan-level CSV (all modes):**
File, Plan Label, Technique, Beam Count, CP Count, Radiation Type, Energy, MFA, EFS, PA, JA, psmall, Total MU, Delivery Time, GT, MUCA, LTMU, GS, LS, mDRV, MCS, LSV, AAV, LT, LTMCS, SAS5, SAS10, EM, PI, LG, MAD, TG, PM, MD, MI

**Beam-level CSV (optional second file):**
File, Plan Label, Beam Number, Beam Name, Radiation Type, Nominal Energy (MeV), Energy Label, Beam MU, Arc Length, CPs, Est Delivery Time, MCS, LSV, AAV, MFA, LT, LTMCS, LG, MAD, EFS, psmall, SAS5, SAS10, EM, PI, PA, JA, TG, PM, MUCA, LTMU, Collimator Angle