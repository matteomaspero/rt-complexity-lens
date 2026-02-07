

# Plan: Add Dark Mode Toggle and Mathematical Formulas to Help Page

## Summary
This plan adds three key features:
1. **Dark mode toggle** - User-controlled theme switching across all pages (not default)
2. **LaTeX-rendered formulas** - Mathematical descriptions for metrics in the Help page
3. **Dark mode visibility** - Ensure all charts, figures, and diagrams are visible in dark mode

---

## Part 1: Dark Mode Implementation

### Approach
Use `next-themes` (already installed) to add theme switching with localStorage persistence. The default will remain light mode unless the user explicitly selects dark.

### New Files

| File | Description |
|------|-------------|
| `src/components/ui/theme-toggle.tsx` | Toggle button component with sun/moon icons |
| `src/components/ThemeProvider.tsx` | Wrapper using next-themes' ThemeProvider |

### `ThemeProvider.tsx`
```typescript
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="light"  // Light by default
      enableSystem={false}   // Don't auto-detect system preference
      storageKey="theme"
    >
      {children}
    </NextThemesProvider>
  );
}
```

### `theme-toggle.tsx`
```typescript
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

### Modified Files

#### `src/App.tsx`
Wrap the app in `ThemeProvider`:
```typescript
import { ThemeProvider } from "@/components/ThemeProvider";

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      {/* ... existing providers */}
    </QueryClientProvider>
  </ThemeProvider>
);
```

#### Add Toggle to All Pages

| Page | Location for Toggle |
|------|---------------------|
| `InteractiveViewer.tsx` | Main header (when plan loaded) and home page (top right) |
| `BatchDashboard.tsx` | Header, next to Help button |
| `ComparePlans.tsx` | Header, next to Help button |
| `Help.tsx` | Top header area |

---

## Part 2: Mathematical Formulas with react-katex

### Approach
Install `react-katex` (lightweight, already uses KaTeX) to render mathematical formulas for complexity metrics. The formulas will be added to the metrics definitions and displayed in the Help page.

### Dependencies to Install
- `react-katex` - React wrapper for KaTeX
- `katex` - Core KaTeX library (required peer dependency)

### Enhanced Metric Definitions

Add a `formula` field to `src/lib/metrics-definitions.ts` for metrics that have mathematical expressions:

```typescript
export interface MetricDefinition {
  key: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  formula?: string;  // LaTeX formula (optional)
  unit: string | null;
  category: MetricCategory;
  reference?: string;
  doi?: string;
}
```

### Key Formulas to Add

| Metric | Formula (LaTeX) |
|--------|-----------------|
| MCS | `MCS = LSV \times AAV` |
| LSV | `LSV = \frac{\sum_{j} pos_{max,j} - \sum_{j}\|pos_{A,j} - pos_{B,j}\|}{\sum_{j} pos_{max,j}}` |
| AAV | `AAV = 1 - \frac{1}{N-1}\sum_{i=1}^{N-1}\left\|\frac{A_{i+1} - A_i}{A_{max}}\right\|` |
| MFA | `MFA = \frac{1}{N}\sum_{i=1}^{N} A_i` |
| LT | `LT = \sum_{i=1}^{N-1}\sum_{j=1}^{L}\|pos_{j,i+1} - pos_{j,i}\|` |
| EFS | `EFS = \frac{4 \times Area}{Perimeter}` |
| PI | `PI = \frac{Perimeter^2}{4\pi \times Area}` |
| PM | `PM = 1 - MCS` |

**Important**: Formulas use LaTeX syntax only where strictly necessary (summations, fractions, subscripts). Acronyms like "MCS", "LSV", etc. remain plain text in descriptions.

### Help Page Update

Create a `MathFormula` component that conditionally renders:

```typescript
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

