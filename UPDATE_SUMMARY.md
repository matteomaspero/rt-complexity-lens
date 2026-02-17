# Update Summary - February 17, 2026

## Overview

Completed comprehensive cross-validation testing of the RT-Complexity-Lens Python package and TypeScript web implementation against the UCoMX v1.1 MATLAB reference. **Identified critical metric discrepancies requiring urgent fixes.**

## What Was Done

### 1. Cross-Validation Testing ✅
- Executed UCoMX validation test on 12 overlapping plans
- **Result:** 53 matches, 260 mismatches, 47 missing (14.7% match rate)
- Identified 7 critical failure modes

### 2. Documentation Updates ✅
- Created `CROSS_VALIDATION_FINDINGS.md` - Detailed analysis of all failures
- Created `BUG_INVESTIGATION_GUIDE.md` - Step-by-step debugging instructions
- Updated main `README.md` with status notice
- Updated `python/README.md` with known issues
- Downgraded package status from Beta to Alpha in `pyproject.toml`

### 3. Root Cause Analysis ✅
Identified specific issues:
| Metric | Error | Root Cause |
|--------|-------|-----------|
| LT (Leaf Travel) | 183× scaling | Division by dimension missing |
| TG (Tongue-Groove) | 1855× difference | Formula/units mismatch |
| JA (Jaw Area) | 108× scaling | Jaw position or units issue |
| ETH Plans | All zeros | Electron beam parsing/filtering |
| GS, LS (Speeds) | 50-100× | Time estimation cascade |
| SAS5, SAS10 | 70-100% error | Aperture threshold logic |

## Critical Issues Requiring Fixes

### Blocking Issues (Priority 1)

1. **Electron Beam Support** - ETH plans return MCS=0, AAV=0
   - **Impact:** Cannot analyze electron plans at all
   - **Fix:** Debug electron beam parsing and metric calculation
   - **Est. Time:** 1-2 hours

2. **Leaf Travel Scaling** - Off by factor of ~183
   - **Impact:** Cascades to LSV, PT, LTMCS calculations
   - **Fix:** Add missing normalization (division by # leaves or # CPs)
   - **Est. Time:** 30 mins - 1 hour

3. **JawArea Calculation** - Off by factor of ~108
   - **Impact:** JA metric unusable
   - **Fix:** Verify units and jaw position baseline
   - **Est. Time:** 30 mins

### Major Issues (Priority 2)

4. **Tongue-and-Groove (TG)** - 1855× different values
   - **Fix:** Review formula vs UCoMX paper, verify units
   - **Est. Time:** 1-2 hours

5. **Time Estimation Cascade** - Affecting GS, LS, mDRV, mGSV
   - **Fix:** Audit delivery time calculation, compare with UCoMX
   - **Est. Time:** 2-3 hours

### Workflow Recommendation

**Stage 1 - Emergency Fixes (1-2 hours)**
1. Fix electron beam parsing → re-enable ETH plan analysis
2. Fix LT scaling → restore leaf travel metrics
3. Fix JA calculation → restore jaw area metric
4. Run cross-validation → verify improvement

**Stage 2 - Algorithm Audit (3-4 hours)**
5. Compare TG formula with UCoMX specification
6. Audit delivery time estimation
7. Verify SAS thresholds
8. Run full test suite → target >80% match rate

**Stage 3 - Validation (2-3 hours)**
9. Create detailed test cases for each fixed metric
10. Compare expected vs actual on reference dataset
11. Generate updated cross-validation report
12. Update package documentation

## Files Modified/Created

| File | Change | Impact |
|------|--------|--------|
| `CROSS_VALIDATION_FINDINGS.md` | NEW | Detailed failure analysis |
| `BUG_INVESTIGATION_GUIDE.md` | NEW | Debugging roadmap |
| `README.md` | UPDATED | Added status notice |
| `python/README.md` | UPDATED | Added known issues section |
| `python/pyproject.toml` | UPDATED | Changed status to Alpha |

## Next Steps

1. **Immediately:**
   - Post findings to development team
   - Assign priority 1 issues to developers
   - Set up dedicated debugging session

2. **This Week:**
   - Fix electron beam parsing
   - Fix LT and JA scaling
   - Re-run cross-validation

3. **Following Week:**
   - Complete algorithm audits
   - Fix TG formula
   - Address time estimation
   - Full test coverage

## Testing Commands

### Run Cross-Validation
```bash
cd python/tests
python cross_validate_ucomx.py
```

### Run Unit Tests
```bash
cd python
pytest tests/test_metrics.py -v
```

### Test Single Problematic Plan
```python
from rtplan_complexity import parse_rtplan, calculate_plan_metrics

# Test ETH plan
plan = parse_rtplan("testdata/reference_dataset_v1.1/Linac/Eclipse/RP.TG119.CS_ETH_2A_#1.dcm")
metrics = calculate_plan_metrics(plan)
print(f"MCS: {metrics.MCS} (expect >0)")
print(f"LT: {metrics.LT} (expect ~37.89)")
```

## References

- **Cross-Validation Data:** `testdata/reference_dataset_v1.1/`
- **UCoMX Excel Reference:** `testdata/reference_dataset_v1.1/0-all-20262822356.397/dataset.xlsx`
- **TS Implementation:** `src/lib/dicom/metrics.ts` (1586 lines)
- **Python Implementation:** `python/rtplan_complexity/metrics.py` (1415 lines)
- **Tests:** `python/tests/cross_validate_ucomx.py`

## Key Metrics Summary

### Perfect Match ✅
- totalMU (0% error)

### Acceptable Range ⚠️
- MUCA: 18.33% error
- MAD: 10.96% error
- LTMU: 25.85% error
- AAV: 9.97% error
- LSV: 29.67% error
- MCS: 20.45% error

### Major Failures ❌
- LT: 99.45% error (183× scaling)
- TG: 99.95% error (1855× different)
- JA: 99.08% error (108× scaling)
- GS: 98.94% error
- PI: 90.54% error
- EFS: 100% error
- ETH Plans: 100% error (all zeros)

## Health Status

| Component | Status | Confidence |
|-----------|--------|------------|
| Core Parsing | ✅ Working | High |
| Primary Metrics | ⚠️ Partial | Medium |
| Speed Metrics | ❌ Broken | Low |
| Electron Beams | ❌ Broken | Low |
| PAM/BAM | ✅ Working | High |

---

**Report Generated:** 2026-02-17  
**Duration:** ~3 hours investigation  
**Scope:** Full metric suite validation  
**Recommendation:** Prioritize Critical issues to restore package functionality
