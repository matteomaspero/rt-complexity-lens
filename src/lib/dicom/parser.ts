import * as dicomParser from 'dicom-parser';
import type { RTPlan, Beam, ControlPoint, FractionGroup, MLCLeafPositions, DoseReference } from './types';

// DICOM Tags for RT Plan
const TAGS = {
  // Patient
  PatientID: 'x00100020',
  PatientName: 'x00100010',
  
  // Plan
  RTPlanLabel: 'x300a0002',
  RTPlanName: 'x300a0003',
  RTPlanDate: 'x300a0006',
  RTPlanTime: 'x300a0007',
  RTPlanGeometry: 'x300a000c',
  
  // Instance
  SOPInstanceUID: 'x00080018',
  Manufacturer: 'x00080070',
  InstitutionName: 'x00080080',
  
  // Sequences
  BeamSequence: 'x300a00b0',
  FractionGroupSequence: 'x300a0070',
  ControlPointSequence: 'x300a0111',
  BeamLimitingDeviceSequence: 'x300a00b6',
  BeamLimitingDevicePositionSequence: 'x300a011a',
  ReferencedBeamSequence: 'x300c0004',
  
  // Beam attributes
  BeamNumber: 'x300a00c0',
  BeamName: 'x300a00c2',
  BeamDescription: 'x300a00c3',
  BeamType: 'x300a00c4',
  RadiationType: 'x300a00c6',
  TreatmentDeliveryType: 'x300a00ce',
  NumberOfControlPoints: 'x300a0110',
  NominalBeamEnergy: 'x300a0114',
  TreatmentMachineName: 'x300a00b2',
  FinalCumulativeMetersetWeight: 'x300a010e',
  
  // Control Point attributes
  ControlPointIndex: 'x300a0112',
  GantryAngle: 'x300a011e',
  GantryRotationDirection: 'x300a011f',
  BeamLimitingDeviceAngle: 'x300a0120',
  CumulativeMetersetWeight: 'x300a0134',
  IsocenterPosition: 'x300a012c',
  
  // Beam Limiting Device
  RTBeamLimitingDeviceType: 'x300a00b8',
  NumberOfLeafJawPairs: 'x300a00bc',
  LeafPositionBoundaries: 'x300a00be',
  LeafJawPositions: 'x300a011c',
  
  // Patient/Table Position
  PatientSupportAngle: 'x300a0122',
  TableTopVerticalPosition: 'x300a0128',
  TableTopLongitudinalPosition: 'x300a0129',
  TableTopLateralPosition: 'x300a012a',
  
  // Fraction Group
  FractionGroupNumber: 'x300a0071',
  NumberOfFractionsPlanned: 'x300a0078',
  NumberOfBeams: 'x300a0080',
  BeamMeterset: 'x300a0086',
  ReferencedBeamNumber: 'x300c0006',
  
  // Dose Reference Sequence
  DoseReferenceSequence: 'x300a0010',
  DoseReferenceNumber: 'x300a0012',
  DoseReferenceStructureType: 'x300a0014',
  DoseReferenceDescription: 'x300a0016',
  DoseReferenceType: 'x300a0020',
  DeliveryMaximumDose: 'x300a0023',
  TargetMinimumDose: 'x300a0025',
  TargetPrescriptionDose: 'x300a0026',
  TargetMaximumDose: 'x300a0027',
};

function getString(dataSet: dicomParser.DataSet, tag: string): string {
  try {
    return dataSet.string(tag) || '';
  } catch {
    return '';
  }
}

function getFloat(dataSet: dicomParser.DataSet, tag: string): number {
  try {
    const val = dataSet.floatString(tag);
    return val !== undefined ? val : 0;
  } catch {
    return 0;
  }
}

function getInt(dataSet: dicomParser.DataSet, tag: string): number {
  try {
    const val = dataSet.intString(tag);
    return val !== undefined ? val : 0;
  } catch {
    return 0;
  }
}

function getFloatArray(dataSet: dicomParser.DataSet, tag: string): number[] {
  try {
    const element = dataSet.elements[tag];
    if (!element) return [];
    
    const result: number[] = [];
    const numValues = element.length / 8; // DS values are typically 8 bytes each max
    
    // Try parsing as string first (DS VR)
    const str = dataSet.string(tag);
    if (str) {
      return str.split('\\').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    }
    
    return result;
  } catch {
    return [];
  }
}

