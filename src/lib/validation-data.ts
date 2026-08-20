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
  { metric: "SAS2", tolerance: 0.02, unit: "—", category: "accuracy" },
  { metric: "SAS5", tolerance: 0.02, unit: "—", category: "accuracy" },
  { metric: "SAS10", tolerance: 0.02, unit: "—", category: "accuracy" },
  { metric: "SAS20", tolerance: 0.02, unit: "—", category: "accuracy" },
  { metric: "PI", tolerance: 0.1, unit: "—", category: "accuracy" },
  { metric: "EM", tolerance: 0.01, unit: "—", category: "accuracy" },
  { metric: "TG", tolerance: 0.01, unit: "—", category: "accuracy" },
  // Deliverability
  { metric: "MUCA", tolerance: 0.5, unit: "—", category: "deliverability" },
  { metric: "LTMU", tolerance: 0.1, unit: "mm/MU", category: "deliverability" },
  { metric: "LS", tolerance: 0.5, unit: "mm/s", category: "deliverability" },
  { metric: "PA", tolerance: 1.0, unit: "cm²", category: "deliverability" },
  { metric: "JA", tolerance: 1.0, unit: "cm²", category: "deliverability" },
  { metric: "MCSv", tolerance: 0.0001, unit: "—", category: "core" },
  { metric: "BJAR", tolerance: 0.001, unit: "—", category: "deliverability" },
  { metric: "LTNL", tolerance: 0.1, unit: "mm/leaf", category: "deliverability" },
  { metric: "PMU", tolerance: 0.5, unit: "MU/fx", category: "deliverability" },
  { metric: "MUcGy", tolerance: 0.001, unit: "MU/cGy", category: "deliverability" },
];

// ---------- Cross-validation summary ----------

export const CROSS_VALIDATION_SUMMARY = {
  planCount: 25,
  passCount: 25,
  failCount: 0,
  lastValidated: "2026-07-24",
  scriptPath: "python/tests/audit_all.py",
  ucomxComparedMetrics: 24,
  pycomplexityComparedPlans: 25,
} as const;

// Per-metric TS↔Python deltas from python/tests/reference_data/audit_summary.json
// (Regenerate via: cd python && python tests/audit_all.py)
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
  { metric: "SAS2", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.02, passed: true },
  { metric: "SAS5", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.02, passed: true },
  { metric: "SAS10", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.02, passed: true },
  { metric: "SAS20", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.02, passed: true },
  { metric: "PI", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.1, passed: true },
  { metric: "EM", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.01, passed: true },
  { metric: "TG", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.01, passed: true },
  { metric: "MUCA", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.5, passed: true },
  { metric: "LTMU", meanDelta: 0.000008, maxDelta: 0.000138, tolerance: 0.1, passed: true },
  { metric: "LS", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 0.5, passed: true },
  { metric: "PA", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 1.0, passed: true },
  { metric: "JA", meanDelta: 0.000000, maxDelta: 0.000000, tolerance: 1.0, passed: true },
];

// ---------- Per-plan ApertureComplexity (Younge edge metric) audit ----------
// Source: python/tests/reference_data/audit_pycomplexity_per_plan.json
// IMPORTANT: Complementary indicator, NOT an equivalence test.
//   - Ours `EM` = perimeter / (2 · aperture_area), MU-weighted, always ≥ 0
//   - PyComplexity `CI` = signed Younge edge metric (perimeter / area)
// Negative CI values come from MRIdian-style plans with inverted leaf geometry.
export interface PycomplexityPlanEntry {
  plan: string;
  tsEM: number;
  pyCI: number;
  absDelta: number;
}

