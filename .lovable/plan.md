
# Plan: Enhanced Metrics & Multidimensional Clustering for Batch and Cohort Analysis

## Overview

This plan adds comprehensive geometric and beam metrics to both Batch and Cohort analysis modes, organizes metrics into logical categories, expands visualization capabilities, and introduces multidimensional clustering for cohort analysis.

---

## Part 1: Expanded Metrics Categories

### Metric Organization

Metrics will be organized into three main sections displayed at the beginning of analysis results:

| Section | Metrics Included |
|---------|-----------------|
| **Geometric** | MFA (Mean Field Area), EFS (Equivalent Field Size), PA (Plan Area), JA (Jaw Area), psmall (% Small Fields) |
| **Beam** | Beam Count, Control Points, Arc Length (GT), Total MU, Delivery Time, MUCA (MU/CP) |
| **Complexity** | MCS, LSV, AAV, LT, LTMCS, SAS5, SAS10, EM, PI, LG, MAD, TG, PM |

### Files to Modify

| File | Purpose |
|------|---------|
| `src/lib/batch/batch-statistics.ts` | Add all new metrics to `BatchStatistics` interface |
| `src/components/batch/BatchSummaryStats.tsx` | Display metrics in organized sections with tabs |
| `src/contexts/CohortContext.tsx` | Expand `MetricExtendedStats` to include all metrics |
| `src/lib/cohort/correlation.ts` | Add new metrics to correlation analysis |

---

## Part 2: Batch Analysis Enhancements

### New Component: `BatchMetricsSummary.tsx`

A tabbed component replacing the current `BatchSummaryStats` with three tabs:

```text
+--------------------------------------------------+
| [ Geometric ] [ Beam ] [ Complexity ]            |
+--------------------------------------------------+
|  MFA          EFS         PA          JA         |
|  Range: ...   Range: ...  Range: ...  Range: ... |
|  Mean: ...    Mean: ...   Mean: ...   Mean: ...  |
|                                                  |
|  psmall                                          |
|  Range: ...                                      |
+--------------------------------------------------+
```

### Changes to Batch Statistics

Extend `BatchStatistics` interface to include:
- All accuracy metrics: LG, MAD, EFS, psmall, EM, PI
- All deliverability metrics: MUCA, LTMU, GT, GS, PA, JA, PM, TG

---

## Part 3: Cohort Analysis Enhancements

### Extended Statistics

Update `MetricExtendedStats` in `CohortContext.tsx` to include:

```typescript
interface MetricExtendedStats {
  // Existing
  MCS, LSV, AAV, MFA, LT, totalMU, deliveryTime,
  
  // New Geometric
  EFS, PA, JA, psmall,
  
  // New Complexity
  SAS5, SAS10, EM, PI, LG, MAD, TG, PM,
  
  // New Beam
  beamCount, controlPointCount, arcLength, MUCA
}
```

### Enhanced Visualizations

| Component | Current | Enhanced |
|-----------|---------|----------|
| `BoxPlotChart.tsx` | MCS, LSV, AAV | Add MFA, LT + metric selector dropdown |
| `ViolinPlot.tsx` | MCS, LSV, AAV | Add metric selector for any metric |
| `ScatterMatrix.tsx` | 4 fixed pairs | Configurable metric pair selection |
| `CorrelationHeatmap.tsx` | 7 metrics | Expand to include all 15+ metrics |

### New Component: Metric Selector

A reusable dropdown component for selecting which metrics to display in visualizations:

```tsx
<MetricSelector
  selected={['MCS', 'LSV', 'AAV', 'MFA']}
  onChange={setSelectedMetrics}
  maxSelections={6}
/>
```

---

## Part 4: Multidimensional Clustering

### New Clustering Approach

Add support for clustering by multiple dimensions simultaneously, creating compound cluster groups.

### New Types

