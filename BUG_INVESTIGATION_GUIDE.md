# Bug Investigation Guide

## Critical Bugs - Priority Order

### 1. ETH (Electron) Plans Returning Zero Metrics

**Severity:** CRITICAL  
**Impact:** All ETH plans return MCS=0, AAV=0, affecting accuracy of electron beam analysis

**Status:** ETH plans include:
- RP.TG119.CS_ETH_2A_#1.dcm - MCS=0
- RP.TG119.CS_ETH_9F.dcm - MCS=0
- And all other ETH variants

**Root Cause Candidates:**
1. Electron beams not being parsed correctly (radiation_type handling)
2. Control points for electrons missing or malformed
3. MLC positions set to zero for electrons
4. Filtering logic excluding electrons

**Investigation Steps:**
```python
# Test ETH plan parsing
from rtplan_complexity import parse_rtplan, calculate_plan_metrics

plan = parse_rtplan("RP.TG119.CS_ETH_2A_#1.dcm")
print(f"Beams: {len(plan.beams)}")
for beam in plan.beams:
    print(f"  {beam.beam_name}: {beam.radiation_type}, CPs: {beam.number_of_control_points}")
    print(f"    First CP MLC: bankA={beam.control_points[0].mlc_positions.bank_a[:3]}")
    print(f"    First CP: gantry={beam.control_points[0].gantry_angle}°")

metrics = calculate_plan_metrics(plan)
print(f"CalculatedMCS: {metrics.MCS}")
```

**Potential Fixes:**
- Check if `radiation_type == "ELECTRON"` triggers special handling
- Verify MLC positions are populated for electron beams
- Check control point count

---

### 2. Leaf Travel (LT) - 100× Scaling Error

**Severity:** CRITICAL  
**Impact:** LS, LSV, speed metrics affected downstream

**Current vs Expected:**
```
TS reports: 6940 mm (RTPLAN_EL_PT_01)
UCoMX reports: 37.89 mm
Ratio: 183× higher in TS
```

**Root Cause Candidates:**
1. Not dividing by number of leaves
2. Summing movement for both banks instead of averaging
3. Summing per-leaf travel for ALL leaves instead of just active
4. Unit error (counting steps instead of distance)

**Code to Investigate:**
- TypeScript: Search for `calculateLeafTravel` around line ~800
- Python: `python/rtplan_complexity/metrics.py` - `calculate_leaf_travel()`

**Test Case:**
```
RTPLAN_EL_PT_01.dcm:
- UCoMX LT: 37.89 mm
- TS LT: 6940.2 mm
- Ratio: 183×

Pattern: All plans show TS reporting 100-200× higher LT
Suggests: Division missing (# of leaves = 60, or # of CPs, or # of banks)
```

**Potential Fixes:**
```python
# Check current code structure:
# Currently: LT = sum of all leaf movements
# Should be: LT = sum of active leaf movements (filtered by jaw)
# or: LT / number_of_leaves
# or: LT / (number_of_control_points - 1)  # per-CP movement
```

---

### 3. Tongue-and-Groove (TG) - Near-Complete Mismatch

**Severity:** HIGH  
**Impact:** TG metric unusable for plan comparison

**Current vs Expected:**
```
RTPLAN_EL_PT_01:
  UCoMX: 35.3°
  TS: 0.019°
  Ratio: 1855× different
```

**Root Cause Candidates:**
1. Formula completely different from reference
2. Returns dimensionless ratio instead of angle
3. Units mismatch (currently returns 0-1 ratio, should return degrees or mm)
4. Algorithm description in code doesn't match UCoMX formula

**Potential Fixes:**
- Compare formula in code vs published UCoMX paper
- Verify units (should be in degrees or mm, not ratio)
- Check if normalization factor is correct

---

### 4. JawArea (JA) - 100× Scaling Error or Complete Miscalculation

**Severity:** HIGH  
**Impact:** JA metric completely unreliable

**Current vs Expected:**
```
RTPLAN_EL_PT_01:
  UCoMX: 25104.0 cm²
  TS: 232.1 cm²
  Ratio: 108× difference

RTPLAN_MO_PT_01:
  UCoMX: 30455.0 cm²
  TS: 0 cm²? (NaN in reference)
```

**Root Cause Candidates:**
1. Jaw positions being parsed incorrectly (in different units?)
2. Averaging JA across CPs instead of using final/maximum
3. Sum instead of average (or vice versa)
4. Baseline jaw position not being subtracted

**Code Location:** `calculateJawArea()` function in both implementations

**Investigation:**
```python
# Check jaw dimensions in a plan
plan = parse_rtplan("RTPLAN_EL_PT_01.dcm")
for i, beam in enumerate(plan.beams):
    if i == 0:
        for j, cp in enumerate(beam.control_points):
            ja = cp.jaw_positions
            print(f"CP {j}: X=[{ja.x1}, {ja.x2}], Y=[{ja.y1}, {ja.y2}]")
            area = (ja.x2 - ja.x1) * (ja.y2 - ja.y1) / 100
            print(f"  -> Calculated JA: {area} cm²")
```

