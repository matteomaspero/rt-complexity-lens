

# Asynchronous Control Point and MLC Comparison Mode

## What This Adds

Currently, the CP comparison viewer locks both plans to the **same control point index**. This works when plans have identical CP counts and sampling, but is misleading when:
- Plans have different CP counts (e.g., 178 vs 90 CPs)
- Plans use different gantry sampling rates
- A user wants to compare specific apertures at different delivery points (e.g., "what does Plan A look like at CP 50 vs Plan B at CP 120?")

This enhancement adds an **Independent Navigation** toggle that decouples the two CP sliders, letting users freely browse each plan's control points and MLC segments independently.

## User Experience

1. A new **Switch toggle** labeled "Independent Navigation" appears in the CP Comparison Viewer card header
2. **Toggle OFF (default)**: Current behavior -- single slider controls both plans (synchronized)
3. **Toggle ON**: Two separate sliders appear, one for Plan A and one for Plan B, each with its own range (0 to that plan's max CPs). The MLC aperture viewers, CP details, and difference overlay all update independently
4. When in independent mode, the difference overlay still works but now compares the two independently-selected control points
5. Charts (MU, Delivery, Polar) show **two reference lines** in independent mode -- one for each plan's current CP position

## Technical Changes

### 1. `src/pages/ComparePlans.tsx`
- Add state: `const [independentNav, setIndependentNav] = useState(false)`
- Add state: `const [cpIndexB, setCpIndexB] = useState(0)` (Plan B's independent CP index)
- Pass `independentNav`, `cpIndexB`, `setCpIndexB` down to `CPComparisonViewer`
- Pass `cpIndexB` (or `currentCPIndex` when synced) to chart components
- Reset `cpIndexB` to 0 when beam match or toggle changes

### 2. `src/components/comparison/CPComparisonViewer.tsx` (main changes)
- Add props: `independentNav`, `onIndependentNavChange`, `cpIndexB`, `onCPIndexBChange`
- Add the Switch toggle in the card header area
- When `independentNav` is true:
  - Render **two sliders** (one for Plan A, one for Plan B) with separate ranges (`0..beamA.controlPoints.length-1` and `0..beamB.controlPoints.length-1`)
  - Use `currentCPIndex` for Plan A's CP selection
  - Use `cpIndexB` for Plan B's CP selection
  - Update badge to show both: "CP 12/178 | CP 45/90"
  - The difference overlay compares `beamA.controlPoints[currentCPIndex]` vs `beamB.controlPoints[cpIndexB]`
  - The gantry/meterset deltas compare the independently-selected CPs
- When `independentNav` is false:
  - Current behavior unchanged (single slider, clamped to min CP count)

### 3. `src/components/comparison/ComparisonMUChart.tsx`
- Add optional prop: `cpIndexB?: number`
- When `cpIndexB` is provided and differs from `currentCPIndex`, render a **second ReferenceLine** for Plan B's position using `hsl(var(--chart-comparison-b))` color

### 4. `src/components/comparison/ComparisonDeliveryChart.tsx`
- Same pattern: add optional `cpIndexB` prop, render second reference line when in independent mode

### 5. `src/components/comparison/index.ts`
- No changes needed (no new components)

## Layout Detail (Independent Mode)

```text
+--------------------------------------------------+
| Control Point Comparison    [Independent Nav: ON] |
| CP A: 12/178  |  CP B: 45/90                     |
+--------------------------------------------------+
| Plan A Slider: [====|===========]  CP 12          |
| Plan B Slider: [==================|===]  CP 45    |
+--------------------------------------------------+
| [Side-by-Side] [Difference Overlay]               |
|                                                   |
|  Plan A (CP 12)       Plan B (CP 45)              |
|  +----------+         +----------+                |
|  | MLC A    |         | MLC B    |                |
|  +----------+         +----------+                |
|  Gantry: 120.5        Gantry: 278.3               |
|  Meterset: 23.1%      Meterset: 67.2%             |
+--------------------------------------------------+
| Gantry Delta: 157.8   Meterset Delta: 44.1%       |
+--------------------------------------------------+
```

## Files Modified

| File | Change |
|---|---|
| `src/pages/ComparePlans.tsx` | Add `independentNav`, `cpIndexB` state; pass to children |
| `src/components/comparison/CPComparisonViewer.tsx` | Add toggle, dual sliders, independent CP selection |
| `src/components/comparison/ComparisonMUChart.tsx` | Add optional second reference line |
| `src/components/comparison/ComparisonDeliveryChart.tsx` | Add optional second reference line |

No new files, no new dependencies.

