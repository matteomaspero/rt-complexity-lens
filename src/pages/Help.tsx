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
import { TableOfContents } from '@/components/help';

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
                        <TableHead className="font-semibold">MLC Platform</TableHead>
                        <TableHead className="font-semibold">Max Dose Rate</TableHead>
                        <TableHead className="font-semibold">Max Gantry Speed</TableHead>
                        <TableHead className="font-semibold">Max MLC Speed</TableHead>
                        <TableHead className="font-semibold">Energies</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Generic (Conservative)</TableCell>
                        <TableCell className="text-muted-foreground text-sm">Generic</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">600 MU/min</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">4.8 °/s</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">25 mm/s</TableCell>
                        <TableCell className="text-muted-foreground text-sm">—</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Varian TrueBeam</TableCell>
                        <TableCell className="text-muted-foreground text-sm">Millennium 120</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">600 (1400 FFF)</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">6.0 °/s</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">25 mm/s</TableCell>
                        <TableCell className="text-muted-foreground text-sm">6/10/15/18X, 6/10FFF, 6–20e</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Varian Halcyon</TableCell>
                        <TableCell className="text-muted-foreground text-sm">SX2 Dual-Layer</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">800 MU/min</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">4.0 °/s</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">50 mm/s</TableCell>
                        <TableCell className="text-muted-foreground text-sm">6X, 6FFF</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Varian Ethos</TableCell>
                        <TableCell className="text-muted-foreground text-sm">HD120</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">800 (1400 FFF)</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">6.0 °/s</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">25 mm/s</TableCell>
                        <TableCell className="text-muted-foreground text-sm">6X, 6/10FFF</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Elekta Versa HD</TableCell>
                        <TableCell className="text-muted-foreground text-sm">Agility</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">600 (1400 FFF)</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">6.0 °/s</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">35 mm/s</TableCell>
                        <TableCell className="text-muted-foreground text-sm">6/10/15/18X, 6/10FFF, 4–18e</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Elekta Unity (MR-Linac)</TableCell>
                        <TableCell className="text-muted-foreground text-sm">Agility 160</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">425 MU/min</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">6.0 °/s</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">25 mm/s</TableCell>
                        <TableCell className="text-muted-foreground text-sm">7X</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Elekta Harmony</TableCell>
                        <TableCell className="text-muted-foreground text-sm">MLCi2</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">600 MU/min</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">6.0 °/s</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">35 mm/s</TableCell>
                        <TableCell className="text-muted-foreground text-sm">6/10/15X</TableCell>
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
                    'Customize delivery parameters (dose rate, speeds, MLC model)',
                    'Configure energy-specific dose rates per machine',
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
            {/* Metrics Reference - Link to dedicated page */}
            <Card id="metrics-reference" className="border-l-4 border-l-amber-500 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-amber-600" />
                  Complexity Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  RTp-lens calculates over 30 complexity metrics organized by category: 
                  <strong> Primary</strong> (MCS, LSV, AAV, MFA, LT, LTMCS), 
                  <strong> Accuracy</strong> (LG, MAD, EFS, etc.), and 
                  <strong> Deliverability</strong> (MUCA, GT, GS, etc.).
                </p>
                <p className="text-sm text-muted-foreground">
                  Each metric includes mathematical definition, units, and references to published research.
                </p>
                <Button asChild variant="outline">
                  <Link to="/metrics" className="flex items-center gap-2">
                    View Complete Metrics Reference
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Plan Aperture Modulation (PAM) */}
            <Card id="target-based-metrics">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Target-Based Metrics: PAM & BAM
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  Plan Aperture Modulation (PAM) and Beam Aperture Modulation (BAM) measure how well the MLC apertures 
                  conform to target geometry. These metrics require a corresponding RTSTRUCT file with target structure(s).
                </p>

                <div className="space-y-4 mt-6">
                  <div className="border-l-2 border-primary pl-4">
                    <h4 className="font-semibold text-base">Plan Aperture Modulation (PAM)</h4>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      <strong>Definition:</strong> Average fraction of time the target is blocked by the primary collimator 
                      or MLC apertures across all control points.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      <strong>Range:</strong> 0.0 to 1.0, where:
                    </p>
                    <ul className="text-sm text-muted-foreground ml-4 mt-2 space-y-1">
                      <li>• <strong>PAM = 0.0</strong>: Target is never blocked (excellent conformality)</li>
                      <li>• <strong>PAM = 0.5</strong>: Target is blocked ~50% of the time (moderate blocking)</li>
                      <li>• <strong>PAM = 1.0</strong>: Target is always completely blocked (poor conformality)</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      <strong>Interpretation:</strong> Lower PAM values indicate better MLC conformity to the target shape. 
                      High PAM suggests opportunities for plan optimization or multi-arc delivery.
                    </p>
                  </div>

                  <div className="border-l-2 border-blue-500 pl-4">
                    <h4 className="font-semibold text-base">Beam Aperture Modulation (BAM)</h4>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      <strong>Definition:</strong> Per-beam average of target blocking by apertures, calculated identically to PAM 
                      but for individual beams.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      <strong>In the Viewer:</strong> Each beam shows its BAM value in the summary card. Multi-arc plans typically have 
                      lower BAM per arc due to repeated beam angles allowing better conformality.
                    </p>
                  </div>
                </div>

                <NoteBox>
                  <p>
                    <strong>How to use:</strong> Upload an RTSTRUCT file (RS*.dcm) with your target structure after loading the plan. 
                    PAM and BAM will automatically calculate. If multiple structures exist, select the target/PTV.
                  </p>
                </NoteBox>
              </CardContent>
            </Card>

            {/* Coordinate System - Link to dedicated page */}
            <Card id="coordinate-system" className="border-l-4 border-l-blue-500 bg-blue-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Compass className="h-5 w-5 text-blue-600" />
                  IEC 61217 Coordinate System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  RTv-lens uses the <strong>IEC 61217</strong> standard for coordinate systems. 
                  This defines gantry angles, collimator rotations, couch positioning, and patient axes 
                  used in all DICOM-RT files.
                </p>
                <p className="text-sm text-muted-foreground">
                  If you need to understand angle conventions, machine-specific variations, or technical details 
                  about coordinate transformations, see the dedicated reference.
                </p>
                <Button asChild variant="outline">
                  <Link to="/technical" className="flex items-center gap-2">
                    View Technical Reference
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
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
                    <h4 className="font-semibold text-base">Load RTSTRUCT (Optional)</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      To calculate Plan Aperture Modulation (PAM) and Beam Aperture Modulation (BAM) metrics, 
                      upload a corresponding RTSTRUCT file. PAM measures target coverage and aperture blocking. 
                      The metrics automatically recalculate when the RTSTRUCT is loaded.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start">
                  <StepBadge step={6} />
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

            {/* Workflows & Tips */}
            <Card id="workflows-tips">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  Workflows & Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground leading-relaxed">
                  Recommended workflows for getting the most out of RTp-lens, whether you're in clinic or doing research.
                </p>

                {/* Clinical Workflow */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-base">Clinical Workflow</h4>
                  <div className="space-y-2 text-sm">
                    {[
                      { step: 1, label: 'Batch', desc: 'Screen clinic workload for complexity outliers (5-10 min)' },
                      { step: 2, label: 'Single', desc: 'Deep dive on complex or concerning plans (10-15 min)' },
                      { step: 3, label: 'Compare', desc: 'Test plan modifications or alternatives (5 min)' },
                      { step: 4, label: 'Decision', desc: 'Approve or request re-optimization (2 min)' },
                    ].map(({ step, label, desc }) => (
                      <div key={step} className="flex items-start gap-3">
                        <StepBadge step={step} />
                        <div>
                          <span className="font-medium">{label}:</span>{' '}
                          <span className="text-muted-foreground">{desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Research Workflow */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-base">Research / Institutional Workflow</h4>
                  <div className="space-y-2 text-sm">
                    {[
                      { step: 1, label: 'Batch', desc: 'Collect all plans, 50-100+ (30 min)' },
                      { step: 2, label: 'Cohort', desc: 'Analyze population patterns & clusters (20 min)' },
                      { step: 3, label: 'Single', desc: 'Validate outliers & edge cases (15 min)' },
                      { step: 4, label: 'Export', desc: 'Generate report with findings (5 min)' },
                    ].map(({ step, label, desc }) => (
                      <div key={step} className="flex items-start gap-3">
                        <StepBadge step={step} />
                        <div>
                          <span className="font-medium">{label}:</span>{' '}
                          <span className="text-muted-foreground">{desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Pro Tips */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-base">Pro Tips</h4>
                  <ul className="space-y-2">
                    {[
                      'Start with MCS — it\'s the primary complexity indicator',
                      'Check MAD & LG — critical for QA accuracy',
                      'Review avgDoseRate and LS for machine feasibility',
                      'Multi-rotation VMAT plans show color-coded rotations in dose rate charts',
                      'Use Batch first to identify plans needing attention',
                      'Use Comparison mode to A/B-test plan variations',
                    ].map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator className="my-4" />

                {/* FAQ */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-base">Common Questions</h4>
                  <div className="space-y-4 text-sm">
                    {[
                      { q: 'What does MCS value of 0.5 mean?', a: 'MCS ranges from 0 (highly modulated) to 1 (simple). 0.5 indicates moderate complexity—likely requiring standard QA.' },
                      { q: 'Why are metrics organized in 6 levels?', a: 'They\'re ordered by clinical priority: Plan Overview → Details → QA Concerns → Delivery Feasibility → Machine Parameters → Advanced.' },
                      { q: 'How do I interpret the colored rotations?', a: 'Each 360° gantry rotation gets a different color (blue, orange, green…). This shows which rotation has dose delivery issues.' },
                      { q: 'Batch vs. single analysis?', a: 'Use Batch to screen many plans (5-100+) quickly, then Single for plans needing deeper investigation.' },
                    ].map(({ q, a }, idx) => (
                      <div key={idx}>
                        <div className="font-medium text-foreground">{q}</div>
                        <div className="text-muted-foreground mt-1">{a}</div>
                      </div>
                    ))}
                  </div>
                </div>
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
                      href="https://github.com/matteomaspero/rt-complexity-lens/blob/main/python/README.md"
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
