import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Download, FileText } from 'lucide-react';
import { MetricStatusBadge } from '@/components/metrics/MetricStatusBadge';
import type { OutlierDetectionResult } from '@/lib/outlier-detection';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface OutlierReportProps {
  outliers: OutlierDetectionResult[];
  totalPlans: number;
  onExport?: () => void;
}

export function OutlierReport({ outliers, totalPlans, onExport }: OutlierReportProps) {
  const criticalPlans = outliers.filter(o => 
    o.outlierMetrics.some(m => m.severity === 'critical')
  );
  const warningPlans = outliers.filter(o => 
    !o.outlierMetrics.some(m => m.severity === 'critical')
  );

  if (outliers.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-500 p-2 text-white">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-green-900 dark:text-green-100">
                No Outliers Detected
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                All {totalPlans} plans fall within expected complexity ranges for your cohort.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Alert */}
      <Alert variant={criticalPlans.length > 0 ? 'destructive' : 'default'}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <strong>{outliers.length} of {totalPlans} plans</strong> flagged as outliers
              {criticalPlans.length > 0 && (
                <> — <strong className="text-red-600 dark:text-red-400">{criticalPlans.length} critical</strong></>
              )}
              {warningPlans.length > 0 && (
                <>, {warningPlans.length} warning</>
              )}
            </div>
            {onExport && (
              <Button onClick={onExport} size="sm" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>

      {/* Outlier Plans List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Detailed Outlier Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {outliers.map((outlier, index) => {
              const hasCritical = outlier.outlierMetrics.some(m => m.severity === 'critical');
              
              return (
                <AccordionItem key={outlier.planId} value={`plan-${index}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${
                          hasCritical 
                            ? 'bg-red-500' 
                            : 'bg-yellow-500'
                        }`} />
                        <span className="font-semibold text-left">{outlier.planId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {outlier.outlierMetrics.length} outlier metrics
                        </Badge>
                        <Badge 
                          variant={hasCritical ? 'destructive' : 'default'}
                          className="text-xs"
                        >
                          Complexity: {outlier.overallComplexityScore.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {/* Recommendation */}
                      <Alert>
                        <AlertDescription className="text-sm">
                          <strong>Recommendation:</strong> {outlier.recommendation}
                        </AlertDescription>
                      </Alert>

                      {/* Outlier Metrics Table */}
                      <div className="rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-24">Metric</TableHead>
                              <TableHead>Value</TableHead>
                              <TableHead>Z-Score</TableHead>
                              <TableHead>Percentile</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {outlier.outlierMetrics.map((metric) => (
                              <TableRow key={metric.metricKey}>
                                <TableCell className="font-mono text-sm font-medium">
                                  {metric.metricKey}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{metric.value.toFixed(3)}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {metric.metricName}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {metric.zScore > 0 ? '+' : ''}{metric.zScore.toFixed(2)}σ
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-muted-foreground">
                                    {metric.percentile.toFixed(1)}th
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <MetricStatusBadge
                                    status={metric.severity === 'critical' ? 'critical' : 'warning'}
                                    metricKey={metric.metricKey}
                                    value={metric.value}
                                    showText={false}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Statistical Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statistical Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1 rounded-lg border p-3">
              <div className="text-sm font-semibold text-muted-foreground">Total Plans</div>
              <div className="text-2xl font-bold">{totalPlans}</div>
            </div>
            <div className="space-y-1 rounded-lg border p-3 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
              <div className="text-sm font-semibold text-red-700 dark:text-red-300">Critical Outliers</div>
              <div className="text-2xl font-bold text-red-900 dark:text-red-100">{criticalPlans.length}</div>
              <div className="text-xs text-red-600 dark:text-red-400">
                {((criticalPlans.length / totalPlans) * 100).toFixed(1)}% of cohort
              </div>
            </div>
            <div className="space-y-1 rounded-lg border p-3 border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
              <div className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">Warning Outliers</div>
              <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">{warningPlans.length}</div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400">
                {((warningPlans.length / totalPlans) * 100).toFixed(1)}% of cohort
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
