# RTplan Complexity Lens - Enhancement Plan

**Date**: February 8, 2026  
**Scope**: Website UX/UI, Analysis Modes, Metrics Organization, Visualization Fixes

---

## Issue 1: Dose Rate vs Gantry Angle Chart Discontinuity

### Problem
- **Location**: `src/components/viewer/AngularDistributionChart.tsx` (line 121+)
- **Issue**: Continuous line connects 360° → 0° due to periodicity, creating visual artifact
- **Current**: Line goes from top-right (360°) to bottom-left (0°) with straight connection
- **Expected**: Should show as separate rotations with visual distinction

### Root Cause
- Gantry angles are plotted as raw values (0-360)
- Recharts LineChart with `connectNulls` or default behavior connects all points
- Multi-rotation arcs (e.g., 2x360° = 720°) are not supported in current implementation

### Solution: Color-Coded Rotation Periods

**Strategy**: Detect rotation periods and color-code them

```
Rotation 1 (0-360°):    Color A (e.g., Primary Blue)
Rotation 2 (360-720°):  Color B (e.g., Secondary Orange)
Rotation 3 (720-1080°): Color C (e.g., Tertiary Green)
```

#### Implementation Steps:

1. **Modify `angular-binning.ts`** - Add rotation detection
   ```typescript
   export function getRotationPeriods(segments: ControlPointSegment[]): Array<{
     rotationNumber: number;
     startIndex: number;
     endIndex: number;
     totalAngle: number;
     doseRate: number[];
   }>
   ```

2. **Update chart data** - Add rotation metadata
   ```typescript
   interface DoseRateChartData {
     angle: number;            // 0-360° for this rotation
     absoluteAngle: number;    // 0-720° total (cumulative)
     doseRate: number;
     rotation: number;         // 1st, 2nd, 3rd rotation
     direction: 'CW' | 'CCW';  // Clockwise or counter-clockwise
   }
   ```

3. **Update AngularDistributionChart component**
   - Split LineChart data into multiple Line components per rotation
   - Each with different strokeDasharray and color
   - Add legend showing rotation periods
   - Add vertical reference lines between rotations

4. **Add visual indicators**
   - Rotation badges: "1st Rotation", "2nd Rotation", etc.
   - Direction indicators: "↻ CW" or "↺ CCW"
   - Angle range labels: "0-360°", "360-720°", etc.

#### Expected Output:
- **Rotation 1**: Solid blue line (0-360°)
- **Rotation 2**: Dashed orange line (360-720°)
- **Rotation 3**: Dotted green line (720-1080°)
- **Gap**: Clear visual break between rotations (no connecting line)

**Effort**: 2-3 hours | **Priority**: High | **Benefit**: Huge UX improvement

---

## Issue 2: Metrics Ordering

### Current Order (by category in metrics-definitions.ts)
- Primary: MCS, LSV, AAV, MFA, LT, LTMCS
- Secondary: MFI, MFD, MVDI
- Accuracy: LG, MAD, EFS, Jaccard, DSC
- Deliverability: MUCA, LTMU, GT, GS, LS, LSV_del, TG
- Delivery: MU, Total MU, Beam Dose, Avg Dose Rate, Avg MLC Speed, Collimator Angle

### Problems
1. **Not Clinically Relevant**: Order doesn't follow radiation therapy workflow
2. **Not By Importance**: MCS (most important) is first by accident
3. **Mixed Levels**: Per-beam and per-plan metrics scattered

### Proposed New Organization

#### Level 1: Plan-Level Overview (What to present first to users)
```
1. MCS        [Modulation Complexity Score] — PRIMARY INDICATOR
2. LSV        [Leaf Sequence Variability] — SECONDARY COMPLEXITY
3. AAV        [Aperture Area Variability] — SHAPE COMPLEXITY
4. MFA        [Mean Field Area] — AVERAGE FIELD SIZE
```
**Rationale**: These 4 metrics give complete plan complexity picture in 30 seconds

#### Level 2: Beam-Level Complexity
```
5. MFI        [Modulation Fluence Intensity]
6. LT         [Leaf Travel]
7. LTMCS      [Leaf Travel normalized by MCS]
8. MFD        [Modulation Fluence Deviation]
```
**Rationale**: Drill down into individual beam characteristics

