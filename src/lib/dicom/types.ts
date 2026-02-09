// DICOM RT Plan Types aligned with UCoMX nomenclature

export interface MLCLeafPositions {
  bankA: number[]; // Leaf positions for Bank A (negative X direction, typically)
  bankB: number[]; // Leaf positions for Bank B (positive X direction, typically)
}

export interface ControlPoint {
  index: number;
  gantryAngle: number; // degrees
  gantryRotationDirection: 'CW' | 'CCW' | 'NONE';
  beamLimitingDeviceAngle: number; // collimator angle
  cumulativeMetersetWeight: number; // 0 to 1
  mlcPositions: MLCLeafPositions;
  jawPositions: {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
  };
  isocenterPosition?: [number, number, number];
  patientSupportAngle?: number; // Table rotation (degrees)
  tableTopVertical?: number; // mm
  tableTopLongitudinal?: number; // mm
  tableTopLateral?: number; // mm
}

export interface Beam {
  beamNumber: number;
  beamName: string;
  beamDescription?: string;
  beamType: 'STATIC' | 'DYNAMIC';
  radiationType: string;
  treatmentDeliveryType: 'TREATMENT' | 'OPEN_PORTFILM' | 'TRMT_PORTFILM';
  numberOfControlPoints: number;
  controlPoints: ControlPoint[];
  beamMetersetUnits: string;
  finalCumulativeMetersetWeight: number;
  beamDose?: number;
  gantryAngleStart: number;
  gantryAngleEnd: number;
  isArc: boolean;
  mlcLeafWidths: number[]; // Width of each leaf pair in mm
  mlcLeafBoundaries: number[]; // N+1 boundary positions defining leaf pair edges (mm, centered at 0)
  numberOfLeaves: number;
  sourceSkinDistance?: number;
  // Energy fields (DICOM 300A,0114)
  nominalBeamEnergy?: number; // Energy in MeV (e.g., 6, 10, 15 for photons)
  energyLabel?: string; // Clinical label (e.g., '6X', '10FFF', '9E')
}

export interface FractionGroup {
  fractionGroupNumber: number;
  numberOfFractionsPlanned: number;
  numberOfBeams: number;
  referencedBeams: {
    beamNumber: number;
    beamMeterset: number; // MU for this beam
  }[];
}

export interface DoseReference {
  doseReferenceNumber: number;
  doseReferenceStructureType: string; // 'SITE' | 'VOLUME' | 'COORDINATES' | 'POINT'
  doseReferenceDescription?: string;
  doseReferenceType: string; // 'TARGET' | 'ORGAN_AT_RISK'
  deliveryMaximumDose?: number; // Gy
  targetMinimumDose?: number; // Gy
  targetPrescriptionDose?: number; // Gy
  targetMaximumDose?: number; // Gy
}

export interface RTPlan {
  // Patient & Plan Identification
  patientId: string;
  patientName: string;
  planLabel: string;
  planName: string;
  planDate?: string;
  planTime?: string;
  
  // Plan Configuration
  rtPlanGeometry: 'PATIENT' | 'TREATMENT_DEVICE';
  planIntent?: 'CURATIVE' | 'PALLIATIVE' | 'PROPHYLACTIC' | 'VERIFICATION' | 'MACHINE_QA';
  
  // Treatment Machine
  treatmentMachineName?: string;
  manufacturer?: string;
  institutionName?: string;
  
  // Beams & Fractions
  beams: Beam[];
  fractionGroups: FractionGroup[];
  doseReferences: DoseReference[];
  
  // Prescription
  prescribedDose?: number; // Total prescribed dose (Gy)
  dosePerFraction?: number; // Dose per fraction (Gy)
  numberOfFractions?: number; // Number of fractions planned
  
  // Derived Metrics
  totalMU: number;
  technique: 'VMAT' | 'IMRT' | 'CONFORMAL' | 'UNKNOWN';
  
  // Parsing metadata
  parseDate: Date;
  fileSize: number;
  sopInstanceUID: string;
}

// UCoMX Complexity Metrics
export interface ControlPointMetrics {
  controlPointIndex: number;
  apertureLSV: number; // Leaf Sequence Variability for this CP
  apertureAAV: number; // Aperture Area Variability
  apertureArea: number; // mm²
  leafTravel: number; // mm (from previous CP)
  metersetWeight: number;
  // Additional aperture analysis
  aperturePerimeter?: number; // mm
  smallApertureFlags?: {
    below2mm: boolean;
    below5mm: boolean;
    below10mm: boolean;
    below20mm: boolean;
  };
}

export interface BeamMetrics {
  beamNumber: number;
  beamName: string;
  
  // UCoMX Primary Metrics
  MCS: number; // Modulation Complexity Score
  LSV: number; // Leaf Sequence Variability (beam average)
  AAV: number; // Aperture Area Variability
  MFA: number; // Mean Field Area (cm²)
  LT: number; // Leaf Travel (mm)
  LTMCS: number; // Combined Leaf Travel + MCS
  
  // UCoMX Accuracy Metrics
  LG?: number; // Leaf Gap - average gap between opposing leaf pairs (mm)
  MAD?: number; // Mean Asymmetry Distance (mm)
  EFS?: number; // Equivalent Field Size (mm)
  psmall?: number; // Percentage of small fields (ratio 0-1)
  
