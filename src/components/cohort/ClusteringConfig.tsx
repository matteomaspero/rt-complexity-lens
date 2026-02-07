import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Settings2 } from 'lucide-react';
import { useCohort } from '@/contexts/CohortContext';
import { CLUSTER_DIMENSIONS, type ClusterDimension, type ClusterMode } from '@/lib/cohort';

export function ClusteringConfig() {
  const { 
    primaryDimension, 
    setPrimaryDimension, 
    secondaryDimension,
    setSecondaryDimension,
    clusterMode,
    setClusterMode,
    successfulPlans,
    clusters,
  } = useCohort();

  const selectedDimensionInfo = CLUSTER_DIMENSIONS.find(d => d.id === primaryDimension);
  const secondaryDimensionInfo = CLUSTER_DIMENSIONS.find(d => d.id === secondaryDimension);

  // Available dimensions for secondary (exclude primary)
  const secondaryDimensions = CLUSTER_DIMENSIONS.filter(d => d.id !== primaryDimension);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Clustering Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Clustering Mode */}
        <div className="space-y-2">
          <Label>Clustering Mode</Label>
          <RadioGroup
            value={clusterMode}
            onValueChange={(value) => setClusterMode(value as ClusterMode)}
            className="flex gap-4"
            disabled={successfulPlans.length === 0}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single" id="mode-single" />
              <Label htmlFor="mode-single" className="font-normal cursor-pointer">
                Single
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="combined" id="mode-combined" />
              <Label htmlFor="mode-combined" className="font-normal cursor-pointer">
                Combined
              </Label>
            </div>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            {clusterMode === 'single' 
              ? 'Group plans by a single dimension'
              : 'Combine two dimensions for finer grouping'
            }
          </p>
        </div>

        {/* Primary Dimension */}
        <div className="space-y-2">
          <Label htmlFor="primary-dimension">Primary Dimension</Label>
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

        {/* Secondary Dimension (only in combined mode) */}
        {clusterMode === 'combined' && (
          <div className="space-y-2">
            <Label htmlFor="secondary-dimension">Secondary Dimension</Label>
            <Select
              value={secondaryDimension}
              onValueChange={(value) => setSecondaryDimension(value as ClusterDimension)}
              disabled={successfulPlans.length === 0}
            >
              <SelectTrigger id="secondary-dimension">
                <SelectValue placeholder="Select dimension" />
              </SelectTrigger>
              <SelectContent>
                {secondaryDimensions.map((dim) => (
                  <SelectItem key={dim.id} value={dim.id}>
                    {dim.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {secondaryDimensionInfo && (
              <p className="text-xs text-muted-foreground">
                {secondaryDimensionInfo.description}
              </p>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="pt-2 border-t space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Plans loaded:</span>
            <span className="font-mono font-medium">{successfulPlans.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Clusters:</span>
            <span className="font-mono font-medium">{clusters.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
