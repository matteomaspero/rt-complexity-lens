# RTplan Complexity Lens

A browser-based tool for analyzing DICOM-RT Plan complexity using research-inspired metrics.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://rt-complexity-lens.lovable.app)
[![Python Package](https://img.shields.io/badge/python-rtplan--complexity-blue)](https://github.com/rtplan-complexity/rtplan-complexity)

## Overview

**RTplan Complexity Lens** (RTp-lens) calculates and visualizes treatment plan complexity metrics directly in your browser. No data is uploaded to servers—all processing happens locally.

This tool helps radiation therapy professionals:
- Evaluate plan complexity to predict delivery accuracy
- Identify potential QA challenges before treatment
- Compare treatment planning approaches across plans
- Perform cohort-level statistical analysis

## Live Demo

👉 **[Launch RTp-lens](https://rt-complexity-lens.lovable.app)**

Load a demo plan instantly or upload your own DICOM-RT Plan files.

---

## Analysis Modes

RTp-lens offers four analysis modes for different workflows:

### 🔬 Single Plan Analysis

Upload a single DICOM-RT Plan file for detailed analysis:
- Interactive control point navigation with playback animation
- MLC aperture, gantry, and collimator visualization
- Beam summary with MU, gantry range, dose rate statistics
- Delivery timeline charts (segment duration, gantry/MLC speeds)
- Complexity heatmaps (LSV, AAV, aperture area per CP)
- CSV export of all metrics at plan, beam, and CP levels

### 📊 Batch Analysis

Process multiple plans simultaneously:
- Upload multiple DICOM files or ZIP archives
- Nested folder structure support
- Aggregate statistics (min, max, mean, standard deviation)
- Distribution histograms for each metric
- Machine preset selection for threshold alerts
- Batch CSV/JSON export

### ⚖️ Plan Comparison

Side-by-side comparison of two treatment plans:
- Automated beam matching algorithm (by name or geometry)
- Metrics difference table with delta values and % change
- Synchronized control point scrubber
- MLC aperture overlay and difference visualization
- Comparison charts (Cumulative MU, Polar MU distribution, Delivery timeline)

### 📈 Cohort Analysis

Population-level statistical analysis with clustering:
- **Clustering dimensions:**
  - Technique (VMAT vs IMRT)
  - Beam Count
  - Complexity Level (Low/Medium/High/Very High)
  - MU Level
  - Treatment Site
- Extended statistics (quartiles, IQR, percentiles, skewness, kurtosis)
- Box plots, scatter matrix, correlation heatmap, violin plots
- Automatic outlier detection (IQR method)
- Cluster summary grid
- Cohort CSV/JSON export

---

## Features

### Visualizations

| Feature | Description |
|---------|-------------|
| **MLC Aperture Viewer** | SVG display of leaf positions with gap highlighting |
| **Gantry Schematic** | Real-time gantry angle indicator with arc direction |
| **Collimator Display** | Jaw positions and collimator rotation |
| **Control Point Scrubber** | Interactive slider with playback controls |
| **Delivery Timeline** | Segment duration, dose rate, gantry/MLC speed charts |
| **Complexity Heatmaps** | Per-CP visualization of LSV, AAV, and aperture area |
| **MU Distribution** | Polar chart showing MU per gantry angle |
| **Angular Binning** | Distribution of complexity metrics by gantry sector |

### Export Options

- **CSV Export**: Download metrics for spreadsheet analysis
- **Chart PNG Export**: Save any visualization as an image (click 📷 icon)
- **JSON Export**: Machine-readable format for automation

---

## Complexity Metrics

Metrics are inspired by published research including the UCoMX framework.

### Primary Metrics

| Metric | Name | Description | Range |
|--------|------|-------------|-------|
| **MCS** | Modulation Complexity Score | Overall plan modulation complexity | 0–1 (higher = simpler) |
| **LSV** | Leaf Sequence Variability | MLC leaf position uniformity | 0–1 (higher = more uniform) |
| **AAV** | Aperture Area Variability | Aperture size consistency between CPs | 0–1+ (lower = more consistent) |
| **MFA** | Mean Field Area | Average aperture size | cm² |

### Secondary Metrics

| Metric | Name | Description |
|--------|------|-------------|
| **LT** | Leaf Travel | Total MLC movement (mm) |
| **LTMCS** | Leaf Travel-weighted MCS | LT normalized by MCS |
| **SAS5** | Small Aperture Score (5mm) | Fraction of aperture with gaps <5mm |
| **SAS10** | Small Aperture Score (10mm) | Fraction of aperture with gaps <10mm |
| **EM** | Edge Metric | Aperture edge irregularity |
| **PI** | Plan Irregularity | Deviation from circular apertures |

### Accuracy Metrics

| Metric | Name | Description |
|--------|------|-------------|
| **LG** | Leaf Gap | Mean gap between opposing leaves |
| **MAD** | Mean Asymmetry Distance | Left-right asymmetry of apertures |
| **EFS** | Equivalent Field Size | Effective field size |
| **psmall** | Percentage Small Fields | Fraction of small apertures |

### Deliverability Metrics

| Metric | Name | Description |
|--------|------|-------------|
| **MUCA** | MU per Control Arc | MU density for VMAT arcs |
| **LTMU** | Leaf Travel per MU | MLC activity per unit dose |
| **GT** | Gantry Time | Time for gantry rotation |
| **GS** | Gantry Speed Variation | Coefficient of variation |
| **LS** | Leaf Speed | Average MLC speed |
| **LSV_del** | Leaf Speed Variation | MLC speed coefficient of variation |
| **TG** | Tongue-and-Groove Index | Potential T&G effect |

### Delivery Parameters

| Metric | Name | Description |
|--------|------|-------------|
| **Total MU** | Monitor Units | Total plan MU |
| **Est. Time** | Estimated Delivery Time | Based on machine parameters |
| **MU/°** | MU per Degree | Modulation density for arcs |
| **Dose Rate** | Average Dose Rate | MU/min during delivery |

---

## Machine Presets

### Built-in Presets

| Preset | Max Dose Rate | Max Gantry Speed | Max MLC Speed | MLC Type |
|--------|---------------|------------------|---------------|----------|
| **Generic (Conservative)** | 600 MU/min | 4.8 °/s | 25 mm/s | MLCX |
| **Varian TrueBeam** | 600 MU/min (1400 FFF) | 6.0 °/s | 25 mm/s | MLCX |
| **Varian Halcyon** | 800 MU/min | 4.0 °/s | 50 mm/s | Dual-layer |
| **Elekta Versa HD** | 600 MU/min | 6.0 °/s | 35 mm/s | MLCY |

### Threshold Alerts

Each preset includes configurable thresholds for metrics:

| Status | Color | Meaning |
|--------|-------|---------|
| **Normal** | — | Value within expected range |
| **Warning** | 🟡 Yellow | Approaching concerning levels |
| **Critical** | 🔴 Red | Exceeds recommended thresholds |

Thresholds are directional:
- Some metrics alert when **low** (e.g., MCS < 0.2)
- Others alert when **high** (e.g., LT > 50000mm)

### Custom Presets

- Create new presets from scratch
- Duplicate and modify built-in presets
- Edit threshold values and delivery parameters
- Import/export presets as JSON for sharing across teams

---

## Python Toolkit

The **rtplan-complexity** Python package mirrors the web application's metric calculations for offline analysis.

### Installation

```bash
pip install rtplan-complexity
```

### Quick Example

```python
from rtplan_complexity import parse_rtplan, calculate_plan_metrics

plan = parse_rtplan("RTPLAN.dcm")
metrics = calculate_plan_metrics(plan)

print(f"MCS: {metrics.MCS:.4f}")
print(f"LSV: {metrics.LSV:.4f}")
print(f"Total MU: {metrics.total_mu:.1f}")
```

### Features

- Identical algorithms to web application
- Single-plan, batch, and cohort analysis
- Matplotlib visualizations (box plots, heatmaps, scatter matrix)
- CSV/JSON export
- Cross-validation with TypeScript implementation

📖 **[Full Python Documentation](/python-docs)**

---

## Technology Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type-safe development |
| **Vite** | Fast build tooling |
| **Tailwind CSS** | Styling |
| **shadcn/ui** | Component library |
| **Recharts** | Data visualization |
| **dicom-parser** | DICOM file parsing |

---

## Quick Start

### Single Plan

1. Visit [RTp-lens](https://rt-complexity-lens.lovable.app)
2. Drag and drop a DICOM-RT Plan file (`RP*.dcm`)
3. View metrics, MLC apertures, and gantry positions
4. Navigate control points with the slider or playback controls
5. Export data as CSV

### Batch Analysis

1. Navigate to **Batch** mode
2. Upload multiple DICOM files or a ZIP archive
3. Review aggregate statistics and distributions
4. Export all metrics as CSV or JSON

### Plan Comparison

1. Navigate to **Compare** mode
2. Upload Plan A and Plan B
3. Review matched beams and metric differences
4. Use synchronized CP scrubber to compare apertures

### Cohort Analysis

1. Navigate to **Cohort** mode
2. Upload multiple plans
3. Select clustering dimension (technique, complexity, etc.)
4. Explore statistical visualizations
5. Export cohort data

---

## Coordinate System

RTp-lens uses **IEC 61217** conventions:

| Component | Convention |
|-----------|------------|
| **Gantry** | 0° = vertical down (AP), 90° = patient left, 180° = vertical up (PA), 270° = patient right |
| **Collimator** | 0° = MLC perpendicular to gantry axis; positive = counter-clockwise (BEV) |
| **Patient** | X = left(+)/right(−), Y = posterior(+)/anterior(−), Z = superior(+)/inferior(−) |

---

## Privacy & Security

- ✅ **100% client-side processing** — no data leaves your browser
- ✅ **No server uploads** — all DICOM parsing happens locally
- ✅ **No cookies or tracking** — your data stays private
- ✅ **Offline capable** — works without internet after initial load

---

## References

### Inspiration

Metrics are inspired by published research, including the UCoMX framework:
- [UCoMX v1.1 on Zenodo](https://zenodo.org/records/8276837)

### Key Publications

| Metric | Reference |
|--------|-----------|
| **MCS** | McNiven AL, et al. *Med Phys.* 2010;37(2):505-515. [DOI](https://doi.org/10.1118/1.3276775) |
| **LSV/AAV** | Masi L, et al. *Med Phys.* 2013;40(7):071718. [DOI](https://doi.org/10.1118/1.4810969) |
| **SAS** | Crowe SB, et al. *Australas Phys Eng Sci Med.* 2014;37:475-482. [DOI](https://doi.org/10.1007/s13246-014-0274-9) |
| **Edge Metric** | Younge KC, et al. *J Appl Clin Med Phys.* 2016;17(4):124-131. [DOI](https://doi.org/10.1120/jacmp.v17i4.6241) |
| **Plan Irregularity** | Du W, et al. *Med Phys.* 2014;41(2):021716. [DOI](https://doi.org/10.1118/1.4861821) |

---

## Disclaimer

This tool is intended for **research and educational purposes**. It should not be used as the sole basis for clinical decisions. Always verify results with your institution's QA procedures.

---

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International** (CC BY-NC-SA 4.0).

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

### You are free to:

- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material

### Under the following terms:

- **Attribution** — You must give appropriate credit and link to the original project
- **NonCommercial** — You may not use the material for commercial purposes
- **ShareAlike** — Derivatives must use the same license

### Citation

When using RTp-lens in academic work, please cite:

> RTplan Complexity Lens. (2024). A browser-based DICOM-RT Plan complexity analysis tool. Available at: https://rt-complexity-lens.lovable.app

See [LICENSE](LICENSE) for full details.
