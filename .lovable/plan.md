

# Enhanced Metrics: Delivery Time, Collimator Data, and Additional Complexity Indices

## Overview

This plan expands the RT Plan Complexity Analyzer with delivery time estimation, collimator angle/position display, coordinate system specification, and additional complexity metrics from UCoMX and literature sources.

---

## Part 1: Delivery Time Estimation

Based on the UCoMX framework and TPS validation, delivery time can be estimated from control point data using machine parameters.

### 1.1 Delivery Time Calculation

Add estimated beam delivery time calculation based on:
- **MU and dose rate**: Time = MU / DoseRate
- **Gantry speed limiting**: For VMAT arcs, check if gantry speed limits delivery
- **MLC speed limiting**: Check if MLC leaf travel limits delivery

**Formula per control point:**
```text
Time_CP = max(
  MU_CP / MaxDoseRate,
  GantryAngle_CP / MaxGantrySpeed,
  MaxLeafTravel_CP / MaxMLCSpeed
)
```

**Machine parameters (configurable by preset):**

| Machine | Max Dose Rate | Max Gantry Speed | Max MLC Speed |
|---------|---------------|------------------|---------------|
| Generic | 600 MU/min | 4.8 °/s | 25 mm/s |
| TrueBeam | 600 MU/min | 6.0 °/s | 25 mm/s |
| TrueBeam FFF | 1400 MU/min | 6.0 °/s | 25 mm/s |
| Halcyon | 800 MU/min | 4.0 °/s | 50 mm/s |
| Elekta Versa HD | 600 MU/min | 6.0 °/s | 35 mm/s |

### 1.2 New Metrics

| Metric | Name | Unit | Description |
|--------|------|------|-------------|
| `estimatedDeliveryTime` | Est. Delivery Time | s | Estimated beam-on time per beam |
| `totalDeliveryTime` | Total Delivery Time | s | Sum across all beams |
| `MUperDegree` | MU per Degree | MU/° | Average MU delivered per degree of arc |
| `avgDoseRate` | Avg Dose Rate | MU/min | Average dose rate during delivery |
| `avgGantrySpeed` | Avg Gantry Speed | °/s | Average gantry rotation speed |
| `avgMLCSpeed` | Avg MLC Speed | mm/s | Average leaf speed during delivery |

---

## Part 2: Collimator Angles and Positions

### 2.1 Display Collimator Angle

The `beamLimitingDeviceAngle` is already parsed in control points. Add display components:

**Current ControlPoint type already has:**
```typescript
beamLimitingDeviceAngle: number; // collimator angle
```

### 2.2 Collimator Visualization

Create a `CollimatorViewer` component similar to `GantryViewer`:
- Display current collimator angle
- Show rotation indicator
- Display alongside gantry viewer

### 2.3 Jaw Positions Display

Jaw positions are already parsed. Add a card showing:
- X1, X2 (asymmetric X jaws)
- Y1, Y2 (asymmetric Y jaws)
- Field size calculation: (X2-X1) × (Y2-Y1)

### 2.4 Machine-Specific Collimator Types

Different machines use different collimator configurations:

| Machine | MLC Type | Jaw Configuration |
|---------|----------|-------------------|
| Varian C-arm | MLCX | ASYMX, ASYMY |
| Varian Halcyon | MLCX (dual-layer) | No jaws |
| Elekta Agility | MLCY | X, Y |
| Elekta MLCi2 | MLCX | X, Y |

---

## Part 3: Coordinate System Reference

### 3.1 IEC 61217 Standard

DICOM-RT uses the IEC 61217 coordinate system. Add display and documentation:

**Gantry coordinate system:**
- 0° = beam from above (superior)
- 90° = beam from patient's left
- 180° = beam from below (posterior)
- 270° = beam from patient's right

**Collimator coordinate system:**
- 0° = leaves perpendicular to gantry rotation axis
- Positive rotation = clockwise looking from source

**Patient coordinate system:**
- X = left (positive) / right (negative)
- Y = posterior (positive) / anterior (negative)  
- Z = superior (positive) / inferior (negative)

