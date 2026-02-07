import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCohort } from '@/contexts/CohortContext';

export function ClusterSummaryGrid() {
  const { clusters, successfulPlans, clusterStats } = useCohort();

  if (clusters.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Upload plans to see clustering analysis</p>
      </div>
    );
  }

  const totalPlans = successfulPlans.length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {clusters.map((cluster) => {
        const percentage = totalPlans > 0 
          ? ((cluster.planIds.length / totalPlans) * 100).toFixed(1)
          : '0';
        const stats = clusterStats.get(cluster.id);
        
        return (
          <Card 
            key={cluster.id}
            className="relative overflow-hidden"
          >
            <div 
              className="absolute top-0 left-0 w-1 h-full"
              style={{ backgroundColor: cluster.color }}
            />
            <CardContent className="pt-4 pl-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-sm truncate" title={cluster.name}>
                    {cluster.name}
                  </h4>
                  <p className="text-2xl font-bold mt-1">
                    {cluster.planIds.length}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      plan{cluster.planIds.length !== 1 ? 's' : ''}
                    </span>
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {percentage}%
                </Badge>
              </div>

              {stats && (
                <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">MCS</span>
                    <p className="font-mono">{stats.MCS.mean.toFixed(3)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">MU</span>
                    <p className="font-mono">{stats.totalMU.mean.toFixed(0)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
