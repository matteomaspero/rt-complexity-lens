

# Plan: Fix PDF Readability, Chart Stretching, and File Size

## Problems Identified

1. **Charts are stretched**: `addChartPage` forces a fixed 2:1 aspect ratio (`imgH = imgW * 0.5`) regardless of the actual chart dimensions. Batch/cohort uses `0.45`. This distorts every chart.

2. **Large file size**: Charts are captured at `scale: 2` and embedded as PNG (lossless). A single chart image can be 2-5MB of base64 data. Multiple charts = massive PDF.

3. **Poor readability**: The per-plan metrics table (`buildMetricsRows`) tries to fit 30+ columns horizontally into one row, making each column ~3-5mm wide with 7pt text -- effectively unreadable. Tables need to be restructured for the medium.

---

## Fix 1: Preserve Actual Chart Aspect Ratio

**File: `src/lib/pdf-report.ts`**

Replace the fixed aspect ratio with one computed from the actual captured canvas dimensions:

```typescript
async function captureChart(element: HTMLElement): Promise<{ data: string; ratio: number } | null> {
  const canvas = await html2canvas(element, {
    scale: 1.5,  // reduced from 2
    backgroundColor: '#ffffff',
    logging: false,
    useCORS: true,
  });
  const ratio = canvas.height / canvas.width;
  return { data: canvas.toDataURL('image/jpeg', 0.85), ratio };
}
```

Then in `addChartPage`:
```typescript
function addChartPage(doc, y, label, chart: { data: string; ratio: number }, contentW: number): number {
  const imgW = contentW;
  const imgH = imgW * chart.ratio;  // actual aspect ratio, not forced
  const maxH = 120; // cap height to avoid charts spanning multiple pages
  const finalH = Math.min(imgH, maxH);
  const finalW = imgH > maxH ? finalH / chart.ratio : imgW;
  // ... embed with correct dimensions
}
```

This fixes stretching for all chart types (tall heatmaps, wide bar charts, square scatter plots).

---

## Fix 2: Reduce File Size (JPEG + Lower Scale)

**File: `src/lib/pdf-report.ts`**

Three changes:
- Reduce `html2canvas` scale from `2` to `1.5` (still sharp enough for PDF at 150 DPI effective)
- Use `canvas.toDataURL('image/jpeg', 0.85)` instead of PNG -- JPEG is ~5-10x smaller for charts
- Pass `'JPEG'` to `doc.addImage()` instead of `'PNG'`

Expected size reduction: ~70-80% per chart image. A 3MB PNG chart becomes ~400KB JPEG.

---

## Fix 3: Restructure Tables for Readability

The current approach of cramming 30+ metric columns into a single horizontal row is unreadable. Replace with a vertical key-value layout grouped by category.

### For Single Plan (already uses compact layout -- OK)
No change needed; it already uses the 3-column `[Metric, Value, Unit]` format.

### For Batch/Cohort Per-Plan Table
Replace the wide horizontal table with one **vertical table per plan** (same compact format as single-plan), or better: keep the summary statistics table (which is already readable at 9 columns) and **remove the per-plan wide table entirely** since the CSV export already provides that data in a spreadsheet-friendly format. The PDF should focus on what PDFs are good at: summary statistics and charts.

### For Batch/Cohort -- Simplified Approach
- **Keep**: Summary statistics table (9 columns, fits well)
- **Remove**: Per-plan metrics table (unreadable in PDF; CSV is the right format for this)
- **Keep**: All chart pages

### For Compare Diff Table (already readable)
Already uses 5 columns `[Metric, Plan A, Plan B, Diff, Diff%]` -- no change needed.

### Increase base font sizes
- Table header: 7pt to 8pt
- Table body: 7pt to 7.5pt
- Section titles: keep at 10-12pt

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/pdf-report.ts` | (1) Fix `captureChart` to return actual aspect ratio and use JPEG at 0.85 quality; (2) Fix `addChartPage` to use actual ratio with max height cap; (3) Reduce scale from 2 to 1.5; (4) Remove unreadable per-plan wide table from batch/cohort PDFs; (5) Bump table font sizes slightly |

Only one file needs changing. All fixes are in the PDF generator.

---

## Summary of Changes in `pdf-report.ts`

1. `captureChart()`: returns `{data, ratio}`, uses JPEG 0.85, scale 1.5
2. `addChartPage()`: computes height from actual ratio, caps at 120mm
3. `generateBatchPDF()` and `generateCohortPDF()`: remove the `buildMetricsRows` / per-plan wide table section; keep summary stats + charts
4. All `doc.addImage` calls: use `'JPEG'` format
5. Table font sizes: 7pt body to 7.5pt, 7pt header to 8pt

