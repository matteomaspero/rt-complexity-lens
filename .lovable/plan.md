
# Plan: Restructured Export with Two-Row Headers, Additional Fields, and GT Fix

## Overview

Three changes: (1) reorder export columns so directly-extractable plan/beam metadata comes first, followed by computed metrics; (2) add a two-row CSV header with category labels on row 1 and metric names on row 2; (3) fix the GT (Gantry Travel) calculation to sum all inter-control-point angle differences instead of just start-to-end.

---

## 1. Fix GT Calculation

**Problem**: GT is currently set to `arcLength`, which is computed as `Math.abs(gantryAngleEnd - gantryAngleStart)` with a `>180` wraparound. This fails for full arcs (start == end gives 0) and doesn't account for actual gantry path through all control points.

**Fix in `src/lib/dicom/metrics.ts` (beam-level, ~line 760-806)**:

Replace the arcLength and GT calculation with a proper summation through all control points:

```text
// Calculate true gantry travel by summing all CP-to-CP angle differences
let totalGantryTravel = 0;
for (let i = 1; i < beam.controlPoints.length; i++) {
  let delta = Math.abs(beam.controlPoints[i].gantryAngle - beam.controlPoints[i-1].gantryAngle);
  if (delta > 180) delta = 360 - delta;
  totalGantryTravel += delta;
}
const arcLength = beam.isArc ? totalGantryTravel : undefined;
const GT = totalGantryTravel > 0 ? totalGantryTravel : undefined;
```

This matches the approach already used in `BeamSummaryCard.tsx` (lines 47-52) which correctly sums segment-by-segment.

---

## 2. Add Missing Extractable Fields to Export

Add columns for data that is parsed from DICOM but currently not exported:

**Plan-level**: PatientID, PatientName, Treatment Machine, Institution

**Beam-level**: Gantry Range (start-end as string), Avg Dose Rate, Isocenter (x,y,z), Table Angle, Collimator Angle, Table Position (V,L,Lat)

These fields are already available on `RTPlan`, `Beam`, and `BeamMetrics` interfaces -- they just need column definitions added to `export-utils.ts`.

---

## 3. Reorder Columns: Metadata First, Then Metrics

The new column order for plan-level CSV:

```text
Category row:  Plan Info,,,,,,,,,,,,,Prescription,,,,Delivery,,,,,,,Geometric,,,,,,Complexity,,,,,,,,,,,,,,Deliverability,,,,
Name row:      File,Patient ID,Patient Name,Plan Label,Technique,Beam Count,CP Count,Radiation Type,Energy,Machine,...,Rx Dose (Gy),Dose/Fx (Gy),Fractions,MU/Gy,Total MU,Delivery Time (s),GT (deg),...,MFA (cm2),EFS (mm),...,MCS,LSV,AAV,...,LTMU,GS,...
```

Grouping:
- **Plan Info**: File, Patient ID, Patient Name, Plan Label, Technique, Beam Count, CP Count, Radiation Type, Energy, Machine, Institution
- **Prescription**: Rx Dose, Dose/Fx, Fractions, MU/Gy
- **Delivery**: Total MU, Delivery Time, GT, Avg Dose Rate, psmall
- **Geometric**: MFA, EFS, PA, JA
- **Complexity (Primary)**: MCS, LSV, AAV
- **Complexity (Secondary)**: LT, LTMCS, SAS5, SAS10, EM, PI, LG, MAD, TG, PM, MD, MI
- **Deliverability**: MUCA, LTMU, LTNLMU, LNA, LTAL, GS, mGSV, LS, mDRV

Similarly for beam-level CSV, adding: Isocenter, Table Angle, Collimator, Table Position, Avg Dose Rate, Gantry Range.

---

## 4. Two-Row CSV Header

Row 1 contains the category name only at the first column of each group, all other cells in that group are empty. Row 2 contains the metric name with unit. Data starts at row 3.

```text
Plan Info,,,,,,,,,,,,Prescription,,,,Delivery,,,,,Geometric,,,,Complexity (Primary),,,Complexity (Secondary),,,,,,,,,,,,Deliverability,,,,,,,,
File,Patient ID,Patient Name,Plan Label,Technique,Beam Count,CP Count,Radiation Type,Energy,Machine,Institution,,Rx Dose (Gy),Dose/Fx (Gy),Fractions,MU/Gy,Total MU,Delivery Time (s),GT (deg),Avg Dose Rate (MU/min),psmall,MFA (cm2),EFS (mm),PA (cm2),JA (cm2),MCS,LSV,AAV,LT (mm),LTMCS,SAS5,SAS10,EM,PI,LG (mm),MAD (mm),TG,PM,MD,MI,MUCA (MU/CP),LTMU (mm/MU),LTNLMU,LNA,LTAL (mm/deg),GS (deg/s),mGSV (deg/s),LS (mm/s),mDRV (MU/min)
plan1.dcm,AB***CD,Anonymized,Head,VMAT,2,178,PHOTON,6X,TrueBeam,Hospital,...
```

