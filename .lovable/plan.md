

# Split Complexity Metrics for Better Clarity

## Issue Analysis

After testing the Angular Analysis tabs, all features work correctly:
- Polar MU Distribution updates with control point changes
- Delivery Timeline shows segment durations with limiting factor colors
- Complexity Heatmap displays LSV, AAV, and Aperture Area

However, the **Complexity tab** currently shows multiple metrics on overlapping charts which can be visually overwhelming:
- Chart 1: LSV (area) + AAV (line) combined on a single chart
- Chart 2: Aperture Area separately

## Proposed Changes

### Split Strategy

Reorganize the Complexity tab into **sub-tabs or separate cards** for cleaner visualization:

```text
Current Layout:
+------------------------------------------+
| Complexity vs Gantry Angle               |
|   LSV (area) + AAV (line) - COMBINED     |
+------------------------------------------+
| Aperture Area vs Control Point           |
+------------------------------------------+

New Layout:
+------------------------------------------+
| [LSV] [AAV] [Aperture] - sub-tabs        |
+------------------------------------------+
| Selected metric full-height chart        |
| with clearer single-metric focus         |
+------------------------------------------+
```

### Alternative: Stacked Cards

Keep all metrics visible but in separate cards:

```text
+------------------------------------------+
| LSV vs Gantry Angle          LSV: 0.957  |
|   [Full height area chart]               |
+------------------------------------------+
| AAV vs Gantry Angle          AAV: 0.384  |
|   [Full height line chart]               |
+------------------------------------------+
| Aperture Area             Area: 15.2 cm² |
|   [Area chart]                           |
+------------------------------------------+
```

---

## File Changes

### Modified Files

| File | Changes |
|------|---------|
| `src/components/viewer/ComplexityHeatmap.tsx` | Split combined LSV+AAV chart into separate cards with individual charts for each metric |

---

## Implementation Details

### Separate Metric Cards

Each metric gets its own card with:
- Clear title with current value
- Single focused chart
- Consistent height
- Reference line showing current control point

```text
+-- LSV (Leaf Sequence Variability) ------+
| Current: 0.9567                          |
| [Single metric area chart - 120px]       |
+------------------------------------------+

+-- AAV (Aperture Area Variability) ------+
| Current: 0.3840                          |
| [Single metric line chart - 120px]       |
+------------------------------------------+

+-- Aperture Area -------------------------+
| Current: 15.2 cm²                        |
| [Single metric area chart - 120px]       |
+------------------------------------------+
```

### Benefits

1. **Easier to read** - Each metric has its own visual space
2. **Better comparison** - Values are clearly labeled per metric
3. **Consistent pattern** - Matches the layout used elsewhere in the app
4. **Mobile friendly** - Stacks naturally on smaller screens

---

## Technical Implementation

Update `ComplexityHeatmap.tsx` to:

1. Remove the combined `ComposedChart` with overlapping LSV + AAV
2. Create 3 separate card sections:
   - **LSV Chart Card** - Area chart with LSV data only
   - **AAV Chart Card** - Line chart with AAV data only  
   - **Aperture Area Card** - Existing chart (keep as-is)
3. Each card shows the current metric value in the header
4. Reduce individual chart heights from 160px to ~100-120px to fit all three

---

## Success Criteria

- LSV, AAV, and Aperture Area each have their own dedicated chart
- Current values clearly displayed in each card header
- All charts sync with control point scrubber (reference line updates)
- Overall section height remains reasonable (scrollable if needed)
- Cleaner visual presentation with no overlapping data series

