# Algorithm Documentation

Shared reference for TypeScript and Python implementations.

- TypeScript: `src/lib/dicom/metrics.ts`
- Python: `python/rtplan_complexity/metrics.py`

---

## Primary Metrics

### MCS (Modulation Complexity Score)

Measures overall plan modulation complexity.

```
MCS = LSV × (1 - AAV)
```

- **Range**: 0–1 (higher = less complex/simpler plan)
- **Reference**: McNiven AL, et al. Med Phys. 2010;37(2):505-515

### LSV (Leaf Sequence Variability)

Quantifies positional variability between adjacent MLC leaves.

```
LSV = 1 - mean(sum(|pos[i+1] - pos[i]|) / (n × pos_max))
```

Where:
- `pos[i]` = position of leaf i
- `n` = number of leaf pairs
- `pos_max` = maximum leaf extension

- **Range**: 0–1 (higher = more uniform leaf positions)
- **Reference**: Masi L, et al. Med Phys. 2013;40(7):071718

### AAV (Aperture Area Variability)

Relative change in aperture area between consecutive control points.

```
AAV = |area_current - area_previous| / area_previous
```

- **Range**: 0–∞ (lower = more consistent aperture sizes)
- **Reference**: Masi L, et al. Med Phys. 2013;40(7):071718

### MFA (Mean Field Area)

Average aperture area across all control points.

```
MFA = sum(aperture_areas) / count / 100  # Result in cm²
```

- **Unit**: cm²

---

## Secondary Metrics

### LT (Leaf Travel)

Total cumulative MLC leaf movement across all control points.

```
LT = sum(|pos_current - pos_previous|) for all leaves and CPs
```

- **Unit**: mm
- **Note**: Higher values indicate more leaf motion during delivery

### LTMCS (Leaf Travel-weighted MCS)

Combines leaf travel with modulation complexity.

```
LTMCS = MCS / LT  # when LT > 0
```

- **Unit**: 1/mm
- **Interpretation**: Higher values suggest efficient modulation with less movement

### SAS5 / SAS10 (Small Aperture Score)

Fraction of aperture with small leaf gaps.

```
SAS5 = fraction of leaf pairs with gap < 5mm
SAS10 = fraction of leaf pairs with gap < 10mm
```

- **Range**: 0–1
- **Reference**: Crowe SB, et al. Australas Phys Eng Sci Med. 2014

### EM (Edge Metric)

Measures aperture edge irregularity/jaggedness.

```
EM = sum(edge_weights × leaf_differences) / total_edge_length
```

- **Reference**: Younge KC, et al. J Appl Clin Med Phys. 2016

### PI (Plan Irregularity)

Deviation of aperture shape from a circular reference.

```
PI = perimeter / (2 × sqrt(π × area))
```

Where:
- `perimeter` = total aperture edge length
- `area` = aperture area

- **Range**: ≥1 (1 = perfect circle)
- **Reference**: Du W, et al. Med Phys. 2014

---

## Accuracy Metrics

### LG (Leaf Gap)

Mean gap between opposing leaf pairs.

```
LG = mean(right_pos - left_pos) for all leaf pairs
```

- **Unit**: mm

### MAD (Mean Asymmetry Distance)

Average left-right asymmetry of aperture shape.

```
MAD = mean(|left_pos + right_pos|) / 2
```

- **Unit**: mm
- **Interpretation**: 0 = perfectly symmetric

### EFS (Equivalent Field Size)

Effective field size based on aperture area.

```
EFS = sqrt(aperture_area)
```

- **Unit**: mm

### psmall (Percentage Small Fields)

Fraction of control points with small effective field sizes.

```
psmall = count(EFS < threshold) / total_CPs
```

- **Range**: 0–1

---

## Deliverability Metrics

### MUCA (MU per Control Arc)

MU density for VMAT arcs.

```
MUCA = beam_MU / arc_length_degrees
```

- **Unit**: MU/degree

### LTMU (Leaf Travel per MU)

MLC activity normalized by delivered dose.

```
LTMU = LT / total_MU
```

- **Unit**: mm/MU

### GT (Gantry Time)

Estimated time for gantry rotation based on arc and speed limits.

```
GT = arc_length / max_gantry_speed
```

- **Unit**: seconds

### GS (Gantry Speed Variation)

Coefficient of variation of gantry speed across control points.

