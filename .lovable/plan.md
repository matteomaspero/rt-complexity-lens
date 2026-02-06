
# Plan: Fix Broken Links in Help Page and Metrics Definitions

## Summary
Fix 3 broken DOI links and 1 incorrect Zenodo URL in the Help documentation and metrics definitions file.

---

## Issues Found

### 1. UCoMX Zenodo Repository Link (Help.tsx)
- **Current**: `https://zenodo.org/records/7672823`
- **Problem**: Redirects to unrelated project (giant hogweed study)
- **Correct**: `https://zenodo.org/records/8276837` (UCoMX: Universal Complexity Metrics Extractor)

### 2. Small Aperture Score DOI (Help.tsx + metrics-definitions.ts)
- **Current**: `10.1007/s13246-014-0271-5`
- **Problem**: DOI not found
- **Correct**: `10.1007/s13246-014-0274-9`
- **Paper**: Crowe SB, et al. "Treatment plan complexity metrics for predicting IMRT pre-treatment quality assurance results"

### 3. Delivery Time Estimation DOI (Help.tsx + metrics-definitions.ts)
- **Current**: `10.1259/bjr.20150040`
- **Problem**: DOI not found
- **Correct**: `10.1259/bjr.20140698`
- **Paper**: Park JM, et al. "The effect of MLC speed and acceleration on the plan delivery accuracy of VMAT"

---

## Files to Modify

### 1. `src/pages/Help.tsx`

| Line | Change |
|------|--------|
| ~323 | Update Zenodo URL from `zenodo.org/records/7672823` to `zenodo.org/records/8276837` |
| ~389-394 | Update SAS DOI from `10.1007/s13246-014-0271-5` to `10.1007/s13246-014-0274-9` |
| ~434 | Update Park DOI from `10.1259/bjr.20150040` to `10.1259/bjr.20140698` |

### 2. `src/lib/metrics-definitions.ts`

| Line | Metric | Change |
|------|--------|--------|
| 164 | SAS5 | Update DOI from `10.1007/s13246-014-0271-5` to `10.1007/s13246-014-0274-9` |
| 174 | SAS10 | Update DOI from `10.1007/s13246-014-0271-5` to `10.1007/s13246-014-0274-9` |
| 112 | estimatedDeliveryTime | Update DOI from `10.1259/bjr.20150040` to `10.1259/bjr.20140698` |

---

## Verified Working Links

These links were verified and require no changes:
- MCS DOI: `10.1118/1.3276775`
- LSV/AAV DOI: `10.1118/1.4810969`
- PMC Review: `PMC6774599`
- Edge Metric DOI: `10.1120/jacmp.v17i4.6241`
- Plan Irregularity DOI: `10.1118/1.4861821`
- DICOM RT Plan IOD Specification
- dicom-parser GitHub repository

---

## Bonus Enhancement

Consider adding the new UCoMX Medical Physics publication reference:
- **DOI**: `10.1002/mp.17365`
- **Title**: "Technical note: A software tool to extract complexity metrics from radiotherapy treatment plans"
- **Authors**: Cavinato S, Scaggion A (2024)
