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
import { TableOfContents, IEC61217Diagram, PatientAxesDiagram } from '@/components/help';

function ExternalLinkIcon() {
  return <ExternalLink className="ml-1 inline h-3 w-3" />;
}

export default function Help() {
  const categories: MetricCategory[] = ['primary', 'secondary', 'accuracy', 'deliverability', 'delivery'];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">
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

        {/* Main layout with TOC sidebar */}
        <div className="flex gap-8">
          {/* Sticky TOC sidebar (desktop) */}
          <TableOfContents />

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* Mobile TOC is rendered inside TableOfContents */}

            {/* Introduction */}
            <Card id="introduction">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Introduction
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  The <strong>RT Plan Complexity Analyzer</strong> is a browser-based tool for analyzing 
                  DICOM-RT Plan files and calculating delivery complexity metrics inspired by 
                  <strong> published research</strong> including the UCoMX framework.
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
                  <li>Calculate complexity metrics at plan, beam, and control point levels</li>
                  <li>Export metrics to CSV for external analysis</li>
                  <li>Support for VMAT and static IMRT plans</li>
                </ul>
              </CardContent>
            </Card>

            {/* Metrics Reference */}
            <Card id="metrics-reference">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Metrics Reference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
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
                    <div key={category} className="mb-6">
                      <h4 className="mb-2 font-medium">{categoryInfo.label}</h4>
                      <p className="mb-3 text-sm text-muted-foreground">
                        {categoryInfo.description}
                      </p>
                      <div className="overflow-x-auto">
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
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Coordinate System */}
            <Card id="coordinate-system">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="2" x2="12" y2="12" />
                    <line x1="12" y1="12" x2="20" y2="12" />
                  </svg>
                  IEC 61217 Coordinate System
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  The <strong>IEC 61217</strong> standard defines coordinate systems and angle conventions 
                  used universally in radiotherapy equipment. DICOM-RT files encode all geometric 
                  information using these conventions. Understanding this system is essential for 
                  correctly interpreting gantry angles, collimator rotations, and patient positioning 
                  in treatment plans.
                </p>

                <h4>Gantry Angle</h4>
                <p className="text-sm text-muted-foreground">
                  Gantry angle describes the rotation of the treatment head around the patient. 
                  The angle is measured from the viewer's perspective facing the gantry. At 0°, 
                  the radiation source is directly above the patient (superior), with the beam 
                  directed downward. Rotation proceeds <strong>clockwise</strong> from this position.
                </p>
                
                <div className="my-6 flex flex-col lg:flex-row gap-6 items-start">
                  <IEC61217Diagram className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Angle</TableHead>
                          <TableHead>Beam Direction</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-mono font-medium">0°</TableCell>
                          <TableCell>From ceiling — AP beam (enters anterior surface)</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono font-medium">90°</TableCell>
                          <TableCell>From patient's left — left lateral beam</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono font-medium">180°</TableCell>
                          <TableCell>From floor — PA beam (enters posterior, through couch)</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono font-medium">270°</TableCell>
                          <TableCell>From patient's right — right lateral beam</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <h4>Collimator Angle</h4>
                <p className="text-sm text-muted-foreground">
                  The collimator (beam-limiting device) can rotate independently within the gantry head. 
                  At 0°, the MLC leaves are perpendicular to the gantry rotation axis. Rotation is 
                  <strong> counter-clockwise</strong> when viewed from the radiation source (beam's-eye view).
                </p>
                <ul>
                  <li><strong>0°</strong> — MLC leaves perpendicular to gantry rotation axis</li>
                  <li><strong>Positive rotation</strong> — Counter-clockwise when viewed from the radiation source (BEV)</li>
                </ul>

                <h4>Couch (Table) Angle</h4>
                <p className="text-sm text-muted-foreground">
                  Couch rotation allows non-coplanar beam arrangements. The angle is measured 
                  as viewed from above the patient.
                </p>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-mono font-medium w-20">0°</TableCell>
                      <TableCell>Couch parallel to gantry rotation axis (standard position)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono font-medium">90°</TableCell>
                      <TableCell>Counter-clockwise rotation (patient's head toward 90° gantry position)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-mono font-medium">270°</TableCell>
                      <TableCell>Clockwise rotation (patient's head toward 270° gantry position)</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <h4>Patient Coordinate System</h4>
                <p className="text-sm text-muted-foreground">
                  The patient coordinate system assumes a supine (face-up) patient position with 
                  head toward the gantry (head-first supine, HFS). The origin is at the machine 
                  isocenter. This is a <strong>right-handed</strong> coordinate system.
                </p>
                
                <div className="my-6 flex flex-col lg:flex-row gap-6 items-start">
                  <PatientAxesDiagram className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Axis</TableHead>
                          <TableHead>Positive (+)</TableHead>
                          <TableHead>Negative (−)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-mono font-bold text-[hsl(0,84%,60%)]">X</TableCell>
                          <TableCell>Patient's Left</TableCell>
                          <TableCell>Patient's Right</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono font-bold text-[hsl(142,71%,45%)]">Y</TableCell>
                          <TableCell>Posterior (back)</TableCell>
                          <TableCell>Anterior (front)</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono font-bold text-[hsl(217,91%,60%)]">Z</TableCell>
                          <TableCell>Superior (head)</TableCell>
                          <TableCell>Inferior (feet)</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Note: This differs from medical imaging conventions (LPS/RAS). 
                      DICOM-RT patient coordinates follow IEC 61217 for consistency with machine geometry.
                    </p>
                  </div>
                </div>

                <h4>Machine-Specific Variations</h4>
                <p className="text-sm text-muted-foreground">
                  While IEC 61217 defines the coordinate system, different linac manufacturers 
                  use varying MLC and jaw configurations:
                </p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Machine</TableHead>
                        <TableHead>MLC Type</TableHead>
                        <TableHead>Jaw Configuration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Varian C-arm (TrueBeam, Clinac)</TableCell>
                        <TableCell>MLCX (leaves move in X-direction)</TableCell>
                        <TableCell>ASYMX, ASYMY jaws</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Varian Halcyon/Ethos</TableCell>
                        <TableCell>Dual-layer stacked MLC</TableCell>
                        <TableCell>No physical jaws</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Elekta Agility/Versa HD</TableCell>
                        <TableCell>MLCY (leaves move in Y-direction)</TableCell>
                        <TableCell>X, Y jaw pairs</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-6 p-3 rounded-md bg-muted/50 text-sm">
                  <strong>References:</strong> For complete technical specifications, see the{' '}
                  <a
                    href="https://dicom.nema.org/medical/dicom/current/output/chtml/part03/sect_C.8.8.25.6.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    DICOM PS3.3 Coordinate Systems<ExternalLinkIcon />
                  </a>{' '}
                  and the IEC 61217:2011 standard for radiotherapy equipment coordinates.
                </div>
              </CardContent>
            </Card>

            {/* How to Use */}
            <Card id="how-to-use">
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
            <Card id="export-format">
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
            <Card id="references">
              <CardHeader>
                <CardTitle>References & Citations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium">UCoMX Framework</h4>
                  <p className="text-sm text-muted-foreground">
                    The metrics in this tool are inspired by the UCoMX framework. For the original MATLAB implementation, see:
                  </p>
                  <a
                    href="https://zenodo.org/records/8276837"
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
                    <li>
                      <span className="text-muted-foreground">Small Aperture Score:</span>
                      <br />
                      Crowe SB, et al. "Treatment plan complexity metrics for predicting IMRT 
                      pre-treatment quality assurance results." <em>Australas Phys Eng Sci Med.</em> 2014;37:475-482.
                      <br />
                      <a
                        href="https://doi.org/10.1007/s13246-014-0274-9"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        DOI: 10.1007/s13246-014-0274-9<ExternalLinkIcon />
                      </a>
                    </li>
                    <li>
                      <span className="text-muted-foreground">Edge Metric:</span>
                      <br />
                      Younge KC, et al. "Predicting deliverability of VMAT plans using aperture 
                      complexity analysis." <em>J Appl Clin Med Phys.</em> 2016;17(4):124-131.
                      <br />
                      <a
                        href="https://doi.org/10.1120/jacmp.v17i4.6241"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        DOI: 10.1120/jacmp.v17i4.6241<ExternalLinkIcon />
                      </a>
                    </li>
                    <li>
                      <span className="text-muted-foreground">Plan Irregularity:</span>
                      <br />
                      Du W, et al. "Quantification of beam complexity in IMRT treatment plans." 
                      <em>Med Phys.</em> 2014;41(2):021716.
                      <br />
                      <a
                        href="https://doi.org/10.1118/1.4861821"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        DOI: 10.1118/1.4861821<ExternalLinkIcon />
                      </a>
                    </li>
                    <li>
                      <span className="text-muted-foreground">Delivery Time Estimation:</span>
                      <br />
                      Park JM, et al. "The effect of MLC speed and acceleration on the plan 
                      delivery accuracy of VMAT." <em>Brit J Radiol.</em> 2015.
                      <br />
                      <a
                        href="https://doi.org/10.1259/bjr.20140698"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        DOI: 10.1259/bjr.20140698<ExternalLinkIcon />
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
            <Card id="about">
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
                  <li>Complexity metrics inspired by published research (see References)</li>
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
    </div>
  );
}
