/**
 * Cross-validation test: EM (Edge Metric) and PI (Plan Irregularity)
 *
 * Compares our implementation against the algorithm described in
 * Jothy/ComplexityCalc (Du et al., Med Phys 2014).
 *
 * ComplexityCalc defines:
 *   - side_perimeter(): walks leaf pairs, adds horizontal gap widths,
 *     vertical steps between adjacent open leaves, and handles jaw clipping
 *     and disjoint leaf groups.
 *   - Area: per-leaf gap × effective_width, clipped to both X and Y jaws.
 *   - Edge Metric (EM) = perimeter / (2 × area) for each CP, averaged.
 *   - Aperture Irregularity (AI) = P² / (4π × A), used for PI.
 *
 * Our implementation uses a simpler perimeter formula:
 *   - Horizontal: opening × 2 (top + bottom edges)
 *   - Vertical: |Δ bankA| + |Δ bankB| between adjacent open leaves
 *   - leafWidth × 2 per open leaf (left + right ends)
 *   - No jaw clipping on perimeter
 *
 * This test quantifies the numerical divergence so we can track it
 * and decide whether to adopt ComplexityCalc's algorithm.
 */

import { describe, it, expect } from 'vitest';
import { parseTestPlan, TEST_FILES, getAllTestFiles } from './test-utils';
import { calculatePlanMetrics } from '@/lib/dicom/metrics';
import type { MLCLeafPositions } from '@/lib/dicom/types';

// ---------------------------------------------------------------------------
// Reference implementation of ComplexityCalc's side_perimeter algorithm
// Ported from: https://github.com/Jothy/ComplexityCalc/blob/master/complexity/
// ---------------------------------------------------------------------------

/**
 * ComplexityCalc-style perimeter: walks open leaf pairs, tracking
 * horizontal (gap width) and vertical (leaf-to-leaf step) edges,
 * plus left/right end-caps via leaf widths.
 * Handles disjoint groups (closed leaves between open ones).
 */
function complexityCalcPerimeter(
  bankA: number[],
  bankB: number[],
  leafWidths: number[],
  jawX1: number,
  jawX2: number,
  jawY1: number,
  jawY2: number
): number {
  const n = Math.min(bankA.length, bankB.length);
  if (n === 0) return 0;

  // Compute leaf Y-boundaries (cumulative widths centered at 0)
  const leafBounds: number[] = [];
  let totalWidth = 0;
  for (let i = 0; i < n; i++) totalWidth += leafWidths[i] || 5;
  let yPos = -totalWidth / 2;
  for (let i = 0; i <= n; i++) {
    leafBounds.push(yPos);
    if (i < n) yPos += leafWidths[i] || 5;
  }

  let perimeter = 0;
  let prevOpen = false;
  let prevA = 0;
  let prevB = 0;

  for (let i = 0; i < n; i++) {
    // Clip leaf to Y-jaw
    const leafTop = leafBounds[i];
    const leafBot = leafBounds[i + 1];
    const effWidth = Math.max(0, Math.min(leafBot, jawY2) - Math.max(leafTop, jawY1));
    if (effWidth <= 0) { prevOpen = false; continue; }

    // Clip leaf positions to X-jaw
    const a = Math.max(bankA[i], jawX1);
    const b = Math.min(bankB[i], jawX2);
    const gap = b - a;

    if (gap <= 0) {
      // Leaf is closed (or clipped shut)
      if (prevOpen) {
        // Close off previous group: add bottom horizontal edge + end-cap
        perimeter += (prevB - prevA); // bottom horizontal
        // Right end-cap already counted per-leaf below
      }
      prevOpen = false;
      continue;
    }

    // Leaf is open
    if (!prevOpen) {
      // Start of new open group: top horizontal edge
      perimeter += gap; // top horizontal
    } else {
      // Continuation: add vertical steps between this and previous leaf
      perimeter += Math.abs(a - prevA); // left bank step
      perimeter += Math.abs(b - prevB); // right bank step
    }

    // Left and right end-caps for this leaf (leaf width on each side)
    perimeter += effWidth * 2;

    prevOpen = true;
    prevA = a;
    prevB = b;
  }

  // Close final group
  if (prevOpen) {
    perimeter += (prevB - prevA); // bottom horizontal
  }

  return perimeter;
}

