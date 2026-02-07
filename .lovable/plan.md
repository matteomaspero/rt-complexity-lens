

# Plan: Fix Demo Loader Click Interception in Batch Mode and all the other modes

## Problem

The `BatchDemoLoader` and the rest of the component is placed inside the `BatchUploadZone` container, but an invisible file input (`<input type="file" className="absolute inset-0 opacity-0">`) covers the entire container. This causes all clicks on the demo buttons to be intercepted by the file input, triggering the file picker dialog instead of loading demo data.

## Solution

Move the `BatchDemoLoader` **outside** the upload zone container so it's not covered by the invisible file input. The same issue likely exists in `CohortUploadZone`.

## Changes Required

### 1. BatchUploadZone.tsx

Restructure to separate the dropzone from the demo loader:

```
BEFORE:
+------------------------------------------+
| <div container with file input overlay>  |
|   <input absolute inset-0 /> ← intercepts|
|   [Upload text and icons]                |
|   <BatchDemoLoader /> ← clicks blocked   |
+------------------------------------------+

AFTER:
+------------------------------------------+
| <div container with file input overlay>  |
|   <input absolute inset-0 />             |
|   [Upload text and icons]                |
+------------------------------------------+
<BatchDemoLoader /> ← now clickable
```

### 2. CohortUploadZone.tsx

Apply the same fix - move `CohortDemoLoader` outside the upload container.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/batch/BatchUploadZone.tsx` | Move `BatchDemoLoader` outside the container div |
| `src/components/cohort/CohortUploadZone.tsx` | Move `CohortDemoLoader` outside the container div |

## Implementation Details

### BatchUploadZone.tsx

Current structure (problematic):
```tsx
<div className="relative ..." onDrop={...}>
  <input className="absolute inset-0 opacity-0" />
  <div>Upload text...</div>
  <BatchDemoLoader className="mt-4 ..." />  {/* INSIDE - blocked */}
</div>
```

Fixed structure:
```tsx
<div className="space-y-4">
  <div className="relative ..." onDrop={...}>
    <input className="absolute inset-0 opacity-0" />
    <div>Upload text...</div>
  </div>
  <BatchDemoLoader />  {/* OUTSIDE - clickable */}
</div>
```

### CohortUploadZone.tsx

Apply the same structural change to ensure the demo loader is outside the file input overlay.

## Estimated Changes

| File | Lines Modified |
|------|---------------|
| `src/components/batch/BatchUploadZone.tsx` | ~10 lines |
| `src/components/cohort/CohortUploadZone.tsx` | ~10 lines |

**Total: ~20 lines across 2 files**

