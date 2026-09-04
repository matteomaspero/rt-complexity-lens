import { describe, it, expect } from 'vitest';
import { resolveBeamDoseRate } from '@/lib/dicom/dose-rate';
import type { MachineDeliveryParams } from '@/lib/dicom/types';

const PRESET: MachineDeliveryParams = {
  maxDoseRate: 600,
  maxDoseRateFFF: 1400,
  energyDoseRates: [
    { energy: '6X', maxDoseRate: 600, isDefault: true },
    { energy: '10FFF', maxDoseRate: 2400 },
  ],
  maxGantrySpeed: 6,
  maxMLCSpeed: 25,
  mlcType: 'MLCX',
};

describe('resolveBeamDoseRate', () => {
  it('prefers DoseRateSet from the plan file', () => {
    const result = resolveBeamDoseRate(
      { doseRateSet: 1100, energyLabel: '10FFF', isFFF: true },
      PRESET
    );
    expect(result).toEqual({ maxDoseRate: 1100, source: 'plan' });
  });

  it('uses the energy-specific preset rate for FFF beams', () => {
    const result = resolveBeamDoseRate({ energyLabel: '10FFF', isFFF: true }, PRESET);
    expect(result).toEqual({ maxDoseRate: 2400, source: 'preset' });
  });

  it('falls back to the preset default energy when the label is unknown', () => {
    const result = resolveBeamDoseRate({ energyLabel: '15X', isFFF: false }, PRESET);
    expect(result.maxDoseRate).toBe(600);
    expect(result.source).toBe('preset');
  });

  it('uses the legacy FFF rate when no energy list is configured', () => {
    const { energyDoseRates: _omit, ...noList } = PRESET;
    const result = resolveBeamDoseRate({ energyLabel: '6FFF', isFFF: true }, noList);
    expect(result.maxDoseRate).toBe(1400);
  });

  it('detects FFF from the energy label when the flag is absent', () => {
    const { energyDoseRates: _omit, ...noList } = PRESET;
    const result = resolveBeamDoseRate({ energyLabel: '6FFF' }, noList);
    expect(result.maxDoseRate).toBe(1400);
  });

  it('returns the machine default for flattened beams', () => {
    const { energyDoseRates: _omit, ...noList } = PRESET;
    const result = resolveBeamDoseRate({ energyLabel: '6X', isFFF: false }, noList);
    expect(result.maxDoseRate).toBe(600);
  });
});
