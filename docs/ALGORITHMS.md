# Algorithm Documentation

Shared reference for TypeScript and Python implementations.

- TypeScript: `src/lib/dicom/metrics.ts`
- Python: `python/rtplan_complexity/metrics.py`

---

## Primary Metrics

### MCS (Modulation Complexity Score)

Measures overall plan modulation complexity (UCoMx Eq. 33).

```
MCS_ij = LSV_ij × AAV_ij
```

- **Range**: 0–1 (higher = less complex/simpler plan)
- **Aggregation**: MU-weighted (Eq. 2) at beam and plan level
- **Reference**: McNiven AL, et al. Med Phys. 2010;37(2):505-515

### LSV (Leaf Sequence Variability)

Quantifies positional variability between adjacent MLC leaves (UCoMx Eq. 31–32).

Per-bank:
```
LSV_bank = (1 / (N-1)) × Σ (y_max - |y_l - y_{l+1}|) / y_max
```

Where:
- `y_l` = position of leaf l in one bank
- `y_max` = max |y_l - y_{l+1}| across adjacent pairs in the beam
- N = number of active leaves

Combined as **product** of both banks:
```
LSV_ij = LSV_bankA × LSV_bankB
```

- **Range**: 0–1 (higher = more uniform leaf positions)
- **Aggregation**: MU-weighted (Eq. 2) at beam and plan level
- **Reference**: Masi L, et al. Med Phys. 2013;40(7):071718

### AAV (Aperture Area Variability)

Ratio of each control-arc aperture area to the union (maximum) aperture area (UCoMx Eq. 29–30).

```
AAV_ij = A_ij / A_max_union
```

Where:
- `A_ij` = aperture area at control arc j in beam i
- `A_max_union` = union of all aperture boundaries across the beam

- **Range**: 0–1 (lower = smaller apertures relative to max)
- **Aggregation**: MU-weighted (Eq. 2) at beam and plan level
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

Measures aperture edge irregularity as the ratio of perimeter to twice the area (ComplexityCalc-aligned).

```
EM_j = P_j / (2 × A_j)
```

Where `P_j` and `A_j` are the jaw-clipped perimeter and area at control point j.

**Perimeter algorithm (`side_perimeter`):**

The perimeter is computed by walking leaf pairs from one jaw boundary to the other, grouping contiguous open leaves:

```
for each leaf i (within Y-jaw range):
  clip leaf width to Y-jaw boundaries → effWidth
  clip leaf positions to X-jaw boundaries → a, b
  gap = b - a
  if gap ≤ 0:
    if previous leaf was open: add bottom horizontal edge (prevB - prevA)
    mark closed
  else:
    if previous leaf was closed: add top horizontal edge (gap)
    else: add vertical steps |a - prevA| + |b - prevB|
    add end-caps: effWidth × 2
    mark open
if last leaf was open: add bottom horizontal edge
```

**Area** is computed as the sum of `gap × effWidth` for all open leaves within the jaw boundaries.

**Beam-level aggregation**: MU-weighted mean of per-CP values (not ratio of totals):
```
beam_EM = Σ(EM_j × ΔMU_j) / Σ(ΔMU_j)
```

MU-weighted averaging is physically necessary for VMAT plans where control points have non-uniform meterset weights due to dose-rate modulation. Control points delivering more MU contribute proportionally more to the aggregate metric.

- **Unit**: 1/mm
- **Range**: ≥0 (higher = more irregular/jagged aperture edge)
- **Reference**: Younge KC, et al. J Appl Clin Med Phys. 2016;17(4):124-131; ComplexityCalc (Jothy/ComplexityCalc, GitHub)

### PI (Plan Irregularity / Aperture Irregularity)

Deviation of aperture shape from a circular reference, using the ComplexityCalc-aligned perimeter.

```
PI_j = P_j² / (4 × π × A_j)
```

Where `P_j` and `A_j` use the same jaw-clipped `side_perimeter` algorithm as EM.

**Beam-level aggregation**: MU-weighted mean of per-CP values:
```
beam_PI = Σ(PI_j × ΔMU_j) / Σ(ΔMU_j)
```

- **Range**: ≥1 (1 = perfect circle; higher = more irregular)
- **Note**: The squared perimeter term amplifies any differences in perimeter computation between implementations
- **Reference**: Du W, et al. Med Phys. 2014;41(2):021716

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

MU density for VMAT arcs (NCA = NCP − 1).

```
MUCA = beam_MU / N_CA
```

- **Unit**: MU/CA

### LTMU (Leaf Travel per MU)

MLC activity normalized by delivered dose.

```
LTMU = LT / total_MU
```

- **Unit**: mm/MU

### LTNLMU (Leaf Travel per Leaf and MU)

MLC activity normalized by both number of active leaves and delivered dose.

```
LTNLMU = LT / (NL × total_MU)
```