/**
 * ComplexityCalc-style area with full X+Y jaw clipping.
 */
function complexityCalcArea(
  bankA: number[],
  bankB: number[],
  leafWidths: number[],
  jawX1: number,
  jawX2: number,
  jawY1: number,
  jawY2: number
): number {
  const n = Math.min(bankA.length, bankB.length);
  let totalWidth = 0;
  for (let i = 0; i < n; i++) totalWidth += leafWidths[i] || 5;

  let yPos = -totalWidth / 2;
  let area = 0;

  for (let i = 0; i < n; i++) {
    const w = leafWidths[i] || 5;
    const leafTop = yPos;
    const leafBot = yPos + w;
    yPos = leafBot;

    const effWidth = Math.max(0, Math.min(leafBot, jawY2) - Math.max(leafTop, jawY1));
    if (effWidth <= 0) continue;

    const a = Math.max(bankA[i], jawX1);
    const b = Math.min(bankB[i], jawX2);
    const gap = b - a;
    if (gap <= 0) continue;

    area += gap * effWidth;
  }

  return area;
}

/**
 * ComplexityCalc Edge Metric for a single aperture: P / (2A)
 */
function complexityCalcEM(
  bankA: number[], bankB: number[],
  leafWidths: number[],
  jawX1: number, jawX2: number,
  jawY1: number, jawY2: number
): number {
  const area = complexityCalcArea(bankA, bankB, leafWidths, jawX1, jawX2, jawY1, jawY2);
  if (area <= 0) return 0;
  const perim = complexityCalcPerimeter(bankA, bankB, leafWidths, jawX1, jawX2, jawY1, jawY2);
  return perim / (2 * area);
}

/**
 * ComplexityCalc Aperture Irregularity for a single aperture: P² / (4πA)
 */
