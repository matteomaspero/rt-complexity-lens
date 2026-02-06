

# Plan: Fix Coordinate System Diagrams

## Summary
Correct both diagrams to show anatomically accurate representations:
1. **IEC61217Diagram**: Change to transverse cross-sectional view (looking from feet toward head) with patient lying supine on table and gantry ring around them
2. **PatientAxesDiagram**: Show patient lying supine on treatment table with linac/gantry representation

---

## Current Problems

### IEC61217Diagram (Gantry Angle)
- **Wrong**: Bird's-eye view looking down at patient (coronal/top-down view)
- **Wrong**: Patient shown longitudinally (head at top, feet at bottom of diagram)
- **Correct View**: Transverse cross-section (viewing from feet toward head, as if standing at foot of table)
- **In Correct View**: 
  - 0° = gantry at top (beam comes from above patient)
  - 90° = gantry on patient's left (viewer's right)
  - 180° = gantry at bottom (beam from below, through couch)
  - 270° = gantry on patient's right (viewer's left)

### PatientAxesDiagram (Patient Axes)
- **Wrong**: Shows upright patient silhouette (standing)
- **Wrong**: No treatment table or linac context
- **Correct**: Patient lying supine (on back) on treatment table
- **Correct**: Should show table, and optionally a simplified linac/gantry

---

## Corrected Layouts

### IEC61217Diagram - Transverse View

```text
                    0° (Anterior/AP)
                    Gantry at top
                         ↓
                    ┌────●────┐
                   /     │     \
         270°    /   ┌───┴───┐   \    90°
        (Right) ●────│Patient│────● (Left)
        Gantry   \   │ Cross │   /  Gantry
                  \  │Section│  /
                   \ └───────┘ /
                    └────●────┘
                         ↑
                   180° (Posterior/PA)
                   Gantry under couch

Viewing direction: From feet toward head (into the page)
Patient: Supine (face up), cross-section at isocenter level
```

**Key elements to draw:**
- Gantry ring (outer circle)
- Treatment couch (flat rectangle at bottom of patient)
- Patient cross-section (ellipse for body outline)
- Left/Right labels on patient
- Anterior/Posterior labels
- Beam arrows from each cardinal position pointing to isocenter

### PatientAxesDiagram - Side/Sagittal View with Context

```text
                Z+ (Superior)
                     ↑
                     │
          ┌──────────┼──────────┐ ← Linac Gantry (ring)
          │    ┌─────●─────┐    │
          │    │  Patient  │    │
    ←─────┼────│  (supine) │────┼─────→ X+ (Left)
    Right │    │   body    │    │
          │    └───────────┘    │
          └──────────────────────┘
                     │
              ═══════════════════  ← Treatment Table
                     │
                     ↓
                 Z- (Inferior)

   Y+ (Posterior) points into page (toward table)
   Y- (Anterior) points out of page (toward ceiling)
```

**Chose the 3/4 isometric view** showing patient lying on table with all three axes visible.

---

## Implementation Details

### 1. IEC61217Diagram.tsx - Complete Redesign

**New SVG structure:**
- Viewbox: 320x320 (slightly larger for labels)
- Center: (160, 160)

**Elements:**
1. **Gantry ring** - Large dashed circle (r=130) representing rotation path
2. **Treatment couch** - Horizontal rectangle at bottom center of patient area
3. **Patient cross-section** - Ellipse (wider than tall, representing transverse body section)
4. **Spine indicator** - Small circle at posterior of patient (for orientation)
5. **L/R labels** - Inside or near patient cross-section
6. **Four beam arrows** - From cardinal positions pointing to isocenter
7. **Isocenter marker** - Center crosshairs
8. **CW rotation indicator** - Arc with arrow

**Key positions (center at 160,160):**
```text
0°:   (160, 30)  → beam points down to (160, 100)
90°:  (290, 160) → beam points left to (220, 160)
180°: (160, 290) → beam points up to (160, 220)
270°: (30, 160)  → beam points right to (100, 160)

Patient ellipse: cx=160, cy=160, rx=50 (L-R width), ry=35 (A-P depth)
Couch: rect at y=185, width=120, height=15, centered at x=160
```

