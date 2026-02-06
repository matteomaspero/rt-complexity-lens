import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBatch } from '@/contexts/BatchContext';
import { calculateBatchStatistics, formatStatRange, formatStatMean } from '@/lib/batch/batch-statistics';

export function BatchSummaryStats() {
  const { plans } = useBatch();
  
  const successfulPlans = useMemo(
    () => plans.filter(p => p.status === 'success'),
    [plans]
  );

  const stats = useMemo(
    () => calculateBatchStatistics(successfulPlans.map(p => p.metrics)),
    [successfulPlans]
  );

  if (successfulPlans.length === 0) {
    return null;
  }

  const metricRows = [
    { label: 'MCS', stat: stats.MCS, decimals: 3 },
    { label: 'LSV', stat: stats.LSV, decimals: 3 },
    { label: 'AAV', stat: stats.AAV, decimals: 3 },
    { label: 'MFA (cm²)', stat: stats.MFA, decimals: 1 },
    { label: 'Total MU', stat: stats.totalMU, decimals: 0 },
    { label: 'Delivery Time (s)', stat: stats.deliveryTime, decimals: 0 },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Summary Statistics
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({stats.planCount} plans)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {metricRows.map(({ label, stat, decimals }) => (
            <div key={label} className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="text-sm">
                <span className="font-medium">Range:</span>{' '}
                {formatStatRange(stat, decimals)}
              </p>
              <p className="text-sm">
                <span className="font-medium">Mean:</span>{' '}
                {formatStatMean(stat, decimals)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