#### Level 3: Accuracy Concerns (QA-relevant)
```
9. MAD        [Mean Absolute Deviation] — MLC positioning
10. LG        [Leaf Gap] — Tongue-and-groove effects
11. EFS       [Equivalent Field Size]
12. TG        [Tongue-and-Groove Index]
```
**Rationale**: What QA team should watch for

#### Level 4: Delivery Feasibility (Machine-specific)
```
13. MUCA      [MU per Control Arc] — Modulation density
14. LTMU      [Leaf Travel per MU] — Activity normalization
15. LS        [Leaf Speed] — MLC speed requirements
16. mDRV      [Mean Dose Rate Variation] — Delivery smoothness
```
**Rationale**: Can the linac deliver this plan?

#### Level 5: Delivery Parameters (Informational)
```
17. GT        [Gantry Travel] — Total rotation needed
18. GS        [Gantry Speed] — Rotation speed variation
19. avgDoseRate — Average delivered dose rate
20. avgMLCSpeed — Average leaf movement speed
```
**Rationale**: Context/reference information

#### Level 6: Spatial Metrics (Research/Comparison)
```
21. Jaccard Coefficient
22. Dice Similarity Coefficient
23. MVDI     [MLC Velocity Deviation Index]
```
**Rationale**: For advanced users/research

**Effort**: 1 hour | **Impact**: Better UX, more intuitive workflow

---

## Issue 3: Website Layout & Analysis Mode Improvements

### Current Analysis Modes (in Help)
1. **Single Plan** - One file analysis
2. **Batch Analysis** - Multiple files
3. **Plan Comparison** - Two plans side-by-side
4. **Cohort Analysis** - Population statistics

### Issues
1. **Navigation not obvious** - Users don't know which mode to use
2. **No quick-start guide** - Cards lack actionable guidance
3. **No visual hierarchy** - All modes appear equally important
4. **Missing entry point** - No "recommended workflow" path

### Proposed Website Improvements

#### A. Homepage Restructure

**Current**: Upload zone + info cards  
**Proposed**: Add workflow selection before upload

```
┌─────────────────────────────────────────────────────────┐
│           RTplan Complexity Lens v1.0                    │
│  Analyze DICOM RT Plans for Delivery Complexity          │
└─────────────────────────────────────────────────────────┘

┌─ STEP 1: Choose Your Analysis Mode ───────────────────────┐
│                                                            │
│  ┌─────────────────┐  ┌──────────────────┐               │
│  │ 📋 Single Plan  │  │ 📦 Batch (5+ →)  │               │
│  │  Analyze one    │  │  Analyze many    │               │
│  │  file in detail │  │  files quickly   │               │
│  └─────────────────┘  └──────────────────┘               │
│                                                            │
│  ┌──────────────────┐  ┌──────────────────┐              │
│  │ ⚖️  Comparison   │  │ 🧬 Cohort        │              │
│  │  Compare 2 plans│  │  Population stats│              │
│  └──────────────────┘  └──────────────────┘              │
│                                                            │
│  💡 TIP: Start with Single Plan if new to RTp-lens      │
└────────────────────────────────────────────────────────────┘

┌─ STEP 2: Upload Your Files ────────────────────────────────┐
│                                                             │
│        ⬆️  Drag DICOM RT Plans here                         │
│         (or click to browse)                               │
│                                                             │
│    ✓ DICOM-RT Plan files (.dcm)                            │
│    ✓ Multiple files for Batch/Cohort                       │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

#### B. Mode Selection Cards - Add Descriptions

**Current Card**: Just title + features  
**Proposed**: Add recommended use cases

```
┌──────────────────────────────────────────────────────────┐
│ 📋 Single Plan Analysis                                  │
│ ─────────────────────────────────────────────────────────│
│                                                          │
│ ✓ Detailed complexity metrics for one plan              │
│ ✓ Interactive control point visualization              │
│ ✓ Delivery timeline and dose rate profiles             │
│ ✓ MLC aperture shape analysis                           │
│                                                          │
│ USE WHEN:                                               │
│ • Comparing against institutional baseline              │
│ • Intensive QA and validation                           │
│ • Teaching/learning the metrics                         │
│ • Detailed reporting for one case                       │
│                                                          │
│ ⏱️  ~2-3 minutes per plan                                │
│ [Open Single Plan Analysis →]                           │
└──────────────────────────────────────────────────────────┘
```

#### C. Quick Reference Guide - Add to Index

**Location**: Bottom of homepage or new section

```
┌─ Which Mode Should I Use? ────────────────────────────────┐
│                                                           │
│ SINGLE PLAN          → Want all the details             │
│ BATCH ANALYSIS       → Want to screen many plans        │
│ PLAN COMPARISON      → Want to compare 2 plans          │
│ COHORT ANALYSIS      → Want population insights         │
│                                                           │
│💡 WORKFLOW TIP:                                          │
│   Batch → Find outliers                                 │
│              ↓                                            │
│   Single Plan → Dive deep on interesting cases          │
│              ↓                                            │
│   Comparison → A/B test plan variations                 │
│              ↓                                            │
│   Cohort → Understand population trends                │
│                                                           │
└─────────────────────────────────────────────────────────────┘
```

**Effort**: 2-3 hours | **Impact**: Better onboarding, clearer UX

---

## Issue 4: Analysis Mode Content & Presentation

### Single Plan Mode Improvements

**Current Top Section**:
- Beam selector tabs
- Metrics summary boxes
- No clear priority

**Proposed Reorganization**:
```
┌─ Plan Summary (Quick View) ─────────────────────────────┐
│ Plan Name: VMAT_Head_001                               │
│ Technique: VMAT (1x360° CW + 1x360° CCW)              │
│ Beams: 2 | Total MU: 542 | Est. Time: 3m 24s          │
│                                                       │
│ 🔴 4 Metrics of Concern (threshold exceeded):         │
│   • LSV: 0.67 (HIGH)                                  │
│   • MAD: 8.2mm (CRITICAL)                             │
│   • LS: 42 mm/s (WARNING)                             │
└────────────────────────────────────────────────────────┘

