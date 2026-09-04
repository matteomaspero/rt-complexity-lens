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
    Structure,
    ContourSequence,
)


# DICOM RT Plan SOP Class UID
RT_PLAN_SOP_CLASS = "1.2.840.10008.5.1.4.1.1.481.5"
RT_STRUCT_SOP_CLASS = "1.2.840.10008.5.1.4.1.1.481.3"


def _read_dataset(file_path) -> Dataset:
    """Read a DICOM file tolerantly.

    Some TPS exports (e.g. Elekta Monaco) omit the Part-10 preamble and
    file-meta group; those raw datasets are read as Implicit VR Little Endian.
    """
    ds = pydicom.dcmread(file_path, force=True)
    if not getattr(ds.file_meta, "TransferSyntaxUID", None):
        ds.file_meta.TransferSyntaxUID = pydicom.uid.ImplicitVRLittleEndian
    return ds



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
    """Parse MLC positions from control point.

    Recognises the standard MLCX/MLCY device types plus the private
    MLCX1/MLCX2 (and MLCY1/MLCY2) types emitted by Varian Eclipse for
    dual-layer machines (Halcyon/Ethos). For stacked MLCs the two layers
    are concatenated (bank_a = A1+A2, bank_b = B1+B2) so downstream
    perimeter/area metrics see every open leaf.
    """
    result = MLCLeafPositions(bank_a=[], bank_b=[])

    try:
        bldp_seq = getattr(cp_ds, "BeamLimitingDevicePositionSequence", None)
        if bldp_seq is None:
            return result

        primary_a: List[float] = []
        primary_b: List[float] = []
        stacked_a: List[float] = []
        stacked_b: List[float] = []

        for item in bldp_seq:
            device_type = _get_string(item, "RTBeamLimitingDeviceType")
            if device_type not in ("MLCX", "MLCY", "MLCX1", "MLCX2", "MLCY1", "MLCY2"):
                continue
            positions = _get_float_array(item, "LeafJawPositions")
            if len(positions) == 0:
                continue
            half = len(positions) // 2
            a = positions[:half]
            b = positions[half:]
            if device_type in ("MLCX", "MLCY"):
                primary_a = a
                primary_b = b
            else:
                stacked_a.extend(a)
                stacked_b.extend(b)

        if primary_a:
            result.bank_a = primary_a
            result.bank_b = primary_b
        elif stacked_a:
            result.bank_a = stacked_a
            result.bank_b = stacked_b
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


