## Objective

Close the two remaining audit gaps (Park MI_t / MI_s / MI_a, EM=0 on static IMRT), re-run the full audit, refresh the Validation Report, and prepare the `rtplan-complexity` Python package for a PyPI release.

## Scope

### 1. Implement Park Modulation Indices (MI_s, MI_a, MI_t)

Reference: Park et al., *"A beam-specific modulation complexity score for intensity-modulated radiation therapy"*, PMB 2014, as implemented in UCoMx v1.1 (`MIs`, `MIa`, `MIt` columns).

Definition (per beam, then MU-weighted across beams):

- Compute leaf speed v(i, k) between adjacent control points k, k+1 for each leaf i.
- Compute leaf acceleration a(i, k) between adjacent speed samples.
- MI_s(f) = fraction of (leaf × CP-interval) samples with |v| > f · v_mean, integrated over f ∈ [0, 2] in steps of 0.01.
- MI_a(f) same for acceleration.
- MI_t(f) same but modulates by gantry-speed / dose-rate variation between CPs (Park's temporal term).

Weight by CP delta-MU, sum across the beam, then MU-weight across beams for plan-level values.

Files to add / edit:

- `src/lib/dicom/metrics.ts` — new helpers `calculateParkMIs`, `calculateParkMIa`, `calculateParkMIt`; wire into `calculateBeamMetrics` and plan aggregation.
- `src/lib/dicom/types.ts` — add `MI_s`, `MI_a`, `MI_t` to `BeamMetrics` and `PlanMetrics`.
- `src/lib/metrics-definitions.ts` — register the three metrics (category: Complexity) with formula + reference.
- Python mirror in `python/rtplan_complexity/metrics.py` and `types.py` so parity holds.
- Tests: `src/test/dicom-metrics.test.ts` (synthetic golden case), `python/tests/test_metrics.py` (matching case).

### 2. EM=0 on static step-and-shoot plans

Investigate: current per-CP EM uses `weight > 0` gating, which drops shaping CPs in step-and-shoot. Static IMRT often emits `(shape CP, weight=0) → (same shape, weight=δ)` pairs; the perimeter is on the *shape* CP, but the weight lands on the delivery CP whose MLC state is identical, so EM should still be non-zero. Reproduce on `RP.TG119.CS_ETH_2A_#1.dcm` and locate whether:

- (a) beam type detection reroutes static IMRT down a different path that skips EM, or
- (b) `aperturePerimeter` is zero on the weighted CPs because the parser copies the previous MLC but resets the perimeter cache.

Fix minimally in one place (parser or metrics loop). Add a regression case using one of the affected TG-119 plans.

### 3. Re-run the audit

- `python tests/audit_all.py` (already writes `audit_ts_python_per_plan.json`, `audit_pycomplexity_per_plan.json`, `audit_summary.json`, `AUDIT_REPORT.md`).
- Regenerate `python/tests/reference_data/reference_metrics_ts.json` and `benchmark_pycomplexity.json`.
- Confirm 25/25 plans pass at Δ = 0 for all 24 metrics plus the three new Park MIs.

### 4. Refresh Validation Report + docs

- `src/lib/validation-data.ts`: remove Park MI from `KNOWN_GAPS` (or move to "resolved"); update `notImplementedUCoMxMetrics` list; refresh audit summary numbers and generation date; update EM gap entry based on the fix outcome.
- `src/pages/ValidationReport.tsx`: no structural change, just re-render with new data.
- `docs/ALGORITHMS.md`: add a Park MI section with formulas and Park 2014 citation; add a dated "Audit Results (2026-07-24)" entry.

### 5. Prepare Python package for PyPI

- Bump `python/pyproject.toml` version 1.1.0 → 1.2.0 (adds Park MIs, EM fix, third-party benchmark script).
- Update `python/rtplan_complexity/__init__.py` `__version__` and re-export new metrics.
- Refresh `python/README.md` + `python/PACKAGE_STATUS.md` with the new metrics list and audit link.
- Ensure `python/MANIFEST.in` includes `tests/reference_data/*.json` and `AUDIT_REPORT.md` so the audit ships with the sdist.
- Run `python -m build` + `twine check dist/*` locally (via `code--exec`) to confirm the wheel + sdist pass.
- **Do NOT run** `twine upload` — publishing needs the maintainer's PyPI token from Workspace Secrets and their explicit go-ahead. Leave `python/UPLOAD_INSTRUCTIONS.md` with the exact `twine upload` invocation and the token env-var name to expect.

## Out of scope

- MCSv, BJAR, LTNL, PMU, MUcGy (still tracked under `notImplementedUCoMxMetrics`).
- Actually uploading to PyPI — that stays a manual maintainer action.

## Technical notes

- Park MI integrates over a threshold spectrum; use trapezoidal integration with 201 samples on [0, 2] to match UCoMx v1.1 exactly. If UCoMx's step size differs, mirror UCoMx (source: `testdata/reference_dataset_v1.1/…/dataset.xlsx` columns `MIs`, `MIa`, `MIt`) once we can validate against it; otherwise document the chosen spectrum in `ALGORITHMS.md`.
- Speed/acceleration require valid delta-time between CPs; where CumulativeMetersetWeight is the only ordering signal (static IMRT), MI_t collapses toward MI_s — record that behaviour in the docs, don't force a synthetic time axis.
- Wheel builds run inside `code--exec`; do not touch the dev server.

## Verification checklist

1. `bunx vitest run` — full TS suite green.
2. `python -m pytest python/tests` — full Python suite green.
3. `python tests/audit_all.py` — 25/25, zero deltas, Park MIs present.
4. `python -m build && twine check dist/*` — both artefacts PASSED.
5. `/validation` route renders the refreshed numbers; no design-token regressions beyond the two pre-existing warnings.