export const PER_PLAN_PYCOMPLEXITY: PycomplexityPlanEntry[] = [
  { plan: "RP1.2.752.243.1.1.20230623170950828.2520.26087.dcm", tsEM: 0.1495, pyCI: 0.0994, absDelta: 0.0501 },
  { plan: "RP.TG119.CS_ETH_2A_#1.dcm", tsEM: 0.0730, pyCI: 0.1000, absDelta: 0.0270 },
  { plan: "RP.TG119.CS_TB_2A_#1.dcm", tsEM: 0.0977, pyCI: 0.0882, absDelta: 0.0095 },
  { plan: "RP.TG119.HN_ETH_2A_#1.dcm", tsEM: 0.0607, pyCI: 0.0756, absDelta: 0.0148 },
  { plan: "RP.TG119.MT_ETH_2A_#1.dcm", tsEM: 0.0870, pyCI: 0.0592, absDelta: 0.0279 },
  { plan: "RP.TG119.PR_ETH_2A_2.dcm", tsEM: 0.0960, pyCI: 0.0919, absDelta: 0.0042 },
  { plan: "RP.TG119.PR_UN_2A_#1.dcm", tsEM: 0.1343, pyCI: 0.1284, absDelta: 0.0058 },
  { plan: "RP.TG119.CS_ETH_9F.dcm", tsEM: 0.2533, pyCI: 0.0574, absDelta: 0.1959 },
  { plan: "RP.TG119.HN_ETH_7F.dcm", tsEM: 0.2084, pyCI: 0.0898, absDelta: 0.1186 },
  { plan: "RP.TG119.HN_TB_7F.dcm", tsEM: 0.2595, pyCI: 0.1427, absDelta: 0.1168 },
  { plan: "RP.TG119.MT_ETH_7F.dcm", tsEM: 0.2232, pyCI: 0.0655, absDelta: 0.1578 },
  { plan: "RP.TG119.PR_ETH_7F.dcm", tsEM: 0.1912, pyCI: 0.0808, absDelta: 0.1104 },
  { plan: "RP.TG119.PR_UN_7F.dcm", tsEM: 0.2152, pyCI: 0.1135, absDelta: 0.1017 },
  { plan: "RTPLAN_MO_PT_01.dcm", tsEM: 0.1247, pyCI: 0.1089, absDelta: 0.0159 },
  { plan: "RTPLAN_MO_PT_02.dcm", tsEM: 0.3000, pyCI: 0.2762, absDelta: 0.0238 },
  { plan: "RTPLAN_MO_PT_03.dcm", tsEM: 0.2640, pyCI: 0.3929, absDelta: 0.1288 },
  { plan: "RTPLAN_MO_PT_04.dcm", tsEM: 0.1409, pyCI: 0.1226, absDelta: 0.0183 },
  { plan: "RTPLAN_EL_PT_01.dcm", tsEM: 0.0914, pyCI: 0.0967, absDelta: 0.0053 },
  { plan: "RTPLAN_EL_PT_03.dcm", tsEM: 0.2251, pyCI: 0.2417, absDelta: 0.0165 },
  { plan: "RTPLAN_PI_PT_01.dcm", tsEM: 0.1093, pyCI: 0.1061, absDelta: 0.0031 },
  { plan: "RTPLAN_PI_PT_03.dcm", tsEM: 0.0938, pyCI: 0.1039, absDelta: 0.0101 },
  { plan: "RTPLAN_MR_PT_01_PENALTY.dcm", tsEM: 0.0430, pyCI: -0.0970, absDelta: 0.1400 },
  { plan: "RTPLAN_MR_PT_02_PENALTY.dcm", tsEM: 0.0460, pyCI: -0.1325, absDelta: 0.1786 },
  { plan: "RTPLAN_MR_PT_03_O&C.dcm", tsEM: 0.0353, pyCI: -0.1576, absDelta: 0.1929 },
  { plan: "RTPLAN_MR_PT_05_A3i.dcm", tsEM: 0.0000, pyCI: 0.0927, absDelta: 0.0927 },
];

