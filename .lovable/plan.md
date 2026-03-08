

# Application Audit Report

## Overall Assessment

The application is **largely correct** with solid algorithmic foundations. The core UCoMx metrics (MCS, LSV, AAV) use proper CA midpoint interpolation, active leaf filtering, and union aperture computation consistent with the UCoMx v1.1 paper. The cross-validation framework confirms TS-Python parity at tight tolerances (25/25 plans passing).

However, I found **3 correctness issues** and **2 minor inconsistencies** worth addressing.

---

## Issues Found

### 1. CRITICAL: Python `is_arc` gantry span uses wrong calculation

**TS** computes cumulative CP-by-CP gantry span (correct for full/near-full arcs):
```typescript
let totalSpan = 0;
for (let i = 1; i < gantryAngles.length; i++) {
  let d = Math.abs(gantryAngles[i] - gantryAngles[i - 1]);
  if (d > 180) d = 360 - d;
  totalSpan += d;
}
```

**Python** uses simple endpoint difference (incorrect for full arcs):
```python
gantry_span = abs(gantry_end - gantry_start)
if gantry_span > 180:
    gantry_span = 360 - gantry_span
```

For a 358° arc (e.g., start=181°, end=179°), TS correctly computes ~358° but Python computes 2°. This means Python would miss detecting full-circle arcs as VMAT if the rotation direction field is absent.

**Fix**: Replace with CP-by-CP cumulative summation in `python/rtplan_complexity/parser.py` lines 415-417.

### 2. MINOR: Python `has_rotation` checks `any()` CP vs TS checks only CP[0]

**TS** (parser.ts line 444): checks only `controlPoints[0].gantryRotationDirection`
**Python** (parser.py line 411): checks `any(cp ... for cp in control_points)`

In standard DICOM, gantry rotation direction is set on CP 0 and inherited. These should produce the same result in practice, but for strict parity, Python should check only the first CP.

**Fix**: Change `any(...)` to `control_points[0].gantry_rotation_direction in ("CW", "CCW") if control_points else False`.

### 3. MINOR: Beam-level `JA` accumulation counts ALL CPs including weight=0

Both TS and Python sum `JA` across **all** control points (including CP[0] which has `metersetWeight=0`). This is consistent between TS and Python (so no parity issue), but it means the first CP's jaw area contributes to the total despite delivering no MU. This is a design choice that could be intentional (representing the setup field), but worth noting.

---

## Verified Correct

- **Core UCoMx metrics** (MCS, LSV, AAV): CA midpoint interpolation, active leaf filtering, union A_max, Masi per-bank LSV with product combining -- all correct per the paper
- **CC→CCW gantry direction mapping**: Both TS and Python correctly normalize DICOM "CC" to "CCW"
- **`isArc` primary detection**: Rotation direction check is correct; cumulative gantry span fallback is correct in TS
- **Technique determination**: VMAT/IMRT/CONFORMAL logic matches between TS and Python
- **Jaw derivation for Elekta/Monaco**: Correctly derives X/Y jaw positions from open MLC leaves when ASYMX/ASYMY are absent
- **MLC position inheritance**: Both implementations correctly inherit MLC and jaw positions from previous CP when not present
- **Leaf travel**: Active-leaf-only travel computation matches between TS and Python
- **PM formula**: Correct per UCoMx Eq. (38)
- **Delivery time estimation**: Correct max(dose_time, gantry_time, mlc_time) approach
- **Plan-level aggregation**: MU-weighted averages for core metrics, additive for LT/GT/PA/JA
- **Energy label generation**: Correct PHOTON→X/FFF, ELECTRON→E mapping
- **Anonymization**: Patient ID and institution are properly masked
- **Perimeter calculation**: Side_perimeter algorithm with jaw clipping is correct
- **EFS formula**: Sterling's 4A/P is correct

---

## Proposed Changes

| File | Change | Priority |
|---|---|---|
| `python/rtplan_complexity/parser.py` | Fix `gantry_span` to use cumulative CP-by-CP sum (match TS) | High |
| `python/rtplan_complexity/parser.py` | Change `has_rotation` from `any()` to check only first CP (match TS) | Low |

Two targeted edits to the Python parser. No TS changes needed.