function parseMLCPositions(
  dataSet: dicomParser.DataSet,
  beamDataSet: dicomParser.DataSet
): MLCLeafPositions {
  const result: MLCLeafPositions = { bankA: [], bankB: [] };
  
  try {
    const bldpSeq = dataSet.elements[TAGS.BeamLimitingDevicePositionSequence];
    if (!bldpSeq || !bldpSeq.items) return result;
    
    for (const item of bldpSeq.items) {
      const itemDataSet = item.dataSet;
      if (!itemDataSet) continue;
      
      const deviceType = getString(itemDataSet, TAGS.RTBeamLimitingDeviceType);
      
      if (deviceType === 'MLCX' || deviceType === 'MLCY') {
        const positions = getFloatArray(itemDataSet, TAGS.LeafJawPositions);
        
        if (positions.length > 0) {
          const halfLength = Math.floor(positions.length / 2);
          result.bankA = positions.slice(0, halfLength);
          result.bankB = positions.slice(halfLength);
        }
      }
    }
  } catch {
    // Silent fallback - MLC positions will use empty default
  }
  
  return result;
}

function parseJawPositions(dataSet: dicomParser.DataSet): { x1: number; x2: number; y1: number; y2: number } {
  const result = { x1: 0, x2: 0, y1: 0, y2: 0 };
  
  try {
    const bldpSeq = dataSet.elements[TAGS.BeamLimitingDevicePositionSequence];
    if (!bldpSeq || !bldpSeq.items) return result;
    
    for (const item of bldpSeq.items) {
      const itemDataSet = item.dataSet;
      if (!itemDataSet) continue;
      
      const deviceType = getString(itemDataSet, TAGS.RTBeamLimitingDeviceType);
      const positions = getFloatArray(itemDataSet, TAGS.LeafJawPositions);
      
      if (deviceType === 'X' || deviceType === 'ASYMX') {
        if (positions.length >= 2) {
          result.x1 = positions[0];
          result.x2 = positions[1];
        }
      } else if (deviceType === 'Y' || deviceType === 'ASYMY') {
        if (positions.length >= 2) {
          result.y1 = positions[0];
          result.y2 = positions[1];
        }
      }
    }
  } catch {
    // Silent fallback - jaw positions will use zero defaults
  }
  
  return result;
}

function parseControlPoint(
  cpDataSet: dicomParser.DataSet,
  beamDataSet: dicomParser.DataSet,
  index: number,
  previousCP?: ControlPoint
): ControlPoint {
  const gantryAngle = getFloat(cpDataSet, TAGS.GantryAngle);
  const hasGantryAngle = cpDataSet.elements[TAGS.GantryAngle] !== undefined;
  
  const gantryRotDir = getString(cpDataSet, TAGS.GantryRotationDirection);
  const hasRotDir = cpDataSet.elements[TAGS.GantryRotationDirection] !== undefined;
  
  const collAngle = getFloat(cpDataSet, TAGS.BeamLimitingDeviceAngle);
  const hasCollAngle = cpDataSet.elements[TAGS.BeamLimitingDeviceAngle] !== undefined;
  
  const cumulativeMW = getFloat(cpDataSet, TAGS.CumulativeMetersetWeight);
  
  // Parse MLC positions (may inherit from previous CP)
  let mlcPositions = parseMLCPositions(cpDataSet, beamDataSet);
  if (mlcPositions.bankA.length === 0 && previousCP) {
    mlcPositions = previousCP.mlcPositions;
  }
  
  // Parse jaw positions (may inherit from previous CP)
  let jawPositions = parseJawPositions(cpDataSet);
  if (jawPositions.x1 === 0 && jawPositions.x2 === 0 && previousCP) {
    jawPositions = previousCP.jawPositions;
  }
  
  // Parse isocenter position (may inherit from previous CP)
  let isocenterPosition: [number, number, number] | undefined;
  const isocenterArr = getFloatArray(cpDataSet, TAGS.IsocenterPosition);
  if (isocenterArr.length === 3) {
    isocenterPosition = [isocenterArr[0], isocenterArr[1], isocenterArr[2]];
  } else if (previousCP?.isocenterPosition) {
    isocenterPosition = previousCP.isocenterPosition;
  }
  
  // Parse patient support (table) angle (may inherit from previous CP)
  const patientSupportAngle = cpDataSet.elements[TAGS.PatientSupportAngle] !== undefined
    ? getFloat(cpDataSet, TAGS.PatientSupportAngle)
    : previousCP?.patientSupportAngle;
  
  // Parse table top positions (may inherit from previous CP)
  const tableTopVertical = cpDataSet.elements[TAGS.TableTopVerticalPosition] !== undefined
    ? getFloat(cpDataSet, TAGS.TableTopVerticalPosition)
    : previousCP?.tableTopVertical;
  
  const tableTopLongitudinal = cpDataSet.elements[TAGS.TableTopLongitudinalPosition] !== undefined
    ? getFloat(cpDataSet, TAGS.TableTopLongitudinalPosition)
    : previousCP?.tableTopLongitudinal;
  
  const tableTopLateral = cpDataSet.elements[TAGS.TableTopLateralPosition] !== undefined
    ? getFloat(cpDataSet, TAGS.TableTopLateralPosition)
    : previousCP?.tableTopLateral;
  
  return {
    index,
    gantryAngle: hasGantryAngle ? gantryAngle : (previousCP?.gantryAngle ?? 0),
    gantryRotationDirection: hasRotDir 
      ? (gantryRotDir as 'CW' | 'CCW' | 'NONE') 
      : (previousCP?.gantryRotationDirection ?? 'NONE'),
    beamLimitingDeviceAngle: hasCollAngle ? collAngle : (previousCP?.beamLimitingDeviceAngle ?? 0),
    cumulativeMetersetWeight: cumulativeMW,
    mlcPositions,
    jawPositions,
    isocenterPosition,
    patientSupportAngle,
    tableTopVertical,
    tableTopLongitudinal,
    tableTopLateral,
  };
}

