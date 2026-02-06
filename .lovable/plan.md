
# Plan: Improve Coordinate System Explanation with Diagrams

## Summary
Enhance the IEC 61217 Coordinate System section in the Help page with:
1. A custom interactive SVG diagram component showing gantry angles and patient orientation
2. A patient coordinate axes diagram showing XYZ orientation
3. Improved prose explanations with clearer technical descriptions
4. Reference to the IEC 61217 standard and DICOM documentation

---

## Current State

The coordinate system section at lines 162-244 of `Help.tsx` has:
- Basic tables for gantry angles (0/90/180/270)
- Simple bullet lists for collimator and patient axes
- Machine-specific variations table
- No visual diagrams

**Problem**: Text-only descriptions are difficult to understand without visual aids, especially for the spatial relationships between gantry positions and patient anatomy.

---

## Implementation

### 1. Create New Component: `IEC61217Diagram.tsx`

A reusable SVG component showing:
- Top-down view of linac gantry with patient on couch
- Four cardinal gantry angles (0, 90, 180, 270) with beam direction arrows
- Patient orientation labels (Head, Feet, Left, Right)
- XYZ axis indicators
- Interactive highlights on hover (optional)

**Component Location**: `src/components/help/IEC61217Diagram.tsx`

```text
Layout:
                    0° (Superior)
                       ↓
                   ┌───────┐
                   │ Gantry│
          270° ←── │   ●   │ ──→ 90°
          (Right)  │ Couch │  (Left)
                   └───────┘
                       ↑
                   180° (Inferior)
```

### 2. Create Patient Axes Diagram: `PatientAxesDiagram.tsx`

Simple SVG showing XYZ axes with anatomical labels:
- X-axis: Left (+) / Right (-)
- Y-axis: Posterior (+) / Anterior (-)  
- Z-axis: Superior (+) / Inferior (-)

**Component Location**: `src/components/help/PatientAxesDiagram.tsx`

### 3. Update Help.tsx Coordinate Section

#### Enhanced Content Structure:

```text
┌─────────────────────────────────────────────────────────┐
│ IEC 61217 Coordinate System                             │
├─────────────────────────────────────────────────────────┤
│ [Improved intro paragraph about IEC 61217 purpose]      │
│                                                         │
│ ┌─────────────────────┬─────────────────────────────┐  │
│ │   Gantry Diagram    │   Gantry Angle Table        │  │
│ │   (SVG component)   │   0° = Superior             │  │
│ │                     │   90° = Left lateral        │  │
│ │   [IEC61217Diagram] │   180° = Inferior           │  │
│ │                     │   270° = Right lateral      │  │
│ └─────────────────────┴─────────────────────────────┘  │
│                                                         │
│ Collimator Angle (existing + enhanced text)             │
│                                                         │
│ ┌─────────────────────┬─────────────────────────────┐  │
│ │   Patient Axes      │   Axis descriptions         │  │
│ │   (SVG component)   │   X: Left/Right             │  │
│ │                     │   Y: Posterior/Anterior     │  │
│ │   [PatientAxesDiag] │   Z: Superior/Inferior      │  │
│ └─────────────────────┴─────────────────────────────┘  │
│                                                         │
│ Machine-Specific Variations (existing table)           │
│                                                         │
│ [Note about DICOM standard reference]                  │
└─────────────────────────────────────────────────────────┘
```

---

## File Changes

### New Files

#### 1. `src/components/help/IEC61217Diagram.tsx`

Custom SVG component featuring:
- 300x300px viewbox with responsive scaling
- Outer circle representing gantry rotation path
- Patient silhouette (head/torso) in center on couch
- Beam direction arrows at 0, 90, 180, 270
- Color-coded labels matching the table
- Caption noting this follows IEC 61217 conventions

**Key SVG elements**:
```tsx
// Gantry rotation circle
<circle cx="150" cy="150" r="120" />

// Patient body (simplified)
<ellipse cx="150" cy="150" rx="30" ry="50" />
<circle cx="150" cy="95" r="15" /> // head

// Beam arrows at cardinal angles
<path d="M150,30 L150,70" /> // 0° beam from superior
// ... arrows for 90°, 180°, 270°

// Labels
<text x="150" y="20">0° (Superior)</text>
// ... other labels
```

#### 2. `src/components/help/PatientAxesDiagram.tsx`

