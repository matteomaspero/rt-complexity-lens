"""
DICOM RT Plan parser matching the TypeScript implementation in src/lib/dicom/parser.ts

Uses pydicom to parse DICOM files and extract RT Plan structure.
"""

from datetime import datetime
from typing import List, Optional, Tuple
import pydicom
from pydicom.dataset import Dataset, FileDataset

from .types import (
    RTPlan,
    Beam,
    ControlPoint,
    FractionGroup,
    ReferencedBeam,
    MLCLeafPositions,
    JawPositions,
    Technique,
)


# DICOM RT Plan SOP Class UID
RT_PLAN_SOP_CLASS = "1.2.840.10008.5.1.4.1.1.481.5"


def _get_string(ds: Dataset, keyword: str, default: str = "") -> str:
    """Safely get a string value from dataset."""
    try:
        value = getattr(ds, keyword, None)
        if value is None:
            return default
        return str(value)
    except Exception:
        return default


def _get_float(ds: Dataset, keyword: str, default: float = 0.0) -> float:
    """Safely get a float value from dataset."""
    try:
        value = getattr(ds, keyword, None)
        if value is None:
            return default
        return float(value)
    except Exception:
        return default


def _get_int(ds: Dataset, keyword: str, default: int = 0) -> int:
    """Safely get an integer value from dataset."""
    try:
        value = getattr(ds, keyword, None)
        if value is None:
            return default
        return int(value)
    except Exception:
        return default


def _get_float_array(ds: Dataset, keyword: str) -> List[float]:
    """Safely get an array of float values from dataset."""
    try:
        value = getattr(ds, keyword, None)
        if value is None:
            return []
        # Handle both list and single value cases
        if hasattr(value, "__iter__") and not isinstance(value, str):
            return [float(v) for v in value]
        return [float(value)]
    except Exception:
        return []


def _parse_mlc_positions(cp_ds: Dataset, beam_ds: Dataset) -> MLCLeafPositions:
    """Parse MLC positions from control point."""
    result = MLCLeafPositions(bank_a=[], bank_b=[])
    
    try:
        bldp_seq = getattr(cp_ds, "BeamLimitingDevicePositionSequence", None)
        if bldp_seq is None:
            return result
        
        for item in bldp_seq:
            device_type = _get_string(item, "RTBeamLimitingDeviceType")
            
            if device_type in ("MLCX", "MLCY"):
                positions = _get_float_array(item, "LeafJawPositions")
                
                if len(positions) > 0:
                    half_length = len(positions) // 2
                    result.bank_a = positions[:half_length]
                    result.bank_b = positions[half_length:]
    except Exception:
        pass
    
    return result


def _parse_jaw_positions(cp_ds: Dataset) -> JawPositions:
    """Parse jaw positions from control point."""
    result = JawPositions()
    
    try:
        bldp_seq = getattr(cp_ds, "BeamLimitingDevicePositionSequence", None)
        if bldp_seq is None:
            return result
        
        for item in bldp_seq:
            device_type = _get_string(item, "RTBeamLimitingDeviceType")
            positions = _get_float_array(item, "LeafJawPositions")
            
            if device_type in ("X", "ASYMX") and len(positions) >= 2:
                result.x1 = positions[0]
                result.x2 = positions[1]
            elif device_type in ("Y", "ASYMY") and len(positions) >= 2:
                result.y1 = positions[0]
                result.y2 = positions[1]
    except Exception:
        pass
    
    return result


