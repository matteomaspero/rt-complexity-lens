

# Plan: Update Logo Style and OG Image

## Summary

Redesign the logo SVG to match the reference image style - a magnifying glass with a network/complexity pattern inside the lens, and update the text to show "RTp" with a subscript-style small "p". Also generate a new OG image matching this design.

---

## Reference Image Analysis

The uploaded image shows:
- A magnifying glass icon with a network graph pattern inside
- Circular outer rings (silver/metallic style)
- Dark blue gradient background
- Text layout: "COMPLEXITY" / "LENS" (cyan) / "RT" (white)
- The network pattern has nodes connected by lines

---

## Changes Overview

### 1. Update Logo SVG (`src/components/ui/logo.tsx`)

Redesign the `LogoIcon` component to match the reference style:
- **Magnifying glass**: Circle with a handle extending down-right
- **Network pattern inside**: Nodes (small circles) connected by lines
- **Outer ring**: Single or double circular border
- Uses `currentColor` for theme compatibility

### 2. Update Logo Text

Change the text display to "RTp-lens" with proper styling:
- "RT" in bold
- "p" as a smaller subscript-style character
- "-lens" in regular weight

### 3. Generate New OG Image (`public/og-image.png`)

Create a new 1200x630 OG image featuring:
- Dark blue gradient background (matching reference)
- Centered magnifying glass with network pattern
- "COMPLEXITY" text above
- "LENS" in cyan, "RTp" in white below
- Subtle outer ring decoration

---

## Technical Details

### New Logo SVG Structure

```text
LogoIcon SVG (viewBox 0 0 32 32)
├── Outer ring circle (stroke only)
├── Magnifying glass
│   ├── Lens circle (filled semi-transparent)
│   ├── Handle (angled line)
│   └── Network pattern inside lens
│       ├── Center node
│       ├── Surrounding nodes (6-8 small circles)
│       └── Connecting lines between nodes
└── Theme-compatible colors (currentColor)
```

### Network Pattern Design

A simplified network graph that fits within the lens:
- 1 center node
- 6 outer nodes arranged in a hexagonal pattern
- Lines connecting center to outer nodes
- Some lines connecting adjacent outer nodes

### Size Configurations

| Size | Icon Dimension | Text Class |
|------|----------------|------------|
| sm | 20px | text-sm |
| md | 28px | text-lg |
| lg | 40px | text-2xl |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/ui/logo.tsx` | Redesign SVG with magnifying glass + network pattern |
| `public/og-image.png` | Generate new image matching the design style |

---

## Color Scheme (from reference)

- **Background**: Dark navy gradient (`#1a2744` to `#0f1724`)
- **Primary/Cyan accent**: `#3b9fd4` / `#5bb5e0`
- **Text white**: `#ffffff`
- **Metallic ring**: Linear gradient silver/gray

For the SVG component, we'll use `currentColor` and `text-primary` classes to maintain theme compatibility.

