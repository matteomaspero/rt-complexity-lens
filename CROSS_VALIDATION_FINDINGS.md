# Cross-Validation Findings - February 2026

## Executive Summary

**Status:** ❌ **CRITICAL - Multiple metric mismatches detected**

The cross-validation test comparing TypeScript/web implementation against UCoMX v1.1 MATLAB reference reveals significant discrepancies across the metric suite.

## Test Results Overview

**Date:** February 17, 2026  
**Test Data:** 21 UCoMX plans, 25 TypeScript reference plans, 12 overlapping  
**Total Comparisons:** 360 metric-plans  
**Results:** 53 matches, 260 mismatches, 47 missing (14.7% match rate)

## Key Findings

### 1. Plan-Level Metric Issues

#### Missing Metrics (Both Missing in TS)
- `avgDoseRate` - Not aggregated to plan level
- `MUperDegree` - Not aggregated to plan level  
- These are calculated at beam level but should be aggregated at plan level

#### Completely Mismatched Metrics (100% error)
- **MD**: 99.41% error - Modulation Degree not matching
- **LT**: 99.45% error - Leaf Travel calculation incorrect (scaling issue visible)  
- **JA**: 99.08% error - Jaw Area calculation wrong
- **TG**:99.95% error - Tongue-and-Groove showing near-complete mismatch
- **GS**: 98.94% error - Gantry Speed completely off  
- **LS**: 82% error - Leaf Speed not matching
- **PI**: 90.54% error - Plan Irregularity calculation issue

#### Severely Mismatched Metrics (>75% error)
- **EFS**: 100% error - Equivalent Field Size completely wrong
- **EM**: 84.13% error - Edge Metric calculation issue  
- **SAS5**: 100% error - Small Aperture Score (5mm) generation issue
- **SAS10**: 73.7% error - Small Aperture Score (10mm) issue
- **psmall**: 100% error - Percentage small fields incorrect
- **PM**: 99.73% error - Plan Modulation formula or units issue

#### Mild/Moderate Mismatches (0-50% error)
- **MUCA**: 18.33% error - MU per Control Arc acceptable range
- **MAD**: 10.96% error - Mean Asymmetry Distance acceptable
- **LNA**: 11.24% error - Leaf Gap acceptable
- **LTMU**: 25.85% error - Leaf Travel per MU reasonable
- **AAV**: 9.97% error - Aperture Area Variability acceptable
- **LSV**: 29.67% error - Leaf Sequence Variability in working range
- **MCS**: 20.45% error - Modulation Complexity Score moderate mismatch

#### Perfect Matches
- **totalMU**: 0% error - Monitor units correct
- **MUperDegree** (when present): Missing from TS
- **avgDoseRate** (when present): Missing from TS

### 2. Plan Type Issues

#### ETH Plans (Electron) - Critical Issues
All "ETH" (electron) plans showing **metrics of 0.0** in TypeScript:
- `RP.TG119.CS_ETH_2A_#1.dcm` - MCS=0, AAV=0
- `RP.TG119.CS_ETH_9F.dcm` - MCS=0, AAV=0
- All ETH variants affected

**Cause:** Likely electron beam parsing or filtering issue - electron beams may not be supported or are being excluded from metric calculation

#### TB/UN Plans (Photon) - Variable Issues  
Better results but still significant mismatches (29% LSV error, 9% AAV error)

#### PT Plans (Plan-specific) - Mixed Results
Large variations suggest inconsistent algorithm implementation

### 3. Specific Problematic Metrics

#### Leaf Travel (LT)
- **TS reports:** 6940 mm (ETH_PT_01)
- **UCoMX reports:** 37.89 mm
- **Ratio:** ~183× difference suggests unit conversion or aggregation error
- Possible causes:
  - Not dividing by number of leaves
  - Summing across multiple leaves incorrectly
  - Unit mismatch (mm vs cm?)

