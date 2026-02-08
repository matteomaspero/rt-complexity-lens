# Documentation Structure Analysis & Recommendations

## Current State

### Help Page (`/help`) - 1,024 lines
**Sections:**
1. ✅ **Introduction** (~50 lines) - Overview and key features
2. ✅ **Analysis Modes** (~112 lines) - 4 modes with detailed features + clustering table
3. ✅ **Machine Presets** (~120 lines) - Linac configurations, thresholds, alerts
4. 🔴 **Metrics Reference** (~90 lines + tables) - 30+ metrics with formulas, descriptions, references
5. 🔴 **Coordinate System** (~240 lines) - IEC 61217, extensive diagrams, technical details
6. ✅ **How to Use** (~75 lines) - 5-step quick start guide
7. ✅ **Export Format** (~35 lines) - CSV export explanation
8. 🟡 **Python Toolkit** (~75 lines) - Brief overview, links to full docs
9. ✅ **References** - Research citations
10. ✅ **About** - Version, privacy, disclaimer

### Python Docs Page (`/python-docs`) - 408 lines
**Sections:**
1. Overview
2. Installation
3. Quick Start (single, batch, cohort)
4. API Reference
5. Machine Parameters
6. Export
7. Cross-validation

## Issues Identified

### 1. **Help Page is Too Long** 🔴
- **1,024 lines** is overwhelming for users seeking quick help
- Scrolling through to find specific info is difficult
- Mix of beginner content (How to Use) and advanced technical content (Coordinate System)

### 2. **Metrics Reference Should Be Separate** 🔴
- Currently embedded in Help, but it's a **reference document**
- Users don't need this when learning "how to use" the tool
- Better as searchable/filterable standalone page
- Would benefit from:
  - Search/filter by category
  - Sort by name/category
  - Expandable metric cards
  - Link to from Help rather than inline

### 3. **Coordinate System is Very Technical** 🔴
- **240 lines** of IEC 61217 technical content
- Essential for physics/dosimetry experts, but not for typical users
- Should be optional/separate reference
- Can be linked from Help

### 4. **Python Toolkit Duplication** 🟡
- Brief overview in Help (75 lines)
- Full docs in separate page (408 lines)
- Good separation, but Help section could be condensed to just install + link

### 5. **No Quick Navigation** 🟡
- To get from Help → Python Docs requires scroll to bottom or back button
- No clear "See Also" or related docs links

## Recommended Structure

### Option A: Minimal Split (Quick Win)
Keep existing but reorganize:

```
/help - Main Help (Target: ~500 lines)
├─ Introduction
├─ Analysis Modes
├─ Machine Presets
├─ How to Use (Quick Start)
├─ Export Format
└─ See Also → Metrics, Coordinates, Python

/metrics - Metrics Reference (NEW - ~300 lines)
├─ Overview
├─ Category filters
└─ All 30+ metrics with formulas

/coordinate-system - Technical Reference (NEW - ~250 lines)
├─ IEC 61217 overview
├─ Diagrams
└─ Machine variations

/python-docs - Python Toolkit (EXISTS - 408 lines)
└─ (keep as is)
```

**Pros:**
- Separates learning (Help) from reference (Metrics/Coords)
- Reduces Help page by ~50%
- Keeps beginner-friendly content front and center

**Cons:**
- Need to create 2 new routes/pages
- Update navigation/links

---

### Option B: Full Restructure (Better UX)
Split into focused pages:

```
/help - Getting Started
├─ What is RTp-lens?
├─ Quick Start Guide
├─ Analysis Modes Overview
└─ See Also links

/guide - User Guide (NEW)
├─ Analysis Modes (detailed)
├─ Machine Presets
├─ Export & Workflows
└─ Best Practices

/metrics - Metrics Reference
├─ Searchable metric table
└─ Detailed metric cards

/reference - Technical Reference (NEW)
├─ Coordinate System (IEC 61217)
├─ DICOM RT Plan Structure
└─ Algorithm Details

/python-docs - Python Toolkit
└─ (keep as is)

/about - About & Citations
├─ Version info
├─ Privacy
└─ References & Citations
```

