import { useMemo } from 'react';
import type { MLCLeafPositions } from '@/lib/dicom/types';

interface MLCDifferenceViewerProps {
  mlcPositionsA: MLCLeafPositions;
  mlcPositionsB: MLCLeafPositions;
  leafWidths: number[];
  jawPositionsA: { x1: number; x2: number; y1: number; y2: number };
  jawPositionsB: { x1: number; x2: number; y1: number; y2: number };
  width?: number;
  height?: number;
}

export function MLCDifferenceViewer({
  mlcPositionsA,
  mlcPositionsB,
  leafWidths,
  jawPositionsA,
  jawPositionsB,
  width = 400,
  height = 300,
}: MLCDifferenceViewerProps) {
  const { bankA: bankA_A, bankB: bankB_A } = mlcPositionsA;
  const { bankA: bankA_B, bankB: bankB_B } = mlcPositionsB;

  // Calculate visualization parameters
  const viewBox = useMemo(() => {
    if (bankA_A.length === 0 || bankB_A.length === 0) {
      return { minX: -200, maxX: 200, minY: -200, maxY: 200 };
    }

    const allPositions = [...bankA_A, ...bankB_A, ...bankA_B, ...bankB_B];
    const allJawX = [jawPositionsA.x1, jawPositionsA.x2, jawPositionsB.x1, jawPositionsB.x2];
    const minX = Math.min(...allPositions, ...allJawX) - 20;
    const maxX = Math.max(...allPositions, ...allJawX) + 20;

    const totalHeight = leafWidths.reduce((sum, w) => sum + w, 0) || bankA_A.length * 5;
    const minY = -totalHeight / 2 - 20;
    const maxY = totalHeight / 2 + 20;

    return { minX, maxX, minY, maxY };
  }, [bankA_A, bankB_A, bankA_B, bankB_B, leafWidths, jawPositionsA, jawPositionsB]);

  // Calculate leaf differences and overlap regions
  const leafDifferences = useMemo(() => {
    if (bankA_A.length === 0 || bankA_B.length === 0) return [];

    const diffs: Array<{
      index: number;
      y: number;
      height: number;
      // Plan A aperture
      apertureA: { start: number; end: number };
      // Plan B aperture
      apertureB: { start: number; end: number };
      // Overlap (common opening)
      overlap: { start: number; end: number } | null;
      // Differences
      diffA: { start: number; end: number } | null; // Only in A
      diffB: { start: number; end: number } | null; // Only in B
      // Leaf position deltas
      bankADelta: number; // How much Bank A leaf moved
      bankBDelta: number; // How much Bank B leaf moved
    }> = [];

    let yPos = -leafWidths.reduce((sum, w) => sum + w, 0) / 2;
    const numLeaves = Math.min(bankA_A.length, bankB_A.length, bankA_B.length, bankB_B.length);

    for (let i = 0; i < numLeaves; i++) {
      const leafHeight = leafWidths[i] || 5;
      
      // Plan A aperture (from Bank A position to Bank B position)
      const aA_start = bankA_A[i];
      const aA_end = bankB_A[i];
      
      // Plan B aperture
      const aB_start = bankA_B[i];
      const aB_end = bankB_B[i];
      
      // Calculate overlap
      const overlapStart = Math.max(aA_start, aB_start);
      const overlapEnd = Math.min(aA_end, aB_end);
      const hasOverlap = overlapStart < overlapEnd;

      // Only in A (where A is open but B is closed)
      let diffA = null;
      if (aA_start < aB_start && aA_end > aA_start) {
        diffA = { start: aA_start, end: Math.min(aB_start, aA_end) };
      }
      if (aA_end > aB_end && aA_end > aA_start) {
        const start = Math.max(aB_end, aA_start);
        if (diffA) {
          // Extend if already exists
        } else {
          diffA = { start, end: aA_end };
        }
      }

      // Only in B
      let diffB = null;
      if (aB_start < aA_start && aB_end > aB_start) {
        diffB = { start: aB_start, end: Math.min(aA_start, aB_end) };
      }
      if (aB_end > aA_end && aB_end > aB_start) {
        const start = Math.max(aA_end, aB_start);
        if (diffB) {
          // Extend if already exists
        } else {
          diffB = { start, end: aB_end };
        }
      }

      diffs.push({
        index: i,
        y: yPos,
        height: leafHeight,
        apertureA: { start: aA_start, end: aA_end },
        apertureB: { start: aB_start, end: aB_end },
        overlap: hasOverlap ? { start: overlapStart, end: overlapEnd } : null,
        diffA: diffA && diffA.end > diffA.start ? diffA : null,
        diffB: diffB && diffB.end > diffB.start ? diffB : null,
        bankADelta: aB_start - aA_start,
        bankBDelta: aB_end - aA_end,
      });

      yPos += leafHeight;
    }

    return diffs;
  }, [bankA_A, bankB_A, bankA_B, bankB_B, leafWidths]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    const totalDiffA = leafDifferences.reduce((sum, d) => {
      if (d.diffA) return sum + (d.diffA.end - d.diffA.start) * d.height;
      return sum;
    }, 0);
    const totalDiffB = leafDifferences.reduce((sum, d) => {
      if (d.diffB) return sum + (d.diffB.end - d.diffB.start) * d.height;
      return sum;
    }, 0);
    const totalOverlap = leafDifferences.reduce((sum, d) => {
      if (d.overlap) return sum + (d.overlap.end - d.overlap.start) * d.height;
      return sum;
    }, 0);
    const maxDelta = Math.max(
      ...leafDifferences.map(d => Math.max(Math.abs(d.bankADelta), Math.abs(d.bankBDelta)))
    );
    return { totalDiffA, totalDiffB, totalOverlap, maxDelta };
  }, [leafDifferences]);

  const viewBoxStr = `${viewBox.minX} ${viewBox.minY} ${viewBox.maxX - viewBox.minX} ${viewBox.maxY - viewBox.minY}`;

  if (bankA_A.length === 0 || bankA_B.length === 0) {
    return (
      <div 
        className="flex items-center justify-center rounded-md border bg-muted/50"
        style={{ width, height }}
      >
        <p className="text-sm text-muted-foreground">No MLC data to compare</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <svg
        width={width}
        height={height}
        viewBox={viewBoxStr}
        className="rounded-md border bg-card"
      >
        {/* Background */}
        <rect
          x={viewBox.minX}
          y={viewBox.minY}
          width={viewBox.maxX - viewBox.minX}
          height={viewBox.maxY - viewBox.minY}
          className="fill-muted/30"
        />

        {/* Jaw outlines for both plans - only render if valid */}
        {jawPositionsA.x2 > jawPositionsA.x1 && jawPositionsA.y2 > jawPositionsA.y1 && (
          <rect
            x={jawPositionsA.x1}
            y={jawPositionsA.y1}
            width={jawPositionsA.x2 - jawPositionsA.x1}
            height={jawPositionsA.y2 - jawPositionsA.y1}
            fill="none"
            stroke="hsl(var(--chart-comparison-a))"
            strokeWidth="1"
            strokeDasharray="4 2"
            opacity="0.5"
          />
        )}
        {jawPositionsB.x2 > jawPositionsB.x1 && jawPositionsB.y2 > jawPositionsB.y1 && (
          <rect
            x={jawPositionsB.x1}
            y={jawPositionsB.y1}
            width={jawPositionsB.x2 - jawPositionsB.x1}
            height={jawPositionsB.y2 - jawPositionsB.y1}
            fill="none"
            stroke="hsl(var(--chart-comparison-b))"
            strokeWidth="1"
            strokeDasharray="4 2"
            opacity="0.5"
          />
        )}

        {/* Leaf differences */}
        {leafDifferences.map((leaf) => (
          <g key={leaf.index}>
            {/* Overlap region (common opening) - neutral color */}
            {leaf.overlap && (
              <rect
                x={leaf.overlap.start}
                y={leaf.y}
                width={leaf.overlap.end - leaf.overlap.start}
                height={leaf.height - 0.5}
                className="fill-muted-foreground"
                opacity="0.15"
              />
            )}

            {/* Only in Plan A - highlight with A color */}
            {leaf.diffA && (
              <rect
                x={leaf.diffA.start}
                y={leaf.y}
                width={leaf.diffA.end - leaf.diffA.start}
                height={leaf.height - 0.5}
                fill="hsl(var(--chart-comparison-a))"
                opacity="0.6"
              />
            )}

            {/* Only in Plan B - highlight with B color */}
            {leaf.diffB && (
              <rect
                x={leaf.diffB.start}
                y={leaf.y}
                width={leaf.diffB.end - leaf.diffB.start}
                height={leaf.height - 0.5}
                fill="hsl(var(--chart-comparison-b))"
                opacity="0.6"
              />
            )}

            {/* Aperture outlines */}
            <rect
              x={leaf.apertureA.start}
              y={leaf.y}
              width={Math.max(0, leaf.apertureA.end - leaf.apertureA.start)}
              height={leaf.height - 0.5}
              fill="none"
              stroke="hsl(var(--chart-comparison-a))"
              strokeWidth="0.5"
              opacity="0.7"
            />
            <rect
              x={leaf.apertureB.start}
              y={leaf.y}
              width={Math.max(0, leaf.apertureB.end - leaf.apertureB.start)}
              height={leaf.height - 0.5}
              fill="none"
              stroke="hsl(var(--chart-comparison-b))"
              strokeWidth="0.5"
              opacity="0.7"
            />
          </g>
        ))}

        {/* Center crosshair */}
        <line
          x1="0"
          y1={viewBox.minY}
          x2="0"
          y2={viewBox.maxY}
          stroke="hsl(var(--foreground))"
          strokeWidth="0.5"
          opacity="0.2"
        />
        <line
          x1={viewBox.minX}
          y1="0"
          x2={viewBox.maxX}
          y2="0"
          stroke="hsl(var(--foreground))"
          strokeWidth="0.5"
          opacity="0.2"
        />

        {/* Legend */}
        <g transform={`translate(${viewBox.minX + 10}, ${viewBox.maxY - 55})`}>
          <rect width="12" height="12" fill="hsl(var(--chart-comparison-a))" opacity="0.6" />
          <text x="16" y="10" className="fill-foreground text-[8px]">Only in A</text>
          
          <rect y="16" width="12" height="12" fill="hsl(var(--chart-comparison-b))" opacity="0.6" />
          <text x="16" y="26" className="fill-foreground text-[8px]">Only in B</text>
          
          <rect y="32" width="12" height="12" className="fill-muted-foreground" opacity="0.15" />
          <text x="16" y="42" className="fill-foreground text-[8px]">Overlap</text>
        </g>
      </svg>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded bg-muted/50 p-1.5 text-center">
          <span className="text-muted-foreground">Only A:</span>
          <span className="ml-1 font-mono">{stats.totalDiffA.toFixed(0)}mm²</span>
        </div>
        <div className="rounded bg-muted/50 p-1.5 text-center">
          <span className="text-muted-foreground">Only B:</span>
          <span className="ml-1 font-mono">{stats.totalDiffB.toFixed(0)}mm²</span>
        </div>
        <div className="rounded bg-muted/50 p-1.5 text-center">
          <span className="text-muted-foreground">Max Δ:</span>
          <span className="ml-1 font-mono">{stats.maxDelta.toFixed(1)}mm</span>
        </div>
      </div>
    </div>
  );
}