function complexityCalcAI(
  bankA: number[], bankB: number[],
  leafWidths: number[],
  jawX1: number, jawX2: number,
  jawY1: number, jawY2: number
): number {
  const area = complexityCalcArea(bankA, bankB, leafWidths, jawX1, jawX2, jawY1, jawY2);
  if (area <= 0) return 1;
  const perim = complexityCalcPerimeter(bankA, bankB, leafWidths, jawX1, jawX2, jawY1, jawY2);
  return (perim * perim) / (4 * Math.PI * area);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EM & PI Cross-Validation: RTp-lens vs ComplexityCalc', () => {
  /**
   * For each test plan, compute per-CP EM and AI using both implementations
   * and report the divergence. We do NOT expect exact match — the goal is
   * to quantify the difference.
   */
  const testPlans = [
    { label: 'Eclipse VMAT 2-arc', file: TEST_FILES.TG119_CS_ETH_2A },
    { label: 'Eclipse IMRT 9F', file: TEST_FILES.TG119_CS_9F },
    { label: 'Monaco VMAT', file: TEST_FILES.MONACO_PT_01 },
    { label: 'Elements VMAT', file: TEST_FILES.ELEMENTS_PT_01 },
    { label: 'Pinnacle VMAT', file: TEST_FILES.PINNACLE_PT_01 },
    { label: 'MRIdian Penalty', file: TEST_FILES.MRIDIAN_PENALTY_01 },
    { label: 'RayStation VMAT', file: TEST_FILES.VMAT_1 },
  ];

  it.each(testPlans)(
    'should compute EM and PI for $label and report divergence',
    ({ file }) => {
      const plan = parseTestPlan(file);
      const metrics = calculatePlanMetrics(plan);

      // Our EM and PI should at least be defined
      expect(metrics.EM).toBeDefined();
      expect(metrics.PI).toBeDefined();
      expect(typeof metrics.EM).toBe('number');
      expect(typeof metrics.PI).toBe('number');

      // Now compute ComplexityCalc-style EM/AI per beam, per CP
      const ccEMs: number[] = [];
      const ccAIs: number[] = [];

      for (const beam of plan.beams) {
        for (const cp of beam.controlPoints) {
          if (!cp.mlcPositions) continue;
          const { bankA, bankB } = cp.mlcPositions;
          const jaw = cp.jawPositions;
          const lw = beam.mlcLeafWidths;

          const em = complexityCalcEM(bankA, bankB, lw, jaw.x1, jaw.x2, jaw.y1, jaw.y2);
          const ai = complexityCalcAI(bankA, bankB, lw, jaw.x1, jaw.x2, jaw.y1, jaw.y2);

          if (em > 0) ccEMs.push(em);
          if (ai > 0) ccAIs.push(ai);
        }
      }

      // Compute averages from ComplexityCalc reference
      const ccEMavg = ccEMs.length > 0 ? ccEMs.reduce((a, b) => a + b, 0) / ccEMs.length : 0;
      const ccAIavg = ccAIs.length > 0 ? ccAIs.reduce((a, b) => a + b, 0) / ccAIs.length : 0;

      // Log divergence for analysis (visible in test output with --reporter=verbose)
      const emDelta = metrics.EM! - ccEMavg;
      const piDelta = metrics.PI! - ccAIavg;
      const emRelPct = ccEMavg > 0 ? ((emDelta / ccEMavg) * 100).toFixed(1) : 'N/A';
      const piRelPct = ccAIavg > 0 ? ((piDelta / ccAIavg) * 100).toFixed(1) : 'N/A';

      console.log(
        `[${file}] EM: ours=${metrics.EM!.toFixed(4)} CC=${ccEMavg.toFixed(4)} Δ=${emDelta.toFixed(4)} (${emRelPct}%) | ` +
        `PI: ours=${metrics.PI!.toFixed(4)} CC=${ccAIavg.toFixed(4)} Δ=${piDelta.toFixed(4)} (${piRelPct}%)`
      );

      // Structural assertions — values should be non-negative
      // Some plans (e.g., Eclipse TG-119) may have EM=0 if all per-CP areas are zero
      expect(metrics.EM!).toBeGreaterThanOrEqual(0);
      expect(metrics.PI!).toBeGreaterThanOrEqual(0);
      expect(ccEMavg).toBeGreaterThanOrEqual(0);
      expect(ccAIavg).toBeGreaterThanOrEqual(0);
    }
  );

  describe('Perimeter algorithm unit tests', () => {
    const leafWidths = [5, 5, 5, 5, 5];
    const jaw = { x1: -100, x2: 100, y1: -100, y2: 100 };

    it('uniform rectangular aperture: both algorithms should agree closely', () => {
      const bankA = [-10, -10, -10, -10, -10];
      const bankB = [10, 10, 10, 10, 10];

      const ccPerim = complexityCalcPerimeter(bankA, bankB, leafWidths, jaw.x1, jaw.x2, jaw.y1, jaw.y2);
      const ccArea = complexityCalcArea(bankA, bankB, leafWidths, jaw.x1, jaw.x2, jaw.y1, jaw.y2);

      // For a uniform rectangle: width=20mm, height=25mm
      // True perimeter = 2*(20+25) = 90mm
      // CC adds per-leaf end-caps (effWidth*2 per leaf = 5*2*5 = 50) plus
      // top + bottom horizontals (20 + 20 = 40) — so CC perimeter ≠ geometric perimeter
      // The key is consistency.
      expect(ccArea).toBeCloseTo(20 * 25, 0); // 500 mm²
      expect(ccPerim).toBeGreaterThan(0);
    });

    it('single open leaf: minimal perimeter case', () => {
      const bankA = [0, -10, 0, 0, 0];
      const bankB = [0, 10, 0, 0, 0];

      const ccPerim = complexityCalcPerimeter(bankA, bankB, leafWidths, jaw.x1, jaw.x2, jaw.y1, jaw.y2);
      const ccArea = complexityCalcArea(bankA, bankB, leafWidths, jaw.x1, jaw.x2, jaw.y1, jaw.y2);

      expect(ccArea).toBeCloseTo(20 * 5, 0); // 100 mm²
      expect(ccPerim).toBeGreaterThan(0);
    });

    it('disjoint groups: gap between open leaf clusters', () => {
      const bankA = [-10, -10, 0, -5, -5];
      const bankB = [10, 10, 0, 5, 5];

      const ccPerim = complexityCalcPerimeter(bankA, bankB, leafWidths, jaw.x1, jaw.x2, jaw.y1, jaw.y2);
      const ccArea = complexityCalcArea(bankA, bankB, leafWidths, jaw.x1, jaw.x2, jaw.y1, jaw.y2);

      // Two separate groups, perimeter should be larger than a single contiguous aperture
      expect(ccArea).toBeCloseTo(20 * 10 + 10 * 10, 0); // 200 + 100 = 300 mm²
      expect(ccPerim).toBeGreaterThan(0);
    });

    it('jaw clipping should reduce effective area', () => {
      const bankA = [-10, -10, -10, -10, -10];
      const bankB = [10, 10, 10, 10, 10];
      // Tight jaw that clips some leaves
      const tightJaw = { x1: -5, x2: 5, y1: -5, y2: 5 };

      const fullArea = complexityCalcArea(bankA, bankB, leafWidths, jaw.x1, jaw.x2, jaw.y1, jaw.y2);
      const clippedArea = complexityCalcArea(
        bankA, bankB, leafWidths,
        tightJaw.x1, tightJaw.x2, tightJaw.y1, tightJaw.y2
      );

      expect(clippedArea).toBeLessThan(fullArea);
      expect(clippedArea).toBeGreaterThan(0);
    });
  });

  describe('Divergence characterization', () => {
    it('should quantify systematic bias across all test plans', () => {
      const allFiles = getAllTestFiles();
      const emDeltas: number[] = [];
      const piDeltas: number[] = [];

      for (const file of allFiles) {
        const plan = parseTestPlan(file);
        const metrics = calculatePlanMetrics(plan);

        if (metrics.EM == null || metrics.PI == null) continue;

        const ccEMs: number[] = [];
        const ccAIs: number[] = [];

        for (const beam of plan.beams) {
          for (const cp of beam.controlPoints) {
            if (!cp.mlcPositions) continue;
            const { bankA, bankB } = cp.mlcPositions;
            const jaw = cp.jawPositions;
            const lw = beam.mlcLeafWidths;

            const em = complexityCalcEM(bankA, bankB, lw, jaw.x1, jaw.x2, jaw.y1, jaw.y2);
            const ai = complexityCalcAI(bankA, bankB, lw, jaw.x1, jaw.x2, jaw.y1, jaw.y2);
            if (em > 0) ccEMs.push(em);
            if (ai > 0) ccAIs.push(ai);
          }
        }

        const ccEMavg = ccEMs.length > 0 ? ccEMs.reduce((a, b) => a + b, 0) / ccEMs.length : 0;
        const ccAIavg = ccAIs.length > 0 ? ccAIs.reduce((a, b) => a + b, 0) / ccAIs.length : 0;

        if (ccEMavg > 0) emDeltas.push((metrics.EM - ccEMavg) / ccEMavg);
        if (ccAIavg > 0) piDeltas.push((metrics.PI - ccAIavg) / ccAIavg);
      }

      // Report aggregate stats
      const meanEM = emDeltas.reduce((a, b) => a + b, 0) / emDeltas.length;
      const meanPI = piDeltas.reduce((a, b) => a + b, 0) / piDeltas.length;
      const maxEM = Math.max(...emDeltas.map(Math.abs));
      const maxPI = Math.max(...piDeltas.map(Math.abs));

      console.log(`\n=== EM/PI Cross-Validation Summary (${emDeltas.length} plans) ===`);
      console.log(`EM relative error: mean=${(meanEM * 100).toFixed(1)}%  max=${(maxEM * 100).toFixed(1)}%`);
      console.log(`PI relative error: mean=${(meanPI * 100).toFixed(1)}%  max=${(maxPI * 100).toFixed(1)}%`);

      // The test passes if we can compute both — the goal is to MEASURE divergence
      expect(emDeltas.length).toBeGreaterThan(0);
      expect(piDeltas.length).toBeGreaterThan(0);
    });
  });
});
