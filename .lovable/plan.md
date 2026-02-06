

# CSV Export, Configurable Metrics, Tooltips, and Help Page

## Overview

This plan adds four key enhancements to the RT Plan Complexity Analyzer:
1. Enhanced CSV export for all complexity metrics
2. Configurable metrics selection on the upload page
3. Hover tooltips explaining each metric/acronym
4. A comprehensive Help page with references

---

## Part 1: Metrics Configuration System

### 1.1 Create Metrics Definition Data (`src/lib/metrics-definitions.ts`)

A centralized definition file containing all metric information:

```text
METRIC_DEFINITIONS = {
  MCS: {
    key: 'MCS',
    name: 'Modulation Complexity Score',
    shortDescription: 'Overall plan modulation indicator',
    fullDescription: 'Combines LSV and AAV to quantify overall plan complexity. 
                      Values closer to 1 indicate less modulation (simpler plans), 
                      while values closer to 0 indicate higher modulation.',
    unit: null,
    category: 'primary',
    reference: 'McNiven et al., 2010'
  },
  LSV: {
    key: 'LSV',
    name: 'Leaf Sequence Variability',
    shortDescription: 'Variability in leaf positions',
    fullDescription: 'Measures the variation in MLC leaf positions between 
                      adjacent leaves. Higher values indicate more uniform 
                      apertures; lower values suggest more irregular shapes.',
    unit: null,
    category: 'primary',
    reference: 'Masi et al., 2013'
  },
  AAV: {
    key: 'AAV', 
    name: 'Aperture Area Variability',
    shortDescription: 'Changes in aperture area between control points',
    fullDescription: 'Quantifies the relative change in aperture area 
                      across control points. Higher variability indicates 
                      more dynamic aperture changes during delivery.',
    unit: null,
    category: 'primary',
    reference: 'Masi et al., 2013'
  },
  MFA: {
    key: 'MFA',
    name: 'Mean Field Area',
    shortDescription: 'Average aperture size',
    fullDescription: 'The average area of the MLC aperture across all 
                      control points. Smaller apertures are generally 
                      associated with higher complexity and delivery challenges.',
    unit: 'cm²',
    category: 'primary'
  },
  LT: {
    key: 'LT',
    name: 'Leaf Travel',
    shortDescription: 'Total MLC leaf movement',
    fullDescription: 'Sum of all individual leaf movements throughout 
                      the beam delivery. Higher leaf travel may indicate 
                      increased mechanical wear and potential for MLC errors.',
    unit: 'mm',
    category: 'secondary'
  },
  LTMCS: {
    key: 'LTMCS',
    name: 'Leaf Travel-weighted MCS',
    shortDescription: 'Combined complexity and leaf travel metric',
    fullDescription: 'A composite metric that incorporates both modulation 
                      complexity and total leaf travel to provide a more 
                      comprehensive complexity assessment.',
    unit: null,
    category: 'secondary'
  },
  totalMU: {
    key: 'totalMU',
    name: 'Total Monitor Units',
    shortDescription: 'Total radiation output',
    fullDescription: 'The sum of monitor units across all beams. Higher MU 
                      per fraction may indicate more modulated plans.',
    unit: 'MU',
    category: 'delivery'
  }
}
```

### 1.2 Metrics Configuration Context (`src/contexts/MetricsConfigContext.tsx`)

React context to manage which metrics are visible:

- Store enabled/disabled state for each metric
- Persist to localStorage for session continuity
- Provide toggle functions
- Default: all metrics enabled

### 1.3 Settings Panel Component (`src/components/viewer/MetricsSettings.tsx`)

A collapsible settings panel on the upload page:

- Checkbox list for each metric category (Primary, Secondary, Delivery)
- "Select All" / "Deselect All" buttons
- Visual grouping by category
- Settings persist across sessions via localStorage

---

## Part 2: Enhanced Metrics Panel with Tooltips

### 2.1 Update MetricItem Component

Transform the existing `MetricItem` to include hover tooltips:

- Wrap metric label with `<Tooltip>` from Radix UI
- Display full description on hover
- Add info icon (optional visual cue)
- Tooltip shows: full name, description, unit, and reference if available

### 2.2 Filter Metrics by Configuration

Update `MetricsPanel` to:
- Consume the MetricsConfigContext
- Only render metrics that are enabled
- Maintain layout consistency when some metrics are hidden

---

