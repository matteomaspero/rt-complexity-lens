
# Plan: Complete UCoMX Metrics Implementation

## Summary
Implement all missing complexity metrics from the UCoMX framework as specified in the user's comprehensive list. The metrics are divided into two categories: **Accuracy Metrics** (related to dosimetric accuracy) and **Deliverability Metrics** (related to treatment delivery characteristics).

---

## Part 1: Missing Metrics Analysis

### Currently Implemented
| Metric | Status | Category |
|--------|--------|----------|
| MCS | Implemented | Primary |
| LSV | Implemented | Primary |
| AAV | Implemented | Primary |
| MFA | Implemented | Primary |
| LT | Implemented | Secondary |
| LTMCS | Implemented | Secondary |
| SAS5/SAS10 | Implemented | Secondary |
| EM | Implemented | Secondary |
| PI | Implemented | Secondary |
| MU | Implemented | Delivery |
| MUperDegree | Implemented | Delivery |
| Delivery Time | Implemented | Delivery |
| Dose Rate | Implemented | Delivery |

### Accuracy Metrics to Implement

1. **LG (Leaf Gap / Average Leaf Gap)**
   - Average gap between opposing MLC leaf pairs
   - Unit: mm
   - Formula: Mean of (bankB[i] - bankA[i]) for all open leaves

2. **MAD (Mean Asymmetry Distance)**
   - Measures asymmetry of aperture shape relative to central axis
   - Unit: mm
   - Formula: Mean of |((bankA[i] + bankB[i]) / 2) - centralAxis|