#### Tongue-and-Groove (TG)  
- Complete mismatch suggests formula completely different or not implemented correctly
- Shows values like 35.3° vs 0.019° (1800× difference)

#### Gantry Speed (GS) & Gantry Speed Variation (mGSV)
- Off by factors of 10-100× suggesting fundamental calculation error
- May be using wrong time estimation method

#### MLC/Leaf Speeds (LS, mDRV)
- Large variations suggest dose rate or time estimation issues cascade to speed calculations

#### Jaw Area (JA)
- Showing 0 when should have values, or massive inflation
- Suggests aperture area calculation issues upstream

### 4. Root Cause Analysis

#### Primary Issues Identified

1. **Scaling/Units Problem**
   - Units may be inconsistent (mm vs cm, degrees vs radians, seconds vs minutes)
   - Ratios of 10-100× suggest conversion factor missing
   - LT showing 183× higher suggests per-leaf normalization missing

2. **Time Estimation Problem** 
   - mDRV, GS, LS all depend on delivery time calculation
   - If time is wrong, all speed-based metrics will be wrong
   - Currently shows massive variation suggesting fundamental issue

3. **Electron Beam Handling**
   - ETH (electron) plans returning 0 for all metrics
   - Either not being parsed correctly or actively excluded
   - May need separate handling logic for electron vs photon beams

4. **Aggregation Formula Issues**
   - Some metrics may not be MU-weighted correctly (vs beam-averaged)
   - Per-leaf normalization may be missing for some metrics
   - CAM (Control Arc Midpoint) interpolation may not match reference

5. **Aperture Geometry Calculation**
   - JA (Jaw Area) completely wrong suggests jaw handling error
   - TG (Tongue-and-Groove) suggests leaf overlap detection error
   - PA (Plan Area) also affected

## Metrics Requiring Investigation & Fixes

### High Priority (Critical failures)
- [ ] LT (Leaf Travel) - appears scaled wrong  
- [ ] TG (Tongue-and-Groove) - fundamentally broken
- [ ] Electron beam support - returning zeros
- [ ] Jaw area calculation - failing

### Medium Priority (Significant mismatches)
- [ ] Time estimation cascade (affects GS, LS, mDRV, mGSV)
- [ ] Aperture area union calculation (affects AAV, PA, JA)
- [ ] Speed calculations (GS, LS)
- [ ] Small aperture metrics (SAS5, SAS10, psmall)

### Low Priority (Acceptable ranges)
- [x] MCS (20% error - may be acceptable)
- [x] MUCA (18% error - within tolerance)
- [x] LSV (30% error - needs review but lower priority)

## Recommended Next Steps

1. **Verify algorithm documentation** - Compare actual implementation against published UCoMX formulas
2. **Unit audit** - Verify all metrics are in correct units (mm vs cm, s vs min, etc.)
3. **Electron beam testing** - Create test case specifically for electron beams
4. **Time estimation validation** - Cross-check delivery time calculation with UCoMX approach
5. **Per-plan detailed comparison** - Debug one plan in detail to isolate systematic errors
6. **Add validation tests** - Ensure metrics stay within expected ranges
7. **Document algorithm** - Add detailed algorithm documentation showing exact formulas used

## Cross-Validation Test Command

```bash
cd python/tests
python cross_validate_ucomx.py
```

## Associated Tests

- `python/tests/cross_validate_ucomx.py` - UCoMX validation (current status: FAILING)  
- `python/tests/cross_validate_pam.py` - PAM validation (shows 0 metrics for ETH plans)
- `src/test/dicom-metrics.test.ts` - Unit tests (need audit for correctness)

## References

- UCoMX v1.1 Reference: DOI pending
- Reference dataset: `/testdata/reference_dataset_v1.1/`
- TS metrics: `src/lib/dicom/metrics.ts` (1586 lines)
- Python metrics: `python/rtplan_complexity/metrics.py` (1100+ lines)

---

**Document Status:** In Progress  
**Last Update:** 2026-02-17  
**Owner:** RT-Complexity-Lens Development Team