---

## 5. Technical Details

### Files Changed

| File | Change |
|------|--------|
| `src/lib/export-utils.ts` | Restructure `PLAN_COLUMNS` and `BEAM_COLUMNS` with category grouping, add missing fields (patientId, patientName, machine, institution, isocenter, table angle, collimator, dose rate, gantry range, table position), implement two-row header generation in `plansToCSV` and `beamsToCSV` |
| `src/lib/dicom/metrics.ts` | Fix GT calculation (~line 760-806): replace `arcLength = abs(end - start)` with CP-by-CP summation. Also fix arcLength to use same logic |

### Column Definition Changes in export-utils.ts

Each column definition gains a `category` field:

```typescript
interface ColumnDef {
  key: string;
  header: string;
  category: string;  // NEW: 'Plan Info' | 'Prescription' | 'Delivery' | 'Geometric' | etc.
  decimals: number;
  extract: (p: ExportablePlan) => number | string | undefined;
}
```

The `plansToCSV` function builds two header rows:

```typescript
function buildCategoryRow(columns: ColumnDef[]): string {
  let lastCategory = '';
  return columns.map(col => {
    if (col.category !== lastCategory) {
      lastCategory = col.category;
      return escapeCSV(col.category);
    }
    return '';
  }).join(',');
}
```

### New extractors for missing fields

```typescript
// Plan-level
{ key: 'patientId', header: 'Patient ID', category: 'Plan Info', extract: p => p.plan.patientId },
{ key: 'patientName', header: 'Patient Name', category: 'Plan Info', extract: p => p.plan.patientName },
{ key: 'machine', header: 'Machine', category: 'Plan Info', extract: p => p.plan.treatmentMachineName },
{ key: 'institution', header: 'Institution', category: 'Plan Info', extract: p => p.plan.institutionName },

// Beam-level additions
{ key: 'gantryRange', header: 'Gantry Range', extract: bm => `${bm.gantryAngleStart}→${bm.gantryAngleEnd}` },
{ key: 'avgDoseRate', header: 'Avg Dose Rate (MU/min)', extract: bm => bm.avgDoseRate },
{ key: 'isocenter', header: 'Isocenter (mm)', extract: bm => formatIsocenter(bm) },
{ key: 'tableAngle', header: 'Table Angle (deg)', extract: bm => bm.patientSupportAngle },
{ key: 'tablePosition', header: 'Table Position (V,L,Lat)', extract: bm => formatTablePos(bm) },
```

For beam-level export, some fields (isocenter, table angle, table position, gantry start/end) need to be added to the `BeamMetrics` interface so they're available at export time, or extracted from the beam's first control point during export.

### BeamMetrics additions in types.ts

```typescript
interface BeamMetrics {
  // ... existing
  gantryAngleStart?: number;
  gantryAngleEnd?: number;
  patientSupportAngle?: number;
  isocenterPosition?: [number, number, number];
  tableTopVertical?: number;
  tableTopLongitudinal?: number;
  tableTopLateral?: number;
}
```

These are set in `calculateBeamMetrics` from `beam.controlPoints[0]`.

### GT fix details in metrics.ts

Replace lines ~760-776:

```typescript
// Current (WRONG):
if (beam.isArc && beam.controlPoints.length > 1) {
  arcLength = Math.abs(beam.gantryAngleEnd - beam.gantryAngleStart);
  if (arcLength > 180) arcLength = 360 - arcLength;
}

// Fixed (sum all CP-to-CP deltas):
let totalGantryTravel = 0;
if (beam.controlPoints.length > 1) {
  for (let i = 1; i < beam.controlPoints.length; i++) {
    let delta = Math.abs(
      beam.controlPoints[i].gantryAngle - beam.controlPoints[i-1].gantryAngle
    );
    if (delta > 180) delta = 360 - delta;
    totalGantryTravel += delta;
  }
}
arcLength = beam.isArc && totalGantryTravel > 0 ? totalGantryTravel : undefined;
const GT = totalGantryTravel > 0 ? totalGantryTravel : undefined;
```

---

## Summary

- **GT fix**: Sum CP-by-CP gantry angle deltas instead of start-minus-end
- **New columns**: Patient ID, Patient Name, Machine, Institution, Avg Dose Rate at plan level; Isocenter, Table Angle, Gantry Range, Table Position at beam level
- **Reordered**: Plan Info first, then Prescription, Delivery, Geometric, Complexity, Deliverability
- **Two-row header**: Category labels on row 1 (first column of each group only), metric names on row 2, data from row 3
- **Files**: `src/lib/export-utils.ts`, `src/lib/dicom/metrics.ts`, `src/lib/dicom/types.ts`
