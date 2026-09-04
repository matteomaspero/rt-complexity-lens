# Fix FFF energy recognition and FFF dose rate

The user is right. On their TrueBeam plan the three treatment arcs are flagged as flattening-filter-free in the file (Primary Fluence Mode = NON_STANDARD, mode ID = FFF, planned dose rate 1400 MU/min), but the tool ignores that tag completely:

- The energy label is guessed from the **beam name** (`Arc 1`, `Arc 2`, `Arc 3`) — no "FFF" in the name, so every arc is shown as `6X` instead of `6FFF`. The same guess also wrongly labels any beam named "SRS"/"SBRT" as FFF even when it is a flattened beam.
- Because the beam is not seen as FFF, the delivery-time and dose-rate estimates always use the single machine dose rate (typically 600 MU/min) instead of the FFF rate. The per-energy dose rates that already exist in the machine presets are never consulted anywhere in the calculation.
- The dose rate actually planned in the file (1400 MU/min on the arcs, 600 on the setup fields) is never read.

Nothing is wrong with the user's configuration; this is a gap in the tool.

## What will change for users

- Beam energy shows the real fluence mode: `6FFF`, `10FFF`, `6X`, taken from the plan file, with an "FFF" marker on the beam summary and comparison tables.
- Delivery time, average dose rate, MU/degree and the limiting-factor label use the correct dose rate per beam: the dose rate written in the plan when present, otherwise the per-energy value from the selected machine preset (FFF rows included).
- A small note next to the delivery numbers says where the dose rate came from (plan file vs. machine preset), so users can see it is no longer a single global number.
- Setup/imaging fields keep their own (non-FFF) energy and rate, so mixed plans read correctly.
- Exports gain the fluence mode and the dose rate used, so the change is traceable.

## Technical scope

**Parsing (`src/lib/dicom/parser.ts`, `python/rtplan_complexity/parser.py`)**
- Read `PrimaryFluenceModeSequence (3002,0050)` → `FluenceMode (3002,0051)` and `FluenceModeID (3002,0052)`. `NON_STANDARD` + ID (e.g. `FFF`, `SRS`) sets `fluenceMode`/`fluence_mode` and `isFFF`.
- Energy label priority: fluence mode tag → beam-name `FFF` token as fallback → plain `<E>X`. Drop the `SRS|SBRT` name heuristic.
- Read `DoseRateSet (300A,0115)` from the control points; store `doseRateSet` (first non-zero) on the beam.
- Extend `Beam` in `src/lib/dicom/types.ts` and `python/rtplan_complexity/types.py` with `fluenceMode`, `isFFF`, `doseRateSet` (snake_case in Python).

**Metrics (`src/lib/dicom/metrics.ts`, `python/rtplan_complexity/metrics.py`)**
- Resolve an effective max dose rate per beam: `beam.doseRateSet` if > 0, else `getDoseRateForEnergy(params, beam.energyLabel, beam.isFFF)` (this helper exists in `src/lib/threshold-definitions.ts` but is currently unused; add the Python equivalent).
- Pass it into `estimateBeamDeliveryTime` / `_estimate_beam_delivery_time` in place of `machineParams.maxDoseRate`, and use it for the per-segment dose-rate variation (mDRV) path.
- Surface `maxDoseRateUsed` and `doseRateSource` (`'plan' | 'preset'`) on beam metrics; propagate `fluenceMode`/`isFFF` alongside `energyLabel`.

**UI**
- `BeamSummaryCard.tsx`, `BeamComparisonTable.tsx`: FFF badge plus dose-rate-source tooltip.
- `MachineCharacteristicsCard.tsx`: show that per-energy FFF rates are applied automatically.

**Export / docs / tests**
- `src/lib/export-utils.ts`: add `fluenceMode` and `doseRateUsed` columns (batch/cohort/comparison exporters inherit them).
- `docs/ALGORITHMS.md`: document fluence-mode detection and the dose-rate resolution order; `docs/LOVABLE_CONTEXT.md` and README where delivery parameters are described.
- Tests: parser unit test asserting FFF label from the fluence-mode tag and non-FFF for an `SRS`-named flattened beam; metrics test asserting delivery time scales with the resolved rate. Python parity check on the same assertions. The uploaded patient plan is used only for local verification, not committed.

Educational-use disclaimers stay unchanged; no metric is presented as clinically validated.
