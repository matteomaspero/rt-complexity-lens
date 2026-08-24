# Synchronized control-point playback across all enlarged panels

## What you get

- One shared playback state per view: whichever panel you enlarge (MLC aperture, gantry, collimator, MU curves, gantry speed, polar MU, delivery timeline, complexity heatmap), it shows the same compact transport and jumps to the same control point.
- Pressing play in any enlarged panel advances every other panel and the main navigator in lockstep; a single timer drives the animation, so nothing drifts.
- Same behaviour on the Compare page: the shared transport drives Plan A (and Plan B when independent navigation is on), and gantry-sync/snap keeps working.
- Charts that currently only show a "current CP" marker while enlarged get the transport bar too, so stepping is possible without leaving focus mode.

## Implementation

**1. Shared playback context — `src/contexts/ControlPointPlaybackContext.tsx` (new)**
- Provider holds `currentIndex`, `totalPoints`, `isPlaying`, `setIndex`, `togglePlay`, plus an optional secondary track (`secondary: { index, totalPoints, setIndex }`) for the Compare page's independent Plan B.
- Owns the single playback interval (10 FPS, stops at the last CP), replacing the per-component timers.
- `useControlPointPlayback()` returns `null` outside a provider so charts on Batch/Cohort pages stay unaffected.

**2. Transport footer — `src/components/ui/chart-focus.tsx`**
- Export `ChartFocusFooter`: reads the context and renders `<ControlPointNavigator compact />` (plus the Plan B row when a secondary track exists). Renders nothing when focus is off or no provider is present.

**3. Panels render the footer while focused**
- `src/components/ui/focus-panel.tsx`: default `footer` to `<ChartFocusFooter />` when no `footer` prop is given.
- Add `<ChartFocusFooter />` inside the focused container of: `viewer/Charts.tsx` (Cumulative MU, Gantry Speed), `viewer/AngularDistributionChart.tsx` (polar + dose-rate panels), `viewer/DeliveryTimelineChart.tsx`, `viewer/ComplexityHeatmap.tsx`, `comparison/ComparisonMUChart.tsx`, `comparison/ComparisonDeliveryChart.tsx`, `comparison/ComparisonPolarChart.tsx`.
- `batch/BatchDistributionChart.tsx` is untouched (no control-point axis).

**4. Wire the providers**
- `src/components/viewer/InteractiveViewer.tsx`: wrap the viewer content in the provider fed by existing `currentCPIndex` / `isPlaying` state; delete the local interval and the hand-passed `cpTransport` footers.
- `src/components/comparison/CPComparisonViewer.tsx` (or `pages/ComparePlans.tsx`, whichever owns `currentCPIndex`): provider wraps the compare content, with Plan B as the secondary track; remove the local `isPlaying` timer and inline `transport` element.

**5. Docs**
- Update `README.md` and the UI section of `docs/ALGORITHMS.md` to state that enlarged panels share one synchronized CP transport.

## Technical notes

- Presentation only — no metric, geometry, or parsing changes.
- Index clamping stays where it is (Compare still clamps to the shorter beam in synced mode).
- Buttons keep their `aria-label`s; Esc and backdrop click still close focus mode; design tokens only.
- Verify with `npm run lint`, `npm run test`, `npm run build`, plus a browser check: enlarge the MLC panel, press play, close it, and confirm the gantry panel and MU chart sit on the same CP.
