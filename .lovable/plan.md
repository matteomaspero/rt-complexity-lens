

# Fix DICOM Gantry Rotation Direction Parsing (CC vs CCW)

## Problem

The DICOM standard defines Gantry Rotation Direction values as `"CW"`, `"CC"`, and `"NONE"`. However, the codebase uses `"CCW"` instead of `"CC"` throughout. The parser casts the raw DICOM string directly without mapping `"CC"` to `"CCW"`, causing:

1. **Counter-clockwise arcs show "Static" rotation label** -- the `BeamSummaryCard` checks for `'CCW'` which never matches the DICOM value `'CC'`
2. **`isArc` detection partially broken for CC beams** -- the `hasGantryRotation` check looks for `'CCW'`, missing `'CC'` arcs (saved only by the `gantrySpan > 5` fallback)
3. **Wrong rotation icon** -- CC arcs get the `Minus` icon (static) instead of `RotateCcw`

This affects the CS_RS_UN_2A plan (RayStation VMAT) where beams are correctly identified as "VMAT Arc" via the gantry span fallback, but the rotation direction label incorrectly shows "Static".

## Root Cause

In `src/lib/dicom/parser.ts` line 308, the raw DICOM string is cast directly:
```typescript
gantryRotationDirection: hasRotDir 
  ? (gantryRotDir as 'CW' | 'CCW' | 'NONE') 
  : (previousCP?.gantryRotationDirection ?? 'NONE'),
```

When DICOM provides `"CC"`, this gets stored as `"CC"` but the TypeScript type says `'CW' | 'CCW' | 'NONE'`, so no check ever matches it.

## Fix

### 1. Map DICOM `"CC"` to internal `"CCW"` in `src/lib/dicom/parser.ts` (line 307-309)

Add a mapping function that normalizes the DICOM rotation direction values:

```typescript
// Map DICOM rotation direction to internal representation
// DICOM uses "CC" for counter-clockwise, we use "CCW" internally
const mapRotationDirection = (dir: string): 'CW' | 'CCW' | 'NONE' => {
  if (dir === 'CW') return 'CW';
  if (dir === 'CC' || dir === 'CCW') return 'CCW';
  return 'NONE';
};
```

Then use it in the control point parsing:
```typescript
gantryRotationDirection: hasRotDir 
  ? mapRotationDirection(gantryRotDir)
  : (previousCP?.gantryRotationDirection ?? 'NONE'),
```

No other files need changes -- the rest of the codebase already uses `'CCW'` consistently. Only the parser input mapping is missing.

## Files Modified

| File | Change |
|---|---|
| `src/lib/dicom/parser.ts` | Add `mapRotationDirection` helper, use it in `parseControlPoint` to normalize `"CC"` to `"CCW"` |

## Impact

- Counter-clockwise arcs now correctly show the rotation icon and "Counter-CW" label
- `hasGantryRotation` check in `isArc` now works for CC beams (no longer relying solely on gantry span fallback)
- All existing CW and NONE plans are unaffected
- No changes to types, metrics, or other components needed
