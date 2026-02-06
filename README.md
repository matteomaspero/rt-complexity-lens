# RT Plan Complexity Analyzer

A browser-based tool for analyzing DICOM-RT Plan complexity using UCoMX metrics.

## Overview

The **RT Plan Complexity Analyzer** calculates and visualizes treatment plan complexity metrics directly in your browser. No data is uploaded to servers—all processing happens locally.

## Features

### Single Plan Analysis
- Parse DICOM-RT Plan files (RP*.dcm)
- Visualize MLC apertures per control point
- Interactive gantry angle display
- Real-time metric calculation at plan, beam, and control point levels

### Batch Analysis
- Process multiple plans at once
- ZIP file support for bulk uploads
- Statistical summary across plans
- CSV export for external analysis

### Plan Comparison
- Side-by-side comparison of two plans
- Beam-level metrics difference table
- MLC aperture overlay visualization
- MU distribution polar chart comparison

### Machine Presets
- Built-in presets for common linacs (TrueBeam, Halcyon, Versa HD)
- Configurable alert thresholds
- Create and save custom machine presets
- Import/export presets as JSON

## Complexity Metrics (UCoMX v1.1)

### Primary Metrics
| Metric | Name | Description |
|--------|------|-------------|
| **MCS** | Modulation Complexity Score | Overall plan modulation (0–1, higher = simpler) |
| **LSV** | Leaf Sequence Variability | MLC leaf position uniformity |
| **AAV** | Aperture Area Variability | Aperture size consistency |
| **MFA** | Mean Field Area | Average aperture size (cm²) |

### Secondary Metrics
| Metric | Name | Description |
|--------|------|-------------|
| **LT** | Leaf Travel | Total MLC movement (mm) |
| **LTMCS** | Leaf Travel-weighted MCS | Combined complexity metric |
| **SAS5/10** | Small Aperture Score | Fraction of small gaps (<5mm, <10mm) |
| **EM** | Edge Metric | Aperture edge irregularity |
| **PI** | Plan Irregularity | Deviation from circular apertures |

### Delivery Metrics
| Metric | Name | Description |
|--------|------|-------------|
| **Est. Time** | Estimated Delivery Time | Based on machine parameters |
| **MU/°** | MU per Degree | Modulation density for arcs |
| **Dose Rate** | Average Dose Rate | MU/min during delivery |
| **MLC Speed** | Average MLC Speed | mm/s during delivery |

## Technology Stack

- **React 18** with TypeScript
- **Vite** for fast development builds
- **Tailwind CSS** with shadcn/ui components
- **Recharts** for data visualization
- **dicom-parser** for DICOM file parsing

## How to Use

### Quick Start
1. Visit the application
2. Drag and drop a DICOM-RT Plan file onto the upload zone
3. View metrics, MLC apertures, and gantry positions

### Configure Metrics
- Expand "Display Preferences" to choose which metrics to show
- Enable "Threshold Alerts" to highlight concerning values
- Select a machine preset or create your own

### Export Data
- Click "CSV" to download metrics for spreadsheet analysis
- In batch mode, export all plan metrics at once

## References

### UCoMX Implementation
Based on the UCoMX v1.1 MATLAB implementation:
- [Zenodo Repository: UCoMX v1.1](https://zenodo.org/records/7672823)

### Key Publications
- **MCS**: McNiven AL, et al. *Med Phys.* 2010;37(2):505-515. [DOI: 10.1118/1.3276775](https://doi.org/10.1118/1.3276775)
- **LSV/AAV**: Masi L, et al. *Med Phys.* 2013;40(7):071718. [DOI: 10.1118/1.4810969](https://doi.org/10.1118/1.4810969)
- **SAS**: Crowe SB, et al. *Australas Phys Eng Sci Med.* 2014;37:475-482. [DOI: 10.1007/s13246-014-0271-5](https://doi.org/10.1007/s13246-014-0271-5)
- **Edge Metric**: Younge KC, et al. *J Appl Clin Med Phys.* 2016;17(4):124-131. [DOI: 10.1120/jacmp.v17i4.6241](https://doi.org/10.1120/jacmp.v17i4.6241)
- **Plan Irregularity**: Du W, et al. *Med Phys.* 2014;41(2):021716. [DOI: 10.1118/1.4861821](https://doi.org/10.1118/1.4861821)

## Coordinate System

Uses IEC 61217 conventions:
- **Gantry**: 0° = vertical down, 90° = patient left, 180° = vertical up, 270° = patient right
- **Collimator**: 0° = MLC leaves perpendicular to gantry axis
- **Patient**: X = left/right, Y = posterior/anterior, Z = superior/inferior

## Privacy & Security

All DICOM parsing and metric calculations occur locally in your browser. No patient data is transmitted to any server.

## Disclaimer

This tool is intended for research and educational purposes. It should not be used as the sole basis for clinical decisions. Always verify results with your institution's QA procedures.

## License

MIT License
