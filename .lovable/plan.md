
# Documentation Update + Cross-Validation Report Page

## Status: ✅ COMPLETED (2026-02-25)

All items implemented as planned. See details below.

## Completed Changes

### 1. ✅ New Page: `/validation` — Cross-Validation & Benchmark Report
- `src/pages/ValidationReport.tsx` — Full page with parity stamp, metric deltas table, UCoMX benchmark, algorithmic parity statement
- `src/lib/validation-data.ts` — Static validation data (tolerances, deltas, benchmark results, shared algorithms)

### 2. ✅ Updated Help Page (`src/pages/Help.tsx`)
- Added "Automatic Machine Detection" subsection
- Added "Machine Characteristics Card" subsection
- Added configurable outlier detection mention in cohort mode card
- Updated Key Features list with machine detection & outlier config
- Updated Python Toolkit section with cross-validation guarantee & link to /validation
- Added Validation link in About section

### 3. ✅ Updated Python Docs Page (`src/pages/PythonDocs.tsx`)
- Enhanced cross-validation section with parity guarantee, UCoMX benchmark reference
- Added link to /validation page

### 4. ✅ Routes and Navigation
- Added `/validation` route in `src/App.tsx`
- Added "Validation Report" to `NAV_LINKS` in `src/pages/Index.tsx`
