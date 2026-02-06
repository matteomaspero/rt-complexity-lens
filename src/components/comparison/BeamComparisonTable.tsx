import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Beam, BeamMetrics } from '@/lib/dicom/types';
import { matchBeams, matchBeamMetrics } from '@/lib/comparison/beam-matcher';
import { formatDiffPercent } from '@/lib/comparison/diff-calculator';
import { cn } from '@/lib/utils';

interface BeamComparisonTableProps {
  beamsA: Beam[];
  beamsB: Beam[];
  metricsA: BeamMetrics[];
  metricsB: BeamMetrics[];
  selectedBeamMatch: number;
  onBeamMatchSelect: (index: number) => void;
}

export function BeamComparisonTable({
  beamsA,
  beamsB,
  metricsA,
  metricsB,
  selectedBeamMatch,
  onBeamMatchSelect,
}: BeamComparisonTableProps) {
  const matchResult = useMemo(
    () => matchBeams(beamsA, beamsB),
    [beamsA, beamsB]
  );

  const matchTypeLabels: Record<string, string> = {
    exact: 'Name',
    gantry: 'Gantry',
    mu: 'MU',
    index: 'Index',
    unmatched: 'No match',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Beam Comparison
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            (click to compare control points)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beam A</TableHead>
                <TableHead>Beam B</TableHead>
                <TableHead className="text-center">Match</TableHead>
                <TableHead className="text-right">CPs</TableHead>
                <TableHead className="text-right">MU Diff</TableHead>
                <TableHead className="text-right">MCS Diff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matchResult.matches.map((match, idx) => {
                const beamA = beamsA[match.indexA];
                const beamB = beamsB[match.indexB];
                const metricA = metricsA[match.indexA];
                const metricB = metricsB[match.indexB];

                const muA = beamA.beamDose ?? 0;
                const muB = beamB.beamDose ?? 0;
                const muDiff = muA !== 0 ? ((muB - muA) / muA) * 100 : 0;

                const mcsA = metricA?.MCS ?? 0;
                const mcsB = metricB?.MCS ?? 0;
                const mcsDiff = mcsA !== 0 ? ((mcsB - mcsA) / mcsA) * 100 : 0;

                return (
                  <TableRow
                    key={idx}
                    className={cn(
                      'cursor-pointer hover:bg-muted/50',
                      selectedBeamMatch === idx && 'bg-muted'
                    )}
                    onClick={() => onBeamMatchSelect(idx)}
                  >
                    <TableCell className="font-medium">
                      {beamA.beamName}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({beamA.numberOfControlPoints} CPs)
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {beamB.beamName}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({beamB.numberOfControlPoints} CPs)
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={match.matchType === 'exact' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {matchTypeLabels[match.matchType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {beamA.numberOfControlPoints} / {beamB.numberOfControlPoints}
                    </TableCell>
                    <TableCell className={cn(
                      'text-right font-mono text-sm',
                      Math.abs(muDiff) > 10 && 'text-amber-500',
                      Math.abs(muDiff) > 20 && 'text-destructive'
                    )}>
                      {formatDiffPercent(muDiff)}
                    </TableCell>
                    <TableCell className={cn(
                      'text-right font-mono text-sm',
                      Math.abs(mcsDiff) > 10 && 'text-amber-500',
                      Math.abs(mcsDiff) > 20 && 'text-destructive'
                    )}>
                      {formatDiffPercent(mcsDiff)}
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Unmatched beams from A */}
              {matchResult.unmatchedA.map(idx => {
                const beam = beamsA[idx];
                return (
                  <TableRow key={`unmatched-a-${idx}`} className="opacity-60">
                    <TableCell className="font-medium">
                      {beam.beamName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="destructive" className="text-xs">Removed</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {beam.numberOfControlPoints} / —
                    </TableCell>
                    <TableCell />
                    <TableCell />
                  </TableRow>
                );
              })}

              {/* Unmatched beams from B */}
              {matchResult.unmatchedB.map(idx => {
                const beam = beamsB[idx];
                return (
                  <TableRow key={`unmatched-b-${idx}`} className="opacity-60">
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell className="font-medium">
                      {beam.beamName}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default" className="text-xs bg-[hsl(var(--status-success))]">Added</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      — / {beam.numberOfControlPoints}
                    </TableCell>
                    <TableCell />
                    <TableCell />
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
