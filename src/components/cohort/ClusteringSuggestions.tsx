import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lightbulb, TrendingUp, Target, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ClusteringSuggestion {
  metricKey: string;
  metricName: string;
  variabilityScore: number;
  coefficientOfVariation: number;
  reason: string;
}

interface ClusteringSuggestionsProps {
  suggestions: ClusteringSuggestion[];
  onApplySuggestion?: (metricKey: string) => void;
}

export function ClusteringSuggestions({ 
  suggestions, 
  onApplySuggestion 
}: ClusteringSuggestionsProps) {
  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Not enough metric variability detected. Try analyzing a larger or more diverse cohort 
              for clustering recommendations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Determine rank labels
  const getRankLabel = (index: number) => {
    if (index === 0) return 'Best';
    if (index === 1) return 'Good';
    return 'Alternative';
  };

  const getRankColor = (index: number) => {
    if (index === 0) return 'bg-primary/10 text-primary border-primary/30';
    if (index === 1) return 'bg-secondary/10 text-secondary-foreground border-secondary/30';
    return 'bg-muted text-muted-foreground border-muted';
  };

  return (
    <div className="space-y-4">
      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Recommended Clustering Dimensions:</strong> Based on metric variability across your cohort, 
          these dimensions are most likely to reveal distinct subgroups and patterns.
        </AlertDescription>
      </Alert>

      {/* Suggestions Cards */}
      <div className="grid gap-4 md:grid-cols-1">
        {suggestions.map((suggestion, index) => {
          const rankLabel = getRankLabel(index);
          const rankColor = getRankColor(index);
          const variabilityPercent = Math.min(100, suggestion.variabilityScore * 100);

          return (
            <Card 
              key={suggestion.metricKey} 
              className="border-l-4"
              style={{
                borderLeftColor: index === 0 
                  ? 'hsl(var(--primary))' 
                  : index === 1 
                    ? 'hsl(var(--secondary))' 
                    : 'hsl(var(--muted))'
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {suggestion.metricName}
                      </CardTitle>
                      <Badge className={`text-xs ${rankColor}`}>
                        {rankLabel} Choice
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {suggestion.metricKey}
                    </div>
                  </div>
                  {index === 0 && (
                    <div className="rounded-full bg-primary/10 p-2">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Variability Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Clustering Utility</span>
                    <span className="font-semibold">{variabilityPercent.toFixed(0)}%</span>
                  </div>
                  <Progress value={variabilityPercent} className="h-2" />
                </div>

                {/* Coefficient of Variation */}
                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Coefficient of Variation (CV)
                    </span>
                    <Badge variant="outline" className="text-xs font-mono">
                      {suggestion.coefficientOfVariation.toFixed(3)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.reason}
                  </p>
                </div>

                {/* Interpretation */}
                <div className="space-y-2">
                  <h5 className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    What This Tells You
                  </h5>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {getInterpretation(suggestion.metricKey, suggestion.coefficientOfVariation)}
                  </p>
                </div>

                {/* Action Button */}
                {onApplySuggestion && (
                  <Button 
                    onClick={() => onApplySuggestion(suggestion.metricKey)}
                    variant={index === 0 ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                  >
                    Use This Dimension for Clustering
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Tips */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Clustering Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <div className="flex gap-2">
            <span className="font-semibold min-w-fit">•</span>
            <span>
              <strong>High CV (&gt;0.5):</strong> Excellent for distinguishing groups—expect clear clusters
            </span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold min-w-fit">•</span>
            <span>
              <strong>Moderate CV (0.3-0.5):</strong> Good for finding subgroups with moderate differences
            </span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold min-w-fit">•</span>
            <span>
              <strong>Low CV (&lt;0.3):</strong> Limited clustering utility—plans are relatively similar
            </span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold min-w-fit">•</span>
            <span>
              <strong>Combine dimensions:</strong> Use 2-3 metrics together for multi-dimensional clustering
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Get metric-specific interpretation text
 */
function getInterpretation(metricKey: string, cv: number): string {
  const interpretations: Record<string, string> = {
    MCS: cv > 0.4 
      ? 'Your cohort shows significant variation in modulation complexity. Plans likely range from simple conformal to highly modulated IMRT/VMAT techniques. Clustering will reveal technique-based groups.'
      : 'Plans have similar overall modulation complexity. Clustering may be less effective—consider other metrics or analyzing specific techniques separately.',
    
    LSV: cv > 0.4
      ? 'Leaf sequence variability differs substantially across plans. This suggests diverse MLC utilization patterns—excellent for identifying delivery complexity subgroups.'
      : 'Most plans have similar MLC sequence patterns. Limited utility for clustering, but may still reveal subtle modulation differences.',
    
    AAV: cv > 0.4
      ? 'Aperture area variability shows high diversity. Plans likely include both small-field highly modulated techniques and larger-field approaches.'
      : 'Aperture shapes are relatively consistent across the cohort. Consider analyzing by anatomical site or technique type instead.',
    
    MFA: cv > 0.4
      ? 'Mean field area varies significantly—indicates mix of small and large target volumes. Excellent dimension for grouping by anatomical site or target size.'
      : 'Field sizes are fairly uniform. This may indicate a single anatomical site or homogeneous target volumes.',
    
    MAD: cv > 0.4
      ? 'Mean asymmetry distance shows high variation. Plans differ in off-axis positioning—may correlate with lateral/asymmetric targets.'
      : 'Most plans have similar aperture symmetry. Limited clustering value.',
    
    MUCA: cv > 0.4
      ? 'MU per control arc varies widely. This suggests different modulation densities—useful for grouping by delivery efficiency.'
      : 'Control arc MU delivery is relatively consistent. May indicate standardized optimization approaches.',
  };

  return interpretations[metricKey] || 
    `This metric shows ${cv > 0.4 ? 'significant' : 'moderate'} variation across your cohort, making it ${cv > 0.4 ? 'highly' : 'moderately'} useful for revealing patterns and subgroups.`;
}
