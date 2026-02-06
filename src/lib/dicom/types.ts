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
  numberOfLeaves: number;
  sourceSkinDistance?: number;
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
  
  // UCoMX Metrics
  MCS: number; // Modulation Complexity Score
  LSV: number; // Leaf Sequence Variability (beam average)
  AAV: number; // Aperture Area Variability
  MFA: number; // Mean Field Area (cm²)
  LT: number; // Leaf Travel (mm)
  LTMCS: number; // Combined Leaf Travel + MCS
  
  // Additional metrics
  beamMU: number;
  arcLength?: number; // degrees, for VMAT
  numberOfControlPoints: number;
  averageGantrySpeed?: number; // deg/s
  
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
  
  // Plan-level metrics
  totalMU: number;
  prescribedDose?: number;
  MUperGy?: number;
  
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
