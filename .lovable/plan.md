
# Add Isocenter/Table Position and Audit All Test Plans

## Overview

This plan addresses two tasks:
1. Add isocenter position and patient support angle (table) to the BeamSummaryCard
2. Audit all test plans to verify metrics and charts render correctly

---

## Part 1: Add Isocenter and Table Position

### 1.1 DICOM Tags to Parse

The following DICOM tags need to be added to the parser:

| Tag | Keyword | Description | VR |
|-----|---------|-------------|-----|
| (300A,012C) | IsocenterPosition | X, Y, Z coordinates in mm | DS |
| (300A,0122) | PatientSupportAngle | Table rotation angle | DS |
| (300A,0128) | TableTopVerticalPosition | Vertical position | DS |
| (300A,0129) | TableTopLongitudinalPosition | Longitudinal position | DS |
| (300A,012A) | TableTopLateralPosition | Lateral position | DS |

### 1.2 Type Updates

Update `src/lib/dicom/types.ts`:

```typescript
// Add to ControlPoint interface
export interface ControlPoint {
  // ... existing fields ...
  isocenterPosition?: [number, number, number];
  patientSupportAngle?: number;        // Table rotation (degrees)
  tableTopVertical?: number;           // mm
  tableTopLongitudinal?: number;       // mm
  tableTopLateral?: number;            // mm
}
```

### 1.3 Parser Updates

Update `src/lib/dicom/parser.ts`:

Add new DICOM tags:
```typescript
const TAGS = {
  // ... existing tags ...
  PatientSupportAngle: 'x300a0122',
  TableTopVerticalPosition: 'x300a0128',
  TableTopLongitudinalPosition: 'x300a0129',
  TableTopLateralPosition: 'x300a012a',
};
```

Update `parseControlPoint()` to extract these values.

### 1.4 BeamSummaryCard Updates

Update `src/components/viewer/BeamSummaryCard.tsx` to display:

```text
+------------------------------------------------------------------+
| Beam: Arc1_CW                                    VMAT Arc | CW   |
+------------------------------------------------------------------+
| CPs: 178  |  181.0° → 179.0° (358°)  |  324.5 MU  |  Est: 0:52   |
| Dose Rate: 145 – 580 MU/min          |  Avg Gantry: 5.8 °/s      |
+------------------------------------------------------------------+
| Isocenter: (0.0, -50.0, 100.0) mm    |  Table: 0.0°              |
+------------------------------------------------------------------+
```

New fields in the info grid:
- **Isocenter**: X, Y, Z coordinates from first control point
- **Table Angle**: Patient support angle (rotation)

---

## Part 2: File Changes Summary

| File | Changes |
|------|---------|
| `src/lib/dicom/types.ts` | Add table position fields to ControlPoint |
| `src/lib/dicom/parser.ts` | Parse isocenter, patient support angle, table positions |
| `src/components/viewer/BeamSummaryCard.tsx` | Display isocenter and table position |

---

## Part 3: BeamSummaryCard Layout Update

Add a second row to the info grid for geometric parameters:

```typescript
// Row 1: Delivery parameters (existing)
<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
  <div>Control Points: 178</div>
  <div>Gantry: 181.0° → 179.0° (358°)</div>
  <div>MU: 324.5</div>
  <div>Est. Time: 0:52</div>
  <div>Dose Rate: 145 – 580 MU/min</div>
  <div>Avg Gantry: 5.8 °/s</div>
</div>

// Row 2: Geometric parameters (new)
<div className="grid grid-cols-2 md:grid-cols-3">
  <div>Isocenter: (0.0, -50.0, 100.0) mm</div>
  <div>Table Angle: 0.0°</div>
  <div>Collimator: 5.0° → 5.0°</div>  // Optional: add collimator range
</div>
```

---

## Part 4: Audit All Test Plans

After implementing the isocenter/table changes, systematically test each plan:

### 4.1 Test Files to Audit

