import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, BookOpen, Calculator, Upload, Download, CheckCircle2, Info, Compass, Terminal, Github, Layers, Settings2, BarChart3, GitCompare, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { METRIC_DEFINITIONS, METRIC_CATEGORIES, type MetricCategory } from '@/lib/metrics-definitions';
import { TableOfContents, IEC61217Diagram, PatientAxesDiagram } from '@/components/help';
import 'katex/dist/katex.min.css';
import { BlockMath } from 'react-katex';

function ExternalLinkIcon() {
  return <ExternalLink className="ml-1 inline h-3 w-3" />;
}

function StepBadge({ step }: { step: number }) {
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold mr-3 shrink-0">
      {step}
    </span>
  );
}

function NoteBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4 text-sm my-4">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div>{children}</div>
      </div>
    </div>
  );
}

function MathFormula({ formula }: { formula: string }) {
  return (
    <div className="my-2 p-3 bg-muted/30 rounded-lg overflow-x-auto">
      <BlockMath math={formula} />
    </div>
  );
}

function ModeCard({ icon: Icon, title, description, features, linkTo }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  features: string[];
  linkTo: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h4 className="font-semibold">{title}</h4>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      <ul className="space-y-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button variant="outline" size="sm" asChild className="w-full">
        <Link to={linkTo}>Open {title.split(' ')[0]}</Link>
      </Button>
    </div>
  );
}