function getLeafWidths(beamDataSet: dicomParser.DataSet): { widths: number[]; boundaries: number[]; numLeaves: number } {
  try {
    const bldSeq = beamDataSet.elements[TAGS.BeamLimitingDeviceSequence];
    if (!bldSeq || !bldSeq.items) return { widths: [], boundaries: [], numLeaves: 60 };
    
    for (const item of bldSeq.items) {
      const itemDataSet = item.dataSet;
      if (!itemDataSet) continue;
      
      const deviceType = getString(itemDataSet, TAGS.RTBeamLimitingDeviceType);
      
      if (deviceType === 'MLCX' || deviceType === 'MLCY') {
        const numPairs = getInt(itemDataSet, TAGS.NumberOfLeafJawPairs);
        const boundaries = getFloatArray(itemDataSet, TAGS.LeafPositionBoundaries);
        
        const widths: number[] = [];
        for (let i = 1; i < boundaries.length; i++) {
          widths.push(Math.abs(boundaries[i] - boundaries[i - 1]));
        }
        
        return { widths, boundaries, numLeaves: numPairs || widths.length };
      }
    }
  } catch {
    // Silent fallback - will use default Millennium 120 configuration
  }
  
  // Default: Varian Millennium 120 leaf configuration (60 pairs × 5mm, centered)
  const defaultWidths = Array(60).fill(5);
  const defaultBoundaries: number[] = [];
  let pos = -150; // 60 × 5mm = 300mm total, centered at 0
  for (let i = 0; i <= 60; i++) {
    defaultBoundaries.push(pos);
    pos += 5;
  }
  return { widths: defaultWidths, boundaries: defaultBoundaries, numLeaves: 60 };
}

/**
 * Generate clinical energy label from radiation type and energy value
 * Per DICOM standard nomenclature:
 * - Photons: 6X, 10X, 15X, 6FFF, 10FFF (X = MV, FFF = Flattening Filter Free)
 * - Electrons: 6E, 9E, 12E, 15E, 18E (E = MeV)
 * - Protons/Ions: Numeric MeV value
 */
function generateEnergyLabel(radiationType: string, energy: number | undefined, beamName: string): string | undefined {
  if (energy === undefined || energy === 0) return undefined;
  
  const upperRadType = radiationType.toUpperCase();
  
  if (upperRadType === 'PHOTON') {
    // Check for FFF (Flattening Filter Free) - detected from beam name
    const isFFF = /FFF|SRS|SBRT/i.test(beamName);
    return isFFF ? `${Math.round(energy)}FFF` : `${Math.round(energy)}X`;
  }
  
  if (upperRadType === 'ELECTRON') {
    return `${Math.round(energy)}E`;
  }
  
  if (upperRadType === 'PROTON' || upperRadType === 'ION' || upperRadType === 'NEUTRON') {
    return `${Math.round(energy)} MeV`;
  }
  
  // Default: just show energy with unit
  return `${Math.round(energy)} MeV`;
}