```typescript
type MultiClusterConfig = {
  primaryDimension: ClusterDimension;
  secondaryDimension?: ClusterDimension;
  mode: 'single' | 'combined';
};

interface ClusterGroup {
  // Existing fields...
  parentCluster?: string;  // For hierarchical display
  dimensions: {
    [key in ClusterDimension]?: string;
  };
}
```

### Clustering Modes

1. **Single Dimension** (current behavior): Group by one dimension
2. **Combined**: Group by two dimensions creating compound groups like "VMAT + High MCS" or "3-4 beams + Short delivery"

### UI Changes to `ClusteringConfig.tsx`

```text
+------------------------------------------+
| Clustering Configuration                 |
+------------------------------------------+
| Mode: [ Single ▼ ] [ Combined ▼ ]       |
|                                          |
| Primary Dimension:                       |
| [ Technique ▼ ]                         |
|                                          |
| Secondary Dimension: (Combined mode)     |
| [ Complexity (MCS) ▼ ]                  |
|                                          |
| Plans loaded: 24                         |
| Clusters generated: 6                    |
+------------------------------------------+
```

### Implementation in `clustering.ts`

Add new function for combined clustering:

```typescript
function generateMultiDimensionalClusters(
  plans: BatchPlan[],
  primary: ClusterDimension,
  secondary?: ClusterDimension
): ClusterGroup[] {
  // If secondary is undefined, use existing single-dimension logic
  // Otherwise, create compound cluster IDs like "VMAT::High MCS"
}
```

---

## Part 5: Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/batch/batch-statistics.ts` | Modify | Add 15+ new metrics to statistics |
| `src/components/batch/BatchSummaryStats.tsx` | Rewrite | Tabbed layout with metric sections |
| `src/contexts/CohortContext.tsx` | Modify | Expand MetricExtendedStats, add secondaryDimension state |
| `src/lib/cohort/clustering.ts` | Modify | Add multidimensional clustering support |
| `src/lib/cohort/correlation.ts` | Modify | Expand CORRELATION_METRICS array |
| `src/components/cohort/ClusteringConfig.tsx` | Modify | Add clustering mode and secondary dimension UI |
| `src/components/cohort/BoxPlotChart.tsx` | Modify | Add metric selector |
| `src/components/cohort/ViolinPlot.tsx` | Modify | Add metric selector |
| `src/components/cohort/ScatterMatrix.tsx` | Modify | Configurable metric pairs |
| `src/components/cohort/ExtendedStatsTable.tsx` | Modify | Display all new metrics |
| `src/components/cohort/MetricSelector.tsx` | New | Reusable metric selection dropdown |
| `src/lib/cohort/index.ts` | Modify | Export new types and functions |

---

## Technical Details

### Metric Extraction Helper

Create a utility function for extracting any metric from PlanMetrics:

```typescript
// In a new file: src/lib/cohort/metric-utils.ts
export const METRIC_GROUPS = {
  geometric: ['MFA', 'EFS', 'PA', 'JA', 'psmall'],
  beam: ['totalMU', 'totalDeliveryTime', 'GT', 'MUCA', 'arcLength'],
  complexity: ['MCS', 'LSV', 'AAV', 'LT', 'LTMCS', 'SAS5', 'SAS10', 'EM', 'PI', 'LG', 'MAD', 'TG', 'PM'],
} as const;
```

### Beam-Level Aggregation

For metrics like beam count and total control points, aggregate from the plan data:

```typescript
// In CohortContext.tsx
const beamCount = plan.plan.beams?.length ?? 0;
const totalCPs = plan.plan.beams?.reduce(
  (sum, b) => sum + (b.numberOfControlPoints || 0), 0
) ?? 0;
```

---

## Estimated Effort

| Component | Lines Changed |
|-----------|--------------|
| Batch statistics expansion | ~50 lines |
| Batch summary rewrite | ~150 lines |
| Cohort context expansion | ~80 lines |
| Multidimensional clustering | ~120 lines |
| Visualization enhancements | ~200 lines |
| New MetricSelector component | ~80 lines |
| Correlation expansion | ~30 lines |

**Total: ~710 lines across 12 files**
