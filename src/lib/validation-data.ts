/**
 * Static cross-validation and benchmark data.
 *
 * Updated whenever offline cross-validation is re-run via:
 *   cd python && python tests/cross_validate.py
 */

export interface MetricTolerance {
  metric: string;
  tolerance: number;
  unit: string;
  category: "core" | "derived" | "accuracy" | "deliverability";
}

export interface MetricDelta {
  metric: string;
  meanDelta: number;
  maxDelta: number;
  tolerance: number;
  passed: boolean;
}

export interface UCoMXBenchmarkEntry {
  metric: string;
  agreement: string;
  description: string;
}

// ---------- Tolerances (from cross_validate.py) ----------

export const METRIC_TOLERANCES: MetricTolerance[] = [
  // Core UCoMx (CA midpoint)
  { metric: "MCS", tolerance: 0.0001, unit: "—", category: "core" },
  { metric: "LSV", tolerance: 0.0001, unit: "—", category: "core" },
  { metric: "AAV", tolerance: 0.0001, unit: "—", category: "core" },
  { metric: "LT", tolerance: 0.1, unit: "mm", category: "core" },
  { metric: "totalMU", tolerance: 0.5, unit: "MU", category: "core" },
  // Derived
  { metric: "LTMCS", tolerance: 0.001, unit: "—", category: "derived" },
  { metric: "MFA", tolerance: 0.5, unit: "cm²", category: "derived" },
  { metric: "PM", tolerance: 0.0001, unit: "—", category: "derived" },
  // Accuracy / QA
  { metric: "MAD", tolerance: 0.5, unit: "mm", category: "accuracy" },
  { metric: "LG", tolerance: 0.5, unit: "mm", category: "accuracy" },
  { metric: "EFS", tolerance: 0.5, unit: "mm", category: "accuracy" },
  { metric: "psmall", tolerance: 0.02, unit: "—", category: "accuracy" },
  { metric: "SAS5", tolerance: 0.02, unit: "—", category: "accuracy" },
  { metric: "SAS10", tolerance: 0.02, unit: "—", category: "accuracy" },
  { metric: "PI", tolerance: 0.1, unit: "—", category: "accuracy" },
  { metric: "EM", tolerance: 0.01, unit: "—", category: "accuracy" },
  { metric: "TG", tolerance: 0.01, unit: "—", category: "accuracy" },
  // Deliverability
  { metric: "MUCA", tolerance: 0.5, unit: "—", category: "deliverability" },
  { metric: "LTMU", tolerance: 0.1, unit: "mm/MU", category: "deliverability" },
  { metric: "LS", tolerance: 0.5, unit: "mm/s", category: "deliverability" },
  { metric: "PA", tolerance: 1.0, unit: "cm²", category: "deliverability" },
  { metric: "JA", tolerance: 1.0, unit: "cm²", category: "deliverability" },
];

// ---------- Cross-validation summary ----------

export const CROSS_VALIDATION_SUMMARY = {
  planCount: 25,
  passCount: 25,
  failCount: 0,
  lastValidated: "2026-02-18",
  scriptPath: "python/tests/cross_validate.py",
} as const;

export const PER_METRIC_DELTAS: MetricDelta[] = [
  { metric: "MCS", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.0001, passed: true },
  { metric: "LSV", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.0001, passed: true },
  { metric: "AAV", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.0001, passed: true },
  { metric: "LT", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.1, passed: true },
  { metric: "totalMU", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.5, passed: true },
  { metric: "LTMCS", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.001, passed: true },
  { metric: "MFA", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.5, passed: true },
  { metric: "PM", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.0001, passed: true },
  { metric: "MAD", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.5, passed: true },
  { metric: "LG", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.5, passed: true },
  { metric: "EFS", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.5, passed: true },
  { metric: "psmall", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.02, passed: true },
  { metric: "SAS5", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.02, passed: true },
  { metric: "SAS10", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.02, passed: true },
  { metric: "PI", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.1, passed: true },
  { metric: "EM", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.01, passed: true },
  { metric: "TG", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.01, passed: true },
  { metric: "MUCA", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.5, passed: true },
  { metric: "LTMU", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.1, passed: true },
  { metric: "LS", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.5, passed: true },
  { metric: "PA", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 1.0, passed: true },
  { metric: "JA", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 1.0, passed: true },
];

// ---------- UCoMX v1.1 Benchmark ----------

export const UCOMX_BENCHMARK = {
  referenceVersion: "UCoMX v1.1",
  referenceUrl: "https://zenodo.org/records/8276837",
  datasetDescription: "TG-119 test suite (25 plans)",
  coreMetrics: [
    { metric: "MCS", agreement: "<0.01%", description: "Modulation Complexity Score" },
    { metric: "LSV", agreement: "<0.01%", description: "Leaf Sequence Variability" },
    { metric: "AAV", agreement: "<0.01%", description: "Aperture Area Variability" },
    { metric: "totalMU", agreement: "exact", description: "Total Monitor Units" },
  ] as UCoMXBenchmarkEntry[],
} as const;

// ---------- Shared algorithmic details ----------

export const SHARED_ALGORITHMS = [
  "CA midpoint interpolation (average adjacent CP MLC/jaw positions)",
  "Union aperture A_max = Σ(per-leaf max gap × effective width)",
  "Masi per-bank LSV: mean(1 − |diff| / max_diff) for active adjacent leaves",
  "AAV = area_ca / A_max_union",
  "MCS = LSV × AAV, MU-weighted (Eq. 2 from McNiven 2010)",
  "Plan-level LSV/AAV: unweighted beam average (Eq. 1)",
] as const;