3. **EFS (Equivalent Field Size)**
   - Equivalent square field size based on aperture area and perimeter
   - Unit: mm
   - Formula: 4 * Area / Perimeter (Sterling's formula)

4. **psmall (Percentage of Small Fields)**
   - Fraction of apertures below a size threshold (typically 4 cm²)
   - Unit: ratio (0-1)
   - Formula: count(area < threshold) / totalControlPoints

### Deliverability Metrics to Implement

5. **MUCA (MU per Control Arc)**
   - Average MU per control point
   - Unit: MU/CP
   - Formula: beamMU / numberOfControlPoints

6. **LTMU (Leaf Travel per MU)**
   - Leaf travel normalized by monitor units
   - Unit: mm/MU
   - Formula: LT / beamMU

7. **LTNLMU (Leaf Travel per Leaf and MU)**
   - Leaf travel normalized by number of leaves and MU
   - Unit: mm/(leaf·MU)
   - Formula: LT / (numberOfLeaves * beamMU)

8. **LNA (Leaf Travel per Leaf and Control Arc)**
   - Leaf travel normalized by leaves and control points
   - Unit: mm/(leaf·CP)
   - Formula: LT / (numberOfLeaves * numberOfControlPoints)

9. **LTAL (Leaf Travel per Arc Length)**
   - Leaf travel per degree of arc (for VMAT)
   - Unit: mm/°
   - Formula: LT / arcLength

10. **mDRV (Mean Dose Rate Variation)**
    - Average variation in dose rate between control points
    - Unit: MU/min
    - Formula: Mean of |DR[i] - DR[i-1]|

11. **GT (Gantry Travel)**
    - Total gantry rotation during delivery
    - Unit: degrees
    - Same as arcLength for arcs

12. **GS (Gantry Speed)**
    - Average gantry rotation speed
    - Unit: deg/s
    - Formula: arcLength / deliveryTime

13. **mGSV (Mean Gantry Speed Variation)**
    - Average variation in gantry speed
    - Unit: deg/s
    - Formula: Mean of |GS[i] - GS[i-1]|

14. **LS (Leaf Speed)**
    - Average MLC leaf movement speed
    - Unit: mm/s
    - Already calculated as avgMLCSpeed, needs renaming in definitions

15. **PA (Plan Area / BEV Area)**
    - Total beam's eye view aperture area
    - Unit: cm²
    - Formula: Sum of all aperture areas across control points

16. **JA (Jaw Area)**
    - Field defined by jaw positions
    - Unit: cm²
    - Formula: (x2 - x1) * (y2 - y1) / 100

17. **PM (Plan Modulation)**
    - Complement of MCS, indicates degree of modulation
    - Unit: ratio (0-1)
    - Formula: 1 - MCS

18. **TG (Tongue-and-Groove Index)**
    - Fraction of aperture affected by tongue-and-groove effect
    - Unit: ratio (0-1)
    - Formula: Based on leaf position relationships

19. **MD (Modulation Degree)**
    - Alternative modulation metric based on fluence variation
    - Unit: ratio
    - Reference: Heijmen et al.

20. **MI (Modulation Index)**
    - Fluence-based modulation metric
    - Unit: ratio
    - Reference: Webb 2003

---

## Part 2: Implementation Approach

### File Changes

#### 2.1 Update Types (src/lib/dicom/types.ts)
Add new metric fields to `BeamMetrics` and `PlanMetrics` interfaces:

```text
BeamMetrics additions:
- LG: number (avg leaf gap, mm)
- MAD: number (mean asymmetry distance, mm)
- EFS: number (equivalent field size, mm)
- psmall: number (percentage small fields)
- MUCA: number (MU per control arc)
- LTMU: number (leaf travel per MU)
- LTNLMU: number (leaf travel per leaf and MU)
- LNA: number (leaf travel per leaf and CA)
- LTAL: number (leaf travel per arc length)
- mDRV: number (mean dose rate variation)
- GT: number (gantry travel)
- GS: number (gantry speed)
- mGSV: number (mean gantry speed variation)
- LS: number (leaf speed, alias for avgMLCSpeed)
- PA: number (plan area / total aperture area)
- JA: number (jaw area)
- PM: number (plan modulation)
- TG: number (tongue-and-groove index)
- MD: number (modulation degree)
- MI: number (modulation index)
```

#### 2.2 Update Metrics Calculation (src/lib/dicom/metrics.ts)
Add calculation functions for each new metric:

- `calculateLeafGap()` - Average gap for control point
- `calculateMAD()` - Mean asymmetry distance
- `calculateEFS()` - Equivalent field size from area/perimeter
- `calculateTongueAndGroove()` - T&G index
- Update `calculateControlPointMetrics()` with new fields
- Update `calculateBeamMetrics()` to aggregate new metrics
- Update `calculatePlanMetrics()` for plan-level aggregation

#### 2.3 Update Metric Definitions (src/lib/metrics-definitions.ts)
Add all 20 new metrics to `METRIC_DEFINITIONS` with:
- Key, name, short/full descriptions
- Unit
- Category (accuracy, deliverability)
- Reference and DOI where applicable

#### 2.4 Update CSV Export (src/lib/dicom/metrics.ts)
- Add new metrics to `metricsToCSV()` function
- Include all new metrics in beam-level and plan-level exports

#### 2.5 Update Display Components

**MetricsPanel (src/components/viewer/MetricsPanel.tsx)**
- Display new accuracy and deliverability metrics
- Group by category for clarity

**MetricsSettings (src/components/viewer/MetricsSettings.tsx)**
- Add new metrics to the selection UI
- Update category filters

**Help Page (src/pages/Help.tsx)**
- Already uses METRIC_DEFINITIONS, will auto-update

---

## Part 3: Metric Formulas (Technical Reference)

### Accuracy Metrics Formulas

```text
LG (Leaf Gap):
  For each open leaf pair: gap = bankB[i] - bankA[i]
  LG = mean(gap) for all open leaves

MAD (Mean Asymmetry Distance):
  centerPosition = (bankA[i] + bankB[i]) / 2
  MAD = mean(|centerPosition - centralAxis|)

EFS (Equivalent Field Size):
  EFS = 4 * Area / Perimeter
  (Sterling's equivalent square formula)

psmall (Percentage Small Fields):
  threshold = 400 mm² (4 cm²)
  psmall = count(apertureArea < threshold) / totalCPs
```

### Deliverability Metrics Formulas

```text
MUCA = beamMU / numberOfControlPoints
LTMU = LT / beamMU
LTNLMU = LT / (numberOfLeaves * beamMU)
LNA = LT / (numberOfLeaves * numberOfControlPoints)
LTAL = LT / arcLength (for VMAT only)
GT = arcLength (gantry travel = arc length)
GS = arcLength / deliveryTime
PM = 1 - MCS

mDRV = mean(|doseRate[i] - doseRate[i-1]|)
mGSV = mean(|gantrySpeed[i] - gantrySpeed[i-1]|)

JA = (x2 - x1) * (y2 - y1) / 100 (cm²)
PA = sum(apertureArea * metersetWeight) (cm²)

TG (Tongue-and-Groove):
  For adjacent open leaf pairs where one closes:
  TG contribution = exposed T&G region
  TG = sum(TG_contribution) / totalArea
```

---

## Part 4: Files to Modify

| File | Changes |
|------|---------|
| `src/lib/dicom/types.ts` | Add 20 new metric fields to BeamMetrics and PlanMetrics |
| `src/lib/dicom/metrics.ts` | Add calculation functions, update aggregation |
| `src/lib/metrics-definitions.ts` | Add 20 new MetricDefinition entries |
| `src/components/viewer/MetricsPanel.tsx` | Display new metrics in appropriate sections |
| `src/components/viewer/MetricsSettings.tsx` | Ensure new metrics appear in toggles |
| `src/pages/Help.tsx` | Auto-updates from METRIC_DEFINITIONS |

---

## Part 5: Metric Categories Organization

```text
Accuracy Metrics (new category):
├── LG   - Leaf Gap
├── MAD  - Mean Asymmetry Distance
├── EFS  - Equivalent Field Size
├── psmall - Percentage Small Fields
└── EM   - Edge Metric (existing, move to accuracy)

Deliverability Metrics (expanded):
├── MU/MUCA/LTMU/LTNLMU/LNA/LTAL (MU-based)
├── GT/GS/mGSV (Gantry-based)
├── LS/mDRV (Speed-based)
├── PA/JA (Area-based)
├── PM/TG/MD/MI (Modulation-based)
└── Delivery Time/Dose Rate (existing)

Primary Complexity (existing):
├── MCS, LSV, AAV, MFA

Secondary Complexity (existing):
├── LT, LTMCS, SAS5, SAS10, PI
```

---

## Summary of New Metrics (20 total)

**Accuracy (5):** LG, MAD, EFS, psmall, (EM already exists)

**Deliverability (15):** MUCA, LTMU, LTNLMU, LNA, LTAL, mDRV, GT, GS, mGSV, LS, PA, JA, PM, TG, MD, MI
