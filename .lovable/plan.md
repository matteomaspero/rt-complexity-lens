
# Plan: Homogenize Styling Across Pages and Add PNG Export for Charts

## Summary
This plan covers two main improvements:
1. **Style Homogenization**: Apply the Help page styling patterns (StepBadge, NoteBox, subsection headers, card styling) across the main viewer, Batch Dashboard, and Compare Plans pages
2. **PNG Export for Charts**: Add the ability to export any chart as a PNG image using a reusable utility

---

## Part 1: Style Homogenization

### Current State Analysis

The Help page established these styling patterns that are not yet applied elsewhere:

| Pattern | Help Page | Main Viewer | Batch | Compare |
|---------|-----------|-------------|-------|---------|
| Subsection headers with accent bar | Yes | No | No | No |
| NoteBox for tips/info | Yes | No | No | No |
| StepBadge for numbered items | Yes | No | No | No |
| Card border-l-4 accent | Yes (intro card) | No | No | No |
| Table header bg-muted/50 | Yes | No | Partial | No |
| Code blocks with font-mono bg-muted | Yes | Partial | No | No |
| Consistent icon + title in CardHeader | Yes | Partial | No | No |

### Changes Required

#### 1. Create Shared UI Components

Create a new file `src/components/ui/info-box.tsx` with reusable components:
- `NoteBox` - Info callout with accent border (extracted from Help.tsx)
- `SubsectionHeader` - Consistent subsection headers with accent bar
- These can be used across all pages

#### 2. Update InteractiveViewer.tsx (Main Page)

**Header section (home view, lines 107-115):**
- Add subtle accent styling to the hero text
- Use consistent spacing

**Collapsible sections (lines 319-361):**
- Add icons to collapsible triggers matching Help page pattern
- Use consistent header styling: `<h4 className="text-sm font-medium flex items-center gap-2">`

**Card styling (lines 268-300):**
- Add consistent "Gantry Position", "MLC Aperture" headers with subtle accent

#### 3. Update BatchDashboard.tsx

**Header (lines 34-100):**
- Add descriptive subtitle like Help page
- Keep sticky header but improve visual hierarchy

**Empty state:**
- Currently handled by BatchUploadZone, but could add helpful tips using NoteBox

**Summary section:**
- Apply consistent card accent styling

#### 4. Update ComparePlans.tsx

**Header (lines 74-128):**
- Add descriptive subtitle

**Empty state (lines 218-225):**
- Convert to a styled card with NoteBox-style info

**Comparison sections:**
- Apply consistent subsection headers

---

## Part 2: PNG Export for Charts

### Implementation Approach

Use `html2canvas` library to capture chart containers as PNG images. This is more reliable than trying to export SVG/Canvas directly from Recharts.

#### 1. Install html2canvas

Add `html2canvas` as a dependency (it's lightweight and well-maintained).

#### 2. Create Export Utility

Create `src/lib/chart-export.ts`:
```typescript
import html2canvas from 'html2canvas';

export async function exportChartAsPng(
  element: HTMLElement, 
  filename: string
): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: null, // Preserve transparency or use theme background
    scale: 2, // Higher resolution
  });
  
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
```

#### 3. Create ExportableChart Wrapper Component

Create `src/components/ui/exportable-chart.tsx`:
```typescript
interface ExportableChartProps {
  title: string;
  filename?: string;
  children: React.ReactNode;
}

function ExportableChart({ title, filename, children }: ExportableChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  
  const handleExport = async () => {
    if (chartRef.current) {
      await exportChartAsPng(chartRef.current, filename || title);
    }
  };
  
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between p-3 border-b">
        <h4 className="text-sm font-medium">{title}</h4>
        <Button variant="ghost" size="icon" onClick={handleExport} title="Export as PNG">
          <Download className="h-4 w-4" />
        </Button>
      </div>
      <div ref={chartRef} className="p-4">
        {children}
      </div>
    </div>
  );
}
```

#### 4. Update Chart Components

Wrap existing charts with the ExportableChart component or add export buttons:

**Main Viewer Charts to update:**
- `CumulativeMUChart` - Add export button
- `GantrySpeedChart` - Add export button  
- `AngularDistributionChart` - Add export button to polar and line charts
- `DeliveryTimelineChart` - Add export button to each sub-chart
- `ComplexityHeatmap` - Add export button to each sub-chart

**Comparison Charts to update:**
- `ComparisonMUChart`
- `ComparisonDeliveryChart`
- `ComparisonPolarChart`

**Batch Charts to update:**
- `BatchDistributionChart`

---

## Detailed File Changes

### New Files

| File | Description |
|------|-------------|
| `src/components/ui/info-box.tsx` | Shared NoteBox and SubsectionHeader components |
| `src/lib/chart-export.ts` | PNG export utility function |
| `src/components/ui/exportable-chart.tsx` | Wrapper component with export button |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/viewer/InteractiveViewer.tsx` | Apply consistent styling patterns, import shared components |
| `src/components/viewer/Charts.tsx` | Add export button to CumulativeMUChart and GantrySpeedChart |
| `src/components/viewer/AngularDistributionChart.tsx` | Add export functionality |
| `src/components/viewer/DeliveryTimelineChart.tsx` | Add export functionality to sub-charts |
| `src/components/viewer/ComplexityHeatmap.tsx` | Add export functionality to sub-charts |
| `src/components/comparison/ComparisonMUChart.tsx` | Add export functionality |
| `src/components/comparison/ComparisonDeliveryChart.tsx` | Add export functionality |
| `src/components/comparison/ComparisonPolarChart.tsx` | Add export functionality |
| `src/components/batch/BatchDistributionChart.tsx` | Add export functionality |
| `src/pages/BatchDashboard.tsx` | Apply consistent styling, add subtitle |
| `src/pages/ComparePlans.tsx` | Apply consistent styling, improve empty state |
| `package.json` | Add html2canvas dependency |

---

## Visual Styling Standards (Applied Across All Pages)

### Headers
- Page title: `text-lg font-semibold` or `text-xl font-semibold`
- Subtitle: `text-muted-foreground text-sm`

### Section Headers
```tsx
<h4 className="font-semibold text-base flex items-center gap-2">
  <span className="w-1 h-5 bg-primary rounded-full" />
  Section Title
</h4>
```

### Tables
```tsx
<TableHeader>
  <TableRow className="bg-muted/50">
    <TableHead className="font-semibold">Column</TableHead>
  </TableRow>
</TableHeader>
```

### Code/Values
```tsx
<code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">value</code>
```

### Info Boxes
```tsx
<NoteBox>Important information here</NoteBox>
```

---

## Export Button Placement

Each chart will have a small download icon button in the header:

```text
┌─────────────────────────────────────────┐
│ Chart Title                         [⬇] │  ← Download icon button
├─────────────────────────────────────────┤
│                                         │
│           [Chart Content]               │
│                                         │
└─────────────────────────────────────────┘
```

The button will:
- Be `variant="ghost" size="icon"`
- Show tooltip "Export as PNG"
- Download with filename based on chart title + timestamp

---

## Summary

| Category | Files Changed | New Files |
|----------|---------------|-----------|
| Style homogenization | 4 | 1 |
| PNG export | 9 | 2 |
| **Total** | **10** | **3** |

This implementation will:
- Create a consistent visual language across all pages matching the Help page
- Enable PNG export for all charts with minimal code changes per chart
- Use a reusable component pattern for future charts
