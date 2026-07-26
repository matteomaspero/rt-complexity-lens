
# Pages & Visualizations Audit — Findings and Fix Plan

Read-only audit of `src/pages/*.tsx` and their charts/panels surfaced correctness gaps (new metrics not wired everywhere), accessibility issues (unlabeled icon buttons app-wide), and small clarity issues. Full report available; below is the prioritized fix plan.

## Priority 1 — Correctness: metric registry drift

The seven metrics added in the last audit round (MCSv, BJAR, LTNL, PMU, MUcGy, SAS2, SAS20) landed in the viewer and exporters but not in two other registries, so they never appear on the Compare / Cohort / Batch pages.

- **Compare page (`MetricsDiffTable`)** — extend `ALL_COMPARISON_METRICS` in `src/lib/comparison/diff-calculator.ts` (adding the 7 metrics with correct category, unit, decimals, higher-is-better flag).
- **Cohort + Batch (`MetricSelector`, box/violin/scatter/correlation, `BatchSummaryStats`, `BatchDistributionChart`)** — treat `src/lib/dicom/metrics-definitions.ts` as the single source of truth: rewrite `src/lib/cohort/metric-utils.ts` to derive `METRIC_GROUPS`, `METRIC_DEFINITIONS`, and `METRIC_COLORS` from it (mapped to Delivery / Geometric / Complexity / Deliverability per project memory), instead of hand-maintaining a parallel catalogue. Reconcile the `psmall` unit conflict (`%` vs raw fraction) in the same pass.
- Verify by spot-checking that each new metric appears in: Compare diff table, Cohort MetricSelector, box plot, correlation heatmap, batch distribution chart, batch summary stats.

## Priority 2 — Accessibility: unlabeled icon-only buttons

Every page header uses `Button size="icon"` with just a lucide icon and no accessible name. Add `aria-label` to:
- `Index.tsx` (theme/help/etc.), `Help.tsx`, `MetricsReference.tsx`, `PythonDocs.tsx`, `TechnicalReference.tsx`, `ValidationReport.tsx`, `BatchDashboard.tsx`, `ComparePlans.tsx`, `CohortAnalysis.tsx` (also switch from `title=` to `aria-label=` for consistency).
- Labels: "Back to home", "Help", "Settings", "Clear all plans", "Toggle theme", etc.

## Priority 3 — Documentation coverage of new metrics

Confirm that `MetricsReference.tsx`, `Help.tsx`, and `TechnicalReference.tsx` list MCSv / BJAR / LTNL / PMU / MUcGy / SAS2 / SAS20. If they render from `METRIC_DEFINITIONS` already, no work. If they use hardcoded tables, extend the tables (or refactor to iterate `METRIC_DEFINITIONS`).

## Priority 4 — Clarity fixes in the viewer

- **`MetricsPanel.tsx`**: show threshold info on hover even when the metric is "normal" (currently only tooltips fail states), so users can see how close to warning/critical a value is.
- **`CollimatorViewer.tsx`**: label jaw X1/X2/Y1/Y2 values with `mm` unit.
- **`GantryViewer.tsx`**: add an `Info` tooltip explaining the IEC 61217 gantry-angle convention, mirroring the pattern already used in `CollimatorViewer`. (Rotating the "Couch" ring by `patientSupportAngle` is a nice-to-have; called out but deferred unless requested.)
- **Category naming**: align the `MetricsPanel` category labels (`primary` / `secondary` / `accuracy`) with the canonical Delivery / Geometric / Complexity / Deliverability names used in `diff-calculator.ts` and project memory. Rename display labels only — no metric reassignments.

## Priority 5 — Small polish

- `metric-utils.ts` uses raw `hsl(H,S%,L%)` for some chart series colors; move all series colors to `hsl(var(--chart-N))` tokens for dark-mode consistency.
- Header pattern: change `CohortAnalysis.tsx` to use `ArrowLeft` back-button pattern to match every other page (currently uses `Home` icon and `title=`).
- `MetricsPanel` version caption "UCoMX v1.1" — replace with a preset-aware label or drop it, since newer metrics (MCSv, BJAR, ...) are not part of UCoMX v1.1.

## Out of scope (deferred unless requested)

- Mobile-layout audit of large tables (`BatchResultsTable`, `ExtendedStatsTable`, `BeamComparisonTable`) — needs visual verification, not a source read.
- Full keyboard-focus-ring audit component-by-component.
- Adding couch rotation into `GantryViewer`.

## Verification steps after implementation

1. `bun run build` clean.
2. Load a demo plan in the viewer, comparison, batch, and cohort routes; confirm all seven new metrics appear and format correctly.
3. Screen-reader smoke test: tab through each page header; every icon button announces a name.
4. Toggle dark mode on Cohort box plot and correlation heatmap; confirm series colors adapt.

Once you approve, I'll implement Priority 1–4 in a single pass and confirm with a build.
