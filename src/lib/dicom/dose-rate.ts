// Per-beam dose rate resolution.
//
// The delivery-time model needs the dose rate that applies to *this* beam, not a
// single machine-wide value. Priority:
//   1. DoseRateSet (300A,0115) written in the plan by the TPS
//   2. Energy-specific rate from the machine preset (matched on the energy label,
//      e.g. '6FFF', '10X')
//   3. Legacy FFF rate from the preset when the beam is flagged FFF
//   4. Preset default rate
//
// FFF beams are identified from Primary Fluence Mode (3002,0050/0051/0052) during
// parsing, so plans whose beams are simply named "Arc 1" are still recognised.

import type { Beam, MachineDeliveryParams } from './types';

export type DoseRateSource = 'plan' | 'preset';

export interface ResolvedDoseRate {
  maxDoseRate: number; // MU/min
  source: DoseRateSource;
}

export function resolveBeamDoseRate(
  beam: Pick<Beam, 'doseRateSet' | 'energyLabel' | 'isFFF'>,
  machineParams: MachineDeliveryParams
): ResolvedDoseRate {
  if (beam.doseRateSet && beam.doseRateSet > 0) {
    return { maxDoseRate: beam.doseRateSet, source: 'plan' };
  }

  const energy = beam.energyLabel?.toUpperCase();
  const rates = machineParams.energyDoseRates;
  if (rates && rates.length > 0) {
    if (energy) {
      const match = rates.find((r) => r.energy.toUpperCase() === energy);
      if (match && match.maxDoseRate > 0) {
        return { maxDoseRate: match.maxDoseRate, source: 'preset' };
      }
    }
    const fallback = rates.find((r) => r.isDefault);
    if (fallback && fallback.maxDoseRate > 0) {
      return { maxDoseRate: fallback.maxDoseRate, source: 'preset' };
    }
  }

  const isFFF = beam.isFFF ?? (energy ? energy.includes('FFF') : false);
  if (isFFF && machineParams.maxDoseRateFFF && machineParams.maxDoseRateFFF > 0) {
    return { maxDoseRate: machineParams.maxDoseRateFFF, source: 'preset' };
  }

  return { maxDoseRate: machineParams.maxDoseRate, source: 'preset' };
}