// ---------- UCoMx layer status (live re-run requires archived MATLAB dataset) ----------
export const UCOMX_AUDIT_STATUS = {
  status: "archived" as const,
  reason:
    "UCoMx v1.1 MATLAB reference (Zenodo 8276837) ships with the developer dataset, not the " +
    "public repo. The last full per-plan re-run agreed within tolerance for all 24 comparable " +
    "metrics across the 25 TG-119 plans. Re-run locally with " +
    "`python tests/cross_validate_ucomx.py` after placing dataset.xlsx under " +
    "testdata/reference_dataset_v1.1/.",
  comparableMetricCount: 24,
  notImplementedUCoMxMetrics: [
    "MIt", "MIs", "MIa",
    "psmall_20mm", "psmall_30mm",
    "SAS25mm", "SAS50mm",
  ],
} as const;

// ---------- Known implementation gaps surfaced by the audit ----------
export const KNOWN_GAPS = [
  {
    metric: "EM (dual-layer MLC — MRIdian A3i)",
    issue:
      "Edge-metric still returns 0 on RTPLAN_MR_PT_05_A3i.dcm. The 2026-07-24 " +
      "parser update (accepting Eclipse MLCX1/MLCX2 stacked-MLC device types) " +
      "resolved 8 of the 9 previously-affected plans; A3i uses a different " +
      "leaf-geometry convention that our perimeter walker still normalises to zero.",
    impact: "Affects 1 of 25 audit plans (down from 9).",
  },
  {
    metric: "Park MI_t / MI_s / MI_a",
    issue:
      "UCoMx v1.1 exposes Park's modulation indices but RTp-lens does not " +
      "implement them yet. Attempting to add them without the UCoMx MATLAB " +
      "reference dataset (unavailable in this sandbox) risks silent formula " +
      "drift, so they remain on the roadmap rather than being shipped un-validated.",
    impact: "Reported under 'Not implemented' in the audit; no incorrect values shown.",
  },
] as const;

// ---------- Conformality (RTSTRUCT) analytic validation ----------
// Conformality cannot enter the numeric TS↔Python audit table because the
// TG-119 audit corpus ships RTPLAN files without matching RTSTRUCTs.
// Instead, both implementations are pinned by the SAME analytic unit tests.

export interface ConformalityCase {
  name: string;
  expected: string;
}

export const CONFORMALITY_VALIDATION = {
  metrics: ["BAM", "PAM", "TCOV", "ATR", "MARG", "MARGMIN"],
  tsModule: "src/lib/dicom/conformality.ts",
  pyModule: "python/rtplan_complexity/conformality.py",
  tsTest: "src/test/conformality.test.ts",
  pyTest: "python/tests/test_pam.py",
  tsBackend: "polygon-clipping",
  pyBackend: "shapely",
  tsCaseCount: 18,
  pyCaseCount: 22,
  lastValidated: "2026-08-14",
  note:
    "BAM/PAM were rewritten from a jaw-bounding-box placeholder to true MLC+jaw " +
    "polygon geometry with divergent BEV projection (IEC 61217). The target " +
    "silhouette is the per-control-point convex hull of the projected ROI cloud — " +
    "an approximation that over-estimates concave targets.",
  cases: [
    { name: "Isocentre maps to BEV origin", expected: "(0, 0)" },
    { name: "Divergence at 100 mm upstream depth", expected: "scale = SAD / 900" },
    { name: "Gantry 90° in-plane point", expected: "x = 0, y = 20 · SAD/990" },
    { name: "Collimator 90° rotation", expected: "(10, 20) → (20, −10)" },
    { name: "20 mm cube silhouette area", expected: "≈ 400 mm² (±5%)" },
    { name: "Two symmetric leaf pairs, jaw-clipped", expected: "400 mm²" },
    { name: "Concentric squares (60 vs 40 mm)", expected: "TCOV = 1, ATR = 2.25, MARGMIN = 10 mm" },
    { name: "Half-overlapping aperture", expected: "TCOV = 0.5, ATR = 1.0" },
    { name: "Closed aperture, MU-weighted beam", expected: "TCOV = 0, BAM = 1" },
    { name: "No RTSTRUCT / ROI selected", expected: "undefined (never 0)" },
  ] as ConformalityCase[],
} as const;





// ---------- Third-party Benchmark: ApertureComplexity ----------

export interface ThirdPartyBenchmarkPlan {
  filename: string;
  edgeMetric: number; // mm^-1
}

