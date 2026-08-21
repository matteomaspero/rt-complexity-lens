# Fix ROI names + add plot focus/enlarge

## 1. ROI names are wrong (confirmed bug)

`parseRTSTRUCT` in `src/lib/dicom/parser.ts` reads the ROI name and ROI number from the wrong DICOM group: it uses `x300a0004`/`x300a0022` (RT Dose/Beam group) instead of the RTSTRUCT tags `ROIName (3006,0026)` and `ROINumber (3006,0022)`. As a result every entry in `StructureSetROISequence` resolves to number `0` and name `ROI_0`, so the selector shows placeholder names instead of PTV/CTV/OAR labels. The Python parser uses `roi.ROIName` correctly, so this is TS-only.

Fix:
- Use `ROI_NAME = 'x30060026'` and `ROI_NUMBER = 'x30060022'`.
- Also read `ROIObservationLabel`-free fallbacks in order: ROIName, then `ROI_<number>`; trim whitespace/null padding.
- Keep the name→structure `Map` keyed by ROI name, but de-duplicate repeated names (append ` (2)`) so distinct ROIs are not overwritten.
- Selector shows the real name; `pickDefaultTargetIndex` (PTV > CTV > GTV) then works as intended.
- Add a unit test in `src/test/conformality.test.ts` (or a new `rtstruct-parse` test) covering name/number extraction and duplicate-name handling with a synthetic dataset.

## 2. Enlarge a chosen plot

Add a reusable focus mode so any chart can be brought to the front, full-screen, without duplicating chart code.

- New `src/components/ui/chart-focus.tsx` exporting:
  - `ChartFocusButton` — a maximize icon button placed next to the existing export button.
  - `ChartFocusDialog` — a shadcn `Dialog` at ~95vw/90vh that renders the same chart children at large size (Recharts `ResponsiveContainer` reflows automatically).
  - `useChartFocus()` — small hook returning `{ isFocused, open, close }`.
- Charts render their body via a small local `renderChart(height)` function so the same JSX is used inline and in the dialog (taller height when focused).
- Apply to the chart components that already have export buttons:
  `viewer/Charts.tsx`, `viewer/AngularDistributionChart.tsx`, `viewer/DeliveryTimelineChart.tsx`, `viewer/ComplexityHeatmap.tsx`, `viewer/MLCApertureViewer.tsx`, `batch/BatchDistributionChart.tsx`, `cohort` charts (`BoxPlotChart`, `ViolinPlot`, `CorrelationHeatmap`, `ScatterMatrix`), and `comparison/*Chart.tsx`.
- Also extend `ExportableChart` with an optional `focusable` prop so wrapper-based charts get the button for free.
- Keyboard/a11y: `aria-label="Enlarge chart"`, Esc closes (Dialog default), focus returns to the trigger. Export button also available inside the dialog.

## Technical notes

- No metric/calculation logic changes; conformality math untouched.
- Design tokens only (no hardcoded colors); dialog uses existing `Dialog` primitives.
- Verify with `npm run lint`, `npm run test`, `npm run build`, plus a quick browser check that a re-uploaded RTSTRUCT lists real ROI names and that a chart enlarges.
