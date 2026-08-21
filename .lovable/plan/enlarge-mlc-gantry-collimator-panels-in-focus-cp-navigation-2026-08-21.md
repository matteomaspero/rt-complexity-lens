# Enlarge MLC / gantry / collimator panels + in-focus CP navigation

## What you get

- A maximize button on the three geometry panels in the single-plan viewer (Gantry Position, Collimator, MLC Aperture), matching the chart enlarge behaviour already in place.
- When a panel is enlarged, the SVG is redrawn at a much larger size (not CSS-stretched), so leaf edges and jaw outlines stay crisp.
- A compact control-point bar pinned inside the enlarged panel: play/pause, first/prev/next/last, slider, and the `CP n / N` readout — so you can step through control points while zoomed in.
- Same treatment for the Compare page side-by-side / difference MLC views, where the CP bar drives the existing synced or independent navigation.
- Docs and READMEs refreshed to describe the enlarge behaviour.

## Implementation

**1. Reusable focus panel — `src/components/ui/focus-panel.tsx` (new)**
- `FocusPanel`: card wrapper with title, optional trailing actions, and a maximize/restore button. Reuses `useChartFocus()` from `src/components/ui/chart-focus.tsx` (fixed-inset container + `ChartFocusOverlay` backdrop, Esc to close) so behaviour is identical to charts.
- Children receive the render size via a `children: (size: { width: number; height: number }) => ReactNode` render prop: normal size from props, focused size computed from viewport (e.g. `min(80vh, 80vw)` for square viewers, and a width/height pair for the MLC viewer preserving its aspect ratio) via a small `useElementSize`/`window` resize listener.
- Optional `footer` slot rendered only when focused — used for the CP bar.

**2. Compact CP bar — `ControlPointNavigator` (`src/components/viewer/ControlPointNavigator.tsx`)**
- Add an optional `compact?: boolean` prop: single row (transport buttons + slider + `n / N`), no progress-segment strip, no card chrome. Existing default rendering unchanged, so no regression for the main navigator.

**3. Viewer wiring — `src/components/viewer/InteractiveViewer.tsx`**
- Replace the three hand-rolled `rounded-lg border bg-card p-4` blocks (lines ~414-457) with `FocusPanel` instances for Gantry Position, Collimator, MLC Aperture.
- Pass `size` / `width`+`height` from the render prop into `GantryViewer`, `CollimatorViewer`, `MLCApertureViewer`.
- Each panel's `footer` renders `<ControlPointNavigator compact ... />` bound to the existing `currentCPIndex` / `isPlaying` / `handlePlayToggle` state, so playback continues while focused.
- Add a Collimator heading (currently missing) for consistency.

**4. Compare page — `src/components/comparison/CPComparisonViewer.tsx`**
- Wrap the side-by-side pair and the difference overlay in `FocusPanel`s; when focused, render the enlarged viewers plus the existing A/B sliders and a compact transport for Plan A (and Plan B when independent navigation is on). Gantry-sync and snap controls stay available.

**5. Docs**
- `docs/LOVABLE_CONTEXT.md` (or `docs/ALGORITHMS.md` UI section, whichever holds UI behaviour) and `README.md`: document chart/panel enlarge (button, Esc, backdrop click) and in-focus CP stepping.
- `python/README.md` untouched (no Python-side change).

## Technical notes

- No metric or geometry math changes; presentation only.
- Focus mode keeps components mounted and only restyles the container, so refs used by PNG export and Recharts tooltips keep working.
- Design tokens only; no hardcoded colors. Buttons carry `aria-label`s; Esc closes; focus returns to the trigger.
- Verify with `npm run lint`, `npm run test`, `npm run build`, plus a browser check that enlarging the MLC panel and pressing play advances the aperture.
