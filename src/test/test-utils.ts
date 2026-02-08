import { readFileSync } from 'fs';
import { join } from 'path';
import { parseRTPlan } from '@/lib/dicom/parser';
import type { RTPlan } from '@/lib/dicom/types';

/**
 * List of all available test DICOM-RT Plan files
 */
export const TEST_FILES = {
  // --- RayStation VMAT (complex multi-arc) ---
  VMAT_1: 'RP1.2.752.243.1.1.20230623170950828.2520.26087.dcm',

  // --- Eclipse TG-119 VMAT (2-arc) ---
  TG119_CS_ETH_2A: 'RP.TG119.CS_ETH_2A_#1.dcm',
  TG119_CS_TB_2A: 'RP.TG119.CS_TB_2A_#1.dcm',
  TG119_HN_ETH_2A: 'RP.TG119.HN_ETH_2A_#1.dcm',
  TG119_MT_ETH_2A: 'RP.TG119.MT_ETH_2A_#1.dcm',
  TG119_PR_ETH_2A: 'RP.TG119.PR_ETH_2A_2.dcm',
  TG119_PR_UN_2A: 'RP.TG119.PR_UN_2A_#1.dcm',

  // --- Eclipse TG-119 IMRT (fixed-field) ---
  TG119_CS_9F: 'RP.TG119.CS_ETH_9F.dcm',
  TG119_HN_ETH_7F: 'RP.TG119.HN_ETH_7F.dcm',
  TG119_HN_TB_7F: 'RP.TG119.HN_TB_7F.dcm',
  TG119_MT_7F: 'RP.TG119.MT_ETH_7F.dcm',
  TG119_PR_ETH_7F: 'RP.TG119.PR_ETH_7F.dcm',
  TG119_PR_UN_7F: 'RP.TG119.PR_UN_7F.dcm',

  // --- Monaco (Elekta) ---
  MONACO_PT_01: 'RTPLAN_MO_PT_01.dcm',
  MONACO_PT_02: 'RTPLAN_MO_PT_02.dcm',
  MONACO_PT_03: 'RTPLAN_MO_PT_03.dcm',
  MONACO_PT_04: 'RTPLAN_MO_PT_04.dcm',

  // --- Elements (Brainlab) ---
  ELEMENTS_PT_01: 'RTPLAN_EL_PT_01.dcm',
  ELEMENTS_PT_03: 'RTPLAN_EL_PT_03.dcm',

  // --- Pinnacle (Philips) ---
  PINNACLE_PT_01: 'RTPLAN_PI_PT_01.dcm',
  PINNACLE_PT_03: 'RTPLAN_PI_PT_03.dcm',

  // --- ViewRay MRIdian (MR-Linac) ---
  MRIDIAN_PENALTY_01: 'RTPLAN_MR_PT_01_PENALTY.dcm',
  MRIDIAN_PENALTY_02: 'RTPLAN_MR_PT_02_PENALTY.dcm',
  MRIDIAN_OC: 'RTPLAN_MR_PT_03_O&C.dcm',
  MRIDIAN_A3I: 'RTPLAN_MR_PT_05_A3i.dcm',
} as const;

export type TestFileName = (typeof TEST_FILES)[keyof typeof TEST_FILES];

/**
 * Load a test DICOM file as ArrayBuffer
 * Uses Node.js fs module for test environment
 */
export function loadTestFile(filename: TestFileName): ArrayBuffer {
  const filePath = join(process.cwd(), 'public', 'test-data', filename);
  const buffer = readFileSync(filePath);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

/**
 * Load and parse a test DICOM-RT Plan file
 */
export function parseTestPlan(filename: TestFileName): RTPlan {
  const buffer = loadTestFile(filename);
  return parseRTPlan(buffer, filename);
}

/**
 * Get all test file names as an array
 */
export function getAllTestFiles(): TestFileName[] {
  return Object.values(TEST_FILES);
}

/**
 * Utility to check if a value is within a valid range
 */
export function expectInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}
