
# Plan: Create Cross-Validation Reference Data Generator

## Summary

Create the missing reference data generation script that allows Python tests to validate against TypeScript metric calculations.

---

## Current State

| Component | Status |
|-----------|--------|
| Website metrics calculation | ✅ Working - verified with demo plan |
| TypeScript unit tests | ✅ Available in `src/test/dicom-metrics.test.ts` |
| Python parser | ✅ Complete in `python/rtplan_complexity/parser.py` |
| Python metrics | ✅ Complete in `python/rtplan_complexity/metrics.py` |
| Reference data generator | ❌ Missing - documented but not implemented |
| Cross-validation tests | ⏸ Skipped - no reference data file |

---

## Changes Overview

### 1. Create Reference Data Generator Script

Create `scripts/generate-reference-data.ts`:
- Parse all test DICOM files from `public/test-data/`
- Calculate metrics using TypeScript implementation
- Export results as JSON to `python/tests/reference_data/expected_metrics.json`

### 2. Add npm Script

Update `package.json`:
```json
{
  "scripts": {
    "generate-reference-data": "npx tsx scripts/generate-reference-data.ts"
  }
}
```

### 3. Install tsx for Script Execution

Add `tsx` as a dev dependency to run TypeScript scripts directly.

---

## Technical Details

### Generator Script Structure

```text
scripts/generate-reference-data.ts
├── Import parser and metrics from src/lib/dicom
├── List all .dcm files in public/test-data/
├── For each file:
│   ├── Parse DICOM file using parseRTPlan()
│   ├── Calculate metrics using calculatePlanMetrics()
│   └── Store results with filename as key
├── Write JSON to python/tests/reference_data/expected_metrics.json
└── Print summary of generated data
```

### Reference Data JSON Format

```json
{
  "RTPLAN_MO_PT_01.dcm": {
    "MCS": 0.2282,
    "LSV": 0.7127,
    "AAV": 0.1166,
    "MFA": 15.9,
    "LT": 41265.63,
    "LTMCS": 0.0055,
    "totalMU": 1055.05,
    "beamCount": 4,
    "beamMetrics": [
      {
        "beamName": "Arc 1",
        "MCS": 0.2156,
        "LSV": 0.6892,
        "AAV": 0.1234,
        "beamMU": 263.76
      }
    ]
  }
}
```

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `scripts/generate-reference-data.ts` | **New file** - TypeScript generator script |
| `package.json` | Add `generate-reference-data` npm script |

---

## Workflow After Implementation

1. Run `npm run generate-reference-data` to create reference data
2. Reference data written to `python/tests/reference_data/expected_metrics.json`
3. Run `pytest python/tests/` to validate Python against TypeScript
4. All metrics should match within tolerance (1e-4)

---

## Alternative: Manual Testing

If script creation is not preferred, manual testing can verify parity:

1. Load same test file in web app, record metrics
2. Run Python on same file:
   ```python
   from rtplan_complexity import parse_rtplan, calculate_plan_metrics
   plan = parse_rtplan("RTPLAN_MO_PT_01.dcm")
   metrics = calculate_plan_metrics(plan)
   print(f"MCS: {metrics.MCS}, LSV: {metrics.LSV}")
   ```
3. Compare values manually

---

## Test Files Available

| Filename | Description |
|----------|-------------|
| `RTPLAN_MO_PT_01.dcm` | Monaco VMAT Plan 01 |
| `RTPLAN_MO_PT_02.dcm` | Monaco VMAT Plan 02 |
| `RTPLAN_MO_PT_03.dcm` | Monaco VMAT Plan 03 |
| `RTPLAN_MO_PT_04.dcm` | Monaco VMAT Plan 04 |
| `RTPLAN_MR_PT_01_PENALTY.dcm` | Monaco with penalty |
| `RP.TG119.PR_ETH_7F.dcm` | TG-119 test plan (7 fields) |
| `RP.TG119.PR_ETH_2A_2.dcm` | TG-119 test plan (2 arcs) |
| `RP1.2.752.243.1.1.20230623170950828.2520.26087.dcm` | Complex VMAT |