3D-style axes diagram showing:
- Three arrows from origin (X, Y, Z)
- Color coding (X=red, Y=green, Z=blue - common convention)
- Anatomical direction labels at each arrow tip
- Isometric perspective for clarity

### Modified Files

#### 3. `src/components/help/index.ts`

Export new components:
```tsx
export { IEC61217Diagram } from './IEC61217Diagram';
export { PatientAxesDiagram } from './PatientAxesDiagram';
```

#### 4. `src/pages/Help.tsx`

**Changes to coordinate system section (lines 162-244)**:

1. Import new diagram components
2. Restructure into flex/grid layout with diagrams alongside tables
3. Enhance prose descriptions:
   - Add context about why IEC 61217 matters
   - Clarify "beam from above" means source at top, beam pointing down
   - Add note about clockwise/counter-clockwise conventions
   - Reference DICOM standard
4. Add collimator rotation direction clarification
5. Add couch angle explanation (currently missing)
6. Add reference link to DICOM coordinate system documentation

---

## Enhanced Text Content

### Introduction (enhanced)
> The **IEC 61217** standard defines coordinate systems and angle conventions used universally in radiotherapy equipment. DICOM-RT files encode all geometric information using these conventions. Understanding this system is essential for correctly interpreting gantry angles, collimator rotations, and patient positioning in treatment plans.

### Gantry Angle (enhanced)
> Gantry angle describes the rotation of the treatment head around the patient. The angle is measured from the **viewer's perspective facing the gantry**. At 0°, the radiation source is directly above the patient (superior), with the beam directed downward. Rotation proceeds **clockwise** from this position.

### Collimator Angle (enhanced)
> The collimator (beam-limiting device) can rotate independently within the gantry head. At 0°, the MLC leaves are perpendicular to the gantry rotation axis. Rotation is **counter-clockwise** when viewed from the radiation source (beam's-eye view).

### Patient Coordinate System (enhanced)
> The patient coordinate system assumes a supine (face-up) patient position with head toward the gantry. The origin is at the machine isocenter. This left-handed coordinate system differs from typical medical imaging (LPS) conventions.

### New: Couch Angle
| Angle | Description |
|-------|-------------|
| 0° | Couch parallel to gantry rotation axis |
| 90° | Couch rotated counter-clockwise (patient's head toward 90° gantry position) |
| 270° | Couch rotated clockwise (patient's head toward 270° gantry position) |

### Reference Note
> For complete technical specifications, see the [DICOM Coordinate Systems documentation](https://dicom.nema.org/medical/dicom/current/output/chtml/part03/sect_c.8.8.25.6.html) and the IEC 61217:2011 standard.

---

## Technical Details

### Diagram Specifications

**IEC61217Diagram**:
- Size: 280x280px default, responsive via props
- Uses CSS variables for theming (--foreground, --muted, --primary)
- Gantry circle: 120px radius
- Patient figure: simplified oval body + circle head
- Beam arrows: 6px wide, triangular heads
- Labels: 11px font, positioned outside rotation circle
- Animation: subtle pulse on beam origin circles (optional)

**PatientAxesDiagram**:
- Size: 200x200px default
- Isometric projection (30° angles)
- Arrow colors: X=#ef4444 (red), Y=#22c55e (green), Z=#3b82f6 (blue)
- Labels positioned at arrow tips
- Light grid lines for depth perception

### Accessibility
- SVG elements include `aria-label` descriptions
- Color is not the only distinguishing factor (shapes + labels)
- High contrast maintained for visibility

---

## Summary of Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/help/IEC61217Diagram.tsx` | Create | Gantry angle visualization with patient orientation |
| `src/components/help/PatientAxesDiagram.tsx` | Create | XYZ patient coordinate axes diagram |
| `src/components/help/index.ts` | Modify | Export new diagram components |
| `src/pages/Help.tsx` | Modify | Integrate diagrams, enhance text, add couch angle table |

---

## References Used

- **IEC 61217:2011** - Radiotherapy equipment - Coordinates, movements and scales
- **DICOM PS3.3 C.8.8.25.6** - RT Ion Beams Coordinate Systems
- **AAPM Presentation** - "DICOM- an overview with an emphasis on Therapy" by R. Alfredo C. Siochi, PhD (for gantry/collimator conventions confirmation)

Note: The diagrams are original SVG creations following the IEC 61217 conventions; no external copyrighted images are used.