---

### 5. Speed Metrics Cascade (GS, LS, mDRV, mGSV) - 50-100× Error

**Severity:** HIGH  
**Impact:** All speed-based metrics unreliable

**Affected Metrics:**
- **GS** (Gantry Speed): UCoMX=5.37°/s, TS=0.0570°/s (94× smaller)
- **LS** (Leaf Speed): UCoMX=2.47 mm/s, TS=0.443 mm/s (82% error)  
- **mDRV** (Dose Rate Variation): Huge variations
- **mGSV** (Gantry Speed Variation): Major discrepancies

**Root Cause:** Likely in delivery time estimation

```typescript
function estimateBeamDeliveryTime(...):  // Search in metrics.ts around line 580
```

**Time Estimation Issues:**
1. Using wrong formula for delivery time
2. Gantry/MLC speed limits set incorrectly
3. Gantry rotation time calculation wrong
4. Not accounting for dose rate limiting

**Test Fast Track:**
```
If (total_time)is wrong, all speed metrics will cascade:
  GS = arc_length / total_time  -> wrong total_time = wrong GS
  LS = total_leaf_travel / total_time  -> wrong
  mDRV = variation in dose rates  -> depends on time segments
```

---

## Secondary Issues

### 6. Small Aperture Metrics (SAS5, SAS10, psmall) - Large Variations

**Severity:** MEDIUM  
**Impact:** Quality assurance metrics affected

**Issues:**
- `psmall`: 100% error (0 vs non-zero)
- `SAS5`: 100% error
- `SAS10`: 73.7% error

**Root Cause Candidates:**
1. Aperture area threshold definitions wrong
2. Small aperture detection logic incorrect
3. MU-weighting applied incorrectly

---

### 7. Modulation Metrics (PM, MD, MI) - Formula Issues

**Severity:** MEDIUM  
**Impact:** Complexity classification affected

**Issues:**
- **PM** (Plan Modulation): 99.73% error (207.88 vs 0.57)
- **MD** (Modulation Degree): Cascading from other metrics
- **MI** (Modulation Index): Cascading from other metrics

**Root Cause:** Likely depend on upstream metrics (LT, MCS, etc.)

---

## Detailed Testing Plan

### Phase 1: Isolate Electron Beam Issue

1. Load `RP.TG119.CS_ETH_2A_#1.dcm`
2. Inspect beam properties (radiation_type, number of CPs)  
3. Check if first CP has valid MLC positions
4. Compare against photon beam (`RP.TG119.CS_TB_2A_#1.dcm`)
5. Debug metric calculation step-by-step

### Phase 2: Fix Leaf Travel Scaling

1. Manually calculate expected LT from test plan
2. Trace through calculation code
3. Identify where 183× factor comes from
4. Apply fix

### Phase 3: Time Estimation Audit

1. Compare delivery time formula with UCoMX paper
2. Verify gantry speed, MLC speed, dose rate limits
3. Check if time components are being summed correctly
4. Re-test GS, LS, mDRV, mGSV

### Phase 4: Verify Against Reference

After each fix, run cross-validation:
```bash
cd python/tests
python cross_validate_ucomx.py
```

Target: >90% match rate for critical metrics

---

## Debugging Commands

### Run Full Cross-Validation
```bash
python -m pytest python/tests/test_metrics.py -v
python python/tests/cross_validate_ucomx.py | tee validation_results.txt
```

### Test Single Plan
```python
from rtplan_complexity import parse_rtplan, calculate_plan_metrics

plan = parse_rtplan("testdata/reference_dataset_v1.1/Linac/Eclipse/RTPLAN_EL_PT_01.dcm")
metrics = calculate_plan_metrics(plan)

print(f"LT: {metrics.LT} (expect ~37.89)")
print(f"TG: {metrics.TG} (expect ~35.3)")
print(f"JA: {metrics.JA} (expect ~25104)")
print(f"GS: {metrics.GS} (expect ~5.37)")
```

### TypeScript Testing
```bash
npm run test -- --grep "metrics"
```

---

## References

- **UCoMX Paper**: DOI pending  
- **Reference Data**: `/testdata/reference_dataset_v1.1/` and `0-all-*/dataset.xlsx`
- **TS Implementation**: `src/lib/dicom/metrics.ts` (1586 lines)
- **Python Implementation**: `python/rtplan_complexity/metrics.py` (1415 lines)
- **Test Data**: `python/tests/cross_validate_ucomx.py`

---

**Last Updated:** 2026-02-17  
**Status:** Critical issues documented, ready for bug fixes