def _parse_control_point(
    cp_ds: Dataset,
    beam_ds: Dataset,
    index: int,
    previous_cp: Optional[ControlPoint] = None
) -> ControlPoint:
    """Parse a single control point with attribute inheritance."""
    
    # Gantry angle (may inherit from previous CP)
    gantry_angle = _get_float(cp_ds, "GantryAngle")
    has_gantry_angle = hasattr(cp_ds, "GantryAngle")
    if not has_gantry_angle and previous_cp:
        gantry_angle = previous_cp.gantry_angle
    
    # Gantry rotation direction
    gantry_dir = _get_string(cp_ds, "GantryRotationDirection", "NONE")
    has_gantry_dir = hasattr(cp_ds, "GantryRotationDirection")
    if not has_gantry_dir and previous_cp:
        gantry_dir = previous_cp.gantry_rotation_direction
    
    # Collimator angle
    coll_angle = _get_float(cp_ds, "BeamLimitingDeviceAngle")
    has_coll_angle = hasattr(cp_ds, "BeamLimitingDeviceAngle")
    if not has_coll_angle and previous_cp:
        coll_angle = previous_cp.beam_limiting_device_angle
    
    # Cumulative meterset weight
    cumulative_mw = _get_float(cp_ds, "CumulativeMetersetWeight")
    
    # Parse MLC positions (may inherit from previous CP)
    mlc_positions = _parse_mlc_positions(cp_ds, beam_ds)
    if len(mlc_positions.bank_a) == 0 and previous_cp:
        mlc_positions = previous_cp.mlc_positions
    
    # Parse jaw positions (may inherit from previous CP)
    # Matches TS logic: inherit ALL jaws when x1==0 && x2==0
    jaw_positions = _parse_jaw_positions(cp_ds)
    if jaw_positions.x1 == 0 and jaw_positions.x2 == 0 and previous_cp:
        jaw_positions = previous_cp.jaw_positions
    
    # Isocenter position
    isocenter: Optional[Tuple[float, float, float]] = None
    iso_arr = _get_float_array(cp_ds, "IsocenterPosition")
    if len(iso_arr) == 3:
        isocenter = (iso_arr[0], iso_arr[1], iso_arr[2])
    elif previous_cp and previous_cp.isocenter_position:
        isocenter = previous_cp.isocenter_position
    
    # Patient support angle
    patient_support_angle = (
        _get_float(cp_ds, "PatientSupportAngle")
        if hasattr(cp_ds, "PatientSupportAngle")
        else (previous_cp.patient_support_angle if previous_cp else None)
    )
    
    # Table positions
    table_top_vertical = (
        _get_float(cp_ds, "TableTopVerticalPosition")
        if hasattr(cp_ds, "TableTopVerticalPosition")
        else (previous_cp.table_top_vertical if previous_cp else None)
    )
    table_top_longitudinal = (
        _get_float(cp_ds, "TableTopLongitudinalPosition")
        if hasattr(cp_ds, "TableTopLongitudinalPosition")
        else (previous_cp.table_top_longitudinal if previous_cp else None)
    )
    table_top_lateral = (
        _get_float(cp_ds, "TableTopLateralPosition")
        if hasattr(cp_ds, "TableTopLateralPosition")
        else (previous_cp.table_top_lateral if previous_cp else None)
    )
    
    return ControlPoint(
        index=index,
        gantry_angle=gantry_angle,
        gantry_rotation_direction=gantry_dir,
        beam_limiting_device_angle=coll_angle,
        cumulative_meterset_weight=cumulative_mw,
        mlc_positions=mlc_positions,
        jaw_positions=jaw_positions,
        isocenter_position=isocenter,
        patient_support_angle=patient_support_angle,
        table_top_vertical=table_top_vertical,
        table_top_longitudinal=table_top_longitudinal,
        table_top_lateral=table_top_lateral,
    )


def _get_leaf_widths(beam_ds: Dataset) -> Tuple[List[float], List[float], int]:
    """Get MLC leaf widths and boundaries from beam limiting device sequence.
    
    Returns: (widths, boundaries, num_pairs)
        widths: list of N leaf widths in mm
        boundaries: list of N+1 leaf boundary positions in mm
        num_pairs: number of leaf pairs
    """
    try:
        bld_seq = getattr(beam_ds, "BeamLimitingDeviceSequence", None)
        if bld_seq is None:
            # Default Millennium 120: 60 pairs × 5mm centered at 0
            widths = [5.0] * 60
            boundaries = [i * 5.0 - 150.0 for i in range(61)]
            return (widths, boundaries, 60)
        
        for item in bld_seq:
            device_type = _get_string(item, "RTBeamLimitingDeviceType")
            
            if device_type in ("MLCX", "MLCY"):
                num_pairs = _get_int(item, "NumberOfLeafJawPairs")
                boundaries = _get_float_array(item, "LeafPositionBoundaries")
                
                widths = []
                for i in range(1, len(boundaries)):
                    widths.append(abs(boundaries[i] - boundaries[i - 1]))
                
                return (widths, boundaries, num_pairs or len(widths))
    except Exception:
        pass
    
    # Default: Varian Millennium 120 leaf configuration
    widths = [5.0] * 60
    boundaries = [i * 5.0 - 150.0 for i in range(61)]
    return (widths, boundaries, 60)


