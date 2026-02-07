

# Plan: Add Cohort Analysis Mode

## Proposed Mode Name: **Cohort Analysis**

The name "Cohort Analysis" captures the essence of grouping plans into meaningful clusters and performing comparative statistical analysis. Alternative names considered:
- "Statistical Explorer" - too generic
- "Population Analysis" - clinical but less precise
- "Plan Profiler" - doesn't convey grouping aspect
- **"Cohort Analysis"** - best fit: implies grouping of plans with shared characteristics for comparative study

---

## Summary

Create a new analysis mode at `/cohort` that enables:
1. **Bulk upload** of DICOM-RT plans (reuse existing batch upload infrastructure)
2. **Automatic clustering** by plan features (technique, beam count, control points, treatment site)
3. **Enhanced descriptive statistics** with quartiles, IQR, percentiles
4. **Comprehensive visualizations** including box plots, scatter matrices, correlation heatmaps, and violin plots
5. **Export of statistical reports** with clustering results

---

## Feature Groups and Clustering Criteria

### Automatic Clustering Dimensions

| Dimension | Clustering Approach |
|-----------|---------------------|
| **Technique** | VMAT / IMRT / CONFORMAL / UNKNOWN |
| **Number of Beams** | 1, 2, 3-4, 5+ beams |
| **Control Points** | Low (less than 50), Medium (50-100), High (100+) |
| **Beam Type** | Static / Dynamic / Mixed |
| **Delivery Time** | Short (less than 3 min), Medium (3-6 min), Long (6+ min) |
| **Complexity (MCS)** | Low (greater than 0.4), Medium (0.2-0.4), High (less than 0.2) |
| **Total MU** | Low (less than 500), Medium (500-1000), High (1000+) |
| **Treatment Machine** | Group by machine name if available |

---

## Descriptive Statistics Enhancements

Extend the existing `MetricStatistics` interface with:

```typescript
interface ExtendedStatistics {
  min: number;
  max: number;
  mean: number;
  std: number;
  median: number;
  q1: number;           // 25th percentile
  q3: number;           // 75th percentile
  iqr: number;          // Interquartile range
  p5: number;           // 5th percentile
  p95: number;          // 95th percentile
  skewness: number;     // Distribution skewness
  count: number;
  outliers: number[];   // Values outside 1.5×IQR
}
```

---

## Visualizations

### 1. Box Plot Chart (Multiple Metrics Comparison)
Display box plots for each complexity metric (MCS, LSV, AAV, MFA, LT) showing:
- Median line
- Q1-Q3 box
- Whiskers at 1.5×IQR
- Outlier points
- Mean marker (diamond)

### 2. Scatter Matrix
2D scatter plots showing pairwise relationships between key metrics:
- MCS vs Total MU
- LSV vs AAV
- MFA vs Delivery Time
- Control Points vs MCS

Color-coded by cluster group with interactive tooltips.

### 3. Correlation Heatmap
Matrix showing Pearson correlation coefficients between all numeric metrics:
- Color scale from -1 (blue) to +1 (red)
- Hover shows exact correlation value
- Helps identify which metrics are related

### 4. Distribution Violin/Density Plots
Show the full distribution shape for each metric:
- Kernel density estimate
- Embedded box plot summary
- Compare distributions across clusters

### 5. Cluster Summary Cards
For each identified cluster:
- Plan count and percentage
- Key characteristic summary
- Mini sparkline of metric distributions
- Representative plan examples

### 6. Parallel Coordinates Plot
Multi-dimensional visualization showing:
- Each metric as a vertical axis
- Each plan as a line connecting values
- Color by cluster
- Interactive brushing to filter

---

## Page Layout

