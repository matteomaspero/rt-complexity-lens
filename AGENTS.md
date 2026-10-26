# Agent rules

- The 3D treatment room (`src/components/viewer/linac3d/`) is lazy-loaded React Three Fiber and reads the CP index from `ControlPointPlaybackContext`; it never drives its own timer — keeps every panel in lockstep.
- Gantry motion in any visualization goes through `src/lib/dicom/gantry-path.ts` (bounded ±185° travel, no wrap under the couch) — mirrors real mechanical stops.