| File | Type | Expected Characteristics |
|------|------|-------------------------|
| `RP1.2.752.243.1.1.20230623170950828.2520.26087.dcm` | VMAT | Complex arc, multiple control points |
| `RTPLAN_MO_PT_01.dcm` | Monaco VMAT | Single arc |
| `RTPLAN_MO_PT_02.dcm` | Monaco VMAT | Single arc |
| `RTPLAN_MO_PT_03.dcm` | Monaco VMAT | Single arc |
| `RTPLAN_MO_PT_04.dcm` | Monaco VMAT | Single arc |
| `RTPLAN_MR_PT_01_PENALTY.dcm` | Monaco VMAT | Plan with penalty optimization |
| `RP.TG119.PR_ETH_7F.dcm` | IMRT | 7-field static beams |
| `RP.TG119.PR_ETH_2A_2.dcm` | VMAT | 2-arc plan |

### 4.2 Verification Checklist Per Plan

For each plan, verify:

**Beam Summary Card:**
- Beam name displays correctly
- Beam type (Arc/Static/IMRT) is correct
- Gantry range shows start → end with arc length
- MU matches fraction group reference
- Estimated time is reasonable (< 5 min typical)
- Dose rate range is valid (50-600 MU/min typical)
- Isocenter position displays (if present)
- Table angle displays (if present)

**Visualizations:**
- Gantry viewer shows correct angle and direction
- Collimator viewer shows correct angle and jaw positions
- MLC aperture renders without errors
- All control points can be scrubbed

**Charts:**
- Cumulative MU chart shows monotonic increase
- Gantry speed chart renders for arcs
- MU Distribution polar chart renders
- Delivery Analysis shows all 4 sub-charts
- Complexity Analysis shows LSV, AAV, Aperture Area

**Metrics Panel:**
- All UCoMX metrics display (MCS, LSV, AAV, MFA, LT)
- SAS5, SAS10, EM, PI metrics display
- Values are in expected ranges

### 4.3 Expected Metric Ranges

| Metric | Valid Range | Typical Range |
|--------|-------------|---------------|
| MCS | 0 - 1 | 0.2 - 0.8 |
| LSV | 0 - 1 | 0.7 - 0.99 |
| AAV | 0 - 1 | 0.1 - 0.5 |
| MFA | 0 - 500 cm^2 | 5 - 50 cm^2 |
| LT | >= 0 mm | 1000 - 50000 mm |
| SAS5 | 0 - 1 | 0 - 0.1 |
| SAS10 | 0 - 1 | 0 - 0.3 |
| EM | >= 0 mm^-1 | 0.1 - 1.0 mm^-1 |
| PI | >= 1 | 1 - 50 |

### 4.4 Known Edge Cases

| Plan | Expected Behavior |
|------|-------------------|
| TG119_7F (7-field IMRT) | Static beams, no arc length, gantry speed N/A |
| TG119_2A (2-arc) | Multiple beams, beam selector should work |
| MONACO_PENALTY | May have unusual aperture shapes |

---

## Part 5: Implementation Sequence

1. **Update types** - Add table position fields to ControlPoint interface
2. **Update parser** - Parse isocenter and table position tags from DICOM
3. **Update BeamSummaryCard** - Add display for isocenter and table position
4. **Manual audit** - Load each test plan and verify all components

---

## Part 6: Technical Details

### 6.1 Isocenter Position Extraction

The isocenter is typically defined in the first control point only. If not present in subsequent control points, inherit from CP 0:

```typescript
// In parseControlPoint
const isocenterStr = dataSet.string(TAGS.IsocenterPosition);
let isocenterPosition: [number, number, number] | undefined;

if (isocenterStr) {
  const coords = isocenterStr.split('\\').map(v => parseFloat(v.trim()));
  if (coords.length === 3) {
    isocenterPosition = [coords[0], coords[1], coords[2]];
  }
} else if (previousCP?.isocenterPosition) {
  isocenterPosition = previousCP.isocenterPosition;
}
```

### 6.2 Table Position Display

For the BeamSummaryCard, extract isocenter and table angle from the first control point:

```typescript
const firstCP = beam.controlPoints[0];
const isocenter = firstCP.isocenterPosition;
const tableAngle = firstCP.patientSupportAngle ?? 0;
```

Display format:
- Isocenter: `(X, Y, Z) mm` with values rounded to 1 decimal
- Table: `N.N°` 

---

## Success Criteria

- Isocenter position displays in BeamSummaryCard (when available in DICOM)
- Table angle displays in BeamSummaryCard
- All 8 test plans load without errors
- All charts render correctly for each plan type
- Metrics are within expected ranges
- Static IMRT plans display appropriately (no arc-specific metrics)
- Multi-arc plans allow beam switching