**Pros:**
- Clear separation of concerns
- Progressive disclosure (basic → advanced)
- Better for SEO and bookmarking
- Easier to maintain

**Cons:**
- More routes to manage
- More navigation complexity
- Larger refactor effort

---

### Option C: Hybrid Approach (Recommended) ⭐
Keep Help light, split heavy technical content:

```
/help - Help & Quick Start (~400 lines)
├─ Introduction
├─ Analysis Modes (summary)
├─ How to Use
├─ Machine Presets (basics)
├─ Export Format
└─ Navigation to other docs

/metrics - Metrics Reference (~300 lines)
├─ Interactive metric browser
├─ Category tabs
└─ Expandable metric cards with formulas

/technical - Technical Reference (~350 lines)
├─ IEC 61217 Coordinate System
├─ Machine Presets (advanced)
├─ Algorithm Documentation
└─ DICOM RT Details

/python-docs - Python Toolkit (408 lines)
└─ (keep current structure)
```

**Benefits:**
- **Help stays under 500 lines** - scannable, beginner-friendly
- Reference content is findable but not intrusive
- Only requires creating 2 new pages
- Clear mental model: Help → How-to, Metrics → Reference, Technical → Deep dive

---

## Missing Content Gaps

### 1. **Troubleshooting Section** ⚠️
Currently missing:
- File format errors
- Browser compatibility
- Performance tips (large files)
- Common parsing issues

### 2. **FAQ Section** 
Would help with:
- "Why is my MCS value X?"
- "What's a 'good' complexity score?"
- "How accurate are delivery time estimates?"
- "Can I analyze plans from vendor X?"

### 3. **Keyboard Shortcuts**
Missing:
- Control point navigation
- Playback controls
- Quick export

### 4. **Video Tutorials / GIFs**
Would enhance:
- How to Use section
- Analysis Modes section

### 5. **Python Examples Repository**
Link to example scripts:
- Common workflows
- Integration examples
- Custom analysis pipelines

---

## Immediate Actions Recommended

### Priority 1: Split Heavy Content (2-3 hours)
1. ✅ Create `/metrics` page - Move Metrics Reference
2. ✅ Create `/technical` page - Move Coordinate System + advanced presets
3. ✅ Update Help page - Keep only essential content
4. ✅ Add navigation links between pages
5. ✅ Update routes in App.tsx

### Priority 2: Improve Navigation (1 hour)
1. Add "Related Documentation" section at top/bottom of each page
2. Add breadcrumbs
3. Update Table of Contents component to support multiple doc pages

### Priority 3: Add Missing Content (2-3 hours)
1. Create Troubleshooting card in Help
2. Add FAQ section
3. Document keyboard shortcuts

### Priority 4: Enhancement (Future)
1. Add search across all documentation
2. Make metrics table interactive/filterable
3. Add video walkthroughs
4. Create Python cookbook repository

---

## File Structure Changes

### New Files Needed:
```
src/pages/
├── Help.tsx (refactored - lighter)
├── MetricsReference.tsx (NEW)
├── TechnicalReference.tsx (NEW)
└── PythonDocs.tsx (existing)

src/components/help/
├── MetricsTable.tsx (NEW - interactive)
├── MetricCard.tsx (NEW - expandable)
└── DocumentationNav.tsx (NEW - cross-doc navigation)
```

### Routes to Add:
```tsx
<Route path="/metrics" element={<MetricsReference />} />
<Route path="/technical" element={<TechnicalReference />} />
```

---

## Decision Required

**Which approach do you prefer?**
- **A** - Minimal split (Metrics + Coordinate System separate)
- **B** - Full restructure (5 separate doc pages)
- **C** - Hybrid (Help + Metrics + Technical + Python) ⭐ Recommended

I can implement whichever you choose!