def _parse_beam(beam_ds: Dataset) -> Beam:
    """Parse a single beam from BeamSequence."""
    beam_number = _get_int(beam_ds, "BeamNumber")
    beam_name = _get_string(beam_ds, "BeamName") or f"Beam {beam_number}"
    beam_type = _get_string(beam_ds, "BeamType", "DYNAMIC")
    num_cps = _get_int(beam_ds, "NumberOfControlPoints")
    final_mw = _get_float(beam_ds, "FinalCumulativeMetersetWeight", 1.0)
    
    leaf_widths, leaf_boundaries, num_leaves = _get_leaf_widths(beam_ds)
    
    # Parse control points
    control_points: List[ControlPoint] = []
    cp_seq = getattr(beam_ds, "ControlPointSequence", None)
    
    if cp_seq:
        for i, cp_item in enumerate(cp_seq):
            previous_cp = control_points[i - 1] if i > 0 else None
            cp = _parse_control_point(cp_item, beam_ds, i, previous_cp)
            control_points.append(cp)
    
    # Determine gantry angles
    gantry_angles = [cp.gantry_angle for cp in control_points]
    gantry_start = gantry_angles[0] if gantry_angles else 0
    gantry_end = gantry_angles[-1] if gantry_angles else 0
    
    # Determine if arc based on gantry angle change
    is_arc = abs(gantry_end - gantry_start) > 5 or beam_type == "DYNAMIC"
    
    return Beam(
        beam_number=beam_number,
        beam_name=beam_name,
        beam_description=_get_string(beam_ds, "BeamDescription") or None,
        beam_type=beam_type,
        radiation_type=_get_string(beam_ds, "RadiationType", "PHOTON"),
        treatment_delivery_type="TREATMENT",
        number_of_control_points=num_cps or len(control_points),
        control_points=control_points,
        beam_meterset_units="MU",
        final_cumulative_meterset_weight=final_mw,
        gantry_angle_start=gantry_start,
        gantry_angle_end=gantry_end,
        is_arc=is_arc,
        mlc_leaf_widths=leaf_widths,
        mlc_leaf_boundaries=leaf_boundaries,
        number_of_leaves=num_leaves,
    )


def _parse_fraction_group(fg_ds: Dataset) -> FractionGroup:
    """Parse a fraction group."""
    fg_number = _get_int(fg_ds, "FractionGroupNumber")
    num_fractions = _get_int(fg_ds, "NumberOfFractionsPlanned")
    num_beams = _get_int(fg_ds, "NumberOfBeams")
    
    referenced_beams: List[ReferencedBeam] = []
    ref_beam_seq = getattr(fg_ds, "ReferencedBeamSequence", None)
    
    if ref_beam_seq:
        for item in ref_beam_seq:
            referenced_beams.append(ReferencedBeam(
                beam_number=_get_int(item, "ReferencedBeamNumber"),
                beam_meterset=_get_float(item, "BeamMeterset"),
            ))
    
    return FractionGroup(
        fraction_group_number=fg_number,
        number_of_fractions_planned=num_fractions,
        number_of_beams=num_beams,
        referenced_beams=referenced_beams,
    )


def _determine_technique(beams: List[Beam]) -> Technique:
    """Determine treatment technique from beams."""
    if len(beams) == 0:
        return Technique.UNKNOWN
    
    has_arcs = any(b.is_arc for b in beams)
    has_multiple_cps = any(b.number_of_control_points > 2 for b in beams)
    
    if has_arcs and has_multiple_cps:
        return Technique.VMAT
    if has_multiple_cps:
        return Technique.IMRT
    if len(beams) > 0:
        return Technique.CONFORMAL
    
    return Technique.UNKNOWN


def _parse_dose_references(ds: Dataset) -> List["DoseReference"]:
    """Parse DoseReferenceSequence (300A,0010) for prescription data."""
    from .types import DoseReference
    
    refs: List[DoseReference] = []
    seq = getattr(ds, "DoseReferenceSequence", None)
    if not seq:
        return refs
    
    for item in seq:
        presc = _get_float(item, "TargetPrescriptionDose")
        min_d = _get_float(item, "TargetMinimumDose")
        max_d = _get_float(item, "TargetMaximumDose")
        deliv_max = _get_float(item, "DeliveryMaximumDose")
        
        refs.append(DoseReference(
            dose_reference_number=_get_int(item, "DoseReferenceNumber"),
            dose_reference_structure_type=_get_string(item, "DoseReferenceStructureType"),
            dose_reference_type=_get_string(item, "DoseReferenceType"),
            dose_reference_description=_get_string(item, "DoseReferenceDescription") or None,
            delivery_maximum_dose=deliv_max if deliv_max else None,
            target_minimum_dose=min_d if min_d else None,
            target_prescription_dose=presc if presc else None,
            target_maximum_dose=max_d if max_d else None,
        ))
    
    return refs


