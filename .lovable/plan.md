
# Test Plan: RT Plan Complexity Analyzer Verification

## Overview
This plan covers testing the viewer by integrating the provided DICOM-RT test files and creating an automated test suite to verify parsing and visualization work correctly.

---

## Part 1: Fix Console Errors

The console shows React warnings about function components not being able to receive refs. This needs to be fixed first to ensure clean operation:

### 1.1 Add forwardRef to FileUploadZone
The `FileUploadZone` component is being passed a ref from somewhere in the component tree. Wrap it with `React.forwardRef` to properly handle refs.

### 1.2 Add forwardRef to InteractiveViewer
Similarly wrap `InteractiveViewer` with `forwardRef` to eliminate the warning.

---

## Part 2: Test Data Integration

Copy the provided DICOM test files to the project's `public/test-data/` directory so they can be used for:
- Manual testing (downloadable from the app)
- Automated unit/integration tests
- Demo purposes

### Files to Copy
```text
public/test-data/
├── RP1.2.752.243.1.1.20230623170950828.2520.26087.dcm
├── RTPLAN_MO_PT_01.dcm
├── RTPLAN_MO_PT_02.dcm
├── RTPLAN_MO_PT_03.dcm
├── RTPLAN_MO_PT_04.dcm
├── RTPLAN_MR_PT_01_PENALTY.dcm
├── RP.TG119.PR_ETH_7F.dcm
└── RP.TG119.PR_ETH_2A_2.dcm
```

---

## Part 3: Automated Test Suite

Create comprehensive tests for the DICOM parsing and metrics calculation.

### 3.1 DICOM Parser Tests (`src/test/dicom-parser.test.ts`)
Test the parsing logic with real DICOM files:

- **File loading**: Verify files can be read as ArrayBuffer
- **Basic parsing**: Confirm `parseRTPlan()` returns valid `RTPlan` objects
- **Plan metadata extraction**: Verify patient ID, plan label, technique detection
- **Beam extraction**: Check beam count, beam names, control point counts
- **MLC position parsing**: Verify Bank A/B leaf positions are extracted
- **Jaw position parsing**: Verify X1, X2, Y1, Y2 jaw positions
- **Control point inheritance**: Verify MLC positions are inherited when not redefined
- **Fraction group parsing**: Verify MU values are correctly extracted

### 3.2 Metrics Calculation Tests (`src/test/dicom-metrics.test.ts`)
Test the UCoMX complexity metric calculations:

- **MCS calculation**: Verify Modulation Complexity Score is computed
- **LSV calculation**: Verify Leaf Sequence Variability is in valid range [0,1]
- **AAV calculation**: Verify Aperture Area Variability computation
- **MFA calculation**: Verify Mean Field Area is positive and reasonable
- **Leaf Travel**: Verify total leaf travel is positive
- **LTMCS**: Verify combined metric is computed correctly
- **Per-beam metrics**: Verify each beam has its own metrics
- **MU-weighted aggregation**: Verify plan-level metrics aggregate correctly

### 3.3 Test Utilities (`src/test/test-utils.ts`)
Helper functions for loading test data:

- `loadTestFile(filename)`: Fetch file from `/test-data/` and return ArrayBuffer
- `parseTestPlan(filename)`: Load and parse a test DICOM file
- `TEST_FILES`: Constants with all available test file names

---

## Part 4: Demo Mode with Test Data

Add a "Load Demo Plan" feature to the upload zone for users who don't have DICOM files handy:

### 4.1 Demo Button Component
Add a button below the upload zone that says "Load Demo Plan" which fetches one of the test files automatically.

### 4.2 Quick Access Test Panel (Development Only)
For development/testing, add a collapsible panel showing all available test files with one-click loading.

---

## Technical Details

### Test File Structure
```text
src/test/
├── setup.ts              # Existing test setup
├── example.test.ts       # Existing placeholder
├── test-utils.ts         # NEW: Test utilities for loading files
├── dicom-parser.test.ts  # NEW: Parser unit tests
└── dicom-metrics.test.ts # NEW: Metrics calculation tests
```

### Sample Test Cases

**Parser Test Example:**
```typescript
describe('parseRTPlan', () => {
  it('should parse VMAT plan with multiple control points', async () => {
    const plan = await parseTestPlan('RP.TG119.PR_ETH_7F.dcm');
    
    expect(plan.beams.length).toBeGreaterThan(0);
    expect(plan.technique).toBe('VMAT');
    expect(plan.totalMU).toBeGreaterThan(0);
    
    const beam = plan.beams[0];
    expect(beam.controlPoints.length).toBeGreaterThan(2);
    expect(beam.isArc).toBe(true);
  });
});
```

**Metrics Test Example:**
```typescript
describe('calculatePlanMetrics', () => {
  it('should compute valid UCoMX metrics', async () => {
    const plan = await parseTestPlan('RTPLAN_MO_PT_01.dcm');
    const metrics = calculatePlanMetrics(plan);
    
    expect(metrics.MCS).toBeGreaterThanOrEqual(0);
    expect(metrics.MCS).toBeLessThanOrEqual(1);
    expect(metrics.LSV).toBeGreaterThanOrEqual(0);
    expect(metrics.MFA).toBeGreaterThan(0);
    expect(metrics.LT).toBeGreaterThanOrEqual(0);
  });
});
```

---

## Implementation Sequence

1. **Copy test files** to `public/test-data/`
2. **Fix forwardRef warnings** in viewer components
3. **Create test utilities** for loading DICOM files in tests
4. **Write parser tests** covering all extraction logic
5. **Write metrics tests** verifying UCoMX calculations
6. **Add demo button** for quick manual testing
7. **Run full test suite** and verify all tests pass

---

## Success Criteria

- All 8 DICOM test files parse without errors
- Parser extracts beam, control point, and MLC data correctly
- UCoMX metrics are calculated within expected ranges
- No console errors or warnings in the application
- Automated tests can be run with `npm test`
- Demo mode allows instant testing without file upload
