# Audit Report

_Generated 2026-07-25T22:41:50Z_

- Plans analyzed: **25**

## Layer 1 — TS ↔ Python parity

| Metric | n | Mean Δ | Max Δ | Tol | Pass |
|---|---:|---:|---:|---:|:--:|
| AAV | 25 | 0.000000 | 0.000000 | 0.0001 | ✓ |
| EFS | 25 | 0.000000 | 0.000000 | 0.5 | ✓ |
| EM | 25 | 0.000000 | 0.000000 | 0.01 | ✓ |
| JA | 24 | 0.000000 | 0.000000 | 1.0 | ✓ |
| LG | 25 | 0.000000 | 0.000000 | 0.5 | ✓ |
| LS | 25 | 0.000000 | 0.000000 | 0.5 | ✓ |
| LSV | 25 | 0.000000 | 0.000000 | 0.0001 | ✓ |
| LT | 25 | 0.000000 | 0.000000 | 0.1 | ✓ |
| LTMCS | 25 | 0.000000 | 0.000000 | 0.001 | ✓ |
| LTMU | 25 | 0.000256 | 0.003200 | 0.1 | ✓ |
| MAD | 25 | 0.000000 | 0.000000 | 0.5 | ✓ |
| MCS | 25 | 0.000000 | 0.000000 | 0.0001 | ✓ |
| MFA | 25 | 0.000000 | 0.000000 | 0.5 | ✓ |
| MUCA | 25 | 0.000000 | 0.000000 | 0.5 | ✓ |
| PA | 24 | 0.000000 | 0.000000 | 1.0 | ✓ |
| PI | 25 | 0.000000 | 0.000000 | 0.1 | ✓ |
| PM | 25 | 0.000000 | 0.000000 | 0.0001 | ✓ |
| SAS10 | 25 | 0.000000 | 0.000000 | 0.02 | ✓ |
| SAS2 | 25 | 0.000000 | 0.000000 | 0.02 | ✓ |
| SAS20 | 25 | 0.000000 | 0.000000 | 0.02 | ✓ |
| SAS5 | 25 | 0.000000 | 0.000000 | 0.02 | ✓ |
| TG | 25 | 0.000000 | 0.000000 | 0.01 | ✓ |
| psmall | 25 | 0.000000 | 0.000000 | 0.02 | ✓ |
| totalMU | 25 | 0.000000 | 0.000000 | 0.5 | ✓ |

## Layer 2 — ApertureComplexity (Younge edge metric)

- Plans compared: 25
- Mean |Δ(EM, CI)|: 0.0707 mm⁻¹
- Max  |Δ(EM, CI)|: 0.1959 mm⁻¹

> Different formulations — reported for transparency, NOT equivalence.

## Layer 3 — UCoMx v1.1 (MATLAB)

- Status: **skipped** — UCoMx v1.1 MATLAB reference dataset not present in this sandbox (expected at testdata/reference_dataset_v1.1/0-all-20262822356.397/dataset.xlsx). Last archived run results are preserved in src/lib/validation-data.ts.