def _derive_jaw_positions_from_mlc(
    mlc_positions: MLCLeafPositions,
    beam_ds: Dataset
) -> Optional[JawPositions]:
    """
    Derive jaw positions from MLC and beam limiting device for Elekta Monaco plans.
    
    Monaco plans often lack explicit ASYMX/ASYMY jaw positions. This function:
    1. Derives X jaw extent from open MLC leaf positions (filtering out closed leaves)
    2. Derives Y jaw extent from active leaf boundaries
    
    Returns: JawPositions if derivation successful, None otherwise
    """
    if len(mlc_positions.bank_a) == 0 or len(mlc_positions.bank_b) == 0:
        return None
    
    OPEN_LEAF_THRESHOLD = 0.5  # mm - minimum opening to consider leaf "open"
    
    # Step 1: Derive X extent from open leaf pairs
    open_leaf_pairs = [
        (mlc_positions.bank_a[i], mlc_positions.bank_b[i])
        for i in range(len(mlc_positions.bank_a))
        if mlc_positions.bank_b[i] - mlc_positions.bank_a[i] > OPEN_LEAF_THRESHOLD
    ]
    
    if len(open_leaf_pairs) < 2:
        return None  # Need at least 2 open leaves for reasonable derivation
    
    mlc_min = min(pair[0] for pair in open_leaf_pairs)
    mlc_max = max(pair[1] for pair in open_leaf_pairs)
    
    if mlc_max - mlc_min <= 1:
        return None  # Field too small or invalid
    
    result = JawPositions(x1=mlc_min, x2=mlc_max)
    
    # Step 2: Derive Y extent from leaf position boundaries
    open_leaf_indices = [
        i for i in range(len(mlc_positions.bank_a))
        if mlc_positions.bank_b[i] - mlc_positions.bank_a[i] > OPEN_LEAF_THRESHOLD
    ]
    
    if len(open_leaf_indices) >= 2:
        try:
            bld_seq = getattr(beam_ds, "BeamLimitingDeviceSequence", None)
            if bld_seq:
                # Some plans (e.g. MRIdian) have multiple MLCX entries with
                # different boundary arrays. Prefer the one whose leaf count
                # matches the actual MLC bank length to avoid using an
                # unrelated definition.
                candidates = []
                for item in bld_seq:
                    device_type = _get_string(item, "RTBeamLimitingDeviceType")
                    if device_type in ("MLCX", "MLCY"):
                        boundaries = _get_float_array(item, "LeafPositionBoundaries")
                        if len(boundaries) > 1:
                            matches = (len(boundaries) - 1) == len(mlc_positions.bank_a)
                            candidates.append((boundaries, matches))
                chosen = next((c[0] for c in candidates if c[1]), None)
                if chosen is None and candidates:
                    chosen = candidates[0][0]
                if chosen is not None:
                    min_leaf_idx = min(open_leaf_indices)
                    max_leaf_idx = max(open_leaf_indices)
                    y1 = chosen[min_leaf_idx]
                    y2 = chosen[max_leaf_idx + 1]
                    if y2 - y1 > 1:
                        result.y1 = y1
                        result.y2 = y2
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
    # Map DICOM "CC" to internal "CCW" (DICOM uses "CC" for counter-clockwise)
    raw_gantry_dir = _get_string(cp_ds, "GantryRotationDirection", "NONE")
    has_gantry_dir = hasattr(cp_ds, "GantryRotationDirection")
    if has_gantry_dir:
        if raw_gantry_dir == "CW":
            gantry_dir = "CW"
        elif raw_gantry_dir in ("CC", "CCW"):
            gantry_dir = "CCW"
        else:
            gantry_dir = "NONE"
    elif previous_cp:
        gantry_dir = previous_cp.gantry_rotation_direction
    else:
        gantry_dir = "NONE"
    
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
    
    # For Elekta/Monaco plans that lack X jaws, derive X from MLC positions
    # Only derive if X jaws are still zero after parsing and inheritance
    if jaw_positions.x1 == 0 and jaw_positions.x2 == 0 and len(mlc_positions.bank_a) > 0:
        derived_jaws = _derive_jaw_positions_from_mlc(mlc_positions, beam_ds)
        if derived_jaws:
            # Override ONLY the X jaws, preserve Y jaws from parsed/inherited values
            jaw_positions.x1 = derived_jaws.x1
            jaw_positions.x2 = derived_jaws.x2
            # Also override Y if derived successfully (only when Y still at default 0)
            if jaw_positions.y1 == 0 and jaw_positions.y2 == 0 and derived_jaws.y1 != 0:
                jaw_positions.y1 = derived_jaws.y1
                jaw_positions.y2 = derived_jaws.y2
    
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
        
        primary: Optional[Tuple[List[float], List[float], int]] = None
        stacked_widths: List[float] = []
        stacked_boundaries: List[float] = []
        stacked_pairs = 0

        for item in bld_seq:
            device_type = _get_string(item, "RTBeamLimitingDeviceType")
            if device_type not in ("MLCX", "MLCY", "MLCX1", "MLCX2", "MLCY1", "MLCY2"):
                continue
            num_pairs = _get_int(item, "NumberOfLeafJawPairs")
            boundaries = _get_float_array(item, "LeafPositionBoundaries")
            widths = [abs(boundaries[i] - boundaries[i - 1]) for i in range(1, len(boundaries))]
            if device_type in ("MLCX", "MLCY"):
                # First MLCX/MLCY wins (matches legacy behavior for MRIdian-style
                # plans that emit multiple MLCX definitions).
                if primary is None:
                    primary = (widths, boundaries, num_pairs or len(widths))
            else:
                stacked_widths.extend(widths)
                if not stacked_boundaries:
                    stacked_boundaries = list(boundaries)
                else:
                    # Append offset boundaries so downstream indexing stays valid
                    last = stacked_boundaries[-1]
                    for b in boundaries[1:]:
                        stacked_boundaries.append(last + (b - boundaries[0]))
                stacked_pairs += num_pairs or len(widths)

        if primary is not None:
            return primary
        if stacked_widths:
            return (stacked_widths, stacked_boundaries, stacked_pairs or len(stacked_widths))
    except Exception:
        pass
    
    # Default: Varian Millennium 120 leaf configuration
    widths = [5.0] * 60
    boundaries = [i * 5.0 - 150.0 for i in range(61)]
    return (widths, boundaries, 60)


