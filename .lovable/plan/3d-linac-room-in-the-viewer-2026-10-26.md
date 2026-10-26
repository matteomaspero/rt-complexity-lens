# 3D Linac Room in the Viewer

Add an interactive 3D treatment room to the plan viewer, driven by the loaded RT plan's control points, adapted from the Radiotherapy Planner project's linac scene with its known defects fixed.

## What the user gets
- A new "3D Room" panel in the Viewer (enlargeable like the other panels), showing gantry, collimator, jaws, MLC leaves, couch and a supine patient.
- Follows the shared control-point playback: play/pause and stepping move the 3D machine in sync with the MLC, gantry and collimator views.
- Educational disclaimer shown on the panel (not a clinically validated machine model).

## Fixes vs. the reference scene
1. **Stray wall element removed**: the floating block + cylinder + ring on the back wall behind the gantry (beyond the patient's head) is dropped. The wall stays as a plain, light surface.
2. **Gantry cannot spin through the couch**: rotation is modelled as a bounded travel, not a free 0–360 wrap.
   - Range about -185° to +185° (IEC 61217), with a short overtravel past 180°.
   - Moving from e.g. 179° to 181° takes the short way; moving across the limit (CW arc ending past 180°, then a CCW arc) reverses through 0° instead of crossing 180°.
   - Arc start/stop angles and direction (CW/CCW) from the plan determine the unwrapped path; a warning badge appears if a plan would require exceeding the limit.
3. **MLC simulated per leaf**: every leaf pair (bank A/B) is drawn with the plan's real leaf widths and positions per control point, jaws X1/X2/Y1/Y2 move too, all rotated with the collimator.

## Manual control and shortcuts
A "Manual" toggle detaches the scene from the plan so each axis can be moved:

```text
Space        play / pause
← / →        previous / next control point   (Shift = jump 10)
Home / End   first / last control point
G / Shift+G  gantry +1° / -1°     (clamped to the limits)
C / Shift+C  collimator +1° / -1°
T / Shift+T  couch rotation +1° / -1°
L            cycle MLC: plan / fully open / closed
R            reset camera   1/2/3  camera: beam's-eye, room, top
?            show shortcut help
```
Shortcuts only fire when the panel is focused (not while typing in inputs). A small legend lists them; the handheld-pendant UI of the reference is not copied.

## Technical details
- Install `three`, `@react-three/fiber@^8.18`, `@react-three/drei@^9.122`, `@types/three` (React 18).
- New files: `src/components/viewer/linac3d/LinacRoom3D.tsx` (Canvas, lights with local Lightformer environment, no CDN presets), `LinacMachine.tsx`, `MlcLeaves3D.tsx` (instanced mesh, one draw call), `useLinacShortcuts.ts`.
- Pure helper `src/lib/dicom/gantry-path.ts`: `unwrapGantryPath(angles, directions, limits)` returning continuous angles and a limit-violation flag; unit tests in `src/test/gantry-path.test.ts` (179→181 short path, CW arc 181→179 goes the long way via 0°, out-of-range flagged).
- Reads index from `ControlPointPlaybackContext`; manual overrides live in local component state.
- Lazy-loaded so the main viewer bundle is not affected; theme colours via design tokens.
- Update `docs/LOVABLE_CONTEXT.md`, README and Help page with the panel and shortcuts; record the 3D-scene decision in `AGENTS.md`.
- Verify by screenshot (scene renders, wall clean, leaves move between CPs).
