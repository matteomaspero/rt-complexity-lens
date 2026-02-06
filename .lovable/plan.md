
# Improved Angular Analysis Layout and Beam Summary Card

## Overview

This plan addresses three main improvements:
1. Replace tabbed Angular Analysis with fixed separate charts (no dropdown/tabs)
2. Split the Timeline chart into separate charts for better clarity
3. Add a Beam Summary Card at the top with key beam/arc information

---

## Part 1: Beam Summary Card

Add a new component that displays key information about the currently selected beam to help users quickly understand what they're viewing.

### 1.1 Information to Display

| Field | Description | Example |
|-------|-------------|---------|
| Beam Name | The beam's label | "Arc1_CW" |
| Type | Arc or Static | "VMAT Arc" |
| Control Points | Number of CPs | "178 CPs" |
| Gantry Range | Start to end angles | "181.0° to 179.0°" |
| Rotation | Direction | "CW" (clockwise) |
| MU | Beam MU | "324.5 MU" |
| Est. Time | Delivery time | "0:52" (mm:ss) |
| Dose Rate | Min-Max range | "145-580 MU/min" |

### 1.2 Component Design

```text
+------------------------------------------------------------------+
| Beam: Arc1_CW                                    VMAT Arc | CW   |
+------------------------------------------------------------------+
| CPs: 178  |  181.0° → 179.0° (358°)  |  324.5 MU  |  Est: 0:52   |
| Dose Rate: 145 - 580 MU/min          |  Avg Gantry: 5.8 °/s      |
+------------------------------------------------------------------+
```

### 1.3 New File

Create `src/components/viewer/BeamSummaryCard.tsx`

---

## Part 2: Fixed Separate Charts (No Tabs)

Replace the tabbed interface with a vertically stacked layout where all charts are always visible.

### 2.1 Current Layout (Tabbed)

```text
[ MU Distribution ] [ Timeline ] [ Complexity ]
+----------------------------------------+
|   Only one tab content visible at      |
|   a time - requires user to switch     |
+----------------------------------------+
```

### 2.2 New Layout (Fixed Sections)

```text
+-- Beam Summary Card ---------------------------+
| Arc1_CW | VMAT | 178 CPs | 181° → 179° | CW   |
| 324.5 MU | Est: 0:52 | DR: 145-580 MU/min     |
+-----------------------------------------------+

+-- MU Distribution -----------------------------+
| [Polar Chart]       [Dose Rate vs Angle]      |
+-----------------------------------------------+

+-- Delivery Analysis ---------------------------+
| Segment Duration (bar chart)                   |
+-----------------------------------------------+
| Dose Rate vs Angle                             |
+-----------------------------------------------+
| Gantry Speed vs Angle                          |
+-----------------------------------------------+
| MLC Speed vs Angle                             |
+-----------------------------------------------+

+-- Complexity Analysis -------------------------+
| LSV vs Angle                                   |
+-----------------------------------------------+
| AAV vs Angle                                   |
+-----------------------------------------------+
| Aperture Area vs CP                            |
+-----------------------------------------------+
```

---

## Part 3: Split Timeline Chart

Currently the timeline shows segment duration colored by limiting factor. To improve clarity, split into separate focused charts.

### 3.1 Current Timeline (Combined)

- Single bar chart with duration colored by limiting factor
- Difficult to see individual Dose Rate, Gantry Speed, MLC Speed values

### 3.2 New Split Layout

| Chart | Data | Purpose |
|-------|------|---------|
| Segment Duration | Duration (s) with limiting factor colors | Overview of time distribution |
| Dose Rate vs Angle | MU/min at each segment | See dose rate variation |
| Gantry Speed vs Angle | deg/s at each segment | See gantry speed pattern |
| MLC Speed vs Angle | mm/s at each segment | See MLC speed bottlenecks |

Each chart is compact (80-100px height) to allow all to fit vertically.