┌─ Beam Analysis ─────────────────────────────────────────┐
│ [Beam 1]  [Beam 2]  [+Add Comparison]                  │
│                                                       │
│ Beam 1: Left Lateral Arc                              │
│ • MCS: 0.456 | LSV: 0.68 | AAV: 0.42                 │
│ • Modulation: VMAT (1x360° CW)                        │
│                                                       │
│ ┌─ Metrics (Detailed) ──────────────────────────────┐ │
│ │ ✓ Complexity Metrics                              │ │
│ │ ✓ Accuracy Metrics                                │ │
│ │ ✓ Deliverability Metrics                          │ │
│ │ ✓ Delivery Parameters                             │ │
│ └──────────────────────────────────────────────────┘ │
│                                                       │
│ ┌─ Visualizations ──────────────────────────────────┐ │
│ │ [Control Point Navigation]  [MU Distribution]     │ │
│ │ [Delivery Timeline]         [Dose Rate vs Angle]  │ │
│ │ [Gantry Profile]            [MLC Speed Profile]   │ │
│ └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘

┌─ Summary Report ────────────────────────────────────────┐
│ [Export CSV]  [Export PDF Report]  [Copy Metrics]     │
└────────────────────────────────────────────────────────┘
```

### Batch Mode Improvements

**Add Report Section**:
```
┌─ Batch Analysis Results ──────────────────────────────────┐
│ Analyzed: 12 plans | Status: ✓ Complete                  │
│                                                          │
│ ⚠️  OUTLIERS & CONCERNS:                                 │
│ • 3 plans exceed LSV warning threshold                  │
│ • 1 plan exceeds MAD critical threshold                 │
│ • 2 plans have unusual gantry profiles                  │
│                                                          │
│ [Export Outliers Report]  [Detailed Statistics]         │
└──────────────────────────────────────────────────────────┘
```

### Cohort Mode Improvements

**Add Clustering Suggestions**:
```
┌─ Recommended Clustering Dimensions ──────────────────────┐
│ Based on your data:                                     │
│                                                         │
│ 🎯 Technique (VMAT vs IMRT)                            │
│    → Shows largest metric variation (↓ 40%)           │
│                                                         │
│ 📊 Complexity (MCS-based)                              │
│    → Groups clinically relevant patterns              │
│                                                         │
│ 🔧 Delivery Feasibility (LS + MUCA)                    │
│    → Best predictor of delivery accuracy              │
│                                                         │
│ [Use Recommended] or [Manual Clustering]               │
└────────────────────────────────────────────────────────────┘
```

**Effort**: 3-4 hours | **Impact**: Better insights, clearer workflows

---

## Issue 5: Metrics Display & UI Polish

### Current Display Issues
1. Metrics shown as raw numbers without context
2. No visual severity indicator (green ✓ / yellow ⚠️ / red ✗)
3. No explanation for threshold exceedances
4. No "quick fix" suggestions

### Proposed Enhancements

#### A. Metric Cards with Status Indicators
```
┌──────────────────────────────────────────────────────────┐
│ 🔴 MCS: 0.456                         [ⓘ What is this?] │
│                                                          │
│ Status: WARN   (Threshold: 0.4)                        │
│                                                          │
│ This plan has higher complexity than 72% of institution│
│ benchmarks. Recommend additional QA emphasis on:       │
│ • Control Point validation                             │
│ • MLC positioning accuracy                             │
│                                                          │
│ Compare: Min: 0.210  |  Avg: 0.328  |  Max: 0.689    │
│          ↑ Low      |  ↑ This Plan │  ↑ High          │
│                                                          │
│ 📈 More Complex ←──────────●───────→ 📉 Less Complex  │
└──────────────────────────────────────────────────────────┘
```

#### B. Threshold Explanation Tooltips
```
When user hovers on threshold value:

┌─────────────────────────────────────────────┐
│ Why is 0.4 the threshold?                  │
│                                             │
│ • Based on UCoMX v1.1 benchmark           │
│ • Recommended for most linacs              │
│ • Customizable in [Machine Presets]       │
│                                             │
│ Your institution uses: 0.4 (Conservative) │
└─────────────────────────────────────────────┘
```

**Effort**: 2 hours | **Impact**: Users understand metrics better

---

## Implementation Priority & Timeline

| Phase | Tasks | Effort | Impact | Timeline |
|-------|-------|--------|--------|----------|
| **P0** | Fix gantry angle chart (rotation coloring) | 3h | **Critical** | Week 1 |
| **P0** | Reorder metrics (most usable first) | 1h | **High** | Week 1 |
| **P1** | Website homepage: mode selection | 2h | **High** | Week 2 |
| **P1** | Add outlier detection to Batch mode | 2h | **High** | Week 2 |
| **P2** | Metric cards with status indicators | 2h | **Medium** | Week 3 |
| **P2** | Add cohort clustering suggestions | 2h | **Medium** | Week 3 |
| **P3** | PDF export reports | 3h | **Low** | Future |

**Total Estimated**: 17-18 hours  
**Recommended Sprint**: 2-3 weeks

---

## Technical Implementation Notes

### Gantry Angle Fix - Key Files to Modify
1. `src/lib/dicom/angular-binning.ts` - Add rotation detection
2. `src/components/viewer/AngularDistributionChart.tsx` - Update chart rendering
3. `src/lib/dicom/types.ts` - Add ControlPointSegment.rotation field

### Metrics Reordering - Key Files to Modify
1. `src/lib/metrics-definitions.ts` - Reorder METRIC_DEFINITIONS
2. `src/lib/metrics-categories.ts` - Update category definitions
3. `src/pages/MetricsReference.tsx` - Reflect new order
4. All dashboard display components - Use new order for presentation

### Website Improvements - Key Files to Create/Modify
1. Create `src/components/home/ModeSelector.tsx` - New mode selection
2. Modify `src/pages/Index.tsx` - Add to homepage
3. Create `src/components/home/WorkflowGuide.tsx` - Workflow reference
4. Create `src/components/metrics/StatusIndicator.tsx` - Visual indicators

---

## Success Metrics

✓ Users can identify plan complexity at a glance  
✓ Chart discontinuity issue resolved with color coding  
✓ Metrics ordered by clinical relevance  
✓ Homepage onboarding improved  
✓ Batch mode surfaces outliers automatically  
✓ Users spend <1min understanding which mode to use  

---

## Questions for User

1. **Gantry Angle Chart**: Do you prefer solid/dashed/dotted line styles, or should we use gradient colors for rotation periods?

2. **Metrics Order**: Are there any metrics you'd prioritize differently based on your clinical experience?

3. **Website**: Should mode selection be mandatory (modal) or optional (card-based on homepage)?

4. **Reports**: PDF vs CSV vs both? Any specific report format needed for your institution?