export default function Help() {
  const categories: MetricCategory[] = ['primary', 'secondary', 'accuracy', 'deliverability', 'delivery'];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Help & Documentation</h1>
              <p className="text-muted-foreground">
                RTp-lens Documentation
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Main layout with TOC sidebar */}
        <div className="flex gap-8">
          {/* Sticky TOC sidebar (desktop) */}
          <TableOfContents />

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Mobile TOC is rendered inside TableOfContents */}

            {/* Introduction */}
            <Card id="introduction" className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Introduction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">RTplan Complexity Lens</strong> (RTp-lens) is a browser-based tool for analyzing 
                  DICOM-RT Plan files and calculating delivery complexity metrics inspired by 
                  <strong className="text-foreground"> published research</strong> including the UCoMX framework.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  This tool helps radiation therapy professionals evaluate plan complexity to predict 
                  delivery accuracy, identify potential QA challenges, and compare treatment planning 
                  approaches.
                </p>
                
                <Separator className="my-4" />
                
                <h4 className="font-semibold text-base mb-3">Key Features</h4>
                <ul className="space-y-2">
                  {[
                    'Parse DICOM-RT Plan files directly in the browser (no upload to servers)',
                    'Visualize MLC apertures and gantry positions per control point',
                    'Calculate complexity metrics at plan, beam, and control point levels',
                    'Compare plans side-by-side with automated beam matching',
                    'Perform cohort analysis with statistical clustering',
                    'Export metrics to CSV and charts as PNG',
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Analysis Modes - NEW SECTION */}
            <Card id="analysis-modes">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Analysis Modes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground leading-relaxed">
                  RTp-lens provides four analysis modes for different workflows:
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <ModeCard
                    icon={BarChart3}
                    title="Single Plan"
                    description="Detailed analysis of individual DICOM-RT Plan files with interactive visualization."
                    features={[
                      'Interactive control point navigation with playback',
                      'MLC aperture and gantry visualization',
                      'Beam summary with MU and dose rate stats',
                      'Delivery timeline and complexity heatmaps',
                      'Per-CP metric calculation',
                    ]}
                    linkTo="/"
                  />
                  <ModeCard
                    icon={Layers}
                    title="Batch Analysis"
                    description="Process multiple plans simultaneously with aggregate statistics."
                    features={[
                      'Upload multiple files or ZIP archives',
                      'Nested folder structure support',
                      'Distribution histograms for each metric',
                      'Summary stats (mean, median, std, range)',
                      'Batch CSV/JSON export',
                    ]}
                    linkTo="/batch"
                  />
                  <ModeCard
                    icon={GitCompare}
                    title="Plan Comparison"
                    description="Side-by-side comparison of two treatment plans."
                    features={[
                      'Automated beam matching algorithm',
                      'Metrics difference table with delta values',
                      'Synchronized control point scrubber',
                      'MLC aperture overlay visualization',
                      'Comparison charts (MU, Polar, Delivery)',
                    ]}
                    linkTo="/compare"
                  />
                  <ModeCard
                    icon={Users}
                    title="Cohort Analysis"
                    description="Population-level statistical analysis with clustering."
                    features={[
                      'Cluster by technique, complexity, MU level, etc.',
                      'Extended statistics (IQR, percentiles, skewness)',
                      'Box plots, scatter matrix, correlation heatmap',
                      'Automatic outlier detection',
                      'Cohort CSV/JSON export',
                    ]}
                    linkTo="/cohort"
                  />
                </div>

                <Separator className="my-4" />

                <h4 className="font-semibold text-base mb-3">Clustering Dimensions (Cohort Mode)</h4>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-32 font-semibold">Dimension</TableHead>
                        <TableHead className="font-semibold">Description</TableHead>
                        <TableHead className="font-semibold">Example Groups</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Technique</TableCell>
                        <TableCell className="text-muted-foreground">Treatment technique type</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">VMAT, IMRT, 3DCRT</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Beam Count</TableCell>
                        <TableCell className="text-muted-foreground">Number of beams in plan</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">1-2, 3-4, 5-6, 7+</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Complexity</TableCell>
                        <TableCell className="text-muted-foreground">MCS-based complexity level</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">Low, Medium, High, Very High</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">MU Level</TableCell>
                        <TableCell className="text-muted-foreground">Total monitor units range</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">&lt;500, 500-1000, 1000-2000, &gt;2000</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Site</TableCell>
                        <TableCell className="text-muted-foreground">Treatment site from plan name</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">Brain, H&N, Thorax, Pelvis</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Machine Presets - NEW SECTION */}
            <Card id="machine-presets">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" />
                  Machine Presets & Thresholds
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground leading-relaxed">
                  Machine presets define delivery parameters and threshold alerts for different linac models.
                </p>

                <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-primary rounded-full" />
                  Built-in Presets
                </h4>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Preset</TableHead>
                        <TableHead className="font-semibold">Max Dose Rate</TableHead>
                        <TableHead className="font-semibold">Max Gantry Speed</TableHead>
                        <TableHead className="font-semibold">Max MLC Speed</TableHead>
                        <TableHead className="font-semibold">MLC Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Generic (Conservative)</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">600 MU/min</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">4.8 °/s</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">25 mm/s</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">MLCX</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Varian TrueBeam</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">600 (1400 FFF)</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">6.0 °/s</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">25 mm/s</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">MLCX</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Varian Halcyon</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">800 MU/min</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">4.0 °/s</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">50 mm/s</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">Dual-layer</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Elekta Versa HD</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">600 MU/min</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">6.0 °/s</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">35 mm/s</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">MLCY</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <Separator />

                <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-primary rounded-full" />
                  Threshold Alerts
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Each metric can trigger visual alerts based on configurable thresholds:
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4 bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
                      <span className="font-medium text-sm">Normal</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Value within expected range</p>
                  </div>
                  <div className="rounded-lg border p-4 bg-yellow-500/10 border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="font-medium text-sm text-yellow-600 dark:text-yellow-400">Warning</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Approaching concerning levels</p>
                  </div>
                  <div className="rounded-lg border p-4 bg-red-500/10 border-red-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="font-medium text-sm text-red-600 dark:text-red-400">Critical</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Exceeds recommended thresholds</p>
                  </div>
                </div>

                <NoteBox>
                  <strong>Threshold direction matters:</strong> Some metrics alert when values are too <em>low</em> (e.g., MCS &lt; 0.2), 
                  while others alert when too <em>high</em> (e.g., Leaf Travel &gt; 50,000mm).
                </NoteBox>

                <Separator />

                <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-primary rounded-full" />
                  Custom Presets
                </h4>
                <ul className="space-y-2">
                  {[
                    'Create new presets from scratch or duplicate built-in presets',
                    'Edit threshold warning and critical values for each metric',
                    'Customize delivery parameters (dose rate, speeds)',
                    'Import/export presets as JSON to share across teams',
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Metrics Reference */}
            <Card id="metrics-reference">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Metrics Reference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-6 text-sm text-muted-foreground">
                  The following metrics are inspired by complexity metrics from the literature
                  and associated publications.
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

            {/* Coordinate System */}
            <Card id="coordinate-system">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Compass className="h-5 w-5 text-primary" />
                  IEC 61217 Coordinate System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                <p className="text-muted-foreground leading-relaxed">
                  The <strong className="text-foreground">IEC 61217</strong> standard defines coordinate systems and angle conventions 
                  used universally in radiotherapy equipment. DICOM-RT files encode all geometric 
                  information using these conventions. Understanding this system is essential for 
                  correctly interpreting gantry angles, collimator rotations, and patient positioning 
                  in treatment plans.
                </p>

                {/* Gantry Angle Section */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-base flex items-center gap-2">
                    <span className="w-1 h-5 bg-primary rounded-full" />
                    Gantry Angle
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Gantry angle describes the rotation of the treatment head around the patient. 
                    The angle is measured from the viewer's perspective facing the gantry. At <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">0°</code>, 
                    the radiation source is directly above the patient (superior), with the beam 
                    directed downward. Rotation proceeds <strong>clockwise</strong> from this position.
                  </p>
                  
                  <div className="my-6 flex flex-col lg:flex-row gap-6 items-start">
                    <div className="shrink-0 rounded-xl border bg-gradient-to-br from-muted/20 to-muted/40 p-4">
                      <IEC61217Diagram />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="overflow-x-auto rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-20 font-semibold">Angle</TableHead>
                              <TableHead className="font-semibold">Beam Direction</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-mono font-medium text-primary">0°</TableCell>
                              <TableCell>From ceiling — AP beam (enters anterior surface)</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-mono font-medium text-primary">90°</TableCell>
                              <TableCell>From patient's left — left lateral beam</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-mono font-medium text-primary">180°</TableCell>
                              <TableCell>From floor — PA beam (enters posterior, through couch)</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-mono font-medium text-primary">270°</TableCell>
                              <TableCell>From patient's right — right lateral beam</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Collimator Angle Section */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-base flex items-center gap-2">
                    <span className="w-1 h-5 bg-primary rounded-full" />
                    Collimator Angle
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The collimator (beam-limiting device) can rotate independently within the gantry head. 
                    At <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">0°</code>, the MLC leaves are perpendicular to the gantry rotation axis. Rotation is 
                    <strong> counter-clockwise</strong> when viewed from the radiation source (beam's-eye view).
                  </p>
                  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <code className="font-mono bg-background px-2 py-0.5 rounded border text-primary font-medium">0°</code>
                      <span className="text-muted-foreground">— MLC leaves perpendicular to gantry rotation axis</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <code className="font-mono bg-background px-2 py-0.5 rounded border text-primary font-medium">+</code>
                      <span className="text-muted-foreground">— <strong>Counter-clockwise</strong> when viewed from the radiation source (BEV)</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Couch Angle Section */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-base flex items-center gap-2">
                    <span className="w-1 h-5 bg-primary rounded-full" />
                    Couch (Table) Angle
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Couch rotation allows non-coplanar beam arrangements. The angle is measured 
                    as viewed from above the patient.
                  </p>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-mono font-medium w-20 text-primary">0°</TableCell>
                          <TableCell className="text-muted-foreground">Couch parallel to gantry rotation axis (standard position)</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono font-medium text-primary">90°</TableCell>
                          <TableCell className="text-muted-foreground">Counter-clockwise rotation (patient's head toward 90° gantry position)</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono font-medium text-primary">270°</TableCell>
                          <TableCell className="text-muted-foreground">Clockwise rotation (patient's head toward 270° gantry position)</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <Separator />

                {/* Patient Coordinate Section */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-base flex items-center gap-2">
                    <span className="w-1 h-5 bg-primary rounded-full" />
                    Patient Coordinate System
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The patient coordinate system assumes a supine (face-up) patient position with 
                    head toward the gantry (head-first supine, HFS). The origin is at the machine 
                    isocenter. This is a <strong>right-handed</strong> coordinate system.
                  </p>
                  
                  <div className="my-6 flex flex-col lg:flex-row gap-6 items-start">
                    <div className="shrink-0 rounded-xl border bg-gradient-to-br from-muted/20 to-muted/40 p-4">
                      <PatientAxesDiagram />
                    </div>
                    <div className="flex-1 min-w-0 space-y-4">
                      <div className="overflow-x-auto rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-16 font-semibold">Axis</TableHead>
                              <TableHead className="font-semibold">Positive (+)</TableHead>
                              <TableHead className="font-semibold">Negative (−)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-mono font-bold text-[hsl(0,84%,60%)]">X</TableCell>
                              <TableCell>Patient's Left</TableCell>
                              <TableCell className="text-muted-foreground">Patient's Right</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-mono font-bold text-[hsl(142,71%,45%)]">Y</TableCell>
                              <TableCell>Posterior (back)</TableCell>
                              <TableCell className="text-muted-foreground">Anterior (front)</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-mono font-bold text-[hsl(217,91%,60%)]">Z</TableCell>
                              <TableCell>Superior (head)</TableCell>
                              <TableCell className="text-muted-foreground">Inferior (feet)</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                      <NoteBox>
                        This differs from medical imaging conventions (LPS/RAS). 
                        DICOM-RT patient coordinates follow IEC 61217 for consistency with machine geometry.
                      </NoteBox>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Machine Variations Section */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-base flex items-center gap-2">
                    <span className="w-1 h-5 bg-primary rounded-full" />
                    Machine-Specific Variations
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    While IEC 61217 defines the coordinate system, different linac manufacturers 
                    use varying MLC and jaw configurations:
                  </p>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">Machine</TableHead>
                          <TableHead className="font-semibold">MLC Type</TableHead>
                          <TableHead className="font-semibold">Jaw Configuration</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Varian C-arm (TrueBeam, Clinac)</TableCell>
                          <TableCell className="text-muted-foreground">MLCX (leaves move in X-direction)</TableCell>
                          <TableCell className="text-muted-foreground">ASYMX, ASYMY jaws</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Varian Halcyon/Ethos</TableCell>
                          <TableCell className="text-muted-foreground">Dual-layer stacked MLC</TableCell>
                          <TableCell className="text-muted-foreground">No physical jaws</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Elekta Agility/Versa HD</TableCell>
                          <TableCell className="text-muted-foreground">MLCY (leaves move in Y-direction)</TableCell>
                          <TableCell className="text-muted-foreground">X, Y jaw pairs</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-lg bg-muted/50 border text-sm">
                  <strong className="text-foreground">References:</strong>{' '}
                  <span className="text-muted-foreground">For complete technical specifications, see the{' '}</span>
                  <a
                    href="https://dicom.nema.org/medical/dicom/current/output/chtml/part03/sect_C.8.8.25.6.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    DICOM PS3.3 Coordinate Systems<ExternalLinkIcon />
                  </a>{' '}
                  <span className="text-muted-foreground">and the IEC 61217:2011 standard for radiotherapy equipment coordinates.</span>
                </div>
              </CardContent>
            </Card>

            {/* How to Use */}
            <Card id="how-to-use">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  How to Use
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start">
                  <StepBadge step={1} />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-base">Upload a Plan</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Drag and drop a DICOM-RT Plan file (<code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">RP*.dcm</code>) onto the upload zone, or click to 
                      browse for a file. Alternatively, click "Load Demo Plan" to try with sample data.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start">
                  <StepBadge step={2} />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-base">Navigate Control Points</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Use the slider or playback controls to step through control points. The MLC 
                      aperture and gantry position update in real-time.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start">
                  <StepBadge step={3} />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-base">Switch Beams</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      For multi-beam plans, use the beam selector tabs to view different beams. 
                      Each beam shows its own metrics and control point sequence.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start">
                  <StepBadge step={4} />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-base">Configure Metrics</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Before uploading, expand "Metrics Settings" to choose which metrics to display 
                      and export. Your preferences are saved for future sessions.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start">
                  <StepBadge step={5} />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-base">Export Data</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Click the CSV button in the metrics panel to download all complexity metrics 
                      for external analysis in spreadsheet software.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Format */}
            <Card id="export-format">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  CSV Export Format
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  The CSV export includes plan-level aggregate metrics and per-beam breakdowns:
                </p>
                <div className="space-y-3">
                  {[
                    { label: 'Header section', desc: 'Plan name, export date, tool version' },
                    { label: 'Plan metrics', desc: 'MCS, LSV, AAV, MFA, LT, LTMCS, Total MU' },
                    { label: 'Beam metrics', desc: 'Per-beam values with beam name, MU, and control point count' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-foreground">{item.label}:</span>{' '}
                        <span className="text-muted-foreground">{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <NoteBox>
                  Only metrics enabled in your settings will be included in the export.
                </NoteBox>
              </CardContent>
            </Card>

            {/* Python Toolkit */}
            <Card id="python-toolkit" className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-primary" />
                  Python Toolkit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  The <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-sm">rtplan-complexity</code> Python 
                  package provides identical metric calculations for offline analysis on your local workstation.
                </p>

                <Separator className="my-4" />
                
                <h4 className="font-semibold text-base mb-3">Key Features</h4>
                <ul className="space-y-2">
                  {[
                    'Identical metric algorithms to the web application',
                    'Single-plan, batch, and cohort analysis modes',
                    'Matplotlib visualizations (box plots, heatmaps, scatter matrix)',
                    'CSV and JSON export formats',
                    'Machine-specific delivery time estimation',
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Separator className="my-4" />

                <h4 className="font-semibold text-base mb-3">Quick Start</h4>
                <div className="rounded-lg border bg-muted/30 overflow-hidden">
                  <div className="px-4 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
                    Python
                  </div>
                  <pre className="p-4 overflow-x-auto text-sm">
                    <code className="font-mono text-foreground">{`from rtplan_complexity import parse_rtplan, calculate_plan_metrics

plan = parse_rtplan("RTPLAN.dcm")
metrics = calculate_plan_metrics(plan)

print(f"MCS: {metrics.MCS:.4f}")
print(f"LSV: {metrics.LSV:.4f}")`}</code>
                  </pre>
                </div>

                <NoteBox>
                  Install with: <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">pip install rtplan-complexity</code>
                </NoteBox>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button asChild>
                    <Link to="/python-docs" className="flex items-center gap-2">
                      View Full Documentation
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <a
                      href="https://github.com/rtplan-complexity/rtplan-complexity"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <Github className="h-4 w-4" />
                      GitHub Repository
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* References */}
            <Card id="references">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  References & Citations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* UCoMX Framework */}
                <div className="rounded-lg bg-muted/30 p-4 border">
                  <h4 className="font-semibold text-base mb-2">UCoMX Framework</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    The metrics in this tool are inspired by the UCoMX framework. For the original MATLAB implementation, see:
                  </p>
                  <a
                    href="https://zenodo.org/records/8276837"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-primary hover:underline font-medium"
                  >
                    Zenodo Repository: UCoMX v1.1<ExternalLinkIcon />
                  </a>
                </div>

                <Separator />

                {/* Key Publications */}
                <div>
                  <h4 className="font-semibold text-base mb-4">Key Publications</h4>
                  <div className="space-y-4">
                    {[
                      {
                        label: 'MCS Definition',
                        citation: 'McNiven AL, et al. "A new metric for assessing IMRT modulation complexity and plan deliverability."',
                        journal: 'Med Phys. 2010;37(2):505-515.',
                        doi: '10.1118/1.3276775',
                      },
                      {
                        label: 'LSV and AAV',
                        citation: 'Masi L, et al. "Impact of plan parameters on the dosimetric accuracy of volumetric modulated arc therapy."',
                        journal: 'Med Phys. 2013;40(7):071718.',
                        doi: '10.1118/1.4810969',
                      },
                      {
                        label: 'Complexity Metrics Review',
                        citation: '"Complexity metrics for IMRT and VMAT plans: a review of current literature and applications."',
                        journal: 'J Appl Clin Med Phys. 2019.',
                        link: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6774599/',
                        linkText: 'PMC6774599',
                      },
                      {
                        label: 'Small Aperture Score',
                        citation: 'Crowe SB, et al. "Treatment plan complexity metrics for predicting IMRT pre-treatment quality assurance results."',
                        journal: 'Australas Phys Eng Sci Med. 2014;37:475-482.',
                        doi: '10.1007/s13246-014-0274-9',
                      },
                      {
                        label: 'Edge Metric',
                        citation: 'Younge KC, et al. "Predicting deliverability of VMAT plans using aperture complexity analysis."',
                        journal: 'J Appl Clin Med Phys. 2016;17(4):124-131.',
                        doi: '10.1120/jacmp.v17i4.6241',
                      },
                      {
                        label: 'Plan Irregularity',
                        citation: 'Du W, et al. "Quantification of beam complexity in IMRT treatment plans."',
                        journal: 'Med Phys. 2014;41(2):021716.',
                        doi: '10.1118/1.4861821',
                      },
                      {
                        label: 'Delivery Time Estimation',
                        citation: 'Park JM, et al. "The effect of MLC speed and acceleration on the plan delivery accuracy of VMAT."',
                        journal: 'Brit J Radiol. 2015.',
                        doi: '10.1259/bjr.20140698',
                      },
                    ].map((pub, idx) => (
                      <div key={idx} className="rounded-lg border p-4 bg-card">
                        <Badge variant="outline" className="mb-2 text-xs">
                          {pub.label}
                        </Badge>
                        <p className="text-sm text-foreground">{pub.citation}</p>
                        <p className="text-sm text-muted-foreground italic">{pub.journal}</p>
                        {pub.doi && (
                          <a
                            href={`https://doi.org/${pub.doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline mt-1 inline-block"
                          >
                            DOI: {pub.doi}<ExternalLinkIcon />
                          </a>
                        )}
                        {pub.link && (
                          <a
                            href={pub.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline mt-1 inline-block"
                          >
                            {pub.linkText}<ExternalLinkIcon />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Technical Resources */}
                <div>
                  <h4 className="font-semibold text-base mb-3">Technical Resources</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a
                        href="https://dicom.nema.org/medical/dicom/current/output/chtml/part03/sect_C.8.8.14.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        DICOM RT Plan IOD Specification
                      </a>
                    </li>
                    <li className="flex items-center gap-2">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a
                        href="https://github.com/cornerstonejs/dicomParser"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        dicom-parser Library (GitHub)
                      </a>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* About */}
            <Card id="about" className="border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  About
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">RT Plan Complexity Analyzer</strong> is a browser-based, open-source tool 
                  for analyzing radiotherapy plan complexity.
                </p>
                <div className="grid gap-2 text-sm">
                  {[
                    { label: 'Version', value: '1.0.0' },
                    { label: 'Privacy', value: 'All processing occurs locally in your browser — no data is uploaded to servers' },
                    { label: 'Metrics', value: 'Complexity metrics inspired by published research (see References)' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-foreground">{item.label}:</span>{' '}
                        <span className="text-muted-foreground">{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <NoteBox>
                  This tool is intended for research and educational purposes. Clinical use should 
                  follow institutional validation protocols.
                </NoteBox>
              </CardContent>
            </Card>

            {/* Back Link */}
            <div className="pt-4 text-center">
              <Button asChild>
                <Link to="/">← Back to Analyzer</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
