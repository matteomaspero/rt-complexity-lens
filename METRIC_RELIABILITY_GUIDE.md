# Metric Reliability Guide

## Overview

This document provides guidance on which metrics are safe to use in production and which metrics should be used with caution or avoided until fixes are released.

**Test Date:** February 17, 2026  
**Test Set:** 12 overlapping plans from UCoMX reference dataset  
**Reference:** UCoMX v1.1 MATLAB implementation  

---

## Metric Reliability Tiers

### ✅ SAFE TO USE - Production Ready

These metrics match UCoMX within acceptable tolerances (±20%):

| Metric | Tolerance | Status | Use Case |
|--------|-----------|--------|----------|
| **totalMU** | ±0% | ✅ Perfect | Beam dose calculation |
| **MUCA** | ±18.3% | ✅ Good | Delivery feasibility assessment |
| **MAD** | ±11% | ✅ Good | Asymmetry analysis |
| **LTMU** | ±25.8% | ⚠️ Acceptable | Leaf efficiency metric |
| **AAV** | ±10% | ✅ Good | Aperture variability |
| **MCS** | ±20.5% | ⚠️ Acceptable | Overall complexity (use with caution) |
| **LSV** | ±29.7% | ⚠️ Acceptable | Leaf sequence variation (moderate uncertainty) |
| **MFA** | —  | ✅ Good | Average aperture size |
| **PAM/BAM** | —  | ✅ Good | Target blocking metrics (independently validated) |

**Recommendation:** These metrics are suitable for:
- Plan quality assessment
- Trend analysis across patient cohorts
- Machine capability verification
- Relative comparisons (Plan A vs Plan B)

**Caution:** Do not use for:
- Regulatory submissions (without validation)
- Absolute value thresholds
- Clinical decision support (without multi-metric confirmation)

---

### ⚠️ USE WITH CAUTION - Limited Accuracy

These metrics have issues but may be usable with understanding of limitations:

| Metric | Error | Status | Known Issues |
|--------|-------|--------|-------------|
| **LG** (LeafGap) | ~50-70% | ⚠️ Problematic | Cascading from LT errors |
| **EFS** (EquivalentFieldSize) | ~100% | ❌ Broken | Major calculation error |
| **SAS5** (SmallApertureScore<5mm) | ~100% | ❌ Broken | Threshold logic incorrect |
| **SAS10** (SmallApertureScore<10mm) | ~73.7% | ⚠️ Problematic | Threshold definition mismatch |
| **psmall** (PercentSmallFields) | ~100% | ❌ Broken | Related to SAS issues |

**Recommendation:** 
- Avoid in clinical workflows
- Use only for research purposes
- Get secondary validation before decisions
- Document known limitations in reports

---

### ❌ DO NOT USE - Critical Failures

These metrics are currently unreliable and should not be used:

| Metric | Error | Issue | Impact |
|--------|-------|-------|--------|
| **LT** (LeafTravel) | **183×** | Scaling error | Cannot trust absolute values |
| **TG** (Tongue-and-Groove) | **1855×** | Complete mismatch | Wrong formula or units |
| **JA** (JawArea) | **108×** | Calculation error | Unreliable aperture measures |
| **GS** (GantrySpeed) | **98.9%** | Time estimation cascade | Delivery timing wrong |
| **LS** (LeafSpeed) | **82%** | Time estimation cascade | Mechanical constraint wrong |
| **mDRV** (DoseRateVariation) | **100%** | Time estimation cascade | Pulsewidth calculation wrong |
| **mGSV** (GantrySpeedVariation) | **91.7%** | Time estimation cascade | Gantry dynamics wrong |
| **PM** (PlanModulation) | **99.7%** | Cascading errors | Depends on broken metrics |
| **MD** (ModulationDegree) | **~100%** | Cascading errors | Depends on broken metrics |
| **MI** (ModulationIndex) | **~100%** | Cascading errors | Depends on broken metrics |
| **All ETH Beams** | **100%** (zeros) | Electron parsing | Cannot analyze electron beams |

**Recommendation:**
- **REMOVE** from all reports and publications
- **DO NOT** use in clinical decision-making
- **DO NOT** include in regulatory submissions
- **FLAG** as "under development" in documentation
- Contact development team before treating as reliable

---

## Treatment Plan Type Support

### Photon Plans (VMAT, IMRT, 3D-Conformal)

**Status:** ✅ Mostly Working

- Primary metrics (MCS, LSV, AAV) functional
- Secondary metrics (SAS, EFS) have issues
- Speed metricss (GS, LS) unreliable
- Electron contamination not modeled

**Safe for:**
- Modulation assessment (MCS, LSV)
- Aperture analysis (AAV, LG with caution)
- Comparative studies

**Avoid:**
- Absolute timing/delivery estimates
- Small aperture analysis
- Electron dose contributions

### Electron Plans (ETH beams)

**Status:** ❌ Not Supported

- All metrics return zero or garbage
- Beam parsing likely incorrect
- Complete fix required before use

