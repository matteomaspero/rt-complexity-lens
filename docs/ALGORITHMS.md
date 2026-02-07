# Algorithm Documentation

Shared reference for TypeScript and Python implementations.
See `src/lib/dicom/metrics.ts` and `python/rtplan_complexity/metrics.py`.

## Primary Metrics

### MCS (Modulation Complexity Score)
```
MCS = LSV × (1 - AAV)
```
Range: 0-1 (higher = less complex)

### LSV (Leaf Sequence Variability)
```
LSV = 1 - mean(sum(|pos[i+1] - pos[i]|) / (n × pos_max))
```
Measures positional variability between adjacent leaves.

### AAV (Aperture Area Variability)
```
AAV = |area_current - area_previous| / area_previous
```
Relative change in aperture area between control points.

### MFA (Mean Field Area)
```
MFA = sum(aperture_areas) / count / 100  # cm²
```

### LT (Leaf Travel)
```
LT = sum(|pos_current - pos_previous|) for all leaves
```

## Synchronization Workflow

1. Update this document with algorithm changes
2. Run `npm run generate-reference-data`
3. Update Python implementation
4. Run `pytest python/tests/`
