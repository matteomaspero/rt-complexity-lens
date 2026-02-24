

# Fix: Implement Outlier Export Report Button

## Problem

The "Export Report" button in the Batch Analysis Outlier Report section is non-functional. When clicked, it only runs `console.log('Export outliers:', outliers)` with a `// TODO: Implement CSV export of outliers` comment. No file is downloaded.

All other buttons in the batch dashboard work correctly.

## Solution

Implement the outlier export as a CSV download, consistent with the existing batch export pattern.

## Technical Details

### File: `src/pages/BatchDashboard.tsx`

Replace the inline TODO callback with a proper CSV export function:

```typescript
onExport={() => {
  // Build CSV content from outlier detection results
  const headers = ['Plan', 'File', 'Severity', 'Metric', 'Metric Name', 'Value', 'Z-Score', 'Percentile', 'Complexity Score', 'Recommendation'];
  const rows = outliers.flatMap(o =>
    o.outlierMetrics.map(m => [
      o.planId,
      o.fileName,
      m.severity,
      m.metricKey,
      m.metricName,
      m.value.toFixed(4),
      m.zScore.toFixed(2),
      m.percentile.toFixed(1),
      o.overallComplexityScore.toFixed(1),
      `"${o.recommendation}"`,
    ].join(','))
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rtplens-outlier-report.csv';
  a.click();
  URL.revokeObjectURL(url);
}}
```

This requires checking the `OutlierDetectionResult` type to confirm it has `fileName` alongside `planId` (it does, based on the console log output).

### Scope

- Single file change: `src/pages/BatchDashboard.tsx` (lines 149-152)
- No new dependencies
- Pattern matches existing CSV export logic in `src/lib/export-utils.ts`

