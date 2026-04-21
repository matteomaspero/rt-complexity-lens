/**
 * Export TypeScript-computed metrics for all test plans to JSON.
 * This JSON is consumed by the Python cross-validation script
 * (python/tests/cross_validate.py) to confirm TS ↔ Python parity.
 *
 * Run:  npm test -- export-metrics-json
 */
import { describe, it } from 'vitest';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { parseTestPlan, TEST_FILES, getAllTestFiles } from './test-utils';
import { calculatePlanMetrics } from '@/lib/dicom/metrics';

describe('Export TS metrics to JSON', () => {
  it('should export all plan metrics to reference_metrics_ts.json', () => {
    const outputDir = join(process.cwd(), 'python', 'tests', 'reference_data');
    mkdirSync(outputDir, { recursive: true });

    const results: Record<string, Record<string, unknown>> = {};

    for (const filename of getAllTestFiles()) {
      const plan = parseTestPlan(filename);
      const metrics = calculatePlanMetrics(plan);

      // Build a map of beamNumber -> treatmentMachineName from parsed beam data
      const machineByBeam = new Map<number, string | undefined>();
      for (const beam of plan.beams) {
        machineByBeam.set(beam.beamNumber, beam.treatmentMachineName);
      }

      // Extract the flat plan-level metrics (exclude beamMetrics array)
      const flat: Record<string, unknown> = {
        MCS: metrics.MCS,
        LSV: metrics.LSV,
        AAV: metrics.AAV,
        MFA: metrics.MFA,
        LT: metrics.LT,
        LTMCS: metrics.LTMCS,
        totalMU: metrics.totalMU,
        beamCount: metrics.beamMetrics.length,
        controlPointCount: metrics.beamMetrics.reduce(
          (acc, b) => acc + (b.numberOfControlPoints ?? 0),
          0
        ),
      };

      // Add optional UCoMX metrics
      const optionalKeys = [
        'SAS2', 'SAS5', 'SAS10', 'SAS20',
        'MAD', 'LG', 'EFS', 'psmall', 'PI', 'EM', 'TG',
        'MUCA', 'LTMU', 'LS', 'mDRV', 'GT', 'GS', 'LTNLMU', 'LNA', 'LTAL',
        'mGSV', 'PM', 'MD', 'MI', 'PA', 'JA',
        'avgDoseRate', 'avgMLCSpeed', 'totalDeliveryTime',
        'estimatedDeliveryTime', 'arcLength',
      ] as const;

      for (const key of optionalKeys) {
        const val = (metrics as unknown as Record<string, unknown>)[key];
        if (val !== undefined && val !== null) {
          flat[key] = val;
        }
      }

      // Per-beam top-level metrics including energy info
      flat.beamMetrics = metrics.beamMetrics.map((b) => ({
        beamName: b.beamName,
        beamNumber: b.beamNumber,
        radiationType: b.radiationType,
        nominalBeamEnergy: b.nominalBeamEnergy,
        energyLabel: b.energyLabel,
        treatmentMachineName: machineByBeam.get(b.beamNumber) ?? null,
        MCS: b.MCS,
        LSV: b.LSV,
        AAV: b.AAV,
        MFA: b.MFA,
        LT: b.LT,
        LTMCS: b.LTMCS,
        beamMU: b.beamMU,
        numberOfControlPoints: b.numberOfControlPoints,
        // Beam geometry
        gantryAngleStart: b.gantryAngleStart,
        gantryAngleEnd: b.gantryAngleEnd,
        collimatorAngleStart: b.collimatorAngleStart,
        collimatorAngleEnd: b.collimatorAngleEnd,
        patientSupportAngle: b.patientSupportAngle ?? null,
        isocenterPosition: b.isocenterPosition ?? null,
        tableTopVertical: b.tableTopVertical ?? null,
        tableTopLongitudinal: b.tableTopLongitudinal ?? null,
        tableTopLateral: b.tableTopLateral ?? null,
        // Deliverability
        GT: b.GT ?? null,
        arcLength: b.arcLength ?? null,
        estimatedDeliveryTime: b.estimatedDeliveryTime ?? null,
        avgDoseRate: b.avgDoseRate ?? null,
        MUCA: b.MUCA ?? null,
        LTMU: b.LTMU ?? null,
        PA: b.PA ?? null,
        JA: b.JA ?? null,
      }));

      results[filename] = flat;
    }

    const output = {
      generatedAt: new Date().toISOString(),
      generator: 'TypeScript (vitest)',
      testFiles: Object.keys(TEST_FILES),
      plans: results,
    };

    const outPath = join(outputDir, 'reference_metrics_ts.json');
    writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`Wrote ${Object.keys(results).length} plans to ${outPath}`);
  });
});
