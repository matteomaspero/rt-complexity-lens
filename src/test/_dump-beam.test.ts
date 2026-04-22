import { describe, it } from 'vitest';
import { parseTestPlan, TEST_FILES } from './test-utils';
import * as fs from 'fs';

describe('dump beam', () => {
  it('dump MR_PT_02 beam[7]', () => {
    const plan = parseTestPlan(TEST_FILES.MRIDIAN_PENALTY_02 ?? 'RTPLAN_MR_PT_02_PENALTY.dcm');
    const b = plan.beams[7];
    const out = {
      beam_name: b.beamName,
      n_leaves: b.numberOfLeaves,
      leaf_widths: b.mlcLeafWidths,
      leaf_boundaries: b.mlcLeafBoundaries,
      cps: b.controlPoints.map(cp => ({
        cum: cp.cumulativeMetersetWeight,
        jaw: [cp.jawPositions.x1, cp.jawPositions.x2, cp.jawPositions.y1, cp.jawPositions.y2],
        a: Array.from(cp.mlcPositions.bankA),
        b: Array.from(cp.mlcPositions.bankB),
      })),
    };
    fs.writeFileSync('/tmp/ts_beam7.json', JSON.stringify(out));
  });
});