**Do Not Use** until:
- ETH beam parsing fixed
- Metrics validated against reference
- Unit tests added for electron beams

---

## Metric Dependency Graph

Understanding which metrics depend on others helps interpret cascade failures:

```
Fundamental Metrics (Reliable)
├── totalMU ✅
├── MFA ✅
└── MCS/LSV/AAV ⚠️
    ├─→ LTMCS ⚠️
    ├─→ PM (broken)
    └─→ Aperture-based
        ├─→ JA ❌ (108× error)
        ├─→ EFS ❌ (calculation error)
        ├─→ PA ⚠️ (cascading)
        ├─→ SAS metrics ❌
        └─→ EM (cascading)

Time Estimation (Broken)
├─→ GS ❌ (gantry speed)
├─→ LS ❌ (leaf speed)
├─→ mDRV ❌ (dose rate variation)
├─→ mGSV ❌ (gantry variation)
├─→ MD ❌ (modulation degree)
└─→ MI ❌ (modulation index)

Leaf Travel (183× error)
├─→ LT ❌
├─→ LTMU ⚠️
├─→ LTNLMU ⚠️
└─→ LTMCS ⚠️
```

---

## Quick Decision Matrix

**For your use case, are the metrics ready?**

### Clinical QA/Dosimetry Teams
```
✅ Use for: Relative plan comparisons, trend analysis
⚠️ Verify with: Secondary metrics, human review
❌ Avoid: Electron plans, speed-based decisions
```

### Research/Publication
```
✅ Use for: Cohort analysis, complexity comparison
⚠️ Verify with: Independent validation on subset
⚠️ Document: Known limitations, reference dataset
❌ Publish: Speed metrics, electron beam results
```

### Clinical Decision Support
```
❌ NOT READY - Multiple critical issues
✅ When fixed: Use with validated threshold tables
⚠️ Until then: Supplement with traditional metrics
```

### Regulatory Submissions
```
❌ NOT APPROVED - Critical failures identified
⚠️ Status: Under validation/improvement
✅ Target: Ready for use in Q2/Q3 2026 (estimated)
```

---

## Recommended Usage Patterns

### Pattern 1: Safe Metrics Only
```python
from rtplan_complexity import parse_rtplan, calculate_plan_metrics

plan = parse_rtplan("RTPLAN.dcm")
metrics = calculate_plan_metrics(plan)

# Safe metrics
mcs = metrics.MCS  # With ±20% understanding
ls v = metrics.LSV  # With ±30% understanding
aav = metrics.AAV  # With ±10% understanding

# Safe for absolute values
total_mu = metrics.totalMU  # Perfect ± 0%
```

### Pattern 2: Disable Unsafe Metrics
```python
# When exporting, skip problematic metrics
safe_metrics = {
    'MCS': metrics.MCS,
    'LSV': metrics.LSV,
    'AAV': metrics.AAV,
    'MFA': metrics.MFA,
    'totalMU': metrics.totalMU,
    # Skip: LT, TG, JA, GS, LS, mDRV, etc.
}

# Export only safe metrics
export_to_csv(safe_metrics)
```

### Pattern 3: Flag Unsafe Data
```python
# Auto-flag broken metrics in reports
warnings = {}
if plan.beams[0].radiation_type == 'ELECTRON':
    warnings['electron_beams'] = 'ETH plans not supported - results unreliable'

if metrics.LT > 1000:  # Suspiciously high
    warnings['leaf_travel'] = 'LT may be scaled incorrectly - use with caution'

if warnings:
    print("⚠️ WARNINGS:", warnings)
```

---

## Roadmap to Full Support

| Target | Status | ETA |
|--------|--------|-----|
| Fix electron beam parsing | In queue | Feb 2026 |
| Fix LT/JA scaling | In queue | Feb 2026 |
| Fix TG formula | In queue | Mar 2026 |
| Fix time estimation | In queue | Mar 2026 |
| Full cross-validation passing | Blocked | Mar 2026 |
| Regulatory validation | Planned | Q2 2026 |
| Release v1.0.2 | Planned | Mar 2026 |
| Release v1.1 (validated) | Planned | Q2 2026 |

---

## Getting Help

If you need clarification on metric reliability:

1. **Check this document** - See metric status and known issues
2. **Review findings** - Read `CROSS_VALIDATION_FINDINGS.md`
3. **Contact support** - Reference the metric name and version
4. **Report failures** - Create issue with full details, plan file (anonymized)

---

## Disclaimer

This guidance reflects testing conducted on February 17, 2026, against the UCoMX v1.1 reference implementation using 12 overlapping plans from the reference dataset.

**Results may vary** with:
- Different plan types (prostate, head & neck, thorax, etc.)
- Different treatment machines (TrueBeam, Halcyon, Elekta, etc.)
- Different TPS versions (Eclipse, Pinnacle, RayStation, etc.)
- Legacy/non-standard DICOM files

For production use, **independent validation** on your specific data is strongly recommended.

---

**Last Updated:** 2026-02-17  
**Package Version:** 1.0.1  
**Status:** Alpha (under development)
