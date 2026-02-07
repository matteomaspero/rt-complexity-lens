

# Plan: Rebrand to RTplan Complexity Lens (RTp-lens)

## Summary

Rename the application from "RT Plan Complexity Analyzer" to **RTplan Complexity Lens** (short: **RTp-lens**), remove the metric abbreviation line from the home page, add a logo placeholder, and ensure consistent naming throughout the codebase.

---

## Name Recommendation

Based on the project's published URL (`rt-complexity-lens.lovable.app`) and the user's suggestions:

| Form | Usage |
|------|-------|
| **RTplan Complexity Lens** | Full name in documentation and formal contexts |
| **RTp-lens** | Short name for UI headers, badges, and informal references |

The name "Lens" evokes the concept of looking into/analyzing plan complexity, which fits the tool's purpose well.

---

## Changes Overview

### 1. Remove Metric Abbreviation Line

Remove this line from the home page (InteractiveViewer.tsx line 219):
```
MCS • PM • LSV • AAV • Delivery Timing
```

### 2. Add Logo Placeholder

Create a simple SVG logo component that can be used throughout the app:
- Stylized "RTP" letters with a lens/magnifying element
- Works in both light and dark themes
- Can be replaced with actual logo later

### 3. Update App Name Everywhere

| File | Location | Old | New |
|------|----------|-----|-----|
| `index.html` | `<title>` | RT Plan Complexity Analyzer | RTplan Complexity Lens |
| `index.html` | `og:title` | RT Plan Complexity Analyzer | RTplan Complexity Lens |
| `index.html` | `description` | Update description text | Include "RTp-lens" |
| `InteractiveViewer.tsx` | Home page title | RT Plan Complexity Analyzer | RTp-lens |
| `Help.tsx` | Page subtitle | RT Plan Complexity Analyzer Guide | RTp-lens Documentation |
| `Help.tsx` | Introduction text | RT Plan Complexity Analyzer | RTplan Complexity Lens |
| `Help.tsx` | About section | RT Plan Complexity Analyzer | RTplan Complexity Lens |
| `src/lib/dicom/metrics.ts` | CSV export header | RT Plan Complexity Analyzer | RTp-lens |
| `python/README.md` | Title and references | RT Plan Complexity Analyzer | RTplan Complexity Lens / RTp-lens |
| `python/pyproject.toml` | Description | RT Plan Complexity Analyzer | RTplan Complexity Lens |
| `README.md` | Project title | RT Plan Complexity Analyzer | RTplan Complexity Lens |

---

## Technical Details

### New Logo Component

Create `src/components/ui/logo.tsx`:

```text
RTp-lens Logo Component
├── Props: size (sm, md, lg), showText (boolean)
├── SVG with stylized "RT" and lens icon
├── Supports theme colors (uses currentColor)
└── Export: Logo, LogoIcon (icon only)
```

### Home Page Updates

```text
InteractiveViewer.tsx Changes
├── Line 111-112: Replace h1 text with RTp-lens + Logo
├── Line 217-220: Remove the metric abbreviation paragraph
└── Add Logo import
```

### Updated Home Page Header Structure

```text
Before:
  h1: "RT Plan Complexity Analyzer"
  p: "Upload a DICOM-RT Plan..."
  ...
  p: "Supports VMAT and IMRT plans..."
  p: "MCS • PM • LSV • AAV • Delivery Timing"  <-- Remove this

After:
  [Logo] + h1: "RTPlens"
  p: "Upload a DICOM-RT Plan..."
  ...
  p: "Supports VMAT and IMRT plans • Browser-based processing"
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/ui/logo.tsx` | **New file** - Logo component |
| `index.html` | Update title, og:title, description |
| `src/components/viewer/InteractiveViewer.tsx` | Replace name, add logo, remove metric line |
| `src/pages/Help.tsx` | Update name references (3 locations) |
| `src/lib/dicom/metrics.ts` | Update CSV export header |
| `python/README.md` | Update name references |
| `python/pyproject.toml` | Update description |
| `README.md` | Update project title and references |

**Total: 7 files modified + 1 new file**

---

## Logo Design

Simple SVG placeholder that can be easily replaced:

```text
Visual concept:
┌─────────────────┐
│  RT   ◎        │  
│      Lens      │
└─────────────────┘

- "RT" in bold/monospace style
- Circular lens icon (◎) representing analysis/focus
- Clean, minimal design
- Uses CSS currentColor for theme compatibility
```

The logo will be implemented as a React component with size variants, making it easy to use in the header, footer, and other locations consistently.

