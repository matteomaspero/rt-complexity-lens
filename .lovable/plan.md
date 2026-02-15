# Plan: Fix Batch Demo Loading and Add PDF Report Export

## Part 1: Fix Batch Demo Data Loading

### Problem

5 of 25 demo files fail to load in batch mode. All failing files have `#` in their filenames (e.g., `RP.TG119.CS_ETH_2A_#1.dcm`). The `fetchDemoBuffer` function builds the URL as `/test-data/${filename}` without encoding, so `#` is interpreted as a URL fragment identifier, truncating the actual filename.

### Fix

**File: `src/lib/demo-data.ts**` -- in `fetchDemoBuffer`, URL-encode the filename:

```typescript
export async function fetchDemoBuffer(filename: string): Promise<ArrayBuffer> {
  const response = await fetch(`/test-data/${encodeURIComponent(filename)}`);
  // ...
}
```

This is a one-line fix that resolves all 5 failures.

---

## Part 2: Structured PDF Report Export

### Approach

Use `jsPDF` (new dependency) together with the already-installed `html2canvas` to generate structured, multi-page PDF reports. Each mode gets a "Download PDF Report" button alongside existing CSV/JSON options.

The PDF is built programmatically (not by screenshotting the page) using jsPDF's text/table API for clean, print-quality output. Charts and visualizations are captured via `html2canvas` and embedded as images.

### PDF Report Structure (all modes)

**Page 1 -- Cover / Summary**

- Title: "RTp-lens Complexity Report"
- Export date, tool URL
- Plan info table: File, Patient ID, Patient Name, Plan Label, Technique, Machine, Institution
- Prescription summary: Rx Dose, Dose/Fx, Fractions, MU/Gy

**Page 2+ -- Metrics Tables**

- Categorized tables matching the export column order:
  - Delivery parameters
  - Geometric metrics
  - Complexity (Primary)
  - Complexity (Secondary)
  - Deliverability
- For single plan: one table with plan-total and per-beam rows
- For batch/cohort: summary statistics table (min, max, 95th percentile, 1-3rd quartile, mean, std) plus individual plan rows

**Page N -- Charts (captured from DOM)**

- Single Plan: MLC aperture snapshot, MU chart, complexity heatmap
- Batch: Distribution histogram, summary stats cards
- Cohort: Box plots, correlation heatmap, scatter matrix, cluster summary
- Compare: Metric diff table, polar chart, MU comparison

### Mode-Specific Content

**Single Plan PDF:**

1. Cover with plan info
2. Full metrics table (plan-level + beam-level rows)
3. Beam summary cards
4. Charts: MU chart, gantry speed, angular distribution, complexity heatmap, delivery timeline

**Batch PDF:**

1. Cover with batch summary (N plans, success/error counts)
2. Aggregate statistics table
3. Per-plan metrics table
4. Distribution chart
5. Outlier report (if applicable)

**Cohort PDF:**

1. Cover with cohort summary
2. Extended statistics table
3. Per-plan metrics table
4. Box plot charts
5. Correlation heatmap
6. Cluster summary

**Compare PDF:**

1. Cover with Plan A vs Plan B info
2. Full metrics diff table (all categories)
3. Beam comparison table
4. MU comparison chart
5. Polar chart

---

## Technical Details

### New dependency

- `jspdf` -- for programmatic PDF generation with text, tables, and image embedding

### New files

`**src/lib/pdf-report.ts**` -- Core PDF generation logic:

- `generateSinglePlanPDF(plan, metrics, chartElements)` 
- `generateBatchPDF(plans, stats, chartElements)`
- `generateCohortPDF(plans, stats, clusters, chartElements)`
- `generateComparePDF(planA, planB, diffs, chartElements)`
- Shared helpers: `addCoverPage()`, `addMetricsTable()`, `addChartImage()`, `addCategoryHeader()`

Uses `jsPDF` API for text/rectangles/lines to build structured tables. Uses `html2canvas` to capture chart DOM elements as PNG images, then embeds them via `doc.addImage()`.

### Modified files


| File                                          | Change                                                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/lib/demo-data.ts`                        | Add `encodeURIComponent` in `fetchDemoBuffer`                                                     |
| `src/lib/pdf-report.ts`                       | **NEW** -- PDF generation engine                                                                  |
| `src/components/viewer/MetricsPanel.tsx`      | Add "Export PDF" button that captures charts from InteractiveViewer and generates single-plan PDF |
| `src/components/viewer/InteractiveViewer.tsx` | Add refs to chart containers so they can be captured for PDF; pass refs to MetricsPanel           |
| `src/components/batch/BatchExportPanel.tsx`   | Add "PDF" option to format radio group                                                            |
| `src/components/cohort/CohortExportPanel.tsx` | Add "PDF" option to format radio group                                                            |
| `src/pages/ComparePlans.tsx`                  | Add "Export PDF" button in header; add refs to chart containers                                   |


### Chart Capture Strategy

Each chart component (MU chart, heatmap, polar chart, etc.) is wrapped in a `div` with a `ref`. When PDF export is triggered:

1. Collect all chart container refs
2. Use `html2canvas` to render each to a canvas
3. Convert to PNG data URLs
4. Embed in the PDF at appropriate positions with proper scaling

### Table Rendering in PDF

Rather than using the `jspdf-autotable` plugin (to avoid another dependency), tables are drawn manually using jsPDF primitives:

- `doc.setFontSize()`, `doc.text()` for cell content
- `doc.rect()` for cell borders
- `doc.setFillColor()` + `doc.rect(..., 'F')` for category header backgrounds
- Automatic page breaks when content exceeds page height

### PDF Styling

- A4 portrait (210 x 297 mm)
- Font: Helvetica (built into jsPDF)
- Category headers: colored background bars matching the app's category colors
- Tables: alternating row shading for readability
- Charts: centered, scaled to fit page width with margins
- Footer: page numbers, tool URL