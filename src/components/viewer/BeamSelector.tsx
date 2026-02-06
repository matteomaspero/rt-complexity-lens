import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Beam } from '@/lib/dicom/types';

interface BeamSelectorProps {
  beams: Beam[];
  selectedBeamIndex: number;
  onBeamChange: (index: number) => void;
  className?: string;
}

export function BeamSelector({
  beams,
  selectedBeamIndex,
  onBeamChange,
  className,
}: BeamSelectorProps) {
  const beamColors = useMemo(() => {
    const colors = [
      'hsl(var(--chart-primary))',
      'hsl(var(--chart-secondary))',
      'hsl(var(--chart-tertiary))',
      'hsl(var(--chart-quaternary))',
    ];
    return beams.map((_, i) => colors[i % colors.length]);
  }, [beams]);

  if (beams.length <= 1) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {beams.map((beam, index) => (
        <Button
          key={beam.beamNumber}
          variant={selectedBeamIndex === index ? 'default' : 'outline'}
          size="sm"
          onClick={() => onBeamChange(index)}
          className={cn(
            'min-w-[100px]',
            selectedBeamIndex === index && 'ring-2 ring-offset-2'
          )}
          style={{
            borderColor: selectedBeamIndex !== index ? beamColors[index] : undefined,
          }}
        >
          <span
            className="mr-2 h-2 w-2 rounded-full"
            style={{ backgroundColor: beamColors[index] }}
          />
          {beam.beamName}
          <span className="ml-2 text-xs text-muted-foreground">
            {beam.isArc ? 'Arc' : 'Static'}
          </span>
        </Button>
      ))}
    </div>
  );
}
