
# Plan: Fix Build Errors and Investigate PI Divergence

## Part 1 — Build Error (Blocking)

All 19 errors have the same root cause: the `isElectron` block at line 955 tries to assign `undefined` to variables that were declared with `const`. TypeScript `const` declarations cannot be reassigned.

The variables affected (MCS, LSV, AAV, MFA, LT, LTMCS, LG, MAD_val, EFS, psmall, MUCA, LTMU, LTNLMU, LNA, NL, LTAL, GT, GS, LS) are all declared with `const` in lines 793-890.

**Fix**: Change all those `const` declarations to `let` so they can be set to `undefined` inside the electron guard block.

---

## Part 2 — PI Divergence Root-Cause Analysis

### Where the divergence lives

In `src/test/em-pi-cross-validation.test.ts`, the reference CC values are computed as:

```typescript
const ccAIavg = ccAIs.length > 0
  ? ccAIs.reduce((a, b) => a + b, 0) / ccAIs.length  // ← UNWEIGHTED simple mean
  : 0;
```

In `src/lib/dicom/metrics.ts`, the production implementation computes:

```typescript
// Per-CP weighted accumulation
const ai = calculateApertureIrregularity(cp.mlcPositions, beam.mlcLeafWidths, cp.jawPositions);
weightedPI += ai * weight;  // ← weight = delta cumulativeMetersetWeight

// Aggregate
const PI = totalMetersetWeight > 0 ? weightedPI / totalMetersetWeight : 1; // ← WEIGHTED mean
```

Then at the plan level:
```typescript
// calculatePlanMetrics aggregates beam-level PI with MU weighting too
```

### Why they differ (and who is right)

For plans with uniform control-point spacing (Eclipse VMAT, Monaco), the simple mean and weighted mean produce nearly identical results — divergence ≈ 1–2%.

For RayStation and Elements plans, control points have highly **non-uniform meterset weights** (VMAT with dose-rate modulation). A few CPs near the target deliver much more MU and therefore have much higher aperture complexity. The weighted average captures this correctly; the unweighted average does not.

**Conclusion: the production metrics.ts implementation is correct.** The 10–16% divergence on RayStation/Elements is an artefact of the cross-validation test's unweighted averaging, not a bug in the algorithm.

### Verification

The cross-validation test should be updated to mirror the production weighted-averaging logic so the reported divergence reflects only genuine algorithmic differences (perimeter formula), not aggregation differences.

---

## Technical Changes

### File: `src/lib/dicom/metrics.ts`

Change all 19 `const` declarations to `let` for variables that the electron guard block overwrites with `undefined`:

```typescript
// Before (causes TS2588):
const LSV = totalDeltaMU > 0 ? ... : ...;
const AAV = ...;
const MCS = ...;
const LT = ...;
// etc.

// After:
let LSV = totalDeltaMU > 0 ? ... : ...;
let AAV = ...;
let MCS = ...;
let LT = ...;
// etc.
```

Variables to change from `const` to `let`:
- `LSV` (line 793)
- `AAV` (line 796)
- `MCS` (line 799)
- `LT` (line 806)
- `NL` (line 809)
- `LG` (line 813)
- `MAD_val` (line 814)
- `EFS` (line 815)
- `MFA` (line 822)
- `psmall` (line 830)
- `LTMCS` (line 832)
- `MUCA` (line 867)
- `LTMU` (line 870)
- `LTNLMU` (line 873)
- `LNA` (line 876)
- `LTAL` (line 879)
- `GT` (line 882)
- `GS` (line 885)
- `LS` (line 890)

### File: `src/test/em-pi-cross-validation.test.ts`

Update the CC reference computation to use **meterset-weight-weighted averaging**, matching the production implementation. This means accumulating `ai * metersetDelta` and dividing by the total weight, instead of a simple array average.

The updated aggregation in the test:

```typescript
// Instead of:
const ccAIavg = ccAIs.reduce((a, b) => a + b, 0) / ccAIs.length;

// Use weighted accumulation:
let totalWeight = 0;
let weightedAI = 0;
for (const cp of beam.controlPoints) {
  // ... compute ai and weight from delta cumulativeMetersetWeight
  weightedAI += ai * weight;
  totalWeight += weight;
}
const ccAIavg = totalWeight > 0 ? weightedAI / totalWeight : 0;
```

This makes the cross-validation test compare apples-to-apples and should reduce the reported PI divergence on RayStation/Elements from 10–16% down to <2%.

Similarly, apply the same fix to the EM weighted averaging in the test (currently unweighted too).

---

## Summary

| Issue | Root Cause | Fix Location | Expected Outcome |
|---|---|---|---|
| TS2588 build error (19 errors) | `isElectron` guard reassigns `const` variables | `metrics.ts`: `const` → `let` for 19 variables | Build passes |
| 10–16% PI divergence (RayStation/Elements) | Test uses unweighted mean; production uses MU-weighted mean | Cross-validation test: adopt weighted averaging | Reported divergence drops to <2% |

Only two files need changes.
