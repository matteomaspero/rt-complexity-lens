import { readFileSync } from 'fs';
import { join } from 'path';
import { parseRTPlan } from '@/lib/dicom/parser';
import type { RTPlan } from '@/lib/dicom/types';

/**
 * List of all available test DICOM-RT Plan files
 */
export const TEST_FILES = {
  // Complex VMAT plans
  VMAT_1: 'RP1.2.752.243.1.1.20230623170950828.2520.26087.dcm',
  
  // Monaco plans (MO prefix)
  MONACO_PT_01: 'RTPLAN_MO_PT_01.dcm',
  MONACO_PT_02: 'RTPLAN_MO_PT_02.dcm',
  MONACO_PT_03: 'RTPLAN_MO_PT_03.dcm',
  MONACO_PT_04: 'RTPLAN_MO_PT_04.dcm',
  
  // Monaco with penalty
  MONACO_PENALTY: 'RTPLAN_MR_PT_01_PENALTY.dcm',
  
  // TG-119 test plans
  TG119_7F: 'RP.TG119.PR_ETH_7F.dcm',
  TG119_2A: 'RP.TG119.PR_ETH_2A_2.dcm',
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