- **Unit**: mm/(leaf·MU)
- **Note**: Accounts for both modulation and aperture complexity

### LNA (Leaf Travel per Leaf and Control Arc)

MLC activity normalized by number of active leaves and control arcs.

```
LNA = LT / (NL × N_CA)
```

Where:
- `NL` = mean number of active leaves
- `N_CA` = number of control arcs (N_CP - 1)

- **Unit**: mm/(leaf·CA)

### NL (Number of active Leaves)

Mean number of active leaves across all control arcs.

```
NL = 2 × (total_active_leaf_count / N_CA)
```

Where:
- `total_active_leaf_count` = sum of active leaf pairs across all control arcs
- Active leaf pair = leaf gap > min_gap threshold (0mm)
- Factor of 2 converts from leaf pairs to individual leaves

- **Unit**: leaves (dimensionless)
- **Range**: 0–(2 × number_of_leaf_pairs)
- **Interpretation**: Higher values indicate larger/more open apertures

### LTAL (Leaf Travel per Arc Length)

MLC activity normalized by gantry arc length (VMAT only).

```
LTAL = LT / arc_length
```

- **Unit**: mm/°
- **Note**: Only applicable to rotational arcs (VMAT)

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

### mGSV (Mean Gantry Speed Variation)

Mean absolute variation in gantry speed between consecutive segments.

```
mGSV = Σ|gantry_speed[i] - gantry_speed[i-1]| / (N_segments - 1)
```

Where:
- `gantry_speed[i]` = gantry rotation rate at segment i
- `N_segments` = number of control arcs

- **Unit**: °/s
- **Interpretation**: Higher values indicate more variable gantry speeds

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

### PA (Plan Area)

Mean aperture area across all control points in Beam's Eye View.

```
PA = mean(aperture_areas) / 100  # Result in cm²
```

- **Unit**: cm²
- **Interpretation**: Average field size during delivery

### JA (Jaw Area)

Area defined by the jaw positions (X and Y collimators).

```
JA = |X2 - X1| × |Y2 - Y1| / 100  # Result in cm²
```

Where:
- `X1, X2` = jaw positions along X axis (mm)
- `Y1, Y2` = jaw positions along Y axis (mm)
- Closed jaws (gap < 0.1mm) result in JA = 0

- **Unit**: cm²
- **Note**: Represents maximum possible aperture size as limited by jaws
- **Electron beams**: JA preserved; MLC-based metrics cleared (electrons use fixed applicators)

### mDRV (Mean Dose Rate Variation)

Mean absolute variation in dose rate between consecutive control arcs.

```
mDRV = Σ|dose_rate[i] - dose_rate[i-1]| / (N_CA - 1)
```

Where:
- `dose_rate[i]` = MU/min at control arc i
- `N_CA` = number of control arcs

- **Unit**: MU/min
- **Interpretation**: Quantifies dose rate modulation during delivery

### MD (Modulation Degree)

Coefficient of variation of meterset weights across control points.

```
MD = std(meterset_weights) / mean(meterset_weights)
```

Where:
- `meterset_weights` = cumulative MU weights at each control point

- **Range**: ≥0 (higher = more variable MU distribution)
- **Interpretation**: Measures uniformity of dose delivery across control points

### MI (Modulation Index)

Normalized leaf travel accounting for number of leaves and control points.

```
MI = LT / (N_leaves × N_CPs)
```

Where:
- `LT` = total leaf travel (mm)
- `N_leaves` = number of MLC leaves
- `N_CPs` = number of control points

- **Unit**: mm/leaf/CP
- **Interpretation**: Average leaf movement per control point per leaf

---

## Beam Identification Fields

These fields are extracted directly from DICOM RT Plan metadata for beam characterization.

### Radiation Type

DICOM tag `RadiationType` (300A,00C6). Common values:
- `PHOTON` - High-energy X-rays (typical IMRT/VMAT)
- `ELECTRON` - Electron beams (use applicators instead of MLC)
- `PROTON` - Proton therapy
- `NEUTRON` - Neutron therapy
- `ION` - Heavy ion therapy

### Nominal Beam Energy

DICOM tag `NominalBeamEnergy` (300A,0114).
- **Unit**: MeV (megaelectron volts)
- **Example**: 6.0, 10.0, 15.0, 18.0 (photons); 6.0, 9.0, 12.0, 16.0 (electrons)

### Energy Label

DICOM tag `EnergyLabel` or derived from energy.
- **Format**: Clinical designation (e.g., "6X", "10FFF", "6E", "9E")
- **Suffix meanings**:
  - `X` = Photon beam with flattening filter
  - `FFF` = Flattening Filter Free photon beam
  - `E` = Electron beam

---

## Dose & Prescription Metrics

These metrics are extracted from the DICOM RT Plan headers rather than computed from MLC sequences.