function parseBeam(beamDataSet: dicomParser.DataSet): Beam {
  const beamNumber = getInt(beamDataSet, TAGS.BeamNumber);
  const beamName = getString(beamDataSet, TAGS.BeamName) || `Beam ${beamNumber}`;
  const beamType = getString(beamDataSet, TAGS.BeamType) as 'STATIC' | 'DYNAMIC';
  const numCPs = getInt(beamDataSet, TAGS.NumberOfControlPoints);
  const finalMW = getFloat(beamDataSet, TAGS.FinalCumulativeMetersetWeight);
  const radiationType = getString(beamDataSet, TAGS.RadiationType) || 'PHOTON';
  
  const { widths, boundaries, numLeaves } = getLeafWidths(beamDataSet);
  
  // Parse control points
  const controlPoints: ControlPoint[] = [];
  const cpSeq = beamDataSet.elements[TAGS.ControlPointSequence];
  
  // Extract nominal beam energy from first control point (per DICOM standard)
  let nominalBeamEnergy: number | undefined;
  
  if (cpSeq && cpSeq.items) {
    for (let i = 0; i < cpSeq.items.length; i++) {
      const cpItem = cpSeq.items[i];
      if (cpItem.dataSet) {
        // Get energy from first control point
        if (i === 0) {
          const energy = getFloat(cpItem.dataSet, TAGS.NominalBeamEnergy);
          if (energy > 0) {
            nominalBeamEnergy = energy;
          }
        }
        
        const previousCP = i > 0 ? controlPoints[i - 1] : undefined;
        const cp = parseControlPoint(cpItem.dataSet, beamDataSet, i, previousCP);
        controlPoints.push(cp);
      }
    }
  }
  
  // Generate clinical energy label
  const energyLabel = generateEnergyLabel(radiationType, nominalBeamEnergy, beamName);
  
  // Determine if arc based on control point gantry angles
  const gantryAngles = controlPoints.map(cp => cp.gantryAngle);
  const gantryStart = gantryAngles[0] ?? 0;
  const gantryEnd = gantryAngles[gantryAngles.length - 1] ?? 0;
  const isArc = Math.abs(gantryEnd - gantryStart) > 5 || beamType === 'DYNAMIC';
  
  return {
    beamNumber,
    beamName,
    beamDescription: getString(beamDataSet, TAGS.BeamDescription),
    beamType,
    radiationType,
    treatmentDeliveryType: 'TREATMENT',
    numberOfControlPoints: numCPs || controlPoints.length,
    controlPoints,
    beamMetersetUnits: 'MU',
    finalCumulativeMetersetWeight: finalMW || 1,
    gantryAngleStart: gantryStart,
    gantryAngleEnd: gantryEnd,
    isArc,
    mlcLeafWidths: widths,
    mlcLeafBoundaries: boundaries,
    numberOfLeaves: numLeaves,
    nominalBeamEnergy,
    energyLabel,
  };
}

function parseFractionGroup(fgDataSet: dicomParser.DataSet): FractionGroup {
  const fgNumber = getInt(fgDataSet, TAGS.FractionGroupNumber);
  const numFractions = getInt(fgDataSet, TAGS.NumberOfFractionsPlanned);
  const numBeams = getInt(fgDataSet, TAGS.NumberOfBeams);
  
  const referencedBeams: { beamNumber: number; beamMeterset: number }[] = [];
  
  const refBeamSeq = fgDataSet.elements[TAGS.ReferencedBeamSequence];
  if (refBeamSeq && refBeamSeq.items) {
    for (const item of refBeamSeq.items) {
      if (item.dataSet) {
        referencedBeams.push({
          beamNumber: getInt(item.dataSet, TAGS.ReferencedBeamNumber),
          beamMeterset: getFloat(item.dataSet, TAGS.BeamMeterset),
        });
      }
    }
  }
  
  return {
    fractionGroupNumber: fgNumber,
    numberOfFractionsPlanned: numFractions,
    numberOfBeams: numBeams,
    referencedBeams,
  };
}

function determineTechnique(beams: Beam[]): 'VMAT' | 'IMRT' | 'CONFORMAL' | 'UNKNOWN' {
  if (beams.length === 0) return 'UNKNOWN';
  
  const hasArcs = beams.some(b => b.isArc);
  const hasMultipleCPs = beams.some(b => b.numberOfControlPoints > 2);
  
  if (hasArcs && hasMultipleCPs) return 'VMAT';
  if (hasMultipleCPs) return 'IMRT';
  if (beams.length > 0) return 'CONFORMAL';
  
  return 'UNKNOWN';
}