## Part 3: Enhanced CSV Export

### 3.1 Update `metricsToCSV()` Function

Enhance the CSV export to:
- Accept optional list of enabled metrics
- Export only selected metrics if configuration provided
- Include full metric descriptions as comments in header
- Add export timestamp and tool version

### 3.2 Export Button Enhancement

Update the CSV export button in MetricsPanel:
- Use current metrics configuration
- Include beam-level breakdown for enabled metrics only
- Add filename with date stamp

---

## Part 4: Help Page

### 4.1 Create Help Page (`src/pages/Help.tsx`)

Comprehensive documentation page with sections:

**Introduction**
- What is RT Plan Complexity Analyzer
- Purpose and use cases

**Metrics Reference**
- Table of all UCoMX metrics with full explanations
- Mathematical formulations (simplified)
- Interpretation guidelines

**How to Use**
- Uploading plans
- Navigating control points
- Exporting data
- Configuring metrics

**References & Citations**
- UCoMX v1.1 MATLAB repository (Zenodo link)
- Key publications:
  - McNiven et al. (2010) - MCS definition
  - Masi et al. (2013) - LSV and AAV
  - Complexity metrics review papers
- Link to PMC review: "Complexity metrics for IMRT and VMAT plans"

**About**
- Tool version
- Open source nature
- Browser-based processing explanation

### 4.2 Add Route in App.tsx

```text
<Route path="/help" element={<Help />} />
```

### 4.3 Navigation Link

Add help link to:
- Upload page footer
- Viewer header (small icon button)

---

## Part 5: UI Integration

### 5.1 Upload Page Layout Update (`InteractiveViewer.tsx`)

When no plan is loaded, show:

```text
+------------------------------------------+
|     RT Plan Complexity Analyzer          |
|     [subtitle text]                       |
|                                          |
|  +----------------------------------+    |
|  |     Drag & Drop Zone             |    |
|  +----------------------------------+    |
|                                          |
|            — or —                        |
|                                          |
|      [Load Demo Plan Button]             |
|      [More test plans v]                 |
|                                          |
|  +----------------------------------+    |
|  |  ⚙ Metrics Settings              |    |
|  |    [x] MCS  [x] LSV  [x] AAV    |    |
|  |    [x] MFA  [x] LT   [x] LTMCS  |    |
|  +----------------------------------+    |
|                                          |
|  [Supports VMAT/IMRT • UCoMX v1.1]       |
|  [? Help & Documentation]                 |
+------------------------------------------+
```

### 5.2 Viewer Header Enhancement

Add help icon button to the viewer header area for quick access to documentation.

---

## File Changes Summary

| Action | File |
|--------|------|
| Create | `src/lib/metrics-definitions.ts` |
| Create | `src/contexts/MetricsConfigContext.tsx` |
| Create | `src/components/viewer/MetricsSettings.tsx` |
| Create | `src/pages/Help.tsx` |
| Update | `src/components/viewer/MetricsPanel.tsx` |
| Update | `src/components/viewer/InteractiveViewer.tsx` |
| Update | `src/lib/dicom/metrics.ts` |
| Update | `src/App.tsx` |

---

## Technical Notes

**Tooltip Implementation**
- Uses existing `@radix-ui/react-tooltip` (already in dependencies)
- TooltipProvider already wraps App in `App.tsx`
- Consistent styling with existing UI components

**Configuration Persistence**
- Uses `localStorage` with key `rtplan-metrics-config`
- Parsed on app load, saved on change
- Graceful fallback to defaults if storage unavailable

**Accessibility**
- Tooltips are keyboard-accessible
- Help page uses proper heading hierarchy
- Settings checkboxes have proper labels

---

## References to Include in Help Page

Include the doi clickable link to the reference or just the link if doi is not available 

1. **UCoMX v1.1 MATLAB Implementation**
   - Zenodo repository (original user upload)
   - Based on University of Padova research

2. **Key Publications**
   - McNiven AL, et al. "A new metric for assessing IMRT modulation complexity and plan deliverability." Med Phys. 2010
   - Masi L, et al. "Impact of plan parameters on the dosimetric accuracy of VMAT." Med Phys. 2013
   - PMC Review: "Complexity metrics for IMRT and VMAT plans: a review of current literature and applications" (PMC6774599)

3. **Technical Resources**
   - DICOM RT Standard documentation
   - dicom-parser library

