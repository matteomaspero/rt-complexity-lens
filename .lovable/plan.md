
# Plan: Update Python Toolkit GitHub URLs

## Summary

Update all references to the Python Toolkit GitHub repository to point to the correct landing page URL: `https://github.com/matteomaspero/rt-complexity-lens/blob/main/python/README.md`

---

## Files to Update

| File | Line | Current URL | Action |
|------|------|-------------|--------|
| `src/pages/Help.tsx` | 885 | `https://github.com/rtplan-complexity/rtplan-complexity` | Replace with correct URL |
| `src/components/viewer/InteractiveViewer.tsx` | 194 | `https://github.com/rtplan-complexity/rtplan-complexity` | Replace with correct URL |
| `src/pages/PythonDocs.tsx` | 58 | `https://github.com/matteomaspero/rt-complexity-lens/tree/main/python` | Update to README.md path |
| `src/pages/PythonDocs.tsx` | 425 | `https://github.com/rtplan-complexity/rtplan-complexity` | Replace with correct URL |
| `src/lib/batch/batch-export.ts` | 193 | `https://github.com/matteomaspero/rt-complexity-lens/tree/main/python` | Update to README.md path |

---

## Changes

All five URLs will be updated to:
```
https://github.com/matteomaspero/rt-complexity-lens/blob/main/python/README.md
```

This ensures users clicking any Python Toolkit link in the application (Help page, Python Docs page, Interactive Viewer, or JSON exports) are directed to the correct documentation landing page.
