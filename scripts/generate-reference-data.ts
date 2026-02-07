/**
 * Reference Data Generator for Cross-Validation
 * 
 * This script parses all test DICOM files using the TypeScript implementation
 * and exports the calculated metrics as JSON for Python tests to validate against.
 * 
 * Usage: npx tsx scripts/generate-reference-data.ts
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseRTPlan } from '../src/lib/dicom/parser';
import { calculatePlanMetrics } from '../src/lib/dicom/metrics';

interface BeamReferenceData {
  beamNumber: number;
  beamName: string;
  beamMU: number;
  controlPointCount: number;
  isArc: boolean;
  MCS: number;
  LSV: number;
  AAV: number;
  MFA: number;
  LT: number;
  PI: number;
  EM: number;
  SAS5: number;
  SAS10: number;
}

interface PlanReferenceData {
  planLabel: string;
  technique: string;
  totalMU: number;
  beamCount: number;
  MCS: number;
  LSV: number;
  AAV: number;
  MFA: number;
  LT: number;
  LTMCS: number;
  PI: number;
  EM: number;
  SAS5: number;
  SAS10: number;
  beamMetrics: BeamReferenceData[];
}

interface ReferenceDataOutput {
  generatedAt: string;
  generatorVersion: string;
  tolerance: number;
  files: Record<string, PlanReferenceData>;
}

const TEST_DATA_DIR = join(process.cwd(), 'public', 'test-data');
const OUTPUT_FILE = join(process.cwd(), 'python', 'tests', 'reference_data', 'expected_metrics.json');

function loadDicomFile(filePath: string): ArrayBuffer {
  const buffer = readFileSync(filePath);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function roundMetric(value: number, decimals: number = 4): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function main() {
  console.log('='.repeat(60));
  console.log('RTp-lens Reference Data Generator');
  console.log('='.repeat(60));
  console.log(`\nSource directory: ${TEST_DATA_DIR}`);
  console.log(`Output file: ${OUTPUT_FILE}\n`);

  // Get all .dcm files
  const files = readdirSync(TEST_DATA_DIR)
    .filter(f => f.endsWith('.dcm'))
    .sort();

  console.log(`Found ${files.length} DICOM files:\n`);
  files.forEach(f => console.log(`  - ${f}`));
  console.log('');

  const output: ReferenceDataOutput = {
    generatedAt: new Date().toISOString(),
    generatorVersion: '1.0.0',
    tolerance: 1e-4,
    files: {},
  };

  let successCount = 0;
  let errorCount = 0;

  for (const filename of files) {
    const filePath = join(TEST_DATA_DIR, filename);
    
    try {
      console.log(`Processing: ${filename}...`);
      
      // Parse DICOM file
      const arrayBuffer = loadDicomFile(filePath);
      const plan = parseRTPlan(arrayBuffer, filename);
      
      // Calculate metrics
      const metrics = calculatePlanMetrics(plan);
      
      // Extract beam-level metrics
      const beamMetrics: BeamReferenceData[] = metrics.beamMetrics.map(bm => ({
        beamNumber: bm.beamNumber,
        beamName: bm.beamName,
        beamMU: roundMetric(bm.beamMU || 0, 2),
        controlPointCount: bm.controlPointCount,
        isArc: bm.isArc,
        MCS: roundMetric(bm.MCS, 4),
        LSV: roundMetric(bm.LSV, 4),
        AAV: roundMetric(bm.AAV, 4),
        MFA: roundMetric(bm.MFA || 0, 2),
        LT: roundMetric(bm.LT, 2),
        PI: roundMetric(bm.PI || 0, 4),
        EM: roundMetric(bm.EM || 0, 4),
        SAS5: roundMetric(bm.SAS5 || 0, 4),
        SAS10: roundMetric(bm.SAS10 || 0, 4),
      }));

      // Build plan-level reference data
      const planData: PlanReferenceData = {
        planLabel: plan.planLabel,
        technique: plan.technique,
        totalMU: roundMetric(metrics.totalMU, 2),
        beamCount: metrics.beamCount,
        MCS: roundMetric(metrics.MCS, 4),
        LSV: roundMetric(metrics.LSV, 4),
        AAV: roundMetric(metrics.AAV, 4),
        MFA: roundMetric(metrics.MFA || 0, 2),
        LT: roundMetric(metrics.LT, 2),
        LTMCS: roundMetric(metrics.LTMCS || 0, 6),
        PI: roundMetric(metrics.PI || 0, 4),
        EM: roundMetric(metrics.EM || 0, 4),
        SAS5: roundMetric(metrics.SAS5 || 0, 4),
        SAS10: roundMetric(metrics.SAS10 || 0, 4),
        beamMetrics,
      };

      output.files[filename] = planData;
      successCount++;
      
      console.log(`  ✓ MCS=${planData.MCS}, LSV=${planData.LSV}, AAV=${planData.AAV}, LT=${planData.LT}`);
      console.log(`    ${planData.beamCount} beams, ${planData.totalMU} MU total, technique: ${planData.technique}`);
      
    } catch (error) {
      errorCount++;
      console.error(`  ✗ Error processing ${filename}:`, error instanceof Error ? error.message : error);
    }
  }

  // Write output
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('Generation Complete');
  console.log('='.repeat(60));
  console.log(`\nResults:`);
  console.log(`  ✓ Success: ${successCount} files`);
  console.log(`  ✗ Errors: ${errorCount} files`);
  console.log(`\nReference data written to:`);
  console.log(`  ${OUTPUT_FILE}`);
  console.log(`\nTo validate Python implementation:`);
  console.log(`  cd python && pytest tests/ -v`);
  console.log('');
}

main();