### Prescribed Dose (D_Rx)

Total prescribed dose from the DICOM `DoseReferenceSequence` → `TargetPrescriptionDose` (300A,0026), for `DoseReferenceType == TARGET`.

- **Unit**: Gy

### Dose per Fraction (dpf)

```
dpf = D_Rx / N_fx
```

Derived from the prescribed dose and the number of fractions planned (`NumberOfFractionsPlanned`, 300A,0078).

- **Unit**: Gy/fx

### Number of Fractions (N_fx)

The number of fractions planned, from `FractionGroupSequence` → `NumberOfFractionsPlanned` (300A,0078).

- **Unit**: fx

### MU per Gy

```
MU/Gy = MU_total / D_Rx
```

Ratio of total monitor units to prescribed dose. Higher values may indicate more modulated plans.

- **Unit**: MU/Gy
- **Note**: Only available when the prescribed dose is present in the DICOM file

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

Plan metrics are aggregated from beam metrics using **MU-weighted averaging** (UCoMx Eq. 2):

```
plan_metric = Σ(beam_metric × beam_MU) / Σ(beam_MU)
plan_LT = sum(beam_LT)  # exception: additive
```

### Beam-Level Metrics

Beam metrics are aggregated from control-arc (CA) metrics.
CA midpoints are used: metrics are evaluated at the midpoint between consecutive control points.
MU-weighted averaging (Eq. 2) is used for LSV, AAV, MCS:

```
beam_LSV = Σ(ca_LSV × ΔMU) / Σ(ΔMU)
beam_AAV = Σ(ca_AAV × ΔMU) / Σ(ΔMU)
beam_MCS = Σ(ca_MCS × ΔMU) / Σ(ΔMU)
beam_LT = sum(ca_LT)
```

### PM (Plan Modulation)

Area- and MU-weighted modulation metric (UCoMx Eq. 38):

```
PM_i = 1 - Σ(MU_ij × A_ij) / (MU_i × A_max_union)
```

Where:
- `MU_ij` = MU at control arc j
- `A_ij` = aperture area at control arc j
- `A_max_union` = union aperture area

- **Range**: 0–1 (higher = more modulated)

---

## Target-Specific Metrics

### BAM (Beam Aperture Modulation)

Quantifies the average fraction of a target's projected area that is blocked by MLC/jaws for a single beam.

**Definition:**

Aperture Modulation (AM) at a control point:
```
AM_j = A_blocked / A_target
```

Where:
- `A_target` = total target projection area in Beam's Eye View (BEV)
- `A_blocked` = target projection area outside the beam aperture

Beam Aperture Modulation (BAM):
```
BAM = Σ(AM_j × ΔMU) / Σ(ΔMU)
```

- **Range**: 0–1 (0 = no modulation, target always fully within aperture; 1 = target fully blocked)
- **Aggregation**: MU-weighted average across all control points in the beam
- **Requires**: RTSTRUCT file with target structure
- **BEV Coordinate System**: 3D patient coordinates are projected onto 2D Beam's Eye View plane using gantry angle rotation

**Geometric Projection:**

1. For each control point with gantry angle θ:
   - Transform 3D target contour points to 2D BEV coordinates:
     ```
     x_bev = z × sin(θ) + x × cos(θ)
     y_bev = y
     ```
   - Create 2D polygon from projected contour points

2. Create 2D aperture polygon from MLC and jaw positions at that control point

3. Calculate AM as intersection/difference of target and aperture polygons

4. Weight AM values by MU delivered at that control point

**Implementation**: Uses Shapely library for precise 2D polygon operations (union, intersection, difference, area calculation).

### PAM (Plan Aperture Modulation)

Quantifies the average fraction of a target's projected area that is blocked across the entire treatment plan.

**Definition:**

```
PAM = Σ_beams(BAM_i × MU_i) / Σ_beams(MU_i)
```

Where:
- `BAM_i` = Beam Aperture Modulation for beam i
- `MU_i` = total MU delivered to beam i

- **Range**: 0–1
- **Interpretation**: Weighted average fraction of target projection blocked by aperture across all beams and control points
- **Aggregation**: MU-weighted average from all beams
- **Requires**: RTSTRUCT file with target structure

**Key Features:**

- **Dimensionless**: Pure geometric metric, independent of dose or fractionation
- **Target-Specific**: Computed separately for each target structure (e.g., different PAM for PTV70 vs PTV56)
- **Intuitive**: Values directly represent fraction of target blocked (0 = no modulation, 1 = target fully blocked)
- **Geometrically Precise**: Uses exact polygon-based calculations rather than approximations

**Assumptions & Limitations:**

1. Assumes perfect MLC/jaw positioning (no delivery deviations)
2. Does not account for:
   - Transmission through MLC leaves
   - Field boundaries beyond DICOM-specified jaws
   - Couch angle effects on projection (currently assumes couch_angle = 0)
   - Non-uniform target density or heterogeneities