```text
┌─────────────────────────────────────────────────────────────────┐
│  Header: Cohort Analysis | Upload | Clear | Help | Theme        │
├─────────────────────────────────────────────────────────────────┤
│  Upload Zone (reuse BatchUploadZone)                            │
│  Progress Bar (reuse BatchProgressBar)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐  │
│  │ Clustering Config   │  │ Cluster Summary Cards (grid)     │  │
│  │ - Primary dimension │  │ ┌────────┐ ┌────────┐ ┌────────┐ │  │
│  │ - Secondary dim     │  │ │ VMAT   │ │ IMRT   │ │ CONFML │ │  │
│  │ - Show outliers     │  │ │ 45 pln │ │ 23 pln │ │ 12 pln │ │  │
│  │ [Apply Clustering]  │  │ └────────┘ └────────┘ └────────┘ │  │
│  └─────────────────────┘  └──────────────────────────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Tabs: [Box Plots] [Scatter Matrix] [Correlation] [Violin]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │           Selected Visualization                          │  │
│  │           (with export button)                            │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Detailed Statistics Table (collapsible)                        │
│  - Per-cluster breakdown                                        │
│  - All extended statistics                                      │
├─────────────────────────────────────────────────────────────────┤
│  Export Panel: CSV | JSON | PDF Report                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### New Files

| File | Description |
|------|-------------|
| `src/pages/CohortAnalysis.tsx` | Main page component |
| `src/contexts/CohortContext.tsx` | State management for cohort analysis (extends BatchContext patterns) |
| `src/lib/cohort/clustering.ts` | Clustering logic and dimension definitions |
| `src/lib/cohort/extended-statistics.ts` | Enhanced statistical calculations (quartiles, IQR, percentiles, skewness) |
| `src/lib/cohort/correlation.ts` | Correlation matrix calculation |
| `src/lib/cohort/index.ts` | Barrel export |
| `src/components/cohort/CohortUploadZone.tsx` | Reuse BatchUploadZone with cohort branding |
| `src/components/cohort/ClusteringConfig.tsx` | Configuration panel for clustering dimensions |
| `src/components/cohort/ClusterSummaryGrid.tsx` | Grid of cluster summary cards |
| `src/components/cohort/BoxPlotChart.tsx` | Multi-metric box plot visualization |
| `src/components/cohort/ScatterMatrix.tsx` | Pairwise scatter plot matrix |
| `src/components/cohort/CorrelationHeatmap.tsx` | Metric correlation heatmap |
| `src/components/cohort/ViolinPlot.tsx` | Violin/density distribution chart |
| `src/components/cohort/ExtendedStatsTable.tsx` | Detailed per-cluster statistics table |
| `src/components/cohort/CohortExportPanel.tsx` | Export options including statistical report |
| `src/components/cohort/index.ts` | Barrel export |

### Modified Files

| File | Changes |
|------|---------|
| `src/App.tsx` | Add CohortProvider wrapper and `/cohort` route |
| `src/components/viewer/InteractiveViewer.tsx` | Add navigation link to Cohort Analysis in home view |
| `src/pages/Help.tsx` | Add documentation section for Cohort Analysis features |

---

## Statistical Calculations Detail

### Extended Statistics Function

```typescript
// src/lib/cohort/extended-statistics.ts
function calculateExtendedStatistics(values: number[]): ExtendedStatistics {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  // Quartiles using linear interpolation
  const q1 = percentile(sorted, 25);
  const median = percentile(sorted, 50);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  
  // Outliers: values outside [Q1 - 1.5×IQR, Q3 + 1.5×IQR]
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outliers = sorted.filter(v => v < lowerFence || v > upperFence);
  
  // Skewness
  const mean = sum / n;
  const m3 = values.reduce((acc, v) => acc + Math.pow(v - mean, 3), 0) / n;
  const m2 = variance;
  const skewness = m3 / Math.pow(m2, 1.5);
  
  return { min, max, mean, std, median, q1, q3, iqr, p5, p95, skewness, count, outliers };
}
```

### Clustering Assignment

```typescript
// src/lib/cohort/clustering.ts
type ClusterDimension = 'technique' | 'beamCount' | 'controlPoints' | 
                        'deliveryTime' | 'complexity' | 'totalMU' | 'machine';

interface ClusterGroup {
  id: string;
  name: string;
  description: string;
  planIds: string[];
  color: string;
}

function assignCluster(plan: BatchPlan, dimension: ClusterDimension): string {
  switch (dimension) {
    case 'technique':
      return plan.plan.technique;
    case 'beamCount':
      const beams = plan.plan.beams.length;
      if (beams === 1) return '1 beam';
      if (beams === 2) return '2 beams';
      if (beams <= 4) return '3-4 beams';
      return '5+ beams';
    case 'controlPoints':
      const cps = plan.plan.beams.reduce((sum, b) => sum + b.numberOfControlPoints, 0);
      if (cps < 50) return 'Low (<50 CPs)';
      if (cps < 100) return 'Medium (50-100 CPs)';
      return 'High (>100 CPs)';
    // ... other dimensions
  }
}
```

---

## Visualization Implementation Notes

### Box Plots with Recharts

Recharts doesn't have a native BoxPlot component, so implementation uses ComposedChart with:
- `Bar` for the Q1-Q3 box
- `Line` for median and mean markers
- `Scatter` for outlier points
- `ErrorBar` for whiskers

Alternatively, use the `react-boxplot` library (lightweight SVG) for cleaner implementation.

### Correlation Heatmap

Use a custom SVG grid or Recharts heatmap pattern:
- Calculate Pearson correlation for each metric pair
- Render as colored cells with values
- Include color legend

### Scatter Matrix

Grid of `ScatterChart` components from Recharts:
- 4-6 key metrics (configurable)
- Diagonal shows distribution/histogram
- Off-diagonal shows scatter with regression line option

---

## Navigation Integration

Add to InteractiveViewer home view alongside existing "Compare Plans" and "Batch Analysis":

```tsx
<Link to="/cohort" className="...">
  <BarChart3 className="h-4 w-4" />
  Cohort Analysis
</Link>
```

---

## File Summary

| Category | New Files | Modified Files |
|----------|-----------|----------------|
| Pages | 1 | 0 |
| Contexts | 1 | 1 (App.tsx) |
| Libraries | 4 | 0 |
| Components | 11 | 2 |
| **Total** | **17** | **3** |

---

## Expected Outcome

1. **New `/cohort` route** accessible from main page navigation
2. **Automatic plan clustering** by technique, complexity, beam count, etc.
3. **Rich statistical analysis** with quartiles, IQR, percentiles, and outlier detection
4. **Four visualization types**: Box plots, scatter matrix, correlation heatmap, violin plots
5. **Cluster comparison** with summary cards and detailed breakdown tables
6. **Export capability** for statistical reports in CSV/JSON format
7. **Consistent styling** matching the established Help page patterns