export const THIRD_PARTY_BENCHMARK = {
  tool: "ApertureComplexity (PyComplexityMetric)",
  toolUrl: "https://github.com/victorgabr/ApertureComplexity",
  metric: "Younge edge metric (perimeter / area, MU-weighted)",
  units: "mm⁻¹",
  reference: "Younge et al., Med. Phys. 39(11), 2012",
  description:
    "Independent third-party reference (open-source, victorgabr/ApertureComplexity). " +
    "Computes the Younge edge metric — complementary to UCoMx MCS — to verify our DICOM parser " +
    "and MU weighting against an external implementation across all 25 TG-119 plans.",
  scriptPath: "python/tests/benchmark_pycomplexity.py",
  planCount: 25,
  successful: 25,
  min: -0.1576,
  max: 0.3929,
  mean: 0.0939,
  highlights: [
    { filename: "RTPLAN_MO_PT_03.dcm", edgeMetric: 0.3929 },
    { filename: "RTPLAN_EL_PT_03.dcm", edgeMetric: 0.2417 },
    { filename: "RP.TG119.HN_TB_7F.dcm", edgeMetric: 0.1427 },
    { filename: "RP.TG119.CS_ETH_2A_#1.dcm", edgeMetric: 0.1000 },
    { filename: "RP.TG119.CS_ETH_9F.dcm", edgeMetric: 0.0574 },
  ] as ThirdPartyBenchmarkPlan[],
} as const;

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

// ---------- GitHub source file links ----------

export const GITHUB_BASE_URL =
  "https://github.com/matteomaspero/rt-complexity-lens/blob/main/";

export const SOURCE_FILES = [
  {
    label: "Audit orchestrator (all 3 layers)",
    path: "python/tests/audit_all.py",
  },
  {
    label: "TS↔Python cross-validation",
    path: "python/tests/cross_validate.py",
  },
  {
    label: "UCoMx v1.1 cross-validation",
    path: "python/tests/cross_validate_ucomx.py",
  },
  {
    label: "Markdown audit report",
    path: "python/tests/reference_data/AUDIT_REPORT.md",
  },
  {
    label: "Audit summary (JSON)",
    path: "python/tests/reference_data/audit_summary.json",
  },
  {
    label: "Per-plan PyComplexity audit (JSON)",
    path: "python/tests/reference_data/audit_pycomplexity_per_plan.json",
  },
  {
    label: "Independent reference implementation",
    path: "python/tests/external_reference.py",
  },
  {
    label: "Third-party benchmark (ApertureComplexity)",
    path: "python/tests/benchmark_pycomplexity.py",
  },
  {
    label: "Third-party benchmark data",
    path: "python/tests/reference_data/benchmark_pycomplexity.json",
  },
  {
    label: "TS reference data generator",
    path: "src/test/export-metrics-json.test.ts",
  },
  {
    label: "Tolerance definitions",
    path: "src/lib/validation-data.ts",
  },
  {
    label: "Reference data (JSON)",
    path: "python/tests/reference_data/reference_metrics_ts.json",
  },
] as const;

// ---------- Shared algorithmic details ----------

export const SHARED_ALGORITHMS = [
  "CA midpoint interpolation (average adjacent CP MLC/jaw positions)",
  "Union aperture A_max = Σ(per-leaf max gap × effective width)",
  "Masi per-bank LSV: mean(1 − |diff| / max_diff) for active adjacent leaves",
  "AAV = area_ca / A_max_union (McNiven 2010, UCoMx Eq. 29–30)",
  "Per-CP AAV backfilled as A_cp / A_max_union for UI consistency",
  "MCS = LSV × AAV, MU-weighted (Eq. 2 from McNiven 2010)",
  "MAD reference axis = jaw center (X1+X2)/2, not isocenter",
  "TGI (Webb 2001 / Younge 2016): Σ(|ΔbankA|+|ΔbankB|) / Σ(gap_i + gap_{i+1})",
  "Independent third-source benchmark: python/tests/external_reference.py",
] as const;
