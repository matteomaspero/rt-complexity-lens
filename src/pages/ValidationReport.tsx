import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ExternalLink, ShieldCheck, FlaskConical, GitCompare, Info, Download, FileCode2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  CROSS_VALIDATION_SUMMARY,
  PER_METRIC_DELTAS,
  UCOMX_BENCHMARK,
  SHARED_ALGORITHMS,
  METRIC_TOLERANCES,
  SOURCE_FILES,
  GITHUB_BASE_URL,
} from '@/lib/validation-data';

function StatusBadge({ passed }: { passed: boolean }) {
  return passed ? (
    <Badge className="bg-green-600 text-white hover:bg-green-700">PASS</Badge>
  ) : (
    <Badge variant="destructive">FAIL</Badge>
  );
}

function handleDownloadJSON() {
  const data = {
    generatedAt: new Date().toISOString(),
    generator: "RTp-lens Validation Report",
    summary: CROSS_VALIDATION_SUMMARY,
    tolerances: METRIC_TOLERANCES,
    deltas: PER_METRIC_DELTAS,
    benchmark: UCOMX_BENCHMARK,
    algorithms: SHARED_ALGORITHMS,
    sourceFiles: SOURCE_FILES.map(f => ({ ...f, url: `${GITHUB_BASE_URL}${f.path}` })),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rtp-lens-validation-report.json';
  a.click();
  URL.revokeObjectURL(url);
}

function SourceFilesSection() {
  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <FileCode2 className="h-4 w-4 text-primary" />
        Source Files
      </h4>
      <ul className="space-y-1">
        {SOURCE_FILES.map((f) => (
          <li key={f.path} className="flex items-center gap-2 text-sm">
            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">{f.label}:</span>
            <a
              href={`${GITHUB_BASE_URL}${f.path}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-mono text-xs truncate"
            >
              {f.path}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ValidationReport() {
  const { planCount, passCount, failCount, lastValidated } = CROSS_VALIDATION_SUMMARY;
  const allPassed = (failCount as number) === 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/help"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Cross-Validation &amp; Benchmark Report</h1>
              <p className="text-muted-foreground">RTp-lens algorithm validation results</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="space-y-8">
          {/* ── Parity Stamp ── */}
          <Card className={allPassed ? 'border-green-500/40 bg-green-500/5' : 'border-destructive/40 bg-destructive/5'}>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <ShieldCheck className={`h-10 w-10 shrink-0 ${allPassed ? 'text-green-600' : 'text-destructive'}`} />
                <div className="flex-1 space-y-1">
                  <div className="text-lg font-semibold">
                    TypeScript ↔ Python Parity: {passCount}/{planCount} PASS
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Last validated: <strong className="text-foreground">{lastValidated}</strong> &middot;{' '}
                    {planCount} plans tested, {failCount} failures
                  </p>
                </div>
                <StatusBadge passed={allPassed} />
              </div>
            </CardContent>
          </Card>

          {/* ── Section A: Metric Tolerances & Deltas ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary" />
                Metric Tolerances &amp; Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Each metric is compared between the TypeScript (web) and Python (offline) implementations across
                all {planCount} test plans. Deltas must remain within the stated tolerance.
              </p>

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Metric</TableHead>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold text-right">Tolerance</TableHead>
                      <TableHead className="font-semibold text-right">Unit</TableHead>
                      <TableHead className="font-semibold text-right">Mean Δ</TableHead>
                      <TableHead className="font-semibold text-right">Max Δ</TableHead>
                      <TableHead className="font-semibold text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PER_METRIC_DELTAS.map((d) => {
                      const tol = METRIC_TOLERANCES.find((t) => t.metric === d.metric);
                      return (
                        <TableRow key={d.metric}>
                          <TableCell className="font-mono font-medium">{d.metric}</TableCell>
                          <TableCell className="text-muted-foreground text-xs capitalize">{tol?.category ?? '—'}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{d.tolerance}</TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm">{tol?.unit ?? '—'}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{d.meanDelta.toFixed(6)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{d.maxDelta.toFixed(6)}</TableCell>
                          <TableCell className="text-center">
                            {d.passed ? (
                              <CheckCircle2 className="inline h-4 w-4 text-green-600" />
                            ) : (
                              <span className="text-destructive font-semibold">✗</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4 text-sm flex items-start gap-3">
                <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-muted-foreground">
                  Cross-validation is run offline via{' '}
                  <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">python tests/cross_validate.py</code>{' '}
                  after every algorithm change. Reference data is generated by the TypeScript test suite.
                </span>
              </div>

              <SourceFilesSection />
            </CardContent>
          </Card>

          {/* ── Section B: UCoMX Benchmark ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitCompare className="h-5 w-5 text-primary" />
                {UCOMX_BENCHMARK.referenceVersion} Benchmark
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                RTp-lens core metrics are benchmarked against the <strong className="text-foreground">UCoMX</strong> MATLAB
                reference implementation. Agreement is evaluated on the {UCOMX_BENCHMARK.datasetDescription}.
              </p>

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Metric</TableHead>
                      <TableHead className="font-semibold">Description</TableHead>
                      <TableHead className="font-semibold text-right">Agreement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {UCOMX_BENCHMARK.coreMetrics.map((m) => (
                      <TableRow key={m.metric}>
                        <TableCell className="font-mono font-medium">{m.metric}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{m.description}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="font-mono">{m.agreement}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                <a
                  href={UCOMX_BENCHMARK.referenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Zenodo Repository: {UCOMX_BENCHMARK.referenceVersion}
                </a>
              </div>
            </CardContent>
          </Card>

          {/* ── Section C: Algorithmic Parity Statement ── */}
          <Card className="border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Algorithmic Parity Statement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                The <strong className="text-foreground">TypeScript</strong> (web) and{' '}
                <strong className="text-foreground">Python</strong> (offline) implementations use identical algorithms
                and are cross-validated against each other and against the{' '}
                <strong className="text-foreground">{UCOMX_BENCHMARK.referenceVersion}</strong> reference. Any algorithm
                change triggers re-validation across all {planCount}+ test plans.
              </p>

              <Separator />

              <h4 className="font-semibold text-base flex items-center gap-2">
                <span className="w-1 h-5 bg-primary rounded-full" />
                Shared Algorithmic Details
              </h4>
              <ul className="space-y-2">
                {SHARED_ALGORITHMS.map((algo, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{algo}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Button variant="outline" asChild>
              <Link to="/help">← Back to Help</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/python-docs">Python Toolkit Docs</Link>
            </Button>
            <Button variant="outline" onClick={handleDownloadJSON}>
              <Download className="h-4 w-4 mr-2" />
              Download Validation Data (JSON)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
