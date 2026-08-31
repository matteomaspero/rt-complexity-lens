# Fix RTSTRUCT target placement in the BEV aperture view

## What I found in your two files

The plan and the structure set share the same frame of reference, and the structure set even contains an `isoc` point ROI at (16, 91, 12) mm, exactly matching the plan isocentre. So the coordinates are consistent — the projection is not reading the wrong frame.

Two separate things make the overlay look misplaced:

1. **The displayed window is sized only around the leaves.** The MLC aperture view builds its viewBox from leaf/jaw extents plus 20 mm. For this plan the projected target spans roughly x -76..41 mm and y 0..76 mm, while the field is jaw Y -30..35 mm with leaves inside about +-60 mm. Everything of the target outside that window is clipped, so the outline appears cut off, shifted, or invisible.

2. **The default ROI is not the target this plan treats.** The plan is `01_AGlioom42Gy` and its isocentre matches `PTV2_4200` / `CTV2_4200` (centre approx. x 36, y 91, z 13). The current default picks the first PTV-like ROI, i.e. `PTV_6000_20251027`, whose centre sits about 37 mm cranial of this plan's isocentre. Overlaying that ROI legitimately looks off-field, and it also explains the very low TCOV reported earlier.

Additionally the SVG draws with y increasing downward, so the whole BEV (leaves and target together) is shown flipped relative to the usual convention of cranial up. Leaves and target stay mutually consistent, but an asymmetric target reads as mirrored.

## Changes

**MLC aperture viewer (`src/components/viewer/MLCApertureViewer.tsx`)**
- Include the target outline bounding box when computing the viewBox, so the projected silhouette is always fully visible together with the aperture.
- Draw the BEV with cranial up (single flip applied to the whole geometry group: leaves, jaws, target, crosshair), keeping labels upright.
- Add small axis labels (`X` leaf travel, `Y` cranial) so orientation is unambiguous.

**Target selection (`src/lib/dicom/conformality.ts`, `src/contexts/StructureContext.tsx`, `src/components/viewer/ConformalityPanel.tsx`, `src/components/viewer/StructureSelector.tsx`)**
- Extend the default target heuristic so, when the plan isocentre is known, the ROI whose centroid is closest to the isocentre wins among PTV/CTV/GTV candidates. Name-based scoring stays as the fallback.
- Show, per ROI in the selector, the 3D distance from its centroid to the plan isocentre so the user can see which ROI belongs to the plan.
- When the selected ROI centroid is far from the isocentre (> 30 mm) or MU-weighted coverage is very low, display an inline note that this ROI is probably not the target treated by this plan and that conformality numbers will be misleading. No calculation changes.

**Compare view**
- Apply the same viewBox and orientation handling wherever `MLCApertureViewer` is reused (`InteractiveViewer`, comparison viewers), since they share the component.

**Docs**
- Note in `docs/ALGORITHMS.md` that the BEV display is drawn cranial-up, that the target silhouette is included in the view extent, and that the default ROI pick is isocentre-aware.

## Notes

- Purely presentation plus target-picking changes; the conformality mathematics (BAM/PAM, TCOV, ATR, MARG) and Python parity stay untouched, so no Python mirror is needed.
- Verification: run lint, vitest, and build, plus a browser check loading your plan and structure set to confirm the outline sits inside the aperture window for `PTV2_4200`.
- Educational tool only — not clinically validated.
