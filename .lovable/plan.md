
# Plan: Homogenize Help Page Style and Enhance Visual Appeal

## Summary
Improve the Help page by:
1. Standardizing text formatting (bold, headings, lists)
2. Enhancing visual hierarchy and spacing
3. Making diagrams more prominent with better captions
4. Adding visual accents for better readability
5. Ensuring consistent styling patterns throughout

---

## Current Issues Identified

### Diagram Accuracy
The coordinate system diagrams are now **technically correct**:
- **IEC61217Diagram**: Transverse view with correct gantry positions (0° = AP from ceiling)
- **PatientAxesDiagram**: Lateral view with correct axis orientations

### Style Inconsistencies

| Issue | Location | Current State |
|-------|----------|---------------|
| Bold usage | Throughout | Inconsistent - some terms bolded, others not |
| Heading sizes | Section headers | Mix of `<h4>` tags with varying weight |
| List styling | Feature lists | Some bulleted, some not |
| Section spacing | Between cards | Variable margins |
| Emphasis patterns | Key terms | Mix of bold, italics, plain |
| Caption prominence | Diagrams | Small, could be more styled |
| Visual accents | Info boxes | Only one highlighted box (References) |

---

## Implementation Changes

### 1. Standardize Typography Patterns

**Establish consistent rules:**
- **Section titles**: Use `<h4 className="font-semibold text-base mb-2">` 
- **Key terms**: Bold first occurrence only
- **Technical terms**: Use `<code className="font-mono">` for values like `0°`, `90°`
- **Emphasis**: Reserve bold for truly important concepts

### 2. Enhance Introduction Card

**Changes:**
- Add a subtle accent border or icon highlight
- Standardize feature list with checkmark or bullet icons
- Add visual separator between intro text and features

### 3. Improve Coordinate System Section

**Changes to Help.tsx lines 162-345:**
- Add subtle background highlight to diagram containers
- Enhance diagram captions with styled boxes
- Add visual dividers between subsections (Gantry, Collimator, Patient)
- Standardize table styling for all angle tables
- Add consistent "note" styling for clarifications

**Diagram container enhancement:**
```tsx
<div className="my-6 flex flex-col lg:flex-row gap-6 items-start">
  <div className="shrink-0 p-4 rounded-lg bg-muted/30 border">
    <IEC61217Diagram />
  </div>
  ...
</div>
```

### 4. Standardize "How to Use" Section

**Changes to Help.tsx lines 348-387:**
- Number headings more prominently (styled badges)
- Add icons to each step for visual interest
- Consistent paragraph styling

### 5. Improve References Section

**Changes to Help.tsx lines 412-573:**
- Add subtle card backgrounds to group related references
- Use consistent citation formatting
- Enhance DOI links with better visual treatment

### 6. Add Visual Accents Throughout

**New patterns to apply:**
- Subtle dividers between major subsections
- Highlighted "tip" or "note" boxes where appropriate
- Consistent icon usage in headings

---

## Detailed File Changes

### `src/pages/Help.tsx`

#### Introduction Section (lines 51-79)
- Wrap key features in a styled list with icons
- Add subtle visual divider

#### Coordinate System Section (lines 162-345)
- Add styled containers around diagrams
- Enhance caption styling
- Standardize all angle tables with consistent headers
- Add subtle backgrounds to distinguish subsections
- Fix bold usage consistency

#### How to Use Section (lines 348-387)
- Add step number badges
- Improve visual hierarchy

#### References Section (lines 412-573)
- Add grouped backgrounds for different reference types
- Consistent citation formatting

#### About Section (lines 576-596)
- Add subtle branding/visual element

### `src/components/help/IEC61217Diagram.tsx`
- No changes needed - diagram is correct

### `src/components/help/PatientAxesDiagram.tsx`
- No changes needed - diagram is correct

---

## Specific Text Formatting Standards

### Bold Usage Rules
| Use Case | Treatment |
|----------|-----------|
| Tool name ("RT Plan Complexity Analyzer") | Bold on first mention |
| Standards ("IEC 61217") | Bold on first mention |
| Axis labels (X, Y, Z) | Use colored font, not just bold |
| Angle values (0°, 90°) | Monospace font (`font-mono`) |
| Direction terms (clockwise, counter-clockwise) | Bold |
| Anatomical terms (anterior, posterior) | Normal text |

### Heading Hierarchy
| Level | Usage | Styling |
|-------|-------|---------|
| Card Title | Section header | `<CardTitle>` with icon |
| H4 | Subsection | `font-semibold text-base` |
| H5/strong | Minor heading | `font-medium` |

---

## Visual Enhancement Details

### Diagram Container Styling
```tsx
<div className="rounded-xl border bg-gradient-to-br from-muted/20 to-muted/40 p-4">
  <IEC61217Diagram />
</div>
```

### Enhanced Caption Style
```tsx
<p className="mt-3 text-sm text-center text-muted-foreground bg-muted/50 rounded-lg p-2">
  Caption text here
</p>
```

### Note/Tip Box Style
```tsx
<div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4 text-sm">
  <strong>Note:</strong> Important information here
</div>
```

### Step Badge Style
```tsx
<span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold mr-2">
  1
</span>
```

---

## Summary of Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/Help.tsx` | Major edit | Standardize typography, add visual accents, enhance diagram containers, consistent formatting |
| `src/components/help/IEC61217Diagram.tsx` | No change | Diagram is correct |
| `src/components/help/PatientAxesDiagram.tsx` | No change | Diagram is correct |

---

## Expected Outcome
- Consistent visual hierarchy throughout the Help page
- More prominent and visually appealing diagrams
- Easier scanning with better typography
- Professional, clinical aesthetic maintained
- Improved readability and information architecture
