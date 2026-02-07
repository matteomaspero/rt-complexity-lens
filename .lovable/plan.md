

# Plan: Add Python Toolkit Documentation

## Summary

Add information about the Python offline toolkit to the web application:
1. Add a new "Python Toolkit" section to the Help page with a brief overview
2. Create a dedicated `/python-docs` page with full package documentation
3. Add a GitHub/Python package button to the home page

---

## Changes Overview

### 1. Update Help Page (`src/pages/Help.tsx`)

Add a new "Python Toolkit" section between "Export Format" and "References":

- Brief introduction explaining the offline Python package availability
- Key features list (offline analysis, identical metrics, visualization)
- Quick start code snippet
- Link to the dedicated Python documentation page
- Link to GitHub repository

### 2. Update Table of Contents (`src/components/help/TableOfContents.tsx`)

Add a new entry for the Python Toolkit section:
- id: `python-toolkit`
- label: `Python Toolkit`
- icon: Terminal (from lucide-react)

### 3. Create Python Documentation Page (`src/pages/PythonDocs.tsx`)

A dedicated page with comprehensive documentation including:
- Installation instructions (pip, development mode)
- Quick start examples (single plan, batch, cohort)
- API reference (core functions, statistics, clustering, visualization)
- Code snippets with syntax highlighting
- Links to GitHub and algorithm documentation

### 4. Update Home Page (`src/components/viewer/InteractiveViewer.tsx`)

Add a GitHub/Python button below the existing mode selection buttons:
- Button linking to GitHub repository
- Brief text explaining Python offline availability

### 5. Update App Router (`src/App.tsx`)

Add route for the new Python documentation page:
- `/python-docs` -> `PythonDocs` component

---

## File Changes

| File | Change |
|------|--------|
| `src/pages/Help.tsx` | Add Python Toolkit section with overview and links |
| `src/components/help/TableOfContents.tsx` | Add Python Toolkit to navigation sections |
| `src/pages/PythonDocs.tsx` | **New file** - Full Python package documentation page |
| `src/components/viewer/InteractiveViewer.tsx` | Add GitHub/Python toolkit button on home |
| `src/App.tsx` | Add route for `/python-docs` |

---

## Technical Details

### Help Page Python Section Content

```text
Python Toolkit (New Section)
├── Introduction paragraph
├── Key Features list
│   ├── Identical metric calculations
│   ├── Offline workstation analysis
│   ├── Batch and cohort modes
│   └── Matplotlib visualizations
├── Quick Start code block
├── Button: "View Full Documentation" -> /python-docs
└── Button: "GitHub Repository" -> external link
```

### Python Documentation Page Structure

```text
/python-docs
├── Header with back navigation
├── Installation
│   ├── pip install
│   └── Development mode
├── Quick Start Examples
│   ├── Single Plan Analysis
│   ├── Batch Analysis
│   └── Cohort Analysis
├── API Reference
│   ├── Core Functions
│   ├── Statistics Functions
│   ├── Clustering Functions
│   └── Visualization Functions
├── Machine Parameters Configuration
├── Export Formats
└── Cross-Validation with Web App
```

### Home Page Button Addition

Add after the mode selection grid:
- GitHub icon button with "Python Toolkit" label
- Links to GitHub repository
- Tooltip explaining offline analysis capability

### Icon Selection

- Python Toolkit section: `Terminal` icon (represents CLI/scripting)
- GitHub button: `Github` icon from lucide-react

