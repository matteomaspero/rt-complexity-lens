
# Comprehensive Audit & Improvement Plan for RTp-lens

## Executive Summary

After thorough exploration of the codebase, I've identified several areas for improvement across functionality, correctness, flexibility, and testing. The application is well-structured but has gaps in metric consistency, missing exports, incomplete test coverage, and some visualization limitations.

---

## Part 1: Critical Issues & Corrections

### 1.1 Metric Definition Inconsistencies

**Location**: `src/lib/cohort/metric-utils.ts` vs actual `PlanMetrics` type

| Issue | Current State | Fix |
|-------|---------------|-----|
| `beamCount` not in `PlanMetrics` | Extracted from `plan.beams.length` manually | Works correctly, but should add computed metrics documentation |
| `controlPointCount` computed on-the-fly | Not stored in metrics | Add explicit extraction in metric utilities |
| Missing `deliveryTime` key mapping | Uses `totalDeliveryTime` inconsistently | Standardize to `totalDeliveryTime` throughout |
| `arcLength` referenced but not defined | Metric `GT` (Gantry Travel) is used instead | Update references to use `GT` consistently |

### 1.2 Cohort Export Missing New Metrics

**Location**: `src/components/cohort/CohortExportPanel.tsx`

The cohort export only includes 7 metrics:
- MCS, LSV, AAV, MFA, LT, totalMU, deliveryTime

**Missing**: All newly added metrics (EFS, PA, JA, psmall, SAS5, SAS10, EM, PI, LG, MAD, TG, PM, beamCount, controlPointCount)

### 1.3 Correlation Matrix Paired Value Bug

**Location**: `src/lib/cohort/correlation.ts` lines 125-135

```typescript
const pairs = metricsArray
  .map((m, idx) => ({
    x: x[idx],  // BUG: x and y arrays may have different lengths due to filtering
    y: y[idx],
  }))
  .filter(p => !isNaN(p.x) && !isNaN(p.y));
```

The issue: `extractMetricValues` filters out NaN values, so `x[idx]` doesn't correspond to the same plan as `y[idx]`.

---

## Part 2: Functionality Improvements

### 2.1 Enhanced Cohort Export (Full Metrics)

Add all expanded metrics to cohort CSV/JSON exports matching the batch export functionality.

**Files to modify**:
- `src/components/cohort/CohortExportPanel.tsx`

**Changes**:
- Add metric category checkboxes (Geometric/Beam/Complexity)
- Include all 20+ metrics in exports
- Add branded header matching batch exports

### 2.2 Add Metric Selector to Box Plot Y-Axis Scaling

**Current limitation**: Box plots show all selected metrics on same Y-axis, making comparison difficult when scales differ (e.g., MCS 0-1 vs LT 0-10000mm)

**Solution**: Add option to normalize values or use metric-specific Y-axis ranges

### 2.3 Scatter Matrix Improvements

**Files to modify**: `src/components/cohort/ScatterMatrix.tsx`

**Improvements**:
- Add regression line option
- Show R-squared value in tooltip
- Add ability to add/remove scatter plots dynamically

### 2.4 Violin Plot Whiskers

**Location**: `src/components/cohort/ViolinPlot.tsx`

**Current**: Shows IQR box but no whiskers

**Fix**: Add whisker lines from Q1/Q3 to min/max (or 1.5x IQR bounds)

---

## Part 3: Test Coverage Expansion

### 3.1 Current Test State

| Test File | Coverage |
|-----------|----------|
| `dicom-parser.test.ts` | Basic parsing, beam extraction, MLC positions |
| `dicom-metrics.test.ts` | MCS, LSV, AAV, MFA, LT, LTMCS, per-beam metrics |
| `example.test.ts` | Placeholder only |

### 3.2 Missing Test Coverage

**Add tests for**:
1. New UCoMX accuracy metrics (LG, MAD, EFS, psmall)
2. New deliverability metrics (MUCA, GT, GS, PM, TG)
3. Statistical calculations (extended-statistics.ts)
4. Clustering logic (clustering.ts)
5. Correlation calculations (correlation.ts)
6. Metric extraction utilities (metric-utils.ts)
7. Batch statistics (batch-statistics.ts)

