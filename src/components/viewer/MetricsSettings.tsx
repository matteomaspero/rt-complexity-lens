import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useMetricsConfig } from '@/contexts/MetricsConfigContext';
import {
  METRIC_DEFINITIONS,
  METRIC_CATEGORIES,
  getMetricsByCategory,
  type MetricCategory,
} from '@/lib/metrics-definitions';
import { ThresholdSettings } from './ThresholdSettings';

interface MetricsSettingsProps {
  className?: string;
}

export function MetricsSettings({ className }: MetricsSettingsProps) {
  const { isMetricEnabled, toggleMetric, setAllMetrics, enabledMetrics } = useMetricsConfig();

  const allEnabled = enabledMetrics.size === Object.keys(METRIC_DEFINITIONS).length;
  const noneEnabled = enabledMetrics.size === 0;

  const categories: MetricCategory[] = ['primary', 'secondary', 'accuracy', 'deliverability', 'delivery'];

  return (
    <Collapsible className={className}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
          <Settings className="h-4 w-4" />
          <span>Metrics Settings</span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-4 rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Display Preferences</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAllMetrics(true)}
              disabled={allEnabled}
              className="h-7 text-xs"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAllMetrics(false)}
              disabled={noneEnabled}
              className="h-7 text-xs"
            >
              Clear All
            </Button>
          </div>
        </div>

        {categories.map((category) => {
          const categoryInfo = METRIC_CATEGORIES[category];
          const metrics = getMetricsByCategory(category);

          return (
            <div key={category} className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                {categoryInfo.label}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {metrics.map((metric) => (
                  <div key={metric.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`metric-${metric.key}`}
                      checked={isMetricEnabled(metric.key)}
                      onCheckedChange={() => toggleMetric(metric.key)}
                    />
                    <Label
                      htmlFor={`metric-${metric.key}`}
                      className="cursor-pointer text-sm"
                      title={metric.shortDescription}
                    >
                      {metric.key}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <p className="text-xs text-muted-foreground">
          Selected metrics will be shown in the panel and included in CSV exports.
        </p>

        <Separator />

        {/* Threshold Settings Section */}
        <ThresholdSettings />
      </CollapsibleContent>
    </Collapsible>
  );
}