function parseDoseReferences(dataSet: dicomParser.DataSet): DoseReference[] {
  const doseRefs: DoseReference[] = [];
  const drSeq = dataSet.elements[TAGS.DoseReferenceSequence];
  if (!drSeq || !drSeq.items) return doseRefs;
  
  for (const item of drSeq.items) {
    if (!item.dataSet) continue;
    const ds = item.dataSet;
    
    const prescDose = getFloat(ds, TAGS.TargetPrescriptionDose);
    const minDose = getFloat(ds, TAGS.TargetMinimumDose);
    const maxDose = getFloat(ds, TAGS.TargetMaximumDose);
    const delivMaxDose = getFloat(ds, TAGS.DeliveryMaximumDose);
    
    doseRefs.push({
      doseReferenceNumber: getInt(ds, TAGS.DoseReferenceNumber),
      doseReferenceStructureType: getString(ds, TAGS.DoseReferenceStructureType),
      doseReferenceDescription: getString(ds, TAGS.DoseReferenceDescription) || undefined,
      doseReferenceType: getString(ds, TAGS.DoseReferenceType),
      deliveryMaximumDose: delivMaxDose || undefined,
      targetMinimumDose: minDose || undefined,
      targetPrescriptionDose: prescDose || undefined,
      targetMaximumDose: maxDose || undefined,
    });
  }
  
  return doseRefs;
}

export function parseRTPlan(arrayBuffer: ArrayBuffer, fileName: string): RTPlan {
  const byteArray = new Uint8Array(arrayBuffer);
  const dataSet = dicomParser.parseDicom(byteArray);
  
  // Parse beams
  const beams: Beam[] = [];
  const beamSeq = dataSet.elements[TAGS.BeamSequence];
  if (beamSeq && beamSeq.items) {
    for (const item of beamSeq.items) {
      if (item.dataSet) {
        beams.push(parseBeam(item.dataSet));
      }
    }
  }
  
  // Parse fraction groups
  const fractionGroups: FractionGroup[] = [];
  const fgSeq = dataSet.elements[TAGS.FractionGroupSequence];
  if (fgSeq && fgSeq.items) {
    for (const item of fgSeq.items) {
      if (item.dataSet) {
        fractionGroups.push(parseFractionGroup(item.dataSet));
      }
    }
  }
  
  // Calculate total MU
  let totalMU = 0;
  if (fractionGroups.length > 0) {
    totalMU = fractionGroups[0].referencedBeams.reduce(
      (sum, rb) => sum + rb.beamMeterset,
      0
    );
  }
  
  // Parse dose references
  const doseReferences = parseDoseReferences(dataSet);
  
  // Extract prescription info
  const targetRef = doseReferences.find(
    dr => dr.doseReferenceType === 'TARGET' && dr.targetPrescriptionDose
  );
  const prescribedDose = targetRef?.targetPrescriptionDose;
  const numberOfFractions = fractionGroups[0]?.numberOfFractionsPlanned || undefined;
  const dosePerFraction = prescribedDose && numberOfFractions
    ? prescribedDose / numberOfFractions
    : undefined;
  
  // Assign beam doses from fraction groups
  for (const beam of beams) {
    const refBeam = fractionGroups[0]?.referencedBeams.find(
      rb => rb.beamNumber === beam.beamNumber
    );
    if (refBeam) {
      beam.beamDose = refBeam.beamMeterset;
    }
  }
  
  // Anonymize patient info and sensitive metadata
  const rawPatientId = getString(dataSet, TAGS.PatientID);
  const anonymizedId = rawPatientId 
    ? `${rawPatientId.slice(0, 2)}***${rawPatientId.slice(-2)}`
    : 'Anonymous';
  
  // Mask institution name for privacy
  const rawInstitution = getString(dataSet, TAGS.InstitutionName);
  const anonymizedInstitution = rawInstitution 
    ? `${rawInstitution.slice(0, 3)}***` 
    : undefined;
  
  return {
    patientId: anonymizedId,
    patientName: 'Anonymized',
    planLabel: getString(dataSet, TAGS.RTPlanLabel) || fileName,
    planName: getString(dataSet, TAGS.RTPlanName) || fileName,
    planDate: undefined, // Anonymized - dates can be identifying
    planTime: undefined, // Anonymized - times can be identifying
    rtPlanGeometry: 'PATIENT',
    treatmentMachineName: beams[0] ? getString(dataSet, TAGS.TreatmentMachineName) : undefined,
    manufacturer: getString(dataSet, TAGS.Manufacturer),
    institutionName: anonymizedInstitution,
    beams,
    fractionGroups,
    doseReferences,
    prescribedDose,
    dosePerFraction,
    numberOfFractions,
    totalMU,
    technique: determineTechnique(beams),
    parseDate: new Date(),
    fileSize: arrayBuffer.byteLength,
    sopInstanceUID: getString(dataSet, TAGS.SOPInstanceUID),
  };
}