3. Entire contour projected as continuous region (no slice-by-slice analysis)
4. BEV projection assumes isocentric geometry at specified gantry angles

**Reference:**

[To be filled with actual publication DOI: 10.1002/mp.70144]

---

## Known Differences from Reference Implementations

### Differences from UCoMx (Cavinato et al., Med Phys 2024)

- **LSV y_max scope**: RTp-lens computes `y_max` per bank across all control points in the beam (matching UCoMx Eq. 31–32), not per control point
- **AAV union area**: RTp-lens computes `A_max_union` as the maximum per-leaf-pair gap across all CPs in the beam, matching UCoMx Eq. 29–30
- **EM and PI**: Not part of the UCoMx framework; they originate from Du et al. 2014 (PI) and Younge et al. 2016 (EM). RTp-lens aligns EM/PI to the ComplexityCalc reference implementation

### Differences from ComplexityCalc (Du et al., Med Phys 2014)

- **Aggregation**: ComplexityCalc uses trapezoidal interpolation of meterset weights; RTp-lens uses control-arc midpoint delta-MU weighting (consistent with UCoMx Eq. 2)
- **Perimeter algorithm**: Now aligned — both use the `side_perimeter` group-walking approach with full X+Y jaw clipping
- **Area calculation**: Now aligned — both apply full X+Y jaw clipping to aperture area

### Residual Divergence (from cross-validation testing)

| TPS Vendor | EM Divergence | PI Divergence | Notes |
|---|---|---|---|
| Eclipse, Monaco, Pinnacle | 1–3% | 1–3% | Uniform CP spacing minimises interpolation differences |
| RayStation, Elements | up to 5% | up to 5% | Non-uniform meterset weights; attributed to trapezoidal vs. delta-MU interpolation |
| MRIdian | ~5% | ~35% | Non-standard double-stacked MLC (0.415 cm leaf width, 138 leaf pairs); amplifies perimeter end-cap and boundary differences |

The MRIdian PI divergence is a known limitation caused by the unique leaf geometry and does not indicate an error in either algorithm. The squared perimeter in the PI formula (`P²/4πA`) amplifies small absolute perimeter differences into larger relative divergences.

---

## Cross-Validation Workflow

### TypeScript ↔ Python (all metrics)

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

### EM/PI ↔ ComplexityCalc

The cross-validation test (`src/test/em-pi-cross-validation.test.ts`) compares RTp-lens EM and PI values against ComplexityCalc reference data using MU-weighted averaging:

- Eclipse/Monaco/Pinnacle plans: expected within 3%
- RayStation/Elements plans: expected within 5%
- MRIdian plans: PI may diverge up to ~35% (see Residual Divergence table above)

---

## References

1. McNiven AL, et al. "A new metric for assessing IMRT modulation complexity and plan deliverability." *Med Phys.* 2010;37(2):505-515. [DOI: 10.1118/1.3276775](https://doi.org/10.1118/1.3276775)

2. Masi L, et al. "Impact of plan parameters on the dosimetric accuracy of volumetric modulated arc therapy." *Med Phys.* 2013;40(7):071718. [DOI: 10.1118/1.4810969](https://doi.org/10.1118/1.4810969)

3. Crowe SB, et al. "Treatment plan complexity metrics for predicting IMRT pre-treatment quality assurance results." *Australas Phys Eng Sci Med.* 2014;37:475-482. [DOI: 10.1007/s13246-014-0274-9](https://doi.org/10.1007/s13246-014-0274-9)

4. Younge KC, et al. "Predicting deliverability of VMAT plans using aperture complexity analysis." *J Appl Clin Med Phys.* 2016;17(4):124-131. [DOI: 10.1120/jacmp.v17i4.6241](https://doi.org/10.1120/jacmp.v17i4.6241)

5. Du W, et al. "Quantification of beam complexity in IMRT treatment plans." *Med Phys.* 2014;41(2):021716. [DOI: 10.1118/1.4861821](https://doi.org/10.1118/1.4861821)

6. Muralidhar V, et al. "Plan aperture modulation: a new metric for assessing 3D geometry of aperture modulation in radiotherapy." *Med Phys.* 2024. [DOI: 10.1002/mp.70144](https://doi.org/10.1002/mp.70144)

7. Cavinato S, et al. "UCoMX: A unified complexity metric framework for VMAT plan evaluation." *Med Phys.* 2024. [DOI: 10.1002/mp.17457](https://doi.org/10.1002/mp.17457)

8. Jothy/ComplexityCalc. "Complexity metrics for radiotherapy treatment plans." GitHub. [https://github.com/Jothy/ComplexityCalc](https://github.com/Jothy/ComplexityCalc)