def _parse_fluence_mode(beam_ds: Dataset) -> Tuple[Optional[str], Optional[str], bool]:
    """
    Read Primary Fluence Mode Sequence (3002,0050).

    NON_STANDARD + FluenceModeID containing 'FFF' (3002,0052) marks an
    unflattened beam. Returns (fluence_mode, fluence_mode_id, is_fff).
    """
    seq = getattr(beam_ds, "PrimaryFluenceModeSequence", None)
    if not seq:
        return (None, None, False)

    item = seq[0]
    mode = (_get_string(item, "FluenceMode") or "").strip().upper() or None
    mode_id = (_get_string(item, "FluenceModeID") or "").strip().upper() or None
    is_fff = mode == "NON_STANDARD" and bool(mode_id) and "FFF" in mode_id
    return (mode, mode_id, is_fff)


def _generate_energy_label(
    radiation_type: str,
    energy: Optional[float],
    beam_name: str,
    is_fff_from_tag: Optional[bool] = None,
) -> Optional[str]:
    """
    Generate clinical energy label from radiation type and energy value.
    Per DICOM standard nomenclature:
    - Photons: 6X, 10X, 15X, 6FFF, 10FFF (X = MV, FFF = Flattening Filter Free)
    - Electrons: 6E, 9E, 12E, 15E, 18E (E = MeV)
    - Protons/Ions: Numeric MeV value
    """
    if energy is None or energy == 0:
        return None
    
    upper_rad_type = radiation_type.upper()
    
    if upper_rad_type == "PHOTON":
        # FFF comes from the Primary Fluence Mode tags; the beam name is only
        # a fallback for exports that omit (3002,0050).
        import re
        is_fff = (
            is_fff_from_tag
            if is_fff_from_tag is not None
            else bool(re.search(r'FFF', beam_name, re.IGNORECASE))
        )
        return f"{round(energy)}FFF" if is_fff else f"{round(energy)}X"
    
    if upper_rad_type == "ELECTRON":
        return f"{round(energy)}E"
    
    if upper_rad_type in ("PROTON", "ION", "NEUTRON"):
        return f"{round(energy)} MeV"
    
    # Default: just show energy with unit
    return f"{round(energy)} MeV"


