import { useMemo } from 'react';
import type { MLCLeafPositions } from '@/lib/dicom/types';

interface MLCApertureViewerProps {
  mlcPositions: MLCLeafPositions;
  leafWidths: number[];
  jawPositions: { x1: number; x2: number; y1: number; y2: number };
  width?: number;
  height?: number;
}

export function MLCApertureViewer({
  mlcPositions,
  leafWidths,
  jawPositions,
  width = 400,
  height = 300,
}: MLCApertureViewerProps) {
  const { bankA, bankB } = mlcPositions;

  // Validate jaw positions
  const hasValidJaws = 
    jawPositions.x2 > jawPositions.x1 && 
    jawPositions.y2 > jawPositions.y1;

  // Calculate visualization parameters
  const viewBox = useMemo(() => {
    if (bankA.length === 0 || bankB.length === 0) {
      return { minX: -200, maxX: 200, minY: -200, maxY: 200 };
    }

    // Find the extent of leaf positions (only if jaws are valid)
    let minX = -200;
    let maxX = 200;
    let minY = -200;
    let maxY = 200;

    if (hasValidJaws) {
      const allPositions = [...bankA, ...bankB];
      minX = Math.min(...allPositions, jawPositions.x1) - 20;
      maxX = Math.max(...allPositions, jawPositions.x2) + 20;

      // Calculate Y extent based on leaf widths
      const totalHeight = leafWidths.reduce((sum, w) => sum + w, 0) || bankA.length * 5;
      minY = -totalHeight / 2 - 20;
      maxY = totalHeight / 2 + 20;
    }

    return { minX, maxX, minY, maxY };
  }, [bankA, bankB, leafWidths, jawPositions, hasValidJaws]);

  // Generate leaf pair rectangles
  const leafPairs = useMemo(() => {
    if (bankA.length === 0 || bankB.length === 0) return [];

    const pairs: Array<{
      index: number;
      y: number;
      height: number;
      bankAX: number;
      bankBX: number;
      opening: number;
    }> = [];

    let yPos = -leafWidths.reduce((sum, w) => sum + w, 0) / 2;

    for (let i = 0; i < Math.min(bankA.length, bankB.length); i++) {
      const leafHeight = leafWidths[i] || 5;
      const aPos = bankA[i];
      const bPos = bankB[i];

      pairs.push({
        index: i,
        y: yPos,
        height: leafHeight,
        bankAX: aPos,
        bankBX: bPos,
        opening: bPos - aPos,
      });

      yPos += leafHeight;
    }

    return pairs;
  }, [bankA, bankB, leafWidths]);

  const viewBoxStr = `${viewBox.minX} ${viewBox.minY} ${viewBox.maxX - viewBox.minX} ${viewBox.maxY - viewBox.minY}`;

  if (bankA.length === 0 || bankB.length === 0 || !hasValidJaws) {
    return (
      <div 
        className="flex items-center justify-center rounded-md border bg-muted/50"
        style={{ width, height }}
      >
        <p className="text-sm text-muted-foreground">
          {bankA.length === 0 || bankB.length === 0 ? 'No MLC data available' : 'No jaw data available'}
        </p>
      </div>
    );
  }

  return (
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

      {/* Jaw outline */}
      <rect
        x={jawPositions.x1}
        y={jawPositions.y1}
        width={jawPositions.x2 - jawPositions.x1}
        height={jawPositions.y2 - jawPositions.y1}
        fill="none"
        stroke="hsl(var(--foreground))"
        strokeWidth="1"
        strokeDasharray="4 2"
        opacity="0.3"
      />

      {/* Leaf pairs */}
      {leafPairs.map((pair) => (
        <g key={pair.index}>
          {/* Bank A leaf (left side, extending from far left to leaf position) */}
          <rect
            x={viewBox.minX}
            y={pair.y}
            width={pair.bankAX - viewBox.minX}
            height={pair.height - 0.5}
            className="fill-[hsl(var(--mlc-bank-a))]"
            opacity="0.85"
          />

          {/* Bank B leaf (right side, extending from leaf position to far right) */}
          <rect
            x={pair.bankBX}
            y={pair.y}
            width={viewBox.maxX - pair.bankBX}
            height={pair.height - 0.5}
            className="fill-[hsl(var(--mlc-bank-b))]"
            opacity="0.85"
          />

          {/* Aperture opening highlight */}
          {pair.opening > 0 && (
            <rect
              x={pair.bankAX}
              y={pair.y}
              width={pair.opening}
              height={pair.height - 0.5}
              className="fill-[hsl(var(--mlc-aperture))]"
              opacity="0.2"
            />
          )}
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
      <g transform={`translate(${viewBox.minX + 10}, ${viewBox.maxY - 40})`}>
        <rect width="12" height="12" className="fill-[hsl(var(--mlc-bank-a))]" opacity="0.85" />
        <text x="16" y="10" className="fill-foreground text-[8px]">Bank A</text>
        
        <rect y="16" width="12" height="12" className="fill-[hsl(var(--mlc-bank-b))]" opacity="0.85" />
        <text x="16" y="26" className="fill-foreground text-[8px]">Bank B</text>
      </g>
    </svg>
  );
}
