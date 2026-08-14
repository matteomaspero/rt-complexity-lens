# Fix: uploaded Monaco plan fails to parse on the published site

## What I verified

Your file (`rtplan_2.16.840.1.114337.1.10848.1785395016.0.dcm`) parses correctly on the current code:

- Elekta Monaco VMAT, plan `31_AEV1recR`, 1 beam, 199 control points, 2 CCW rotations
- 777.47 MU, 2.00 Gy x 25 fx = 50.00 Gy, MLC layout `ASYMY` + `MLCX`
- Full metric set computes (MCS 0.272, LSV 0.567, AAV 0.480, EM 0.111, ...)
- Verified through the real upload path in the running app on `/` (viewer renders) and `/batch` (row appears, stats compute), plus a direct Node-side parse

So the parser is not broken. The failure is specific to the published build at `rt-complexity-lens.lovable.app`, which predates the parser fixes made in the recent audit rounds — notably the MLC-boundary selection fix (preferring the `MLCX` definition whose leaf count matches the leaf-position data) and the stacked `MLCX1`/`MLCX2` handling. An older bundle hitting a Monaco plan with an `ASYMY` + `MLCX` layout is exactly the case those fixes addressed.

## Plan

1. Republish the project so the live site ships the current parser and metric code.
2. Re-test the same file on the published URL after deploy: load it on the home page and confirm the viewer header shows `31_AEV1recR`, 1 beam, 777 MU, and that the metrics panel is populated.
3. If it still fails on the published site only, capture the exact on-screen error text and browser console output from that page and diagnose from there (next suspects would be a cached bundle or a browser-specific `File`/`ArrayBuffer` issue, not the parser).

## Notes

No source changes are needed for this issue. Nothing about the metric definitions or validation data changes.
