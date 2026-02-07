
# Plan: Comprehensive Documentation Update

## Summary

Update all documentation files (README.md, Python README, Help page, Python Docs page, and Algorithms doc) to comprehensively cover all RTp-lens features with user-friendly guides and consistent branding.

---

## Documentation Audit

### Current Gaps Identified

| Document | Missing Content |
|----------|----------------|
| **README.md** | Cohort Analysis mode, machine presets details, threshold alerts, chart export, privacy section details |
| **Help.tsx** | Batch/Compare/Cohort mode guides, machine preset configuration, chart export as PNG, threshold alert explanation |
| **python/README.md** | Visualization examples incomplete, export format examples, cross-validation workflow |
| **docs/ALGORITHMS.md** | Secondary metrics (SAS, EM, PI), accuracy metrics, deliverability metrics |
| **PythonDocs.tsx** | Missing clustering dimension options, visualization customization |

---

## Changes Overview

### 1. README.md - Complete Feature Documentation

Add/update the following sections:
- **Analysis Modes**: Full descriptions of all 4 modes (Single, Batch, Compare, Cohort)
- **Machine Presets**: Document all 4 built-in presets with parameters
- **Threshold Alerts**: Explain warning/critical threshold system
- **Visualizations**: List all chart types and export capabilities
- **Cohort Analysis**: Clustering dimensions, statistics, visualizations
- **Quick Start Guide**: Step-by-step for each mode

### 2. Help.tsx - Enhanced User Guide

Add new sections:
- **Analysis Modes Overview**: Cards for each mode with navigation
- **Machine Presets**: How to select, create, and customize presets
- **Threshold Alerts**: Understanding warning/critical indicators
- **Batch Analysis Guide**: Step-by-step workflow
- **Plan Comparison Guide**: How to compare plans effectively
- **Cohort Analysis Guide**: Clustering and statistical analysis
- **Chart Export**: How to export visualizations as PNG

### 3. python/README.md - Complete Python Documentation

Enhance with:
- **Full metric list**: All 30+ metrics with descriptions
- **Clustering dimensions**: TECHNIQUE, BEAM_COUNT, COMPLEXITY, MU_LEVEL, SITE
- **Visualization examples**: Complete code for all chart types
- **Export examples**: CSV and JSON format details
- **Machine parameters**: Full parameter reference

### 4. docs/ALGORITHMS.md - Complete Algorithm Reference

Expand to include:
- **All 30+ metrics**: Formulas and descriptions
- **Categorized sections**: Primary, Secondary, Accuracy, Deliverability
- **Delivery time estimation**: Algorithm explanation
- **Threshold evaluation**: Status determination logic

### 5. PythonDocs.tsx - Enhanced API Documentation

Add sections for:
- **Clustering dimensions enum**: All options explained
- **Machine preset examples**: Full preset configurations
- **Batch processing patterns**: Common workflows
- **Visualization customization**: Style options

---

## New README.md Structure

```text
# RTplan Complexity Lens

## Overview
## Live Demo
## Analysis Modes
  - Single Plan Analysis
  - Batch Analysis  
  - Plan Comparison
  - Cohort Analysis
## Features
  - MLC Aperture Visualization
  - Gantry/Collimator Display
  - Interactive Control Point Scrubber
  - Delivery Timeline Charts
  - Complexity Heatmaps
## Complexity Metrics
  - Primary Metrics (MCS, LSV, AAV, MFA)
  - Secondary Metrics (LT, LTMCS, SAS5, SAS10)
  - Accuracy Metrics (LG, MAD, EFS, psmall, EM, PI)
  - Deliverability Metrics (MUCA, LTMU, GT, GS, LS, etc.)
  - Delivery Parameters (MU, timing, dose rate)
## Machine Presets
  - Built-in Presets (Generic, TrueBeam, Halcyon, Versa HD)
  - Threshold Alerts
  - Custom Presets
## Export Options
  - CSV Export
  - Chart PNG Export
## Python Toolkit
## Technology Stack
## Quick Start
## Coordinate System
## Privacy & Security
## References
## Disclaimer
## License
```

