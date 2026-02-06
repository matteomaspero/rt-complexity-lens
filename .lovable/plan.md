

# Metrics Threshold System

## Overview

Add a configurable threshold system that highlights concerning metric values in red (critical) and yellow (warning) based on machine-specific limits. The system will be toggleable and include presets for common radiotherapy linacs.

---

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/lib/threshold-definitions.ts` | Machine presets and threshold type definitions |
| `src/contexts/ThresholdConfigContext.tsx` | Context for threshold state management |
| `src/components/viewer/ThresholdSettings.tsx` | UI for configuring thresholds |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/viewer/MetricsPanel.tsx` | Apply threshold styling to metric values |
| `src/components/viewer/MetricsSettings.tsx` | Add threshold toggle and machine selector |
| `src/index.css` | Add threshold-related CSS classes |
| `src/App.tsx` | Wrap app with ThresholdConfigProvider |

---

## Part 1: Threshold Definitions

### 1.1 Threshold Types

Each metric can have:
- **Warning threshold**: Yellow highlight (approaching limits)
- **Critical threshold**: Red highlight (exceeds recommended limits)
- **Direction**: Whether high or low values are concerning

```text
ThresholdDefinition = {
  metricKey: string
  warningThreshold: number
  criticalThreshold: number
  direction: 'high' | 'low'  // 'high' = values above threshold are bad
                              // 'low' = values below threshold are bad
}
```

### 1.2 Machine Presets

Predefined threshold configurations for common linacs:

**Generic / Conservative**
- Safe baseline values for any modern linac
- Most restrictive thresholds

**Varian TrueBeam**
- MCS: warning < 0.3, critical < 0.2
- MFA: warning < 5 cm², critical < 2 cm²
- LT: warning > 15000 mm, critical > 25000 mm

**Varian Halcyon**
- Stricter thresholds due to dual-layer MLC
- MCS: warning < 0.35, critical < 0.25
- MFA: warning < 4 cm², critical < 2 cm²

**Elekta Versa HD**
- Agility MLC-specific thresholds
- Slightly different MFA ranges

**Custom**
- User-defined thresholds
- Editable input fields for each metric

---

## Part 2: Threshold Configuration Context

### 2.1 Context State

```text
ThresholdConfig = {
  enabled: boolean                    // Master toggle
  selectedPreset: string              // 'generic' | 'truebeam' | 'halcyon' | 'versa_hd' | 'custom'
  customThresholds: ThresholdSet      // User-defined values
  
  // Methods
  setEnabled(enabled: boolean)
  setPreset(preset: string)
  updateCustomThreshold(metricKey, values)
  getThresholdStatus(metricKey, value) -> 'normal' | 'warning' | 'critical'
}
```

### 2.2 Persistence

- Save to localStorage with key `rtplan-threshold-config`
- Store: enabled flag, selected preset, custom threshold values
- Load on app initialization

---

## Part 3: Threshold Settings UI

### 3.1 Integration with MetricsSettings

Add a new collapsible section within or below the existing Metrics Settings:

```text
+------------------------------------------+
| [Toggle] Enable Threshold Alerts         |
|                                          |
| Machine Preset: [Dropdown v]             |
|   - Generic (Conservative)               |
|   - Varian TrueBeam                      |
|   - Varian Halcyon                       |
|   - Elekta Versa HD                      |
|   - Custom...                            |
|                                          |
| [Only shown if Custom selected]          |
| +--------------------------------------+ |
| | MCS:  Warning [____] Critical [____] | |
| | MFA:  Warning [____] Critical [____] | |
| | LT:   Warning [____] Critical [____] | |
| +--------------------------------------+ |
|                                          |
| Legend: [Yellow] Warning  [Red] Critical |
+------------------------------------------+
```

### 3.2 Toggle Behavior

When disabled:
- All thresholds ignored
- Metrics display normally
- Settings panel shows only the enable toggle (collapsed)

