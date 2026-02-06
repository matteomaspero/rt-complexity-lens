import type { Beam, BeamMetrics } from '@/lib/dicom/types';

export interface BeamMatch {
  indexA: number;
  indexB: number;
  matchType: 'exact' | 'gantry' | 'mu' | 'index' | 'unmatched';
  confidence: number;
}

export interface MatchResult {
  matches: BeamMatch[];
  unmatchedA: number[];
  unmatchedB: number[];
}

/**
 * Match beams between two plans using multiple strategies:
 * 1. Exact name match
 * 2. Gantry range match
 * 3. MU-weighted similarity
 * 4. Index-based fallback
 */
export function matchBeams(
  beamsA: Beam[],
  beamsB: Beam[]
): MatchResult {
  const matches: BeamMatch[] = [];
  const usedA = new Set<number>();
  const usedB = new Set<number>();

  // Strategy 1: Exact name match
  for (let i = 0; i < beamsA.length; i++) {
    if (usedA.has(i)) continue;
    
    for (let j = 0; j < beamsB.length; j++) {
      if (usedB.has(j)) continue;
      
      if (beamsA[i].beamName.toLowerCase() === beamsB[j].beamName.toLowerCase()) {
        matches.push({
          indexA: i,
          indexB: j,
          matchType: 'exact',
          confidence: 1.0,
        });
        usedA.add(i);
        usedB.add(j);
        break;
      }
    }
  }

  // Strategy 2: Gantry range match
  for (let i = 0; i < beamsA.length; i++) {
    if (usedA.has(i)) continue;
    const a = beamsA[i];
    
    for (let j = 0; j < beamsB.length; j++) {
      if (usedB.has(j)) continue;
      const b = beamsB[j];
      
      // Match if gantry start/end are within 5 degrees and same direction
      const startDiff = Math.abs(a.gantryAngleStart - b.gantryAngleStart);
      const endDiff = Math.abs(a.gantryAngleEnd - b.gantryAngleEnd);
      const sameDirection = a.controlPoints[0]?.gantryRotationDirection === 
                           b.controlPoints[0]?.gantryRotationDirection;
      
      if (startDiff < 5 && endDiff < 5 && sameDirection) {
        matches.push({
          indexA: i,
          indexB: j,
          matchType: 'gantry',
          confidence: 0.9 - (startDiff + endDiff) / 100,
        });
        usedA.add(i);
        usedB.add(j);
        break;
      }
    }
  }

  // Strategy 3: MU similarity (within 20%)
  for (let i = 0; i < beamsA.length; i++) {
    if (usedA.has(i)) continue;
    const a = beamsA[i];
    const muA = a.beamDose || 0;
    
    let bestMatch = -1;
    let bestDiff = Infinity;
    
    for (let j = 0; j < beamsB.length; j++) {
      if (usedB.has(j)) continue;
      const b = beamsB[j];
      const muB = b.beamDose || 0;
      
      if (muA === 0 && muB === 0) continue;
      
      const diff = Math.abs(muA - muB) / Math.max(muA, muB);
      if (diff < 0.2 && diff < bestDiff) {
        bestDiff = diff;
        bestMatch = j;
      }
    }
    
    if (bestMatch >= 0) {
      matches.push({
        indexA: i,
        indexB: bestMatch,
        matchType: 'mu',
        confidence: 0.7 - bestDiff,
      });
      usedA.add(i);
      usedB.add(bestMatch);
    }
  }

  // Strategy 4: Index-based fallback for remaining beams
  const remainingA = beamsA.map((_, i) => i).filter(i => !usedA.has(i));
  const remainingB = beamsB.map((_, i) => i).filter(i => !usedB.has(i));
  
  const pairCount = Math.min(remainingA.length, remainingB.length);
  for (let k = 0; k < pairCount; k++) {
    matches.push({
      indexA: remainingA[k],
      indexB: remainingB[k],
      matchType: 'index',
      confidence: 0.3,
    });
    usedA.add(remainingA[k]);
    usedB.add(remainingB[k]);
  }

  // Collect unmatched beams
  const unmatchedA = beamsA.map((_, i) => i).filter(i => !usedA.has(i));
  const unmatchedB = beamsB.map((_, i) => i).filter(i => !usedB.has(i));

  // Sort matches by indexA for consistent ordering
  matches.sort((a, b) => a.indexA - b.indexA);

  return { matches, unmatchedA, unmatchedB };
}

/**
 * Match beams using metrics (when only BeamMetrics are available)
 */
export function matchBeamMetrics(
  metricsA: BeamMetrics[],
  metricsB: BeamMetrics[]
): MatchResult {
  const matches: BeamMatch[] = [];
  const usedA = new Set<number>();
  const usedB = new Set<number>();

  // Exact name match
  for (let i = 0; i < metricsA.length; i++) {
    if (usedA.has(i)) continue;
    
    for (let j = 0; j < metricsB.length; j++) {
      if (usedB.has(j)) continue;
      
      if (metricsA[i].beamName.toLowerCase() === metricsB[j].beamName.toLowerCase()) {
        matches.push({
          indexA: i,
          indexB: j,
          matchType: 'exact',
          confidence: 1.0,
        });
        usedA.add(i);
        usedB.add(j);
        break;
      }
    }
  }

  // Index-based fallback
  const remainingA = metricsA.map((_, i) => i).filter(i => !usedA.has(i));
  const remainingB = metricsB.map((_, i) => i).filter(i => !usedB.has(i));
  
  const pairCount = Math.min(remainingA.length, remainingB.length);
  for (let k = 0; k < pairCount; k++) {
    matches.push({
      indexA: remainingA[k],
      indexB: remainingB[k],
      matchType: 'index',
      confidence: 0.3,
    });
    usedA.add(remainingA[k]);
    usedB.add(remainingB[k]);
  }

  const unmatchedA = metricsA.map((_, i) => i).filter(i => !usedA.has(i));
  const unmatchedB = metricsB.map((_, i) => i).filter(i => !usedB.has(i));

  matches.sort((a, b) => a.indexA - b.indexA);

  return { matches, unmatchedA, unmatchedB };
}
