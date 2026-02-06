

# RT Plan Complexity Analyzer
## A Browser-Based DICOM-RT Plan Analysis Tool for Radiation Oncology

---

### Overview

A minimal, functional web application that enables radiation oncology physicists and planners to upload DICOM-RT PLAN files and interactively visualize delivery complexity metrics directly in the browser. The tool will prioritize the **Interactive Single-Plan Viewer** as the centerpiece, with clean data visualization and control-point-by-control-point exploration.

---

### Core Architecture

**Fully Browser-Based Processing**
- All DICOM parsing and metric calculations happen client-side using JavaScript/TypeScript
- No backend server required - works offline after initial load
- Uses `dicomParser` library for DICOM file parsing
- Custom TypeScript implementation of UCoMX complexity metrics

**Session-Only Storage**
- Plans are stored in browser memory during the session
- No user accounts or persistent cloud storage
- Export capabilities for saving results

---

### Phase 1: Interactive Single-Plan Viewer (Priority)

The heart of the application — a deep-dive analysis screen for individual plans.

**1.1 DICOM-RT Plan Upload**
- Drag-and-drop zone for .dcm files
- File validation and parsing status indicator
- Automatic extraction of plan metadata (Patient ID anonymized, Plan Name, Technique)

**1.2 Control Point Navigator**
- Interactive timeline/scrubber showing all control points for each beam/arc
- Beam selector for multi-beam plans
- Current control point indicator with jump-to functionality
- Play/pause button for automatic progression through control points

**1.3 Synchronized Visualizations**
Real-time updates as the user navigates control points:

- **Gantry Angle Display**: Top-down schematic showing current gantry position with rotation animation
- **MLC Aperture Viewer**: Dynamic 2D visualization of leaf bank positions (Bank A & B), showing the aperture shape at each control point
- **Cumulative MU Chart**: Line graph tracking Monitor Units over the arc/beam progression
- **Gantry Speed Plot**: Visualization of angular velocity (degrees/sec) across control points

**1.4 Complexity Metrics Panel**
Fixed sidebar displaying calculated metrics (aligned with UCoMX nomenclature):

- **MCS (Modulation Complexity Score)**: Overall plan modulation indicator
- **LSV (Leaf Sequence Variability)**: Variability in leaf positions
- **AAV (Aperture Area Variability)**: Changes in aperture area
- **MFA (Mean Field Area)**: Average aperture size
- **LT (Leaf Travel)**: Total leaf movement distance
- **LTMCS**: Combined Leaf Travel + MCS metric
- **MU/Gy**: Monitor units per Gray
- Per-control-point metrics (when applicable)

---

### Phase 2: Plan Library Dashboard

**2.1 Session Plan List**
- Table view of all uploaded plans in current session
- Columns: Plan Name, Patient ID (anonymized), Technique (VMAT/IMRT), Upload Time, Status
- Quick-view complexity score badges
- Click to open Interactive Viewer

**2.2 Plan Management**
- Remove plans from session
- Re-analyze with different parameters
- Quick comparison view (side-by-side metrics for 2 plans)

---

### Phase 3: Batch Analysis & Reporting

**3.1 Multi-Plan Selection**
- Checkbox selection from plan library
- "Analyze Batch" action button

**3.2 Batch Summary Dashboard**
- Comparative table of key metrics across all selected plans
- Sortable columns for identifying outliers
- Visual indicators (color coding for complexity ranges)

**3.3 Export Functionality**
- **CSV Export**: Full metric data for all plans
- **PDF Report**: Formatted summary with charts (single plan or batch)
- Copy-to-clipboard for quick data transfer

---

### Design Principles

**Minimal & Functional**
- Clean white/light gray interface with purposeful accent colors
- Clear typography optimized for data readability
- No decorative elements — every pixel serves a purpose
- Responsive but desktop-first (primary use case is workstation)

**Data-Forward Visualization**
- Recharts library for clean, interactive charts
- High-contrast colors for MLC visualization (distinct Bank A/B colors)
- Tooltips with precise values on hover
- Accessible color palette

---

### Technical Implementation Notes

**DICOM Parsing**
- `dicomParser` library for reading DICOM byte streams
- Extract BeamSequence, ControlPointSequence, MLC positions, gantry angles
- Handle both VMAT (continuous arcs) and IMRT (step-and-shoot) plans

**Metric Calculations**
Ported from UCoMX MATLAB logic to TypeScript:
- LSV: Calculated from leaf position variability between adjacent control points
- AAV: Derived from aperture area changes
- MCS: Product of LSV and AAV per control point, weighted by MU
- Additional metrics following UCoMX v1.1 formulations

**State Management**
- React state for current control point index
- Synchronized updates across all visualization components
- Smooth animations for control point transitions

---

### What's NOT Included (Future Enhancements)

- Backend API integration (can be added later for institutional deployments)
- Persistent database storage with user accounts
- Helical tomotherapy support (VMAT/IMRT only for v1)
- 3D dose visualization
- Direct TPS integration

---

### Success Criteria

1. ✅ Upload a DICOM-RT PLAN file and see it parsed within 2 seconds
2. ✅ Navigate through control points and see MLC apertures update in real-time
3. ✅ View all core UCoMX complexity metrics calculated correctly
4. ✅ Export analysis results as CSV
5. ✅ Clean, functional UI that clinical staff find intuitive

