# PAM Quick Start Guide

Get started with Plan Aperture Modulation metrics in 5 minutes.

## What You Need

- DICOM RTPLAN file (radiation therapy plan)
- DICOM RTSTRUCT file (anatomical structures/targets)

## Python: Complete Example

### 1. Load files

```python
from rtplan_complexity import parse_rtplan, calculate_plan_metrics
from rtplan_complexity.parser import parse_rtstruct, get_structure_by_name

# Load radiation plan
rtplan = parse_rtplan("path/to/RTPLAN.dcm")

# Load anatomical structures
structures = parse_rtstruct("path/to/RTSTRUCT.dcm")

# Get your target of interest (e.g., "GTV", "PTV", "TG119-CShape")
target = get_structure_by_name(structures, "GTV")
```

### 2. Calculate PAM metrics

```python
# Calculate metrics with target
metrics = calculate_plan_metrics(rtplan, structure=target)

# Access plan-level PAM
pam = metrics.PAM
print(f"Plan PAM: {pam:.4f}")
print(f"  → Target is blocked ~{pam*100:.1f}% of treatment time on average")

# Access per-beam BAM
for beam_metrics in metrics.beam_metrics:
    print(f"Beam {beam_metrics.beam_number}: BAM = {beam_metrics.BAM:.4f}")
```

### 3. Interpret Results

| PAM Value | Interpretation |
|-----------|-----------------|
| 0.0-0.1 | **Very Low** - target almost never blocked (simple plan) |
| 0.1-0.3 | **Low** - target mostly unblocked (simple-moderate) |
| 0.3-0.5 | **Moderate** - mixed blocking pattern |
| 0.5-0.7 | **High** - frequent blocking (complex) |
| 0.7-1.0 | **Very High** - target frequently blocked (very complex) |

### 4. Save results

```python
import json

results = {
    "plan": rtplan.plan_label,
    "target": target.name,
    "pam": metrics.PAM,
    "num_beams": len(metrics.beam_metrics),
    "beams": [
        {
            "number": bm.beam_number,
            "bam": bm.BAM,
            "mu": bm.monitor_units,
        }
        for bm in metrics.beam_metrics
    ]
}

with open("results.json", "w") as f:
    json.dump(results, f, indent=2)
```

## TypeScript/Frontend: Real-time Display

```typescript
import { parseRTSTRUCT, getStructureByName } from '@/lib/dicom/parser';
import { calculatePlanMetrics } from '@/lib/dicom/metrics';
import type { RTPlan, Structure } from '@/lib/dicom/types';

// React component example
export function MetricsDisplay({ plan, structureBuffer }: 
  { plan: RTPlan, structureBuffer: ArrayBuffer }) {
  
  // Parse structures
  const structures = parseRTSTRUCT(structureBuffer);
  const target = getStructureByName(structures, "GTV");
  
  // Calculate metrics
  const metrics = calculatePlanMetrics(plan, undefined, target);
  
  if (!metrics.PAM) {
    return <p>PAM not available (no target)</p>;
  }
  
  return (
    <div class="metrics">
      <h3>Plan Aperture Modulation</h3>
      <p>PAM: <strong>{metrics.PAM.toFixed(4)}</strong></p>
      <p>{getInterpretation(metrics.PAM)}</p>
      
      <h4>By Beam:</h4>
      <ul>
        {metrics.beam_metrics?.map(bm => (
          <li key={bm.beam_number}>
            Beam {bm.beam_number}: BAM = {bm.BAM?.toFixed(4)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function getInterpretation(pam: number): string {
  if (pam < 0.1) return "Very low complexity";
  if (pam < 0.3) return "Low complexity";
  if (pam < 0.5) return "Moderate complexity";
  if (pam < 0.7) return "High complexity";
  return "Very high complexity";
}
```

## Important Notes

### When PAM is Available
✅ PAM is available when:
- You have loaded a RTSTRUCT file with anatomical structures
- The structure name matches an ROI in the RTSTRUCT
- The plan has at least one beam with control points

❌ PAM is NOT available when:
- No RTSTRUCT file is loaded
- Target structure not found
- Plan has no beams

### Limitations (as of v1.0)
- **Python**: Exact geometry via Shapely (preferred for validation)
- **TypeScript**: Simplified bounding-box approach (suitable for UI)
- Assumes perfect patient positioning (no setup uncertainty)
- No photon transmission through MLCs
- Assumes couch angle = 0°

### Data Requirements
Both RTPLAN and RTSTRUCT files must be:
- Valid DICOM files
- In the same coordinate system (patient or fixed frame)
- Have non-zero area contours

## Common Issues

### "File is not RTSTRUCT"
The file you provided is not an RTSTRUCT (may be CT, RTPLAN, or RTDOSE).
```python
# Check file type
from pydicom import dcmread
ds = dcmread("file.dcm")
print(ds.SOPClassUID)  # Should end in .66 for RTSTRUCT
```

### "Structure not found"
Target structure name doesn't match. Try:
```python
structures = parse_rtstruct("structures.dcm")
print(structures.keys())  # See available structures
```

### PAM is None
Structure was found but PAM calculation failed. Likely cause:
- Structure has zero area (all points on same line)
- Contour is malformed
- Beam has no control points

Check with:
```python
print(f"Target area: {target.contours[0].numberOfPoints}")
print(f"Beam CPs: {len(beam.control_points)}")
```

## Full API Reference

### `parse_rtstruct(file_path: str) -> Dict[str, Structure]`
Parse DICOM RTSTRUCT file and return all structures.

### `get_structure_by_name(structures, label) -> Optional[Structure]`
Retrieve structure by name (exact, case-insensitive, or partial match).

### `calculate_plan_metrics(rtplan, machine_params=None, structure=None) -> PlanMetrics`
Calculate all metrics including PAM if structure provided.

**Returns** `PlanMetrics` with:
- `.PAM` - Plan aperture modulation [0, 1]
- `.beam_metrics[]` - Array of BeamMetrics with `.BAM`

## Learn More

- **Mathematical Details**: [ALGORITHMS.md](docs/ALGORITHMS.md)
- **Source Paper**: DOI 10.1002/mp.70144
- **Unit Tests**: [test_pam.py](python/tests/test_pam.py)
- **Example Script**: [pam_analysis.py](python/examples/pam_analysis.py)

---

**Questions?** See the implementation summary or check function docstrings.