### 3.2 UI Updates

Add to the viewer:
- Info tooltip on gantry viewer explaining IEC 61217
- Coordinate system legend in Help page
- Isocenter position display when available

---

## Part 4: Additional Complexity Metrics

Based on literature review (PMC6774599, Du et al., Crowe et al., Younge et al.), add these metrics:

### 4.1 Aperture-Based Metrics

| Metric | Name | Formula/Description | Reference |
|--------|------|---------------------|-----------|
| `SAS` | Small Aperture Score | Fraction of segments with aperture < threshold (5mm default) | Crowe et al., 2014 |
| `EM` | Edge Metric | Ratio of MLC edge length to aperture area | Younge et al., 2016 |
| `PI` | Plan Irregularity | Average deviation of aperture from circular shape | Du et al., 2014 |
| `PM` | Plan Modulation | Variation in fluence across apertures | Du et al., 2014 |
| `CoA` | Circumference over Area | Aperture perimeter / area ratio | Literature |

### 4.2 Delivery Parameter Metrics

| Metric | Name | Unit | Description |
|--------|------|------|-------------|
| `MUperGy` | MU per Gy | MU/Gy | Plan efficiency metric |
| `MUCP` | MU per Control Point | MU | Average MU between control points |
| `DRV` | Dose Rate Variation | - | Coefficient of variation in dose rate |
| `GSV` | Gantry Speed Variation | - | Coefficient of variation in gantry speed |

### 4.3 Calculation Updates

**Small Aperture Score (SAS):**
```typescript
SAS = Σ (apertures with any leaf gap < threshold) / total_apertures
// Thresholds: 2mm, 5mm, 10mm, 20mm
```

**Edge Metric (EM):**
```typescript
EM = Σ (leaf_pair_edge_length) / aperture_area
// Higher EM = more irregular aperture edges
```

**Plan Irregularity (PI):**
```typescript
AI = aperture_perimeter² / (4π × aperture_area)  // = 1 for circle
PI = MU-weighted average of AI across all control points
```

---

## Part 5: Updated Types and Definitions

### 5.1 Types Updates (`src/lib/dicom/types.ts`)

Add to `BeamMetrics`:
```typescript
// Delivery time metrics
estimatedDeliveryTime?: number;  // seconds
MUperDegree?: number;
avgDoseRate?: number;  // MU/min
avgMLCSpeed?: number;  // mm/s

// Collimator info
collimatorAngleStart?: number;
collimatorAngleEnd?: number;

// Additional complexity
SAS5?: number;   // Small Aperture Score (5mm threshold)
SAS10?: number;  // Small Aperture Score (10mm threshold)
EM?: number;     // Edge Metric
PI?: number;     // Plan Irregularity
CoA?: number;    // Circumference over Area
```

Add to `PlanMetrics`:
```typescript
totalDeliveryTime?: number;  // seconds
MUperGy?: number;
SAS5?: number;
SAS10?: number;
EM?: number;
PI?: number;
```

### 5.2 Metric Definitions Updates

Add to `METRIC_DEFINITIONS`:

| Key | Category | Reference |
|-----|----------|-----------|
| `estimatedDeliveryTime` | delivery | UCoMX validation |
| `totalDeliveryTime` | delivery | - |
| `MUperDegree` | delivery | Miura et al. |
| `avgGantrySpeed` | delivery | - |
| `avgMLCSpeed` | delivery | Park et al. |
| `SAS5` | secondary | Crowe et al., 2014 |
| `SAS10` | secondary | Crowe et al., 2014 |
| `EM` | secondary | Younge et al., 2016 |
| `PI` | secondary | Du et al., 2014 |
| `collimatorAngle` | delivery | IEC 61217 |

---

## Part 6: UI Components

### 6.1 New Components

**CollimatorViewer.tsx**
- Similar design to GantryViewer
- Show collimator angle with rotation
- Include field rectangle representation