def _parse_beam(beam_ds: Dataset) -> Beam:
    """Parse a single beam from BeamSequence."""
    beam_number = _get_int(beam_ds, "BeamNumber")
    beam_name = _get_string(beam_ds, "BeamName") or f"Beam {beam_number}"
    beam_type = _get_string(beam_ds, "BeamType", "DYNAMIC")
    num_cps = _get_int(beam_ds, "NumberOfControlPoints")
    final_mw = _get_float(beam_ds, "FinalCumulativeMetersetWeight", 1.0)
    radiation_type = _get_string(beam_ds, "RadiationType", "PHOTON")
    
    leaf_widths, leaf_boundaries, num_leaves = _get_leaf_widths(beam_ds)
    
    # Parse control points
    control_points: List[ControlPoint] = []
    cp_seq = getattr(beam_ds, "ControlPointSequence", None)
    
    # Extract nominal beam energy from first control point (per DICOM standard)
    nominal_beam_energy: Optional[float] = None
    
    if cp_seq:
        for i, cp_item in enumerate(cp_seq):
            # Get energy from first control point
            if i == 0:
                energy = _get_float(cp_item, "NominalBeamEnergy")
                if energy > 0:
                    nominal_beam_energy = energy
            
            previous_cp = control_points[i - 1] if i > 0 else None
            cp = _parse_control_point(cp_item, beam_ds, i, previous_cp)
            control_points.append(cp)
    
    # Fluence mode (3002,0050) — authoritative FFF flag
    fluence_mode, fluence_mode_id, is_fff = _parse_fluence_mode(beam_ds)

    # Planned dose rate (300A,0115), taken from the first control point that has it
    dose_rate_set: Optional[float] = None
    if cp_seq:
        for cp_item in cp_seq:
            dr = _get_float(cp_item, "DoseRateSet")
            if dr and dr > 0:
                dose_rate_set = dr
                break

    # Generate clinical energy label
    energy_label = _generate_energy_label(
        radiation_type,
        nominal_beam_energy,
        beam_name,
        is_fff if fluence_mode else None,
    )
    
    # Determine gantry angles
    gantry_angles = [cp.gantry_angle for cp in control_points]
    gantry_start = gantry_angles[0] if gantry_angles else 0
    gantry_end = gantry_angles[-1] if gantry_angles else 0
    
    # Determine if arc: check rotation direction first (CW/CCW), then gantry span fallback
    # Matches TS logic: explicit rotation direction OR gantry span > 5°
    has_rotation = (
        control_points[0].gantry_rotation_direction in ("CW", "CCW")
        if control_points else False
    )
    # Cumulative CP-by-CP gantry span (handles full 360° arcs correctly)
    gantry_span = 0.0
    for i in range(1, len(gantry_angles)):
        d = abs(gantry_angles[i] - gantry_angles[i - 1])
        if d > 180:
            d = 360 - d
        gantry_span += d
    is_arc = has_rotation or gantry_span > 5
    
    # Per-beam treatment machine name
    beam_machine_name = _get_string(beam_ds, "TreatmentMachineName") or None
    
    return Beam(
        beam_number=beam_number,
        beam_name=beam_name,
        beam_description=_get_string(beam_ds, "BeamDescription") or None,
        beam_type=beam_type,
        radiation_type=radiation_type,
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
        nominal_beam_energy=nominal_beam_energy,
        energy_label=energy_label,
        fluence_mode=fluence_mode,
        fluence_mode_id=fluence_mode_id,
        is_fff=is_fff,
        dose_rate_set=dose_rate_set,
        treatment_machine_name=beam_machine_name,
        source_axis_distance=_get_float(beam_ds, "SourceAxisDistance") or None,
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
    ds = _read_dataset(file_path)
    
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


# ============================================================================
# RTSTRUCT Parsing Functions
# ============================================================================

def parse_rtstruct(file_path: str) -> dict:
    """
    Parse an RTSTRUCT DICOM file and extract all structures.
    
    Args:
        file_path: Path to the RTSTRUCT DICOM file.
    
    Returns:
        Dictionary mapping structure names to Structure objects.
    
    Raises:
        FileNotFoundError: If file doesn't exist.
        ValueError: If file is not a valid RTSTRUCT.
    """
    try:
        ds = _read_dataset(file_path)
    except Exception as e:
        raise ValueError(f"Failed to read DICOM file: {e}")
    
    # Verify this is an RTSTRUCT
    sop_class_uid = _get_string(ds, "SOPClassUID")
    if sop_class_uid and sop_class_uid != RT_STRUCT_SOP_CLASS:
        raise ValueError(f"File is not an RTSTRUCT (SOP Class: {sop_class_uid})")
    
    structures: dict = {}
    
    # Parse ReferencedRoiNumber to ROI mapping
    roi_map = {}
    if hasattr(ds, "StructureSetROISequence"):
        for roi in ds.StructureSetROISequence:
            # (3006,0022) ROI Number / (3006,0026) ROI Name
            roi_number = int(getattr(roi, "ROINumber", getattr(roi, "ReferencedROINumber", 0)))
            roi_name = str(getattr(roi, "ROIName", "") or f"ROI_{roi_number}").replace("\x00", "").strip()
            roi_map[roi_number] = roi_name or f"ROI_{roi_number}"

    
    # Parse ROI Contour Sequence
    if hasattr(ds, "ROIContourSequence"):
        for roi_contour in ds.ROIContourSequence:
            referenced_roi_num = int(roi_contour.ReferencedROINumber)
            
            # Get structure name; distinct ROIs may share a name, keep both
            base_name = roi_map.get(referenced_roi_num, f"ROI_{referenced_roi_num}")
            structure_name = base_name
            suffix = 2
            while structure_name in structures:
                structure_name = f"{base_name} ({suffix})"
                suffix += 1

            
            # Parse contours
            contours = []
            if hasattr(roi_contour, "ContourSequence"):
                for contour_seq in roi_contour.ContourSequence:
                    # Extract contour data
                    contour_data = list(contour_seq.ContourData)
                    # Contour data is a flat list: [x0, y0, z0, x1, y1, z1, ...]
                    points = []
                    for i in range(0, len(contour_data), 3):
                        if i + 2 < len(contour_data):
                            x = float(contour_data[i])
                            y = float(contour_data[i + 1])
                            z = float(contour_data[i + 2])
                            points.append((x, y, z))
                    
                    if points:
                        contours.append(ContourSequence(points=points, number_of_points=len(points)))
            
            # Create and store Structure
            if contours:  # Only add if has contours
                structure = Structure(
                    name=structure_name,
                    number=referenced_roi_num,
                    reference_roi_number=referenced_roi_num,
                    contours=contours,
                )
                structures[structure_name] = structure
    
    return structures


def get_structure_by_name(structures: dict, structure_label: str) -> Optional[Structure]:
    """
    Retrieve a structure by name (case-insensitive).
    
    Args:
        structures: Dictionary of structures from parse_rtstruct().
        structure_label: Name of the structure to retrieve (case-insensitive).
    
    Returns:
        Structure object if found, None otherwise.
    """
    # Try exact match first
    if structure_label in structures:
        return structures[structure_label]
    
    # Try case-insensitive match
    label_lower = structure_label.lower()
    for name, struct in structures.items():
        if name.lower() == label_lower:
            return struct
    
    # Try partial match
    for name, struct in structures.items():
        if label_lower in name.lower():
            return struct
    
    return None
