# Implement Remaining UCoMx Metrics + PyPI Publishing via GitHub Actions

## Part A — Implement 5 metrics (TS + Python parity)

Definitions from the UCoMx v1.1 reference (Chiavassa/Duchateau) and Park 2014:

| Metric | Definition |
|---|---|
| **MCSv** | Modulation Complexity Score for VMAT (McNiven 2010): same MU-weighted product of LSV·AAV as MCS, but pair-wise between adjacent CPs (segment = interval), not per CP. For static IMRT falls back to MCS. |
| **BJAR** | Beam Jaw Area Ratio = mean over CPs of (aperture_area / jaw_area). Requires per-CP aperture area (already computed) and jaw area (already computed for `JA`). |
| **LTNL** | Leaf Travel Normalized by Luminance — Σ leaf_travel per beam / (beam MU × mean aperture area). Units: mm/(MU·cm²). |
| **PMU** | Plan MU = totalMU / total prescribed dose (Gy). Inverse of MUcGy scaled — reported per plan. |
| **MUcGy** | MU per cGy at prescription point = totalMU / (prescription_dose_Gy × 100). Uses `DoseReferenceSequence` target dose. |

### Files to edit (mirror TS ⇄ Python)
- `src/lib/dicom/types.ts` — add optional fields on `PlanMetrics` and `BeamMetrics` where applicable.
- `src/lib/dicom/metrics.ts` — implement calculators; wire into `calculatePlanMetrics`.
- `python/rtplan_complexity/types.py` — mirror fields.
- `python/rtplan_complexity/metrics.py` — mirror calculators.
- `src/lib/metrics-definitions.ts` — add UI definitions (category, description, references, thresholds).
- `src/lib/export-utils.ts` + Python `export.py` — include in CSV/JSON exports.
- `python/tests/cross_validate.py` — add tolerances.
- `src/test/dicom-metrics.test.ts` — add a focused parity test for each new metric on one static-IMRT and one VMAT demo plan.
- `docs/ALGORITHMS.md` — add formulas + references.
- `src/lib/validation-data.ts` — remove the 5 metrics from `notImplementedUCoMxMetrics` after audit passes.

### Validation
1. Regenerate TS reference: `bunx vitest run export-metrics-json`.
2. Run `python tests/audit_all.py` — confirm all 25 plans pass TS↔Python parity for the new metrics and existing metrics remain at Δ≈0.
3. Refresh `AUDIT_REPORT.md` and update the Validation Report page counts.

## Part B — PyPI publishing via GitHub Actions

The GitHub App connector calls the GitHub REST API from edge functions; it cannot push git commits or run local `twine`. The correct path is a GitHub Actions workflow triggered on tag push, using PyPI's Trusted Publishing (OIDC) — no long-lived token required.

### Steps
1. Add `.github/workflows/publish-python.yml`:
   - Trigger: `push` on tags matching `python-v*`, plus `workflow_dispatch`.
   - Job: checkout → set up Python 3.11 → `pip install build` → `python -m build` in `python/` → `pypa/gh-action-pypi-publish@release/v1` with `packages-dir: python/dist/`.
   - Use OIDC (`permissions: id-token: write`) — no secrets in the workflow.
2. Document a one-time PyPI setup in `python/PUBLISHING_GUIDE.md`:
   - Create the project on PyPI (if not already).
   - Add a Trusted Publisher pointing to `<owner>/<repo>` + workflow filename + environment `pypi`.
   - Alternative fallback: create a PyPI API token and store it as `PYPI_API_TOKEN` in GitHub repo secrets; workflow can switch to token auth if OIDC is refused.
3. Tag `python-v1.2.0` (the version already bumped) — I will not push the tag from here; instead the plan documents the exact `git tag` / `git push` commands the user runs after the workflow lands, since the Lovable sandbox cannot push tags to their repo.
4. Optionally, use the GitHub connector from an edge function later to trigger `workflow_dispatch` on demand — noted as a follow-up, not part of this change.

### Why not "push directly to PyPI from Lovable"
- PyPI accepts uploads only via `twine`/`gh-action-pypi-publish`, not the GitHub REST API.
- Lovable's sandbox is ephemeral and cannot hold PyPI credentials for repeatable releases.
- GitHub Actions + OIDC is the standard, secretless, auditable path.

## Order of work
1. Implement 5 metrics in TS.
2. Mirror in Python.
3. Add tests + regenerate TS reference + run audit.
4. Update docs and validation UI.
5. Add the GitHub Actions workflow + publishing guide.
6. Report back with audit deltas and the exact tag command for the user to publish v1.2.0.
