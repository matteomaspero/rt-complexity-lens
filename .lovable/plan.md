
# Plan: Thorough Testing and Layout Improvements

## Overview

This plan addresses three areas: (1) metric accuracy verification, (2) documentation consistency, and (3) chart layout improvements to use full-screen width. The most impactful visual change is removing the `max-w-7xl` container constraints so charts and visualizations can breathe.

---

## 1. Chart Layout -- Full-Width Plots

Currently, all pages use `container` or `max-w-7xl` wrappers that constrain content to ~1280px. Charts are further squeezed by grid layouts (e.g., `lg:grid-cols-[1fr,380px]`). The plan is to widen the plotting areas significantly.

### Changes

**Single Plan Viewer (`src/components/viewer/InteractiveViewer.tsx`)**
- Change the two-column grid from `lg:grid-cols-[1fr,380px] xl:grid-cols-[1fr,420px]` to `lg:grid-cols-[1fr,360px]` with the viewer section having no max-width constraint
- Increase chart heights: `CumulativeMUChart` and `GantrySpeedChart` from `height={140}` to `height={200}`
- Increase `ComplexityHeatmap` sub-chart heights from `100px` to `140px`
- Increase `DeliveryTimelineChart` chart height from `90px` to `120px`

**Batch Dashboard (`src/pages/BatchDashboard.tsx`)**
- Remove `container` class from `<main>`, replace with `px-6` for edge-to-edge layout
- Change grid from `lg:grid-cols-3` to `lg:grid-cols-4` so the summary stats area gets more room
- Increase `BatchDistributionChart` histogram height from `200px` to `280px`

**Cohort Analysis (`src/pages/CohortAnalysis.tsx`)**
- Remove the `p-6` padding constraint, use wider `px-4 sm:px-6 lg:px-8`
- Make the visualization tabs section full-width (no max-w limit on `TabsList`)
- Increase `BoxPlotChart` height from `h-80` to `h-[400px]`
- Increase `ViolinPlot` SVG height from fixed values to larger responsive heights

**Compare Plans (`src/pages/ComparePlans.tsx`)**
- Remove `container` class from `<main>`, replace with `px-6`
- Give comparison charts more vertical space

### Files changed
- `src/components/viewer/InteractiveViewer.tsx`
- `src/components/viewer/Charts.tsx` (increase default `height` props)
- `src/components/viewer/ComplexityHeatmap.tsx` (increase sub-chart heights)
- `src/components/viewer/DeliveryTimelineChart.tsx` (increase `chartHeight`)
- `src/components/batch/BatchDistributionChart.tsx` (increase histogram height)
- `src/components/cohort/BoxPlotChart.tsx` (increase chart height)
- `src/components/cohort/ViolinPlot.tsx` (increase SVG height)
- `src/components/cohort/ScatterMatrix.tsx` (increase scatter plot height)
- `src/pages/BatchDashboard.tsx` (wider layout)
- `src/pages/CohortAnalysis.tsx` (wider layout)
- `src/pages/ComparePlans.tsx` (wider layout)

---

## 2. Metric Accuracy Verification

### Energy fields propagation check
The `nominalBeamEnergy` and `energyLabel` were added to types and parser but need verification that they flow correctly through the metrics calculation pipeline.

**File: `src/lib/dicom/metrics.ts`**
- Verify the `calculateBeamMetrics` function passes `radiationType`, `nominalBeamEnergy`, and `energyLabel` from the `Beam` object to the `BeamMetrics` result
- If missing, add the three fields to the return object

### CSV export missing energy columns
The CSV export (`batch-export.ts`) includes energy in JSON beam-level export but NOT in CSV headers/rows.

**File: `src/lib/batch/batch-export.ts`**
- Add `Radiation Type`, `Energy` columns to CSV beam details string
- Update the beam summary line to include `energyLabel` (e.g., `Beam1: 200 MU, 6X, MCS=0.234`)

### Beam summary in batch CSV
Currently the beam summary only shows `beamName: MU, MCS`. Add energy label for completeness.

---

## 3. Documentation Consistency

### Metrics Reference page check
- The `MetricsReference.tsx` page renders from `METRIC_DEFINITIONS`. Since the energy fields are beam-level metadata (not complexity metrics), they do not need entries in `METRIC_DEFINITIONS`. No change needed here.

### Help page and Python docs
- No inconsistencies found. The `energyLabel` and `nominalBeamEnergy` are correctly documented in types and the Python toolkit types were updated.

### BeamSummaryCard energy display
- Already implemented in the previous round. The card shows `energyLabel` with MeV fallback. No additional changes needed.

### BAM field type safety
- Currently uses `(beam as any).BAM`. Add `BAM` as an optional field to the `Beam` interface to remove the unsafe cast.

**File: `src/lib/dicom/types.ts`**
- This field is already on `BeamMetrics` but is accessed from `Beam` in the summary card. The card should read from `beamMetrics` data instead, or the cast should remain since BAM is only computed post-parsing.

**File: `src/components/viewer/BeamSummaryCard.tsx`**
- The BAM display logic should be driven by the `controlPointMetrics` or a separate prop rather than casting `beam`. Clean up by accepting an optional `BAM` prop or reading from metrics context.

---

## 4. Chart Smoothness Improvements

### Recharts animation settings
Add `isAnimationActive={false}` to heavy charts (scatter, heatmap) to prevent jank on large datasets, while keeping subtle animations on simpler line charts.

**Files to update:**
- `src/components/cohort/BoxPlotChart.tsx` -- disable animation for bars
- `src/components/cohort/ScatterMatrix.tsx` -- disable scatter animation
- `src/components/batch/BatchDistributionChart.tsx` -- disable bar animation for large batches

### Tooltip performance
- Add `allowEscapeViewBox={{ x: true, y: true }}` to tooltips that get cut off at chart edges in the cohort and batch views

---

## Summary of All Files Changed

| File | Changes |
|------|---------|
| `src/components/viewer/InteractiveViewer.tsx` | Wider grid, larger chart heights |
| `src/components/viewer/Charts.tsx` | Increase default height from 150 to 200 |
| `src/components/viewer/ComplexityHeatmap.tsx` | Increase sub-chart heights to 140px |
| `src/components/viewer/DeliveryTimelineChart.tsx` | Increase chartHeight to 120px |
| `src/components/viewer/BeamSummaryCard.tsx` | Clean up BAM type cast |
| `src/components/batch/BatchDistributionChart.tsx` | Taller histogram, disable animation |
| `src/components/cohort/BoxPlotChart.tsx` | Taller chart (400px), disable animation |
| `src/components/cohort/ViolinPlot.tsx` | Increase SVG height |
| `src/components/cohort/ScatterMatrix.tsx` | Taller plots, disable animation |
| `src/pages/BatchDashboard.tsx` | Full-width layout |
| `src/pages/CohortAnalysis.tsx` | Full-width layout, wider tabs |
| `src/pages/ComparePlans.tsx` | Full-width layout |
| `src/lib/batch/batch-export.ts` | Add energy to CSV beam summary |
| `src/lib/dicom/metrics.ts` | Verify energy field propagation |
