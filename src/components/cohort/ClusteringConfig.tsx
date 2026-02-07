import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings2 } from 'lucide-react';
import { useCohort } from '@/contexts/CohortContext';
import { CLUSTER_DIMENSIONS, type ClusterDimension } from '@/lib/cohort';

export function ClusteringConfig() {
  const { primaryDimension, setPrimaryDimension, successfulPlans } = useCohort();

  const selectedDimensionInfo = CLUSTER_DIMENSIONS.find(d => d.id === primaryDimension);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Clustering Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="primary-dimension">Primary Grouping Dimension</Label>
          <Select
            value={primaryDimension}
            onValueChange={(value) => setPrimaryDimension(value as ClusterDimension)}
            disabled={successfulPlans.length === 0}
          >
            <SelectTrigger id="primary-dimension">
              <SelectValue placeholder="Select dimension" />
            </SelectTrigger>
            <SelectContent>
              {CLUSTER_DIMENSIONS.map((dim) => (
                <SelectItem key={dim.id} value={dim.id}>
                  {dim.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDimensionInfo && (
            <p className="text-xs text-muted-foreground">
              {selectedDimensionInfo.description}
            </p>
          )}
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Plans loaded:</span>
            <span className="font-mono font-medium">{successfulPlans.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