```
GS = std(gantry_speeds) / mean(gantry_speeds)
```

- **Range**: 0–1 (lower = more constant speed)

### LS (Leaf Speed)

Average MLC leaf speed during delivery.

```
LS = LT / delivery_time
```

- **Unit**: mm/s

### LSV_del (Leaf Speed Variation)

Coefficient of variation of MLC speeds.

```
LSV_del = std(leaf_speeds) / mean(leaf_speeds)
```

- **Range**: 0–1

### TG (Tongue-and-Groove Index)

Potential for tongue-and-groove effect based on adjacent leaf staggering.

```
TG = sum(|adjacent_leaf_gaps|) × weight_factor
```

---

## Delivery Time Estimation

Estimated delivery time considers multiple limiting factors:

```
Est_Time = max(MU_time, Gantry_time, MLC_time)

Where:
  MU_time = total_MU / max_dose_rate
  Gantry_time = arc_length / max_gantry_speed
  MLC_time = max_leaf_travel / max_mlc_speed
```

Machine parameters used:

| Machine | Max Dose Rate | Max Gantry Speed | Max MLC Speed |
|---------|---------------|------------------|---------------|
| Generic | 600 MU/min | 4.8 °/s | 25 mm/s |
| TrueBeam | 600 MU/min | 6.0 °/s | 25 mm/s |
| Halcyon | 800 MU/min | 4.0 °/s | 50 mm/s |
| Versa HD | 600 MU/min | 6.0 °/s | 35 mm/s |

---

## Threshold Evaluation

Metrics can trigger warning or critical status based on thresholds:

```typescript
function evaluateStatus(value, threshold) {
  if (threshold.direction === 'below') {
    if (value < threshold.critical) return 'critical';
    if (value < threshold.warning) return 'warning';
  } else {
    if (value > threshold.critical) return 'critical';
    if (value > threshold.warning) return 'warning';
  }
  return 'normal';
}
```

Direction depends on metric semantics:
- **Below** (alert when low): MCS, LSV
- **Above** (alert when high): LT, AAV, SAS, LTMU

---

## Aggregation Methods

### Plan-Level Metrics

Plan metrics are aggregated from beam metrics:

```
plan_MCS = weighted_mean(beam_MCS, weights=beam_MU)
plan_LT = sum(beam_LT)
plan_MFA = weighted_mean(beam_MFA, weights=beam_CP_count)
```

### Beam-Level Metrics

Beam metrics are aggregated from control point metrics:

```
beam_LSV = mean(cp_LSV) for all CPs
beam_AAV = mean(cp_AAV) for CPs 2..n (needs previous CP)
beam_LT = sum(cp_LT) for all CPs
```

---

## Cross-Validation Workflow

To ensure TypeScript and Python implementations produce identical results:

1. **Generate reference data from TypeScript:**
   ```bash
   npm run generate-reference-data
   ```
   This creates `python/tests/reference_data/expected_metrics.json`

2. **Run Python tests:**
   ```bash
   cd python
   pytest tests/
   ```

3. **Tolerance**: All metrics should match within `1e-4`

---

## References

1. McNiven AL, et al. "A new metric for assessing IMRT modulation complexity and plan deliverability." *Med Phys.* 2010;37(2):505-515. [DOI: 10.1118/1.3276775](https://doi.org/10.1118/1.3276775)

2. Masi L, et al. "Impact of plan parameters on the dosimetric accuracy of volumetric modulated arc therapy." *Med Phys.* 2013;40(7):071718. [DOI: 10.1118/1.4810969](https://doi.org/10.1118/1.4810969)

3. Crowe SB, et al. "Treatment plan complexity metrics for predicting IMRT pre-treatment quality assurance results." *Australas Phys Eng Sci Med.* 2014;37:475-482. [DOI: 10.1007/s13246-014-0274-9](https://doi.org/10.1007/s13246-014-0274-9)

4. Younge KC, et al. "Predicting deliverability of VMAT plans using aperture complexity analysis." *J Appl Clin Med Phys.* 2016;17(4):124-131. [DOI: 10.1120/jacmp.v17i4.6241](https://doi.org/10.1120/jacmp.v17i4.6241)

5. Du W, et al. "Quantification of beam complexity in IMRT treatment plans." *Med Phys.* 2014;41(2):021716. [DOI: 10.1118/1.4861821](https://doi.org/10.1118/1.4861821)
