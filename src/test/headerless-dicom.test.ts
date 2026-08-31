import { describe, it, expect } from 'vitest';
import { readDicomDataSet, parseRTPlan } from '@/lib/dicom/parser';

/**
 * Some TPS exports (Elekta Monaco) write a raw dataset with no Part-10
 * preamble / file-meta group, in Implicit VR Little Endian.
 */
function buildImplicitVRDataset(elements: Array<[number, number, string]>): Uint8Array {
  const chunks: number[] = [];
  for (const [group, element, value] of elements) {
    const padded = value.length % 2 === 0 ? value : `${value}\0`;
    const push16 = (v: number) => chunks.push(v & 0xff, (v >> 8) & 0xff);
    push16(group);
    push16(element);
    const len = padded.length;
    chunks.push(len & 0xff, (len >> 8) & 0xff, (len >> 16) & 0xff, (len >> 24) & 0xff);
    for (let i = 0; i < padded.length; i++) chunks.push(padded.charCodeAt(i));
  }
  return new Uint8Array(chunks);
}

describe('Headerless DICOM support', () => {
  it('reads a raw Implicit VR dataset without a DICM prefix', () => {
    const bytes = buildImplicitVRDataset([
      [0x0008, 0x0060, 'RTPLAN'],
      [0x300a, 0x0002, 'RAW_PLAN'],
    ]);

    const ds = readDicomDataSet(bytes);
    expect(ds.string('x00080060')).toBe('RTPLAN');
    expect(ds.string('x300a0002')).toBe('RAW_PLAN');
  });

  it('rejects data with no beam sequence', () => {
    const bytes = buildImplicitVRDataset([[0x300a, 0x0002, 'NO_BEAMS']]);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    expect(() => parseRTPlan(buffer as ArrayBuffer, 'x.dcm')).toThrow(/No beam data/);
  });


  it('rejects an RT Structure Set uploaded as a plan', () => {
    const bytes = buildImplicitVRDataset([
      [0x0008, 0x0016, '1.2.840.10008.5.1.4.1.1.481.3'],
      [0x0008, 0x0060, 'RTSTRUCT'],
    ]);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    expect(() => parseRTPlan(buffer as ArrayBuffer, 'ss.dcm')).toThrow(/RT Structure Set/);
  });
});
