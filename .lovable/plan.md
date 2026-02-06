

# Angular Distribution Viewer and Comprehensive Visualizations

## Implementation Status: COMPLETE ✓

All components implemented:
- ✓ Angular binning calculation (`src/lib/dicom/angular-binning.ts`)
- ✓ Polar MU Distribution Chart (RadarChart)
- ✓ Dose Rate vs Gantry Angle chart
- ✓ Delivery Timeline with limiting factors
- ✓ Complexity Heatmap (LSV/AAV over arc)
- ✓ Aperture Area variation chart
- ✓ Collapsible "Angular Analysis" section with tabs

## Verification Summary

## Part 1: Angular Distribution Charts

### 1.1 Polar MU Distribution Chart

A polar (radar) chart showing MU delivery as a function of gantry angle:

```text
              0° (Superior)
                |
                |
     270° ------+------ 90°
      (Right)   |    (Left)
                |
             180° (Posterior)
```

**Data points:**
- Aggregate MU delivered in each angular bin (e.g., 10° bins)
- Color intensity or radius shows MU magnitude
- Highlights where most dose is being delivered

### 1.2 Angular Dose Rate Chart

Line/area chart with gantry angle on X-axis:

| Metric | Description |
|--------|-------------|
| Dose Rate | MU/min at each control point |
| MU per Degree | Rate of MU delivery per degree of arc |
| Segment Duration | Time spent in each angular segment |

### 1.3 Implementation

New component: `src/components/viewer/AngularDistributionChart.tsx`

```text
+------------------------------------------+
|  Angular Distribution                     |
|  +-------------------+  +--------------+ |
|  |                   |  | Legend       | |
|  |    Polar Chart    |  | - MU Dist    | |
|  |    (SVG/Recharts) |  | - Dose Rate  | |
|  |                   |  |              | |
|  +-------------------+  +--------------+ |
|                                          |
|  X-Axis: Gantry Angle (0-360°)           |
|  +--------------------------------------+|
|  |  Line Chart: Dose Rate vs Angle     ||
|  +--------------------------------------+|
+------------------------------------------+
```

---

## Part 2: Additional Comprehensive Views

### 2.1 Aperture Complexity Heatmap

A visualization showing complexity variation across the arc:

| Axis | Data |
|------|------|
| X | Gantry angle (0-360°) |
| Y | Metric value |
| Metrics | MCS, LSV, AAV per control point segment |

Color gradient shows where complexity peaks occur.

### 2.2 MLC Speed Distribution

Shows leaf movement intensity across the beam:

| Display | Purpose |
|---------|---------|
| Max leaf speed per segment | Identifies MLC speed bottlenecks |
| Histogram of leaf speeds | Distribution analysis |
| Speed limit violations | Highlights potential delivery issues |

### 2.3 Segment Duration Analysis

Bar chart showing time spent in each control point segment:

- X-axis: Control point or gantry angle
- Y-axis: Estimated segment duration (seconds)
- Color: Limiting factor (dose rate, gantry, or MLC)

### 2.4 Cumulative Delivery Timeline

A timeline view showing:

```text
Time (s)  0    10    20    30    40    50    60
          |-----|-----|-----|-----|-----|-----|
Gantry    179° -----> 270° -----> 0° -----> 90°
MU        ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
DoseRate  ████▓▓▓▓▓▓▓▓░░░░████████████
```

---

## Part 3: File Changes

### New Files

| File | Purpose |
|------|---------|
| `src/components/viewer/AngularDistributionChart.tsx` | Polar/angular MU and dose rate charts |
| `src/components/viewer/ComplexityHeatmap.tsx` | Per-angle complexity visualization |
| `src/components/viewer/DeliveryTimelineChart.tsx` | Time-based delivery analysis |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/viewer/Charts.tsx` | Add MU vs Angle chart, Dose Rate vs Angle |
| `src/components/viewer/InteractiveViewer.tsx` | Add new chart sections, tabs for different views |
| `src/components/viewer/index.ts` | Export new components |
| `src/lib/dicom/metrics.ts` | Add per-angle binned metrics calculation |

---

## Part 4: Angular Chart Data Structure

### 4.1 Angular Binned Data

Calculate per-angle aggregations:

```typescript
interface AngularBin {
  angleStart: number;      // Bin start angle
  angleEnd: number;        // Bin end angle
  angleMid: number;        // Bin center for plotting
  MU: number;              // Total MU in this angular range
  MUperDegree: number;     // MU per degree
  avgDoseRate: number;     // Average dose rate (MU/min)
  maxDoseRate: number;     // Peak dose rate
  duration: number;        // Time spent in this range (s)
  avgMCS: number;          // Average complexity
  maxLeafSpeed: number;    // Maximum MLC speed (mm/s)
  limitingFactor: 'doseRate' | 'gantrySpeed' | 'mlcSpeed';
}
```

### 4.2 Calculation Logic

For each control point pair:
1. Calculate angular extent
2. Calculate MU delivered
3. Estimate duration based on limiting factor
4. Compute dose rate = MU / duration
5. Bin into angular segments (10° bins recommended)

---

## Part 5: UI Layout Options

### Option A: Tabbed Chart Section

Replace current chart row with a tabbed interface:

```text
[ Control Points | Angular | Timeline | Complexity ]

+------------------------------------------------+
| Selected Tab Content                            |
+------------------------------------------------+
```

### Option B: Expandable Chart Grid

Add a new collapsible section below existing charts:

```text
+-- Angular Analysis -------------------------+
| [Polar MU Chart]  [Dose Rate vs Angle]     |
| [Complexity Map]  [Speed Distribution]      |
+--------------------------------------------+
```

### Recommended: Option B

Keep existing charts visible, add new section that can be collapsed if not needed.

---

## Part 6: Polar Chart Implementation

### Using Recharts PolarGrid

Recharts supports radar/polar charts that can display angular data:

```typescript
<RadarChart data={angularData}>
  <PolarGrid />
  <PolarAngleAxis dataKey="angleMid" />
  <PolarRadiusAxis />
  <Radar 
    dataKey="MU" 
    fill="hsl(var(--chart-primary))"
  />
</RadarChart>
```

### Alternative: Custom SVG

For better IEC 61217 alignment, a custom SVG polar plot:
- 0° at top (IEC convention)
- Clockwise rotation for positive angles
- Matches gantry viewer orientation

---

## Part 7: Implementation Sequence

1. **Add angular binning calculation** to metrics.ts
2. **Create AngularDistributionChart** component with:
   - Polar MU distribution (radar chart)
   - Dose Rate vs Angle (line chart)
3. **Create ComplexityHeatmap** showing MCS/LSV/AAV per angle
4. **Create DeliveryTimelineChart** with segment duration breakdown
5. **Update InteractiveViewer** layout with new chart section
6. **Update index.ts** exports

---

## Success Criteria

- Polar chart shows MU distribution around the arc
- Line chart displays dose rate variation with gantry angle
- Current gantry position highlighted on angular charts
- Charts sync with control point scrubber
- Limiting factor (dose rate/gantry/MLC) visualized per segment
- New charts work for both single-arc and multi-arc plans