---

## Part 4: File Changes Summary

| Action | File | Description |
|--------|------|-------------|
| Create | `src/components/viewer/BeamSummaryCard.tsx` | New beam info display |
| Update | `src/components/viewer/InteractiveViewer.tsx` | Replace tabs with fixed sections, add BeamSummaryCard |
| Update | `src/components/viewer/DeliveryTimelineChart.tsx` | Split into 4 separate charts |
| Update | `src/components/viewer/AngularDistributionChart.tsx` | Keep as-is (polar + dose rate) |
| Update | `src/components/viewer/index.ts` | Export new component |

---

## Part 5: Implementation Details

### 5.1 BeamSummaryCard Component

```typescript
interface BeamSummaryCardProps {
  beam: Beam;
  beamMetrics: BeamMetrics;
  segments: ControlPointSegment[];
}
```

Display:
- Beam name and type (Arc/Static)
- Rotation direction with icon
- Gantry angle range and arc length
- MU and estimated delivery time
- Dose rate range (min - max across segments)
- Average gantry and MLC speeds

### 5.2 Updated DeliveryTimelineChart

Split into four separate card sections:

```typescript
// 1. Segment Duration (existing bar chart with limiting factor colors)
<Card>
  <h4>Segment Duration</h4>
  <BarChart data={...} /> // 100px height
</Card>

// 2. Dose Rate Line Chart
<Card>
  <h4>Dose Rate</h4>
  <LineChart data={...} /> // 80px height
</Card>

// 3. Gantry Speed Line Chart (if arc)
<Card>
  <h4>Gantry Speed</h4>
  <LineChart data={...} /> // 80px height
</Card>

// 4. MLC Speed Line Chart
<Card>
  <h4>MLC Speed</h4>
  <LineChart data={...} /> // 80px height
</Card>
```

### 5.3 Updated InteractiveViewer Layout

Replace the collapsible tabbed section with:

```text
<BeamSummaryCard />

<div className="space-y-4">
  <Section title="MU Distribution">
    <AngularDistributionChart />
  </Section>
  
  <Section title="Delivery Analysis">
    <DeliveryTimelineChart />  // Now contains 4 separate charts
  </Section>
  
  <Section title="Complexity Analysis">
    <ComplexityHeatmap />  // Already has 3 separate charts
  </Section>
</div>
```

---

## Part 6: Dose Rate Range Calculation

Add utility to calculate dose rate statistics from segments:

```typescript
function getDoseRateStats(segments: ControlPointSegment[]): {
  min: number;
  max: number;
  avg: number;
} {
  const rates = segments.map(s => s.doseRate);
  return {
    min: Math.min(...rates),
    max: Math.max(...rates),
    avg: rates.reduce((a, b) => a + b, 0) / rates.length,
  };
}
```

---

## Part 7: Success Criteria

- Beam Summary Card displays at the top with key beam information
- All Angular Analysis charts are visible without tabs (no switching required)
- Timeline section shows 4 separate charts for duration, dose rate, gantry speed, MLC speed
- Each chart has a clear title and current value display
- Charts sync with control point scrubber
- Responsive layout works on different screen sizes

---

## Part 8: Post-Implementation - Audit All Test Plans

After implementing the UI changes, load each test plan and verify:

| Test File | Check | Purpose |
|-----------|-------|---------|
| VMAT_1 | Complex VMAT arc | Multi-segment delivery |
| MONACO_PT_01-04 | Monaco optimizer plans | Different complexity levels |
| MONACO_PENALTY | Plan with penalty | Edge case handling |
| TG119_7F | 7-field IMRT | Static field behavior |
| TG119_2A | 2-arc VMAT | Multi-arc display |

For each plan, verify:
1. Beam summary shows correct angles, MU, time
2. All charts render without errors
3. Metrics calculate correctly
4. Control point scrubber updates all charts
5. No overlapping or cluttered data

