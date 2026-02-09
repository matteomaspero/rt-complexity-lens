import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, ExternalLink, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { IEC61217Diagram, PatientAxesDiagram } from '@/components/help';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function ExternalLinkIcon() {
  return <ExternalLink className="ml-1 inline h-3 w-3" />;
}

function NoteBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-l-4 border-primary bg-primary/5 p-4 text-sm my-4">
      <div className="flex items-start gap-2">
        <div className="h-4 w-4 text-primary mt-0.5 shrink-0">ℹ</div>
        <div>{children}</div>
      </div>
    </div>
  );
}

export default function TechnicalReference() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12">
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
                <Compass className="h-8 w-8 text-primary" />
                Technical Reference
              </h1>
              <p className="text-muted-foreground mt-2">
                Coordinate systems, machine specifications, and advanced technical details
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="space-y-8">
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
                        <TableHead className="font-semibold">MLC Platform</TableHead>
                        <TableHead className="font-semibold">DICOM MLC Type</TableHead>
                        <TableHead className="font-semibold">Jaw Configuration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Varian TrueBeam / Clinac</TableCell>
                        <TableCell className="text-muted-foreground">Millennium 120</TableCell>
                        <TableCell className="text-muted-foreground">MLCX</TableCell>
                        <TableCell className="text-muted-foreground">ASYMX, ASYMY jaws</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Varian TrueBeam HD</TableCell>
                        <TableCell className="text-muted-foreground">HD120</TableCell>
                        <TableCell className="text-muted-foreground">MLCX</TableCell>
                        <TableCell className="text-muted-foreground">ASYMX, ASYMY jaws</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Varian Halcyon / Ethos</TableCell>
                        <TableCell className="text-muted-foreground">SX2 Dual-Layer</TableCell>
                        <TableCell className="text-muted-foreground">MLCX (×2)</TableCell>
                        <TableCell className="text-muted-foreground">No physical jaws</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Elekta Versa HD / Infinity</TableCell>
                        <TableCell className="text-muted-foreground">Agility (160 leaves)</TableCell>
                        <TableCell className="text-muted-foreground">MLCX</TableCell>
                        <TableCell className="text-muted-foreground">X, Y jaw pairs</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Elekta Unity (MR-Linac)</TableCell>
                        <TableCell className="text-muted-foreground">Agility 160</TableCell>
                        <TableCell className="text-muted-foreground">MLCX</TableCell>
                        <TableCell className="text-muted-foreground">Y jaws only</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Elekta Harmony / Synergy</TableCell>
                        <TableCell className="text-muted-foreground">MLCi2 (80 leaves)</TableCell>
                        <TableCell className="text-muted-foreground">MLCX</TableCell>
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

          {/* Navigation */}
          <div className="pt-4 text-center space-x-3">
            <Button asChild>
              <Link to="/help">← Back to Help</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/metrics">← Metrics Reference</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