### 3.3 New Test Files to Create

| File | Purpose |
|------|---------|
| `src/test/extended-statistics.test.ts` | Test quartile, percentile, outlier detection |
| `src/test/clustering.test.ts` | Test cluster assignment and grouping |
| `src/test/correlation.test.ts` | Test Pearson correlation calculation |
| `src/test/metric-utils.test.ts` | Test metric extraction and formatting |

---

## Part 4: Files to Modify

### Priority 1: Bug Fixes

| File | Change |
|------|--------|
| `src/lib/cohort/correlation.ts` | Fix paired value extraction bug |
| `src/lib/cohort/metric-utils.ts` | Add missing `deliveryTime` alias |
| `src/contexts/CohortContext.tsx` | Ensure `deliveryTime` maps correctly |

### Priority 2: Feature Completion

| File | Change |
|------|--------|
| `src/components/cohort/CohortExportPanel.tsx` | Add full metric export with categories |
| `src/components/cohort/ViolinPlot.tsx` | Add whiskers to violin plots |
| `src/components/cohort/BoxPlotChart.tsx` | Improve multi-scale handling |

### Priority 3: Test Additions

| File | Change |
|------|--------|
| `src/test/extended-statistics.test.ts` | New: Statistical function tests |
| `src/test/clustering.test.ts` | New: Clustering logic tests |
| `src/test/correlation.test.ts` | New: Correlation calculation tests |
| `src/test/dicom-metrics.test.ts` | Expand: Add new metric tests |

### Priority 4: UX Improvements

| File | Change |
|------|--------|
| `src/components/cohort/ScatterMatrix.tsx` | Add regression line and R-squared |
| `src/components/batch/BatchDistributionChart.tsx` | Add metric selector (currently MCS only) |

---

## Part 5: Technical Implementation Details

### 5.1 Fix Correlation Paired Values

```typescript
// BEFORE (buggy)
const pairs = metricsArray.map((m, idx) => ({
  x: x[idx],  // x and y filtered separately - index mismatch
  y: y[idx],
}));

// AFTER (correct)
const pairs = metricsArray.map(m => ({
  x: m[metrics[i] as keyof PlanMetrics] as number,
  y: m[metrics[j] as keyof PlanMetrics] as number,
})).filter(p => 
  typeof p.x === 'number' && !isNaN(p.x) &&
  typeof p.y === 'number' && !isNaN(p.y)
);
```

### 5.2 Cohort Export with Categories

```typescript
interface CohortExportOptions {
  includeGeometric: boolean;
  includeBeam: boolean;
  includeComplexity: boolean;
  format: 'csv' | 'json';
}
```

### 5.3 Extended Metric Tests

```typescript
describe('Extended Statistics', () => {
  it('should calculate correct quartiles', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const stats = calculateExtendedStatistics(values);
    expect(stats.q1).toBeCloseTo(3, 1);
    expect(stats.median).toBeCloseTo(5.5, 1);
    expect(stats.q3).toBeCloseTo(8, 1);
  });

  it('should detect outliers using 1.5xIQR rule', () => {
    const values = [1, 2, 3, 4, 5, 100]; // 100 is outlier
    const stats = calculateExtendedStatistics(values);
    expect(stats.outliers).toContain(100);
  });
});
```

---

## Part 6: Implementation Order

| Phase | Tasks | Estimated Changes |
|-------|-------|-------------------|
| 1 | Fix correlation bug, metric key consistency | 3 files, ~50 lines |
| 2 | Enhanced cohort export with all metrics | 1 file, ~150 lines |
| 3 | Violin plot whiskers, box plot improvements | 2 files, ~80 lines |
| 4 | New test files for statistics/clustering | 4 files, ~400 lines |
| 5 | Scatter matrix regression lines | 1 file, ~60 lines |
| 6 | Batch distribution metric selector | 1 file, ~50 lines |

**Total: ~12 files, ~790 lines**

---

## Part 7: Verification Steps

After implementation:
1. Run all existing tests to ensure no regressions
2. Run new statistical and clustering tests
3. Test cohort analysis end-to-end with demo data
4. Verify exports contain all metrics in correct format
5. Validate correlation matrix values against manual calculation
6. Check visualizations render correctly with all metric groups