**DeliveryTimeCard.tsx**
- Display estimated delivery time per beam
- Show limiting factor (MLC, gantry, or dose rate)
- Total plan delivery time

**CoordinateSystemInfo.tsx**
- Expandable info panel explaining IEC 61217
- Visual diagram of patient/gantry orientation

### 6.2 Updated Components

**MetricsPanel.tsx**
- Add new metrics to appropriate sections
- New "Delivery Time" subsection
- New "Aperture Analysis" subsection for SAS, EM, PI

**GantryViewer.tsx**
- Add collimator angle display (small overlay)
- Optional isocenter marker

**InteractiveViewer.tsx**
- Add collimator viewer alongside gantry viewer
- Add delivery time summary card

---

## Part 7: Machine Configuration Integration

### 7.1 Link to Threshold Presets

Reuse machine presets from `threshold-definitions.ts` and extend with delivery parameters:

```typescript
interface MachineDeliveryParams {
  maxDoseRate: number;        // MU/min
  maxDoseRateFFF?: number;    // MU/min for FFF beams
  maxGantrySpeed: number;     // deg/s
  maxMLCSpeed: number;        // mm/s
  mlcType: 'MLCX' | 'MLCY' | 'DUAL';
}
```

### 7.2 Automatic Detection

When possible, detect machine from DICOM:
- `TreatmentMachineName` tag
- `Manufacturer` tag
- Number of leaves / leaf widths

---

## File Changes Summary

| Action | File | Description |
|--------|------|-------------|
| Update | `src/lib/dicom/types.ts` | Add new metric fields |
| Update | `src/lib/dicom/metrics.ts` | Implement new calculations |
| Update | `src/lib/metrics-definitions.ts` | Add metric definitions |
| Update | `src/lib/threshold-definitions.ts` | Add delivery parameters |
| Create | `src/components/viewer/CollimatorViewer.tsx` | Collimator angle display |
| Create | `src/components/viewer/DeliveryTimeCard.tsx` | Delivery time display |
| Update | `src/components/viewer/MetricsPanel.tsx` | New metric sections |
| Update | `src/components/viewer/InteractiveViewer.tsx` | Layout updates |
| Update | `src/pages/Help.tsx` | Coordinate system docs, new metric refs |

---

## Implementation Sequence

1. **Update types** with new metric fields
2. **Add metric definitions** for new metrics
3. **Implement delivery time calculation** in metrics.ts
4. **Implement SAS, EM, PI calculations** in metrics.ts
5. **Create CollimatorViewer** component
6. **Create DeliveryTimeCard** component
7. **Update MetricsPanel** with new sections
8. **Update InteractiveViewer** layout
9. **Update Help page** with coordinate system and new references
10. **Update threshold definitions** with delivery parameters

---

## New References to Add

1. **Delivery Time Estimation:**
   - Park JM, et al. "The effect of MLC speed and acceleration on the plan delivery accuracy of VMAT." *Brit J Radiol.* 2015.

2. **Small Aperture Score:**
   - Crowe SB, et al. "Treatment plan complexity metrics for predicting IMRT pre-treatment quality assurance results." *Australas Phys Eng Sci Med.* 2014;37:475-482.
   - DOI: 10.1007/s13246-014-0271-5

3. **Edge Metric:**
   - Younge KC, et al. "Predicting deliverability of VMAT plans using aperture complexity analysis." *J Appl Clin Med Phys.* 2016;17(4):124-131.
   - DOI: 10.1120/jacmp.v17i4.6241

4. **Plan Irregularity (PI) and Plan Modulation (PM):**
   - Du W, et al. "Quantification of beam complexity in IMRT treatment plans." *Med Phys.* 2014;41(2):021716.
   - DOI: 10.1118/1.4861821

---

## Success Criteria

- Estimated delivery time shown for each beam and total plan
- Collimator angle displayed and updates with control points
- Jaw positions shown with field size calculation
- SAS, EM, and PI metrics calculated and displayed
- Help page includes IEC 61217 coordinate system explanation
- All new metrics exportable to CSV
- Machine delivery parameters configurable via existing preset system