When enabled:
- Machine selector visible
- Thresholds actively applied
- Metric values styled with warning/critical colors

---

## Part 4: Visual Styling

### 4.1 CSS Classes

Add to index.css:

```css
.metric-value-normal { }  /* Default styling */

.metric-value-warning {
  color: hsl(var(--status-warning));
  background: hsl(var(--status-warning) / 0.1);
  border-radius: 0.25rem;
  padding: 0 0.5rem;
}

.metric-value-critical {
  color: hsl(var(--status-error));
  background: hsl(var(--status-error) / 0.1);
  border-radius: 0.25rem;
  padding: 0 0.5rem;
}
```

### 4.2 Tooltip Enhancement

When a value exceeds thresholds, the tooltip shows:
- Normal description (existing)
- Plus: "Exceeds warning/critical threshold for [Machine]"
- Threshold values for context

---

## Part 5: MetricsPanel Integration

### 5.1 MetricItem Updates

Modify the MetricItem component to:
1. Consume threshold context
2. Call `getThresholdStatus(metricKey, value)`
3. Apply appropriate CSS class
4. Optionally show indicator icon (warning triangle)

### 5.2 All Beams Summary

Apply threshold styling to the beam summary list as well for MCS values.

---

## Machine Preset Details

### Generic (Conservative)

| Metric | Warning | Critical | Direction |
|--------|---------|----------|-----------|
| MCS | < 0.25 | < 0.15 | low |
| LSV | < 0.30 | < 0.20 | low |
| AAV | < 0.30 | < 0.20 | low |
| MFA | < 4 cm² | < 2 cm² | low |
| LT | > 20000 mm | > 30000 mm | high |
| totalMU | > 1500 MU | > 2500 MU | high |

### Varian TrueBeam

| Metric | Warning | Critical | Direction |
|--------|---------|----------|-----------|
| MCS | < 0.30 | < 0.20 | low |
| LSV | < 0.35 | < 0.25 | low |
| AAV | < 0.35 | < 0.25 | low |
| MFA | < 5 cm² | < 2 cm² | low |
| LT | > 15000 mm | > 25000 mm | high |
| totalMU | > 2000 MU | > 3000 MU | high |

### Varian Halcyon

| Metric | Warning | Critical | Direction |
|--------|---------|----------|-----------|
| MCS | < 0.35 | < 0.25 | low |
| LSV | < 0.40 | < 0.30 | low |
| AAV | < 0.40 | < 0.30 | low |
| MFA | < 4 cm² | < 2 cm² | low |
| LT | > 12000 mm | > 20000 mm | high |
| totalMU | > 1800 MU | > 2800 MU | high |

### Elekta Versa HD

| Metric | Warning | Critical | Direction |
|--------|---------|----------|-----------|
| MCS | < 0.28 | < 0.18 | low |
| LSV | < 0.32 | < 0.22 | low |
| AAV | < 0.32 | < 0.22 | low |
| MFA | < 4.5 cm² | < 2.5 cm² | low |
| LT | > 18000 mm | > 28000 mm | high |
| totalMU | > 1800 MU | > 2800 MU | high |

---

## Implementation Sequence

1. Create `src/lib/threshold-definitions.ts` with types and machine presets
2. Create `src/contexts/ThresholdConfigContext.tsx` with state management
3. Update `src/App.tsx` to include ThresholdConfigProvider
4. Add threshold CSS classes to `src/index.css`
5. Create `src/components/viewer/ThresholdSettings.tsx` UI component
6. Update `src/components/viewer/MetricsSettings.tsx` to include threshold section
7. Update `src/components/viewer/MetricsPanel.tsx` to apply threshold styling

---

## Success Criteria

- Toggle to enable/disable threshold system works
- Dropdown shows all machine presets
- Custom preset allows editing individual thresholds
- Metric values show yellow background when in warning range
- Metric values show red background when in critical range
- Settings persist across sessions via localStorage
- Tooltips indicate when thresholds are exceeded