  // Additional metrics
  beamMU: number;
  arcLength?: number; // degrees, for VMAT
  numberOfControlPoints: number;
  averageGantrySpeed?: number; // deg/s
  
  // Radiation type and energy (DICOM standard nomenclature)
  radiationType?: string; // 'PHOTON', 'ELECTRON', 'PROTON', 'NEUTRON', 'ION'
  nominalBeamEnergy?: number; // Energy in MeV
  energyLabel?: string; // Clinical label (e.g., '6X', '10FFF', '9E')
  
  // UCoMX Deliverability Metrics
  MUCA?: number; // MU per Control Arc (MU/CP)
  LTMU?: number; // Leaf Travel per MU (mm/MU)
  LTNLMU?: number; // Leaf Travel per Leaf and MU (mm/(leaf·MU))
  LNA?: number; // Leaf Travel per Leaf and CA (mm/(leaf·CP))
  LTAL?: number; // Leaf Travel per Arc Length (mm/°)
  mDRV?: number; // Mean Dose Rate Variation (MU/min)
  GT?: number; // Gantry Travel (degrees)
  GS?: number; // Gantry Speed (deg/s)
  mGSV?: number; // Mean Gantry Speed Variation (deg/s)
  LS?: number; // Leaf Speed (mm/s)
  PA?: number; // Plan Area / BEV Area (cm²)
  JA?: number; // Jaw Area (cm²)
  PM?: number; // Plan Modulation (1 - MCS)
  TG?: number; // Tongue-and-Groove Index (ratio 0-1)
  MD?: number; // Modulation Degree
  MI?: number; // Modulation Index
  
  // Delivery time metrics
  estimatedDeliveryTime?: number; // seconds
  MUperDegree?: number; // MU per degree of arc
  avgDoseRate?: number; // MU/min
  avgMLCSpeed?: number; // mm/s
  limitingFactor?: 'doseRate' | 'gantrySpeed' | 'mlcSpeed';
  
  // Collimator info
  collimatorAngleStart?: number;
  collimatorAngleEnd?: number;
  
  // Additional complexity metrics
  SAS5?: number; // Small Aperture Score (5mm threshold)
  SAS10?: number; // Small Aperture Score (10mm threshold)
  EM?: number; // Edge Metric
  PI?: number; // Plan Irregularity
  
  // Per-control-point data
  controlPointMetrics: ControlPointMetrics[];
}

export interface PlanMetrics {
  planLabel: string;
  
  // Aggregate UCoMX Metrics (MU-weighted across beams)
  MCS: number;
  LSV: number;
  AAV: number;
  MFA: number; // cm²
  LT: number; // mm
  LTMCS: number;
  
  // UCoMX Accuracy Metrics (aggregate)
  LG?: number; // Average Leaf Gap (mm)
  MAD?: number; // Mean Asymmetry Distance (mm)
  EFS?: number; // Equivalent Field Size (mm)
  psmall?: number; // Percentage of small fields
  
  // Plan-level metrics
  totalMU: number;
  prescribedDose?: number; // Total prescribed dose (Gy)
  dosePerFraction?: number; // Dose per fraction (Gy)
  numberOfFractions?: number;
  MUperGy?: number; // MU per Gy
  
  // UCoMX Deliverability Metrics (aggregate)
  MUCA?: number; // MU per Control Arc
  LTMU?: number; // Leaf Travel per MU
  LTNLMU?: number; // Leaf Travel per Leaf and MU
  LNA?: number; // Leaf Travel per Leaf and CA
  LTAL?: number; // Leaf Travel per Arc Length
  mDRV?: number; // Mean Dose Rate Variation
  GT?: number; // Total Gantry Travel
  GS?: number; // Average Gantry Speed
  mGSV?: number; // Mean Gantry Speed Variation
  LS?: number; // Average Leaf Speed
  PA?: number; // Total Plan Area
  JA?: number; // Average Jaw Area
  PM?: number; // Plan Modulation
  TG?: number; // Tongue-and-Groove Index
  MD?: number; // Modulation Degree
  MI?: number; // Modulation Index
  
  // Delivery time (aggregate)
  totalDeliveryTime?: number; // seconds
  
  // Additional complexity metrics (aggregate)
  SAS5?: number;
  SAS10?: number;
  EM?: number;
  PI?: number;
  
  // Per-beam breakdown
  beamMetrics: BeamMetrics[];
  
  calculationDate: Date;
}

// Machine delivery parameters for time estimation
export interface MachineDeliveryParams {
  maxDoseRate: number; // MU/min
  maxDoseRateFFF?: number; // MU/min for FFF beams
  maxGantrySpeed: number; // deg/s
  maxMLCSpeed: number; // mm/s
  mlcType: 'MLCX' | 'MLCY' | 'DUAL';
  mlcModel?: string; // Human-readable MLC model name
}

// Parsing status
export type ParseStatus = 'pending' | 'parsing' | 'success' | 'error';

export interface ParseResult {
  status: ParseStatus;
  plan?: RTPlan;
  metrics?: PlanMetrics;
  error?: string;
  parseTimeMs?: number;
}

// Session plan storage
export interface SessionPlan {
  id: string;
  fileName: string;
  uploadTime: Date;
  plan: RTPlan;
  metrics: PlanMetrics;
}
