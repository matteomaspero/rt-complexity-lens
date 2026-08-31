# Support headerless DICOM (Elekta Monaco export)

## What's wrong

Both uploaded files are valid Elekta Monaco DICOM objects:

- `0066648_Glioom42Gy.dcm` — RT Plan, 1 dynamic photon beam, 137 control points, ASYMY jaw + 80-pair MLCX, 1 fraction group.
- `0066648_StrctrSets.dcm` — RT Structure Set, 35 ROIs (incl. `CTV_6000_20251027`, `CTV2_4200`, brainstem, chiasm, cochleae), all with contour data.

They fail in the app because they were written **without the DICOM Part-10 file header**: no 128-byte preamble, no `DICM` magic, no file-meta group, and the dataset is Implicit VR Little Endian. The parser calls `dicomParser.parseDicom(byteArray)` directly, which throws:

```text
dicomParser.readPart10Header: DICM prefix not found at location 132 -
this is not a valid DICOM P10 file.
```

Verified: parsing the same bytes with an explicit `TransferSyntaxUID: 1.2.840.10008.1.2` fallback reads the plan label (`01_AGlioom42Gy`) and beam sequence correctly. So this is purely a header-detection gap, not a data problem.

## Fix

Add one shared, tolerant entry point and use it everywhere a DICOM byte array is parsed:

1. New helper `readDicomDataSet(byteArray)` in `src/lib/dicom/parser.ts`:
   - If bytes 128–132 are `DICM`, parse as Part-10 (current behaviour, unchanged).
   - Otherwise treat the data as a headerless (raw) dataset and retry with `{ TransferSyntaxUID: '1.2.840.10008.1.2' }` (Implicit VR LE), then `'1.2.840.10008.1.2.1'` (Explicit VR LE) as a second attempt.
   - If all attempts fail, throw a clear message naming the likely cause instead of the raw dicom-parser text.
2. Route `parseRTPlan` (line 614) and `parseRTSTRUCT` (line 716) through the helper.
3. Sanity-check the parsed object is what the caller expects (SOP Class / Modality) so uploading an RTSTRUCT into the plan drop zone gives a useful error rather than "0 beams".

## Verification

- Parse both uploaded files through the real app pipeline (parse + metrics + conformality) and confirm: 137 control points, non-zero MU, all 35 ROI names read, and TCOV/ATR/MARG computed against `CTV_6000_20251027`.
- Add a regression test in `src/test/dicom-parser.test.ts` covering a headerless Implicit VR dataset.
- Mirror the same tolerant read in `python/rtplan_complexity/parser.py` (`pydicom.dcmread(..., force=True)`) so toolkit parity holds, and note the headerless-export support in `docs/ALGORITHMS.md`.

## Notes

The two files stay session-only and are not committed to the project; they are used only to validate the fix.
