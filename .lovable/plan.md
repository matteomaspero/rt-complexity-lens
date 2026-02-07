

# Plan: Remove UCoMX Implementation Claims and Fix Coordinate Diagrams

## Summary

Two changes are needed:
1. **Remove explicit claims** that this tool is "based on" or "implements" UCoMX v1.1 source code (keep UCoMX in references as inspiration)
2. **Fix coordinate system diagrams** to show correct anatomical orientations

---

## Part 1: Remove UCoMX Implementation References

### Problem
The current text claims this tool is "based on the UCoMX v1.1 MATLAB implementation" and calculates "UCoMX complexity metrics." Since the source code is not available, we cannot claim to have implemented it - only that the metrics are **inspired by** the same publications.

### Files & Changes

#### `src/pages/Index.tsx` (via InteractiveViewer.tsx)
**Line 174** - Change:
```
UCoMX v1.1 complexity metrics
```
To:
```
Plan complexity metrics
```

#### `src/pages/Help.tsx`
Multiple changes:

| Line | Current Text | New Text |
|------|--------------|----------|
| 63 | "based on the **UCoMX v1.1** framework" | "calculating complexity metrics **inspired by published research** including the UCoMX framework" |
| 73 | "Calculate UCoMX complexity metrics at plan, beam, and control point levels" | "Calculate complexity metrics at plan, beam, and control point levels" |
| 91-92 | "based on the UCoMX v1.1 MATLAB implementation" | "inspired by complexity metrics from the literature" |
| 419-430 | "This tool is based on the UCoMX v1.1 MATLAB implementation" with Zenodo link as primary | Reframe as "The metrics in this tool are inspired by the UCoMX framework. For the original MATLAB implementation, see:" |
| 589 | "Based on the UCoMX v1.1 framework from the University of Padova" | "Complexity metrics inspired by published research (see References)" |

---

## Part 2: Fix Coordinate System Diagrams

### Problem Analysis

Looking at the current diagrams:

**IEC61217Diagram (Gantry Angle):**
- The transverse view shows correct orientation (view from feet)
- Labels L/R are correct (patient's left on viewer's right)
- **But**: The labels say "0° (Anterior/AP)" which is wrong - 0° gantry means beam comes from ABOVE (ceiling), which is the **anterior** direction for a supine patient. But the diagram caption says "0° = beam from above (AP)" which mixes terminology.
- The table description says "From above (superior)" which confuses superior (anatomical direction = toward head) with anterior (toward ceiling for supine patient)

**PatientAxesDiagram (Patient Coordinate):**
- The isometric view is confusing
- X axis (red) points upward in the diagram, but it should represent patient's left-right axis
- Y axis (green) points down-left toward table, representing posterior
- Z axis (blue) points toward head, which is correct

The main issues:
1. **Gantry diagram**: Terminology confusion between "superior/inferior" (head/feet directions) and "anterior/posterior" (front/back for supine patient)
2. **Patient axes diagram**: The isometric projection makes the axes confusing - X appears to point to ceiling instead of sideways

### Corrected Diagrams

#### IEC61217Diagram - Terminology Fix

The gantry angle diagram should use consistent terminology:
- **0°** = Gantry at top, beam travels DOWNWARD (toward floor for supine patient = **Anterior-to-Posterior** beam direction, or AP beam)
- **90°** = Gantry at patient's left, beam travels RIGHT (toward patient's right = **Left lateral**)
- **180°** = Gantry at bottom (under couch), beam travels UPWARD = **Posterior-to-Anterior** (PA beam)
- **270°** = Gantry at patient's right, beam travels LEFT = **Right lateral**

Current confusion: The table says "From above (superior)" but superior means toward the head, not toward the ceiling. For a supine patient:
- Beam from ceiling = enters through anterior surface
- Superior direction = toward head (Z+ axis)

**Fix**: Change terminology in the table from "From above (superior)" to "From ceiling (AP direction)" or similar clear language.

#### PatientAxesDiagram - Clearer Orientation

The current isometric view is confusing. A clearer approach would be to use a slightly different viewing angle or add clearer visual cues:

Option A: **Use a true lateral view (from patient's right side)** showing:
- Patient lying flat (horizontal)
- Z-axis horizontal toward head
- Y-axis vertical (up = anterior, down = posterior toward table)
- X-axis coming "out of the page" (shown with a dot symbol ⊙ for +X toward viewer = patient's left)

Option B: **Improve the current isometric view** by:
- Making the patient body clearly horizontal on the table
- Showing X-axis going truly to the side (not upward)
- Adding clearer perspective cues

**Recommended**: Option A (lateral view) is clearer because all axes are intuitive:
- Looking from patient's right side
- Head on right (Z+), feet on left (Z-)
- Anterior (chest/face) up (Y-), Posterior (back/table) down (Y+)  
- Left (+X) toward viewer (⊙ symbol), Right (-X) away from viewer (⊗ symbol)

---

## Detailed Changes

### `src/components/help/IEC61217Diagram.tsx`

**Update table in Help.tsx (lines 202-217)** to use clearer beam direction terminology:

| Angle | Current | Corrected |
|-------|---------|-----------|
| 0° | "From above (superior)" | "From ceiling — AP beam (enters anterior)" |
| 90° | "From patient's left" | "From patient's left — left lateral beam" |
| 180° | "From below (inferior)" | "From floor — PA beam (enters posterior)" |
| 270° | "From patient's right" | "From patient's right — right lateral beam" |

**Update diagram caption** (line 289-291):
Change "0° = beam from above (AP)" to clearer text about the transverse viewing convention.

### `src/components/help/PatientAxesDiagram.tsx`

**Complete rewrite** to use a lateral view:

```text
New diagram structure (looking from patient's RIGHT side):

      Y− (Anterior/ceiling)
            ↑
            │
            │    ┌─────────────────────┐
            │    │     Patient Body    │───→ Z+ (Superior/Head)
            │    │    (horizontal)     │
Z− (Feet) ←─┼────│                     │
            │    └─────────────────────┘
            │    ═══════════════════════ (Table)
            ↓
      Y+ (Posterior/table)

      X+ (Left): ⊙ coming toward viewer
      X− (Right): ⊗ going away from viewer
```

Key elements:
- Patient body as a horizontal ellipse/shape
- Table as a horizontal bar below patient
- Gantry ring as a vertical circle around the patient (optional)
- Z-axis horizontal pointing toward head (right)
- Y-axis vertical (down = posterior toward table, up = anterior toward ceiling)
- X-axis shown with ⊙ (dot in circle) = coming toward viewer = patient's left

---

## Summary of File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/viewer/InteractiveViewer.tsx` | Edit line 174 | Remove "UCoMX v1.1" claim |
| `src/pages/Help.tsx` | Edit lines 63, 73, 91-92, 202-218, 419-430, 589 | Soften UCoMX claims; fix beam direction terminology |
| `src/components/help/IEC61217Diagram.tsx` | Minor edit | Update caption text |
| `src/components/help/PatientAxesDiagram.tsx` | Full rewrite | Change from isometric to lateral view for clarity |