function MathFormula({ formula }: { formula: string }) {
  return (
    <div className="my-2 p-3 bg-muted/30 rounded-lg overflow-x-auto">
      <BlockMath math={formula} />
    </div>
  );
}
```

In the metrics table, add a formula row below the description when available:
```tsx
{metric.formula && (
  <div className="mt-3">
    <span className="text-xs font-medium text-muted-foreground">Formula:</span>
    <MathFormula formula={metric.formula} />
  </div>
)}
```

---

## Part 3: Dark Mode Visibility for Charts & Figures

### Charts (Recharts)
The charts already use CSS variables like `hsl(var(--chart-primary))` which have dark mode variants defined in `index.css`. This should work automatically once the theme class is applied.

**Verify/Fix these components:**
- `Charts.tsx` - Uses `hsl(var(--chart-grid))`, `hsl(var(--card))` - OK
- `ComplexityHeatmap.tsx` - Uses CSS variables - OK
- `DeliveryTimelineChart.tsx` - Verify tooltip styling
- `AngularDistributionChart.tsx` - Verify polar chart colors
- `ComparisonMUChart.tsx` - Verify both line colors are visible

### Potential Issue: Axis text fill color
Some charts use `tick={{ fontSize: 10 }}` without explicit fill. Add:
```tsx
tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
```

### SVG Diagrams

#### `IEC61217Diagram.tsx`
Uses Tailwind classes like `fill-background`, `stroke-muted`, `fill-foreground` which should adapt. Verify:
- Background uses `fill-background` 
- Text uses `fill-foreground` or `fill-muted-foreground`
- Lines use `stroke-primary`, `stroke-muted-foreground`

#### `PatientAxesDiagram.tsx`
Uses hardcoded HSL values for axis colors (red, green, blue). These should remain visible in both modes as they're bright colors. Verify:
- Background uses `fill-background` 
- Text labels use class-based fills

#### `MLCApertureViewer.tsx`
Uses CSS variables for MLC colors:
- `fill-[hsl(var(--mlc-bank-a))]`
- `fill-[hsl(var(--mlc-bank-b))]`
- `fill-[hsl(var(--mlc-aperture))]`

These have dark mode variants defined. Add background:
```tsx
<rect ... className="fill-card" />  // Use card background
```

#### `GantryViewer.tsx`
Uses `stroke-border`, `fill-muted`, `fill-primary` - should adapt.

### Chart Export Background Fix

In `src/lib/chart-export.ts`, the background detection already handles dark mode, but ensure proper background:
```typescript
if (document.documentElement.classList.contains('dark')) {
  backgroundColor = 'hsl(220, 20%, 10%)'; // Match --background in dark
}
```

---

## File Change Summary

### New Files (4)
| File | Description |
|------|-------------|
| `src/components/ThemeProvider.tsx` | Theme context provider |
| `src/components/ui/theme-toggle.tsx` | Toggle button component |

### Modified Files (8)
| File | Changes |
|------|---------|
| `package.json` | Add `react-katex` and `katex` dependencies |
| `src/App.tsx` | Wrap with ThemeProvider |
| `src/lib/metrics-definitions.ts` | Add formula field to metric definitions |
| `src/pages/Help.tsx` | Import KaTeX CSS, add MathFormula component, display formulas |
| `src/pages/BatchDashboard.tsx` | Add ThemeToggle to header |
| `src/pages/ComparePlans.tsx` | Add ThemeToggle to header |
| `src/components/viewer/InteractiveViewer.tsx` | Add ThemeToggle to home and plan view headers |
| `src/components/viewer/Charts.tsx` | Add fill color to axis ticks |

### Minor Fixes for Dark Mode (as needed)
| File | Fix |
|------|-----|
| `src/components/viewer/AngularDistributionChart.tsx` | Axis tick fill |
| `src/components/viewer/DeliveryTimelineChart.tsx` | Axis tick fill |
| `src/components/viewer/ComplexityHeatmap.tsx` | Axis tick fill |
| `src/components/comparison/*.tsx` | Axis tick fills |
| `src/components/batch/BatchDistributionChart.tsx` | Axis tick fill |
| `src/lib/chart-export.ts` | Ensure proper dark mode background for exports |

---

## Formulas Guideline (Style)

**Use LaTeX syntax only for:**
- Mathematical operators and relationships
- Summations (Σ), products (Π)
- Fractions, subscripts, superscripts
- Special mathematical symbols

**Keep as plain text:**
- Metric acronyms (MCS, LSV, AAV, etc.)
- Variable names in descriptions
- Units

**Example:**
- Good: "MCS is calculated as: `MCS = LSV \times AAV`"
- Bad: "`\text{MCS} = \text{LSV} \times \text{AAV}`" (unnecessary \text{})

---

## Expected Result

1. **Theme Toggle**: Sun/moon icon button in all page headers
2. **Persistence**: Theme choice saved in localStorage
3. **Default**: Light mode unless user changes
4. **Formulas**: Beautiful LaTeX-rendered math in Help page metrics
5. **Dark Mode Visibility**: All charts, diagrams, and figures clearly visible with good contrast