def _anonymize_id(raw_id: str) -> str:
    """Anonymize patient ID."""
    if not raw_id:
        return "Anonymous"
    if len(raw_id) <= 4:
        return "***"
    return f"{raw_id[:2]}***{raw_id[-2:]}"


def _anonymize_institution(raw_name: str) -> Optional[str]:
    """Anonymize institution name."""
    if not raw_name:
        return None
    if len(raw_name) <= 3:
        return "***"
    return f"{raw_name[:3]}***"


def parse_rtplan(file_path: str) -> RTPlan:
    """
    Parse a DICOM RT Plan file and extract plan structure.
    
    Args:
        file_path: Path to the DICOM RT Plan file
        
    Returns:
        RTPlan object with parsed data
        
    Raises:
        ValueError: If file is not a valid RT Plan
        FileNotFoundError: If file does not exist
    """
    ds = pydicom.dcmread(file_path)
    
    # Validate SOP Class (optional - some files may not have it)
    sop_class = _get_string(ds, "SOPClassUID")
    if sop_class and sop_class != RT_PLAN_SOP_CLASS:
        # Only warn, don't fail - some valid RT Plans have different SOPs
        pass
    
    # Parse beams
    beams: List[Beam] = []
    beam_seq = getattr(ds, "BeamSequence", None)
    if beam_seq:
        for beam_ds in beam_seq:
            beams.append(_parse_beam(beam_ds))
    
    # Parse fraction groups
    fraction_groups: List[FractionGroup] = []
    fg_seq = getattr(ds, "FractionGroupSequence", None)
    if fg_seq:
        for fg_ds in fg_seq:
            fraction_groups.append(_parse_fraction_group(fg_ds))
    
    # Calculate total MU
    total_mu = 0.0
    if fraction_groups:
        total_mu = sum(rb.beam_meterset for rb in fraction_groups[0].referenced_beams)
    
    # Parse dose references
    dose_references = _parse_dose_references(ds)
    
    # Extract prescription info
    target_ref = next(
        (dr for dr in dose_references
         if dr.dose_reference_type == "TARGET" and dr.target_prescription_dose),
        None
    )
    prescribed_dose = target_ref.target_prescription_dose if target_ref else None
    number_of_fractions = (
        fraction_groups[0].number_of_fractions_planned if fraction_groups else None
    )
    dose_per_fraction = (
        prescribed_dose / number_of_fractions
        if prescribed_dose and number_of_fractions
        else None
    )
    
    # Assign beam doses from fraction groups
    for beam in beams:
        if fraction_groups:
            ref_beam = next(
                (rb for rb in fraction_groups[0].referenced_beams 
                 if rb.beam_number == beam.beam_number),
                None
            )
            if ref_beam:
                beam.beam_dose = ref_beam.beam_meterset
    
    # Get file size
    import os
    file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
    
    # Get treatment machine name from first beam
    treatment_machine = None
    if beams:
        treatment_machine = _get_string(ds, "TreatmentMachineName") or None
    
    return RTPlan(
        patient_id=_anonymize_id(_get_string(ds, "PatientID")),
        patient_name="Anonymized",
        plan_label=_get_string(ds, "RTPlanLabel") or os.path.basename(file_path),
        plan_name=_get_string(ds, "RTPlanName") or os.path.basename(file_path),
        plan_date=None,  # Anonymized
        plan_time=None,  # Anonymized
        rt_plan_geometry="PATIENT",
        treatment_machine_name=treatment_machine,
        manufacturer=_get_string(ds, "Manufacturer") or None,
        institution_name=_anonymize_institution(_get_string(ds, "InstitutionName")),
        beams=beams,
        fraction_groups=fraction_groups,
        dose_references=dose_references,
        prescribed_dose=prescribed_dose,
        dose_per_fraction=dose_per_fraction,
        number_of_fractions=number_of_fractions,
        total_mu=total_mu,
        technique=_determine_technique(beams),
        parse_date=datetime.now(),
        file_size=file_size,
        sop_instance_uid=_get_string(ds, "SOPInstanceUID"),
    )
