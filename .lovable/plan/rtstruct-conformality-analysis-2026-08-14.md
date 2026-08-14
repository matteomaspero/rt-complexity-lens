# RTSTRUCT Conformality Analysis

Yes — it is possible, and part of it already exists: the single-plan viewer already accepts an RTSTRUCT upload and feeds simplified BAM/PAM metrics. Today that geometry is a placeholder (jaw bounding boxes only, MLC ignored, no beam divergence) and there is no way to choose which ROI is the target. This plan replaces the placeholder with real polygon geometry, adds a full conformality metric set, and extends RTSTRUCT upload to Compare, Batch and Cohort.

Educational tool only — conformality output is not clinically validated and the existing disclaimer stays in place.

## What the user gets

1. **ROI picker** — after uploading an RTSTRUCT, a dropdown lists all structures with contour counts; PTV-like names are auto-preselected. Currently the first ROI is silently used.
2. **Beam's-eye-view overlay** — the projected target outline drawn over the MLC aperture viewer, per control point, so the aperture/target relation is visible and the numbers are checkable.
3. **Conformality metrics** (per control point, per beam MU-weighted, per plan):
   - **BAM / PAM** upgraded to true polygon geometry (aperture from MLC leaf pairs plus jaws; target projected with beam divergence).
   - **Target coverage fraction** — share of the projected target inside the aperture.
   - **Aperture/target area ratio** — flags over- or under-sized apertures.
   - **Margin statistics** — mean and minimum aperture-edge-to-target-edge distance in mm at isocentre.
4. **Availability on all analysis routes** — viewer, Compare (one RTSTRUCT per plan, diffed side by side), Batch and Cohort (one shared RTSTRUCT applied to every plan, with per-plan override by matched StructureSet UID when present).
5. **Exports** — new metrics included in CSV/JSON exports and PDF reports; ROI name and source file recorded for provenance.

## Technical approach

**Geometry core — new `src/lib/dicom/conformality.ts`**
- Divergent BEV projection: patient point -> couch/gantry/collimator rotation chain (IEC 61217, reusing the existing rotation conventions) -> perspective scale by `SAD / (SAD - z_beam)` to the isocentre plane.
- Target BEV outline: project every contour point of the selected ROI, take the per-control-point convex hull of the projected cloud as the target silhouette (documented approximation; slice-wise union is a possible later refinement).
- Aperture polygon: build from open MLC leaf-pair spans clipped by jaw X/Y, reusing the existing leaf-boundary and Y-clipping logic in `src/lib/dicom/metrics.ts` so aperture area stays consistent with AAV/EM/perimeter.
- Boolean ops: add `polygon-clipping` (small, MIT, no native deps) for intersection/difference areas. Margin statistics use point-to-segment distances from sampled aperture edge points to the target outline.
- Pure functions, no React, so they run inside the existing WebWorker path for batch/cohort.

**Types and metric registry**
- Extend `ControlPointMetrics`, `BeamMetrics`, `PlanMetrics` in `src/lib/dicom/types.ts` with optional `coverage`, `apertureTargetRatio`, `marginMean`, `marginMin` (undefined when no RTSTRUCT is loaded).
- Register the new metrics in `src/lib/metrics-definitions.ts` (category: Geometric), which automatically surfaces them in MetricsReference, Help and TechnicalReference.
- Add them to `src/lib/comparison/diff-calculator.ts` and `src/lib/cohort/metric-utils.ts` so Compare/Cohort/Batch charts pick them up.

**State and UI**
- New `src/contexts/StructureContext.tsx` holding `{ structures, selectedRoi, sourceFileName }` so the viewer, Compare, Batch and Cohort all read the same selection.
- New `src/components/viewer/StructureSelector.tsx` (shadcn `Select`) with PTV/CTV/GTV name heuristics for the default choice.
- `MLCApertureViewer.tsx` gains an optional target-outline SVG path with a legend entry.
- `ComparisonUploadZone.tsx` gains an RTSTRUCT slot per plan; `BatchUploadZone`/`CohortUploadZone` gain a single shared RTSTRUCT slot plus a note that it applies to all plans.
- `BatchContext`/`CohortContext` pass the selected structure into `calculatePlanMetrics`, and recompute when the ROI selection changes.

**Python parity**
- Mirror the geometry and the four new metrics in `python/rtplan_complexity/` (`conformality.py`, `types.py`, `metrics.py`, RTSTRUCT reading in `parser.py`) using `shapely` as the clipping backend; bump to 1.4.0 and add tolerances to `python/tests/cross_validate.py`.

**Docs and validation**
- `docs/ALGORITHMS.md`: new section with formulas, the convex-hull silhouette approximation and its limits.
- `src/lib/validation-data.ts`: move BAM/PAM out of "simplified placeholder", add the new metrics with TS-Python parity status.
- `docs/LOVABLE_CONTEXT.md` updated in the same pass.

**Tests**
- `src/test/conformality.test.ts`: analytic cases (square aperture vs concentric square target -> known coverage/ratio/margins), off-axis divergence scaling, no-RTSTRUCT path returns undefined, MU-weighted aggregation.
- Verify with `npm run lint`, `npm run test`, `npm run build`, plus a demo-plan smoke check on viewer, Compare, Batch and Cohort.

## Sequencing

1. Geometry core + types + unit tests.
2. Viewer: ROI picker, BEV overlay, metrics panel wiring.
3. Compare, Batch, Cohort upload slots and recomputation.
4. Exports, PDF, metric registries.
5. Python parity, docs, validation report.