---

## New Help.tsx TOC Structure

Update TableOfContents sections:
```text
1. Introduction (existing)
2. Analysis Modes (NEW)
3. Metrics Reference (existing, enhanced)
4. Machine Presets (NEW)
5. Coordinate System (existing)
6. How to Use (enhanced)
7. Export Format (enhanced)
8. Python Toolkit (existing)
9. References (existing)
10. About (existing)
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `README.md` | Complete rewrite with all features |
| `src/pages/Help.tsx` | Add Analysis Modes, Machine Presets sections |
| `src/components/help/TableOfContents.tsx` | Update HELP_SECTIONS array |
| `python/README.md` | Enhance with full metric list, examples |
| `docs/ALGORITHMS.md` | Expand to cover all 30+ metrics |
| `src/pages/PythonDocs.tsx` | Add clustering dimensions, examples |

---

## Content Details

### Analysis Modes Section (README.md & Help.tsx)

```text
Single Plan Analysis
- Upload single DICOM-RT Plan file
- Interactive control point navigation with playback
- MLC aperture, gantry, and collimator visualization
- Beam summary with MU, gantry range, dose rate stats
- Delivery timeline charts (segment duration, speeds)
- Complexity heatmaps (LSV, AAV, aperture area)
- CSV export of all metrics

Batch Analysis
- Upload multiple DICOM files or ZIP archives
- Nested folder structure support
- Aggregate statistics (min, max, mean, std dev)
- Distribution histograms
- Machine preset selection
- Batch CSV/JSON export

Plan Comparison
- Side-by-side comparison of two plans
- Automated beam matching algorithm
- Metrics difference table with delta values
- Synchronized control point scrubber
- MLC aperture overlay/difference view
- Comparison charts (Cumulative MU, Polar, Delivery)

Cohort Analysis
- Statistical clustering by dimension
  - Technique (VMAT/IMRT)
  - Beam Count
  - Complexity Level
  - MU Level
  - Treatment Site
- Extended statistics (quartiles, IQR, percentiles, skewness)
- Box plots, scatter matrix, correlation heatmap, violin plots
- Outlier detection
- Cluster summary grid
- Cohort CSV/JSON export
```

### Machine Presets Section

```text
Built-in Presets:
| Preset | Max Dose Rate | Max Gantry Speed | Max MLC Speed | MLC Type |
|--------|---------------|------------------|---------------|----------|
| Generic (Conservative) | 600 MU/min | 4.8 deg/s | 25 mm/s | MLCX |
| Varian TrueBeam | 600 MU/min (1400 FFF) | 6.0 deg/s | 25 mm/s | MLCX |
| Varian Halcyon | 800 MU/min | 4.0 deg/s | 50 mm/s | DUAL |
| Elekta Versa HD | 600 MU/min | 6.0 deg/s | 35 mm/s | MLCY |

Threshold Alerts:
- Warning (yellow): Approaching concerning values
- Critical (red): Exceeds recommended thresholds
- Direction: Some metrics alert when low (MCS), others when high (LT)

Custom Presets:
- Create from scratch or duplicate built-in
- Edit threshold values and delivery parameters
- Import/export as JSON for sharing
```

---

## Estimated Changes

| File | Lines Added/Modified |
|------|---------------------|
| `README.md` | ~200 lines rewritten |
| `src/pages/Help.tsx` | ~150 lines added |
| `src/components/help/TableOfContents.tsx` | ~10 lines modified |
| `python/README.md` | ~100 lines added |
| `docs/ALGORITHMS.md` | ~150 lines added |
| `src/pages/PythonDocs.tsx` | ~50 lines added |

**Total: 6 files, ~660 lines modified**
