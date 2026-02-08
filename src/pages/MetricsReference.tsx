import { Link } from 'react-router-dom';
import { ArrowLeft, Calculator, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { METRIC_DEFINITIONS, METRIC_CATEGORIES, type MetricCategory } from '@/lib/metrics-definitions';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

function ExternalLinkIcon() {
  return <ExternalLink className="ml-1 inline h-3 w-3" />;
}

function MathFormula({ formula }: { formula: string }) {
  return (
    <div className="my-2 p-3 bg-muted/30 rounded-lg overflow-x-auto">
      <BlockMath math={formula} />
    </div>
  );
}

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function MetricsReference() {
  const categories: MetricCategory[] = ['primary', 'secondary', 'accuracy', 'deliverability', 'delivery'];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/help">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <Calculator className="h-8 w-8 text-primary" />
                Metrics Reference
              </h1>
              <p className="text-muted-foreground mt-2">
                Complete documentation of all complexity metrics
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="space-y-8">
          {/* Overview */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground leading-relaxed">
                RTp-lens calculates over 30 complexity metrics inspired by published research. 
                These metrics quantify different aspects of DICOM-RT Plan delivery complexity, 
                helping predict delivery accuracy challenges and compare treatment planning approaches.
              </p>
            </CardContent>
          </Card>

          {/* All Metrics */}
          <Card id="metrics-reference">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Complexity Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-sm text-muted-foreground">
                The following metrics are organized by category and inspired by complexity metrics from the literature.
              </p>

              {categories.map((category) => {
                const categoryInfo = METRIC_CATEGORIES[category];
                const metrics = Object.values(METRIC_DEFINITIONS).filter(
                  (m) => m.category === category
                );

                if (metrics.length === 0) return null;

                return (
                  <div key={category} className="mb-8">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-base">{categoryInfo.label}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {metrics.length} metrics
                      </Badge>
                    </div>
                    <p className="mb-4 text-sm text-muted-foreground">
                      {categoryInfo.description}
                    </p>
                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-24 font-semibold">Metric</TableHead>
                            <TableHead className="font-semibold">Description</TableHead>
                            <TableHead className="w-20 font-semibold">Unit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {metrics.map((metric) => (
                            <TableRow key={metric.key}>
                              <TableCell className="font-mono font-medium text-primary">
                                {metric.key}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{metric.name}</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {metric.fullDescription}
                                </div>
                                {metric.formula && (
                                  <MathFormula formula={metric.formula} />
                                )}
                                {metric.reference && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    <span className="font-medium">Ref:</span> {metric.reference}
                                    {metric.doi && (
                                      <>
                                        {' '}
                                        <a
                                          href={`https://doi.org/${metric.doi}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline"
                                        >
                                          DOI<ExternalLinkIcon />
                                        </a>
                                      </>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground font-mono text-sm">
                                {metric.unit || '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="pt-4 text-center space-x-3">
            <Button asChild>
              <Link to="/help">← Back to Help</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/technical">Technical Reference →</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