### 2. PatientAxesDiagram.tsx - Complete Redesign

**New SVG structure:**
- Viewbox: 280x260
- Show lateral/side view or 3/4 isometric view

**Option A: Lateral View (simpler, clearer for axes)**
- Patient lying on their back (profile view from side)
- Table visible below patient
- Simplified linac gantry ring around patient
- X-axis pointing left (into page, shown with circle+dot or foreshortened)
- Y-axis pointing down toward table (posterior)
- Z-axis pointing toward head (horizontal in this view)

**Option B: 3/4 Isometric View (more intuitive)**
- Similar to current but patient is horizontal
- Table clearly visible under patient
- Gantry ring sketched around
- All three axes visible with depth cues

**Chosen: Option B (3/4 isometric)** - more intuitive spatial understanding

**Elements:**
1. **Treatment table** - 3D rectangle in isometric projection
2. **Patient body** - Lying supine on table (ellipsoid shape, head at one end)
3. **Gantry ring** - Ellipse around patient (tilted for perspective)
4. **Three axis arrows** from isocenter with color coding
5. **Anatomical labels** - Head, Feet, Left, Right, Anterior, Posterior

---

## File Changes

### `src/components/help/IEC61217Diagram.tsx`

Full rewrite with transverse cross-sectional view:

```tsx
// Key elements:
// 1. Patient cross-section (ellipse, supine orientation)
<ellipse cx="160" cy="155" rx="50" ry="35" /> // Body outline

// 2. Treatment couch below patient
<rect x="100" y="185" width="120" height="12" rx="2" /> // Couch

// 3. Gantry rotation ring
<circle cx="160" cy="160" r="130" strokeDasharray="6 4" />

// 4. Beam arrows from each cardinal angle
// 0° from top
<line x1="160" y1="30" x2="160" y2="110" />
// etc.

// 5. Anatomical orientation markers inside patient
<text>L</text> // Left side
<text>R</text> // Right side
```

### `src/components/help/PatientAxesDiagram.tsx`

Full rewrite with isometric supine patient view:

```tsx
// Key elements:
// 1. Treatment table (3D box shape)
<path d="M40,180 L80,200 L240,200 L260,180 L260,170 L240,190 L80,190 L40,170 Z" />

// 2. Patient lying supine on table
// Head end
<ellipse cx="80" cy="150" rx="20" ry="15" />
// Body
<ellipse cx="150" cy="155" rx="60" ry="20" />
// Feet end  
<ellipse cx="220" cy="155" rx="15" ry="12" />

// 3. Gantry ring (tilted ellipse around patient)
<ellipse cx="150" cy="140" rx="90" ry="60" transform="rotate(-10)" />

// 4. Three coordinate axes from isocenter
// X-axis (Left/Right)
<line x1="150" y1="150" x2="250" y2="165" stroke="red" />
// Y-axis (Posterior/Anterior) 
<line x1="150" y1="150" x2="130" y2="200" stroke="green" />
// Z-axis (Superior/Inferior)
<line x1="150" y1="150" x2="70" y2="130" stroke="blue" />
```

---

## Caption Updates

### IEC61217Diagram
**New caption:**
> Transverse view (looking from feet toward head). Patient is supine on treatment couch. Gantry rotates clockwise. 0° = beam from above (anterior-posterior).

### PatientAxesDiagram
**New caption:**
> Patient lying supine (face-up) on treatment table, head-first orientation. Origin at isocenter. Linac gantry ring shown for reference. Solid arrows show positive (+) axis directions.

---

## Summary of Changes

| File | Change | Description |
|------|--------|-------------|
| `IEC61217Diagram.tsx` | Rewrite | Change from bird's-eye to transverse cross-sectional view; add proper couch representation |
| `PatientAxesDiagram.tsx` | Rewrite | Change from upright patient to supine patient on table; add linac gantry ring |

Both diagrams will maintain:
- Responsive sizing via props
- Theme-aware colors using CSS classes
- Accessible aria-labels
- Descriptive captions

