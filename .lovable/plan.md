

# Update docs/ALGORITHMS.md

## Overview

Update the algorithm documentation to reflect three recent changes:

1. The ComplexityCalc-aligned perimeter algorithm now used for EM and PI
2. The MU-weighted aggregation rationale for EM and PI at beam/plan level
3. Known residual divergence sources (MRIdian leaf geometry)
4. Known differences from UCoMx framework

## Changes to docs/ALGORITHMS.md

### 1. Rewrite EM section (lines 111-119)

Replace the current simplified EM definition with the full ComplexityCalc-aligned algorithm:

- Document the `side_perimeter` walking algorithm: contiguous open leaf groups, horizontal edges at group boundaries, vertical steps between adjacent leaves, end-caps (effWidth x 2), and full X+Y jaw clipping
- Define EM = P / (2A) per control point
- State beam-level aggregation as MU-weighted mean of per-CP EM values (not ratio of totals)
- Explain why MU-weighted averaging is physically correct for VMAT plans with non-uniform dose-rate modulation
- Add reference to ComplexityCalc (Jothy/ComplexityCalc, GitHub)

### 2. Rewrite PI section (lines 121-134)

Replace the current simplified PI definition:

- Define PI (Aperture Irregularity) = P^2 / (4 pi A) per control point, using the same ComplexityCalc-aligned perimeter
- State beam-level aggregation as MU-weighted mean of per-CP AI values
- Add note that the squared perimeter amplifies any perimeter differences

### 3. Add new section: "Known Differences from Reference Implementations"

Insert a new section before "Cross-Validation Workflow" (around line 639) covering:

**Differences from UCoMx (Cavinato et al., Med Phys 2024):**
- LSV y_max scope: RTp-lens computes y_max per bank across all CPs in the beam (matching the UCoMx paper Eq. 31-32), not per control point
- EM and PI are not part of UCoMx; they originate from Du et al. 2014 / Younge et al. 2016 and are aligned to ComplexityCalc
- AAV union area: RTp-lens computes A_max_union as the maximum per-leaf-pair gap across all CPs in the beam, matching UCoMx Eq. 29-30

**Differences from ComplexityCalc (Du et al., Med Phys 2014):**
- Aggregation: ComplexityCalc uses trapezoidal interpolation of meterset weights; RTp-lens uses CA midpoint delta-MU weighting (consistent with UCoMx Eq. 2)
- Perimeter algorithm: Now aligned -- both use the `side_perimeter` group-walking approach with jaw clipping
- Area calculation: Now aligned -- both apply full X+Y jaw clipping

**Residual Divergence (from cross-validation testing):**
- Eclipse, Monaco, Pinnacle plans: EM and PI within 1-3% of ComplexityCalc reference
- RayStation, Elements plans: up to 5% residual divergence, attributed to differences in meterset weight interpolation (trapezoidal vs. delta-MU)
- MRIdian plans: up to ~35% divergence on PI, caused by MRIdian's non-standard double-stacked MLC leaf geometry (0.415 cm leaf width, 138 leaf pairs) which amplifies differences in how leaf boundaries and end-caps are computed; this is a known limitation and does not indicate an error in either algorithm

### 4. Add ComplexityCalc to References section (line 661)

Add a new reference entry:

- Jothy/ComplexityCalc. "Complexity metrics for radiotherapy treatment plans." GitHub. https://github.com/Jothy/ComplexityCalc
- Cavinato S, et al. "UCoMX: A unified complexity metric framework for VMAT plan evaluation." Med Phys. 2024. (already implicitly referenced, make explicit)

### 5. Update Cross-Validation Workflow (lines 641-658)

Expand to mention the EM/PI cross-validation test (`src/test/em-pi-cross-validation.test.ts`) alongside the existing TS-vs-Python workflow, noting it uses MU-weighted averaging and the expected tolerance levels per TPS vendor.

## Technical Detail: Perimeter Algorithm Pseudocode (to include in EM section)

```
for each leaf i:
  clip leaf width to Y-jaw -> effWidth
  clip leaf positions to X-jaw -> a, b
  gap = b - a
  if gap <= 0:
    if previous leaf was open: add bottom horizontal edge (prevB - prevA)
    mark closed
  else:
    if previous leaf was closed: add top horizontal edge (gap)
    else: add vertical steps |a - prevA| + |b - prevB|
    add end-caps: effWidth * 2
    mark open
if last leaf was open: add bottom horizontal edge
```

## Files Modified

Only `docs/ALGORITHMS.md` -- documentation update, no code changes.

