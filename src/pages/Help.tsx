import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, BookOpen, Calculator, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { METRIC_DEFINITIONS, METRIC_CATEGORIES, type MetricCategory } from '@/lib/metrics-definitions';

function ExternalLinkIcon() {
  return <ExternalLink className="ml-1 inline h-3 w-3" />;
}

export default function Help() {
  const categories: MetricCategory[] = ['primary', 'secondary', 'delivery'];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Help & Documentation</h1>
            <p className="text-muted-foreground">
              RT Plan Complexity Analyzer Guide
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Introduction
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                The <strong>RT Plan Complexity Analyzer</strong> is a browser-based tool for analyzing 
                DICOM-RT Plan files and calculating delivery complexity metrics based on the 
                <strong> UCoMX v1.1</strong> framework.
              </p>
              <p>
                This tool helps radiation therapy professionals evaluate plan complexity to predict 
                delivery accuracy, identify potential QA challenges, and compare treatment planning 
                approaches.
              </p>
              <h4>Key Features</h4>
              <ul>
                <li>Parse DICOM-RT Plan files directly in the browser (no upload to servers)</li>
                <li>Visualize MLC apertures and gantry positions per control point</li>
                <li>Calculate UCoMX complexity metrics at plan, beam, and control point levels</li>
                <li>Export metrics to CSV for external analysis</li>
                <li>Support for VMAT and static IMRT plans</li>
              </ul>
            </CardContent>
          </Card>

          {/* Metrics Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Metrics Reference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                The following metrics are calculated based on the UCoMX v1.1 MATLAB implementation 
                and associated publications.
              </p>

              {categories.map((category) => {
                const categoryInfo = METRIC_CATEGORIES[category];
                const metrics = Object.values(METRIC_DEFINITIONS).filter(
                  (m) => m.category === category
                );

                return (
                  <div key={category} className="mb-6">
                    <h4 className="mb-2 font-medium">{categoryInfo.label}</h4>
                    <p className="mb-3 text-sm text-muted-foreground">
                      {categoryInfo.description}
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Metric</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-20">Unit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {metrics.map((metric) => (
                          <TableRow key={metric.key}>
                            <TableCell className="font-mono font-medium">
                              {metric.key}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{metric.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {metric.fullDescription}
                              </div>
                              {metric.reference && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  Ref: {metric.reference}
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
                            <TableCell className="text-muted-foreground">
                              {metric.unit || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* How to Use */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                How to Use
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h4>1. Upload a Plan</h4>
              <p>
                Drag and drop a DICOM-RT Plan file (RP*.dcm) onto the upload zone, or click to 
                browse for a file. Alternatively, click "Load Demo Plan" to try with sample data.
              </p>

              <h4>2. Navigate Control Points</h4>
              <p>
                Use the slider or playback controls to step through control points. The MLC 
                aperture and gantry position update in real-time.
              </p>

              <h4>3. Switch Beams</h4>
              <p>
                For multi-beam plans, use the beam selector tabs to view different beams. 
                Each beam shows its own metrics and control point sequence.
              </p>

              <h4>4. Configure Metrics</h4>
              <p>
                Before uploading, expand "Metrics Settings" to choose which metrics to display 
                and export. Your preferences are saved for future sessions.
              </p>

              <h4>5. Export Data</h4>
              <p>
                Click the CSV button in the metrics panel to download all complexity metrics 
                for external analysis in spreadsheet software.
              </p>
            </CardContent>
          </Card>

          {/* Export Format */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                CSV Export Format
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                The CSV export includes plan-level aggregate metrics and per-beam breakdowns:
              </p>
              <ul>
                <li><strong>Header section:</strong> Plan name, export date, tool version</li>
                <li><strong>Plan metrics:</strong> MCS, LSV, AAV, MFA, LT, LTMCS, Total MU</li>
                <li><strong>Beam metrics:</strong> Per-beam values with beam name, MU, and control point count</li>
              </ul>
              <p>
                Only metrics enabled in your settings will be included in the export.
              </p>
            </CardContent>
          </Card>

          {/* References */}
          <Card>
            <CardHeader>
              <CardTitle>References & Citations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">UCoMX Implementation</h4>
                <p className="text-sm text-muted-foreground">
                  This tool is based on the UCoMX v1.1 MATLAB implementation.
                </p>
                <a
                  href="https://zenodo.org/records/7672823"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Zenodo Repository: UCoMX v1.1<ExternalLinkIcon />
                </a>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium">Key Publications</h4>
                <ul className="mt-2 space-y-2 text-sm">
                  <li>
                    <span className="text-muted-foreground">MCS Definition:</span>
                    <br />
                    McNiven AL, et al. "A new metric for assessing IMRT modulation complexity 
                    and plan deliverability." <em>Med Phys.</em> 2010;37(2):505-515.
                    <br />
                    <a
                      href="https://doi.org/10.1118/1.3276775"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      DOI: 10.1118/1.3276775<ExternalLinkIcon />
                    </a>
                  </li>
                  <li>
                    <span className="text-muted-foreground">LSV and AAV:</span>
                    <br />
                    Masi L, et al. "Impact of plan parameters on the dosimetric accuracy of 
                    volumetric modulated arc therapy." <em>Med Phys.</em> 2013;40(7):071718.
                    <br />
                    <a
                      href="https://doi.org/10.1118/1.4810969"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      DOI: 10.1118/1.4810969<ExternalLinkIcon />
                    </a>
                  </li>
                  <li>
                    <span className="text-muted-foreground">Complexity Metrics Review:</span>
                    <br />
                    "Complexity metrics for IMRT and VMAT plans: a review of current literature 
                    and applications." <em>J Appl Clin Med Phys.</em> 2019.
                    <br />
                    <a
                      href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6774599/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      PMC6774599<ExternalLinkIcon />
                    </a>
                  </li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium">Technical Resources</h4>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>
                    <a
                      href="https://dicom.nema.org/medical/dicom/current/output/chtml/part03/sect_C.8.8.14.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      DICOM RT Plan IOD Specification<ExternalLinkIcon />
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/cornerstonejs/dicomParser"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      dicom-parser Library (GitHub)<ExternalLinkIcon />
                    </a>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                <strong>RT Plan Complexity Analyzer</strong> is a browser-based, open-source tool 
                for analyzing radiotherapy plan complexity.
              </p>
              <ul>
                <li>Version: 1.0.0</li>
                <li>All processing occurs locally in your browser — no data is uploaded to servers</li>
                <li>Based on the UCoMX v1.1 framework from the University of Padova</li>
              </ul>
              <p>
                This tool is intended for research and educational purposes. Clinical use should 
                follow institutional validation protocols.
              </p>
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
  );
}
