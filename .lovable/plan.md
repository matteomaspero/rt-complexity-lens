# Python Parity + Docs/Validation for Conformality

The TypeScript side now computes polygon-based conformality (`src/lib/dicom/conformality.ts`: divergent BEV projection, MLC+jaw aperture polygons, TCOV/ATR/MARG/MARGMIN, MU-weighted beam and plan aggregation). The Python toolkit still uses the older approximation: `project_point_to_bev` ignores collimator rotation and beam divergence (couch angle documented as "not yet implemented"), the aperture polygon is built from leaf spans without the TS Y-clipping/union conventions, and only BAM/PAM exist — no TCOV/ATR/MARG/MARGMIN. Docs and the validation report do not yet cover the new metrics.

Educational tool only; conformality output stays explicitly non-clinically-validated and the disclaimer remains.

## What changes

1. **Python conformality module** — new `python/rtplan_complexity/conformality.py` mirroring the TS module one function at a time, using `shapely` (already a declared dependency) as the clipping backend:
   - divergent projection: couch -> gantry -> collimator rotation chain (IEC 61217), perspective scale `SAD / (SAD - z_beam)` to the isocentre plane, per-beam SAD from DICOM with a 1000 mm fallback;
   - target silhouette: per-control-point convex hull of the projected ROI point cloud (same documented approximation as TS);
   - aperture polygon: leaf-pair spans clipped by jaw X/Y with the same closing rules used by the TS perimeter/EM code, so aperture area stays consistent with AAV/EM;
   - per-CP results (coverage, aperture/target ratio, mean and min margin) plus MU-weighted beam and plan aggregation, identical weighting to TS.
2. **BAM/PAM upgrade in Python** — reroute `calculate_pam_beam` / plan PAM through the new module so BAM/PAM are polygon-based and match TS, replacing the legacy projection helpers.
3. **Types and metrics wiring** — add `TCOV`, `ATR`, `MARG`, `MARGMIN` to `ControlPointMetrics`, `BeamMetrics`, `PlanMetrics` in `python/rtplan_complexity/types.py` (optional, `None` without an RTSTRUCT) and populate them in `python/rtplan_complexity/metrics.py`; include them in `python/rtplan_complexity/export.py` tabular output.
4. **RTSTRUCT selection parity** — a `pick_default_target` helper in `parser.py` with the same PTV > CTV > GTV heuristic as `pickDefaultTargetIndex`, so CLI/examples pick the same ROI the UI does.
5. **Cross-validation** — extend `python/tests/cross_validate.py` with the four conformality metrics plus BAM/PAM and appropriate geometric tolerances; add a conformality case to `python/tests/test_pam.py` (analytic square aperture vs concentric square target with known coverage/ratio/margins). Since the audit fixtures are RTPLAN-only, TS<->Python parity for conformality is driven by a synthetic RTSTRUCT generated in the test rather than the TG-119 plan set; that limitation is stated in the report.
6. **Version bump** — `python/pyproject.toml` and `python/rtplan_complexity/__init__.py` to 1.4.0, with the conformality feature noted in the module docstring.
7. **Docs** — new section in `docs/ALGORITHMS.md`: projection chain and rotation conventions, aperture construction, the convex-hull silhouette approximation and its limits, exact TCOV/ATR/MARG/MARGMIN formulas, and MU weighting. Update `docs/LOVABLE_CONTEXT.md` in the same pass; keep README doc links current.
8. **Validation report** — in `src/lib/validation-data.ts`: move BAM/PAM out of "simplified placeholder", add the four new metrics with their TS<->Python parity status and the synthetic-fixture caveat, and record under Known Gaps that the target silhouette is a convex hull (not a slice-wise union) and that conformality is not cross-checked against a third-party package because none of the benchmarked tools expose it.

## Verification

`npm run lint`, `npm run test`, `npm run build`, then `python python/tests/cross_validate.py` and `python python/tests/audit_all.py` to confirm the 24 existing metrics stay at zero delta and the new conformality metrics agree within tolerance.

## Not included

PDF report conformality fields and the BEV thumbnail — say the word and I will fold that in.
