"""
Data types matching the TypeScript interfaces in src/lib/dicom/types.ts

These dataclasses mirror the TypeScript types exactly to ensure
consistent data structures between implementations.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Optional, Tuple


# ============================================================================
# Structure Types (RTSTRUCT)
# ============================================================================

@dataclass
class ContourSequence:
    """A single contour from an ROI (sequence of 3D points)."""
    points: List[Tuple[float, float, float]]  # List of (x, y, z) points in patient coordinates
    number_of_points: int = 0
    
    def __post_init__(self):
        if self.number_of_points == 0:
            self.number_of_points = len(self.points)


@dataclass
class Structure:
    """ROI structure from RTSTRUCT (e.g., target, OAR)."""
    name: str
    number: int
    reference_roi_number: Optional[int] = None
    roi_display_color: Optional[Tuple[int, int, int]] = None  # RGB
    contours: List[ContourSequence] = field(default_factory=list)
    
    def get_all_points(self) -> List[Tuple[float, float, float]]:
        """Flatten all contour points into a single list."""
        all_points = []
        for contour in self.contours:
            all_points.extend(contour.points)
        return all_points


class Technique(Enum):
    """Treatment technique type."""
    VMAT = "VMAT"
    IMRT = "IMRT"
    CONFORMAL = "CONFORMAL"
    UNKNOWN = "UNKNOWN"


class GantryDirection(Enum):
    """Gantry rotation direction."""
    CW = "CW"
    CCW = "CCW"
    NONE = "NONE"


@dataclass
class MLCLeafPositions:
    """MLC leaf positions for both banks."""
    bank_a: List[float] = field(default_factory=list)  # Negative X direction
    bank_b: List[float] = field(default_factory=list)  # Positive X direction


@dataclass
class JawPositions:
    """Jaw positions in mm."""
    x1: float = 0.0
    x2: float = 0.0
    y1: float = 0.0
    y2: float = 0.0


@dataclass
class ControlPoint:
    """Control point data for a beam."""
    index: int
    gantry_angle: float  # degrees
    gantry_rotation_direction: str  # 'CW', 'CCW', or 'NONE'
    beam_limiting_device_angle: float  # collimator angle in degrees
    cumulative_meterset_weight: float  # 0 to 1
    mlc_positions: MLCLeafPositions = field(default_factory=MLCLeafPositions)
    jaw_positions: JawPositions = field(default_factory=JawPositions)
    isocenter_position: Optional[Tuple[float, float, float]] = None
    patient_support_angle: Optional[float] = None  # Table rotation (degrees)
    table_top_vertical: Optional[float] = None  # mm
    table_top_longitudinal: Optional[float] = None  # mm
    table_top_lateral: Optional[float] = None  # mm


@dataclass
class Beam:
    """Beam data from RT Plan."""
    beam_number: int
    beam_name: str
    beam_type: str  # 'STATIC' or 'DYNAMIC'
    radiation_type: str
    treatment_delivery_type: str  # 'TREATMENT', 'OPEN_PORTFILM', 'TRMT_PORTFILM'
    number_of_control_points: int
    control_points: List[ControlPoint] = field(default_factory=list)
    beam_meterset_units: str = "MU"
    final_cumulative_meterset_weight: float = 1.0
    beam_dose: Optional[float] = None  # MU for this beam
    gantry_angle_start: float = 0.0
    gantry_angle_end: float = 0.0
    is_arc: bool = False
    mlc_leaf_widths: List[float] = field(default_factory=list)  # mm
    mlc_leaf_boundaries: List[float] = field(default_factory=list)  # N+1 boundary positions in mm
    number_of_leaves: int = 60
    beam_description: Optional[str] = None
    source_skin_distance: Optional[float] = None
    # Energy fields (DICOM 300A,0114)
    nominal_beam_energy: Optional[float] = None  # Energy in MeV
    energy_label: Optional[str] = None  # Clinical label (e.g., '6X', '10FFF', '9E')


@dataclass
class ReferencedBeam:
    """Referenced beam in a fraction group."""
    beam_number: int
    beam_meterset: float  # MU


@dataclass
class FractionGroup:
    """Fraction group data."""
    fraction_group_number: int
    number_of_fractions_planned: int
    number_of_beams: int
    referenced_beams: List[ReferencedBeam] = field(default_factory=list)


@dataclass
class DoseReference:
    """DICOM Dose Reference from DoseReferenceSequence (300A,0010)."""
    dose_reference_number: int
    dose_reference_structure_type: str  # 'SITE', 'VOLUME', 'COORDINATES', 'POINT'
    dose_reference_type: str  # 'TARGET' or 'ORGAN_AT_RISK'
    dose_reference_description: Optional[str] = None
    delivery_maximum_dose: Optional[float] = None  # Gy
    target_minimum_dose: Optional[float] = None  # Gy
    target_prescription_dose: Optional[float] = None  # Gy
    target_maximum_dose: Optional[float] = None  # Gy


@dataclass
class RTPlan:
    """Complete RT Plan structure."""
    # Patient & Plan Identification
    patient_id: str
    patient_name: str
    plan_label: str
    plan_name: str
    plan_date: Optional[str] = None
    plan_time: Optional[str] = None
    
    # Plan Configuration
    rt_plan_geometry: str = "PATIENT"  # 'PATIENT' or 'TREATMENT_DEVICE'
    plan_intent: Optional[str] = None
    
    # Treatment Machine
    treatment_machine_name: Optional[str] = None
    manufacturer: Optional[str] = None
    institution_name: Optional[str] = None
    
    # Beams & Fractions
    beams: List[Beam] = field(default_factory=list)
    fraction_groups: List[FractionGroup] = field(default_factory=list)
    dose_references: List["DoseReference"] = field(default_factory=list)
    
    # Prescription
    prescribed_dose: Optional[float] = None  # Total prescribed dose (Gy)
    dose_per_fraction: Optional[float] = None  # Dose per fraction (Gy)
    number_of_fractions: Optional[int] = None  # Number of fractions planned
    
    # Derived Metrics
    total_mu: float = 0.0
    technique: Technique = Technique.UNKNOWN
    
    # Parsing metadata
    parse_date: datetime = field(default_factory=datetime.now)
    file_size: int = 0
    sop_instance_uid: str = ""


# ============================================================================
# Metrics Types
# ============================================================================

@dataclass
class SmallApertureFlags:
    """Flags for small aperture detection."""
    below_2mm: bool = False
    below_5mm: bool = False
    below_10mm: bool = False
    below_20mm: bool = False


@dataclass
class ControlPointMetrics:
    """Metrics calculated for a single control point."""
    control_point_index: int
    aperture_lsv: float  # Leaf Sequence Variability
    aperture_aav: float  # Aperture Area Variability
    aperture_area: float  # mm²
    leaf_travel: float  # mm (from previous CP)
    meterset_weight: float
    aperture_perimeter: Optional[float] = None  # mm
    small_aperture_flags: Optional[SmallApertureFlags] = None
    PAM: Optional[float] = None  # Plan Aperture Modulation (per control point)


@dataclass
class BeamMetrics:
    """
    Comprehensive complexity metrics for a single beam.
    
    Includes UCoMX-based primary metrics, accuracy metrics, deliverability metrics,
    and beam identification fields extracted from DICOM.
    
    Note: For electron beams, MLC-based metrics (MCS, LSV, AAV, LT, etc.) are set to None
    as electrons use fixed applicators instead of multi-leaf collimators.
    """
    beam_number: int
    beam_name: str
    
    # UCoMX Primary Metrics
    MCS: float  # Modulation Complexity Score (0-1, higher = simpler)
    LSV: float  # Leaf Sequence Variability (0-1, higher = more uniform)
    AAV: float  # Aperture Area Variability (≥0, lower = more consistent)
    MFA: float  # Mean Field Area (cm²)
    LT: float   # Leaf Travel (mm, normalized per leaf)
    LTMCS: float  # Combined Leaf Travel + MCS (1/mm)
    
    # Basic metrics
    beam_mu: float
    number_of_control_points: int
    
    # Radiation type and energy (DICOM standard nomenclature)
    radiation_type: Optional[str] = None  # 'PHOTON', 'ELECTRON', 'PROTON', 'NEUTRON', 'ION'
    nominal_beam_energy: Optional[float] = None  # Energy in MeV
    energy_label: Optional[str] = None  # Clinical label (e.g., '6X', '10FFF', '9E')
    
    # UCoMX Accuracy Metrics
    LG: Optional[float] = None  # Leaf Gap (mm)
    MAD: Optional[float] = None  # Mean Asymmetry Distance (mm)
    EFS: Optional[float] = None  # Equivalent Field Size (mm)
    psmall: Optional[float] = None  # Percentage of small fields
    
    # UCoMX Deliverability Metrics
    MUCA: Optional[float] = None  # MU per Control Arc (MU/CA)
    LTMU: Optional[float] = None  # Leaf Travel per MU (mm/MU)
    LTNLMU: Optional[float] = None  # Leaf Travel per Leaf and MU (mm/(leaf·MU))
    LNA: Optional[float] = None  # Leaf Travel per Leaf and CA (mm/(leaf·CA))
    NL: Optional[float] = None  # Mean number of active leaves (2 × mean active leaf pairs)
    LTAL: Optional[float] = None  # Leaf Travel per Arc Length (mm/°, VMAT only)
    mDRV: Optional[float] = None  # Mean Dose Rate Variation (MU/min)
    GT: Optional[float] = None  # Gantry Travel (degrees)
    GS: Optional[float] = None  # Gantry Speed (deg/s)
    mGSV: Optional[float] = None  # Mean Gantry Speed Variation (deg/s)
    LS: Optional[float] = None  # Leaf Speed (mm/s)
    PA: Optional[float] = None  # Plan Area - mean aperture area in BEV (cm²)
    JA: Optional[float] = None  # Jaw Area - area defined by collimator jaws (cm²)
    PM: Optional[float] = None  # Plan Modulation - area & MU weighted (0-1)
    TG: Optional[float] = None  # Tongue-and-Groove Index (ratio)
    MD: Optional[float] = None  # Modulation Degree - CV of meterset weights
    MI: Optional[float] = None  # Modulation Index - normalized leaf travel (mm/leaf/CP)
    
    # Additional metrics
    arc_length: Optional[float] = None  # degrees
    average_gantry_speed: Optional[float] = None  # deg/s
    estimated_delivery_time: Optional[float] = None  # seconds
    MU_per_degree: Optional[float] = None
    avg_dose_rate: Optional[float] = None  # MU/min
    avg_mlc_speed: Optional[float] = None  # mm/s
    limiting_factor: Optional[str] = None  # 'doseRate', 'gantrySpeed', 'mlcSpeed'
    
    # Collimator info
    collimator_angle_start: Optional[float] = None
    collimator_angle_end: Optional[float] = None
    
    # Additional complexity metrics
    SAS5: Optional[float] = None  # Small Aperture Score (5mm)
    SAS10: Optional[float] = None  # Small Aperture Score (10mm)
    EM: Optional[float] = None  # Edge Metric
    PI: Optional[float] = None  # Plan Irregularity
    BAM: Optional[float] = None  # Beam Aperture Modulation (target-specific)
    
    # Per-control-point data
    control_point_metrics: List[ControlPointMetrics] = field(default_factory=list)


@dataclass
class PlanMetrics:
    """
    Aggregate complexity metrics for the entire treatment plan.
    
    Plan-level metrics are aggregated from beam metrics using MU-weighted averaging
    (UCoMX Equation 2) for most metrics, with some exceptions like LT which are additive.
    
    Includes prescription information extracted from DICOM headers and optional
    PAM (Plan Aperture Modulation) if a target structure is provided.
    """
    plan_label: str
    
    # UCoMX Primary Metrics (MU-weighted)
    MCS: float  # Modulation Complexity Score (0-1, higher = simpler)
    LSV: float  # Leaf Sequence Variability (0-1, higher = more uniform)
    AAV: float  # Aperture Area Variability (≥0, lower = more consistent)
    MFA: float  # Mean Field Area (cm²)
    LT: float   # Total Leaf Travel (mm, sum across all beams)
    LTMCS: float  # Combined Leaf Travel + MCS (1/mm)
    
    # Plan-level metrics
    total_mu: float
    prescribed_dose: Optional[float] = None  # Total prescribed dose (Gy)
    dose_per_fraction: Optional[float] = None  # Dose per fraction (Gy)
    number_of_fractions: Optional[int] = None
    mu_per_gy: Optional[float] = None  # MU per Gy
    
    # UCoMX Accuracy Metrics
    LG: Optional[float] = None
    MAD: Optional[float] = None
    EFS: Optional[float] = None
    psmall: Optional[float] = None
    
    # UCoMX Deliverability Metrics (MU-weighted aggregates)
    MUCA: Optional[float] = None  # MU per Control Arc (MU/CA)
    LTMU: Optional[float] = None  # Leaf Travel per MU (mm/MU)
    LTNLMU: Optional[float] = None  # Leaf Travel per Leaf and MU (mm/(leaf·MU))
    LNA: Optional[float] = None  # Leaf Travel per Leaf and CA (mm/(leaf·CA))
    LTAL: Optional[float] = None  # Leaf Travel per Arc Length (mm/°)
    mDRV: Optional[float] = None  # Mean Dose Rate Variation (MU/min)
    GT: Optional[float] = None  # Gantry Travel (degrees)
    GS: Optional[float] = None  # Gantry Speed (deg/s)
    mGSV: Optional[float] = None  # Mean Gantry Speed Variation (deg/s)
    LS: Optional[float] = None  # Leaf Speed (mm/s)
    PA: Optional[float] = None  # Plan Area - mean aperture area (cm²)
    JA: Optional[float] = None  # Jaw Area - mean jaw-defined area (cm²)
    PM: Optional[float] = None  # Plan Modulation (0-1)
    TG: Optional[float] = None  # Tongue-and-Groove Index
    MD: Optional[float] = None  # Modulation Degree
    MI: Optional[float] = None  # Modulation Index (mm/leaf/CP)
    
    # Delivery time
    total_delivery_time: Optional[float] = None  # seconds
    
    # Additional complexity metrics
    SAS5: Optional[float] = None
    SAS10: Optional[float] = None
    EM: Optional[float] = None
    PI: Optional[float] = None
    PAM: Optional[float] = None  # Plan Aperture Modulation (target-specific)
    
    # Per-beam breakdown
    beam_metrics: List[BeamMetrics] = field(default_factory=list)
    
    calculation_date: datetime = field(default_factory=datetime.now)


@dataclass
class MachineDeliveryParams:
    """Machine delivery parameters for time estimation."""
    max_dose_rate: float = 600.0  # MU/min
    max_dose_rate_fff: Optional[float] = None  # MU/min for FFF beams
    max_gantry_speed: float = 4.8  # deg/s
    max_mlc_speed: float = 25.0  # mm/s
    mlc_type: str = "MLCX"  # 'MLCX', 'MLCY', 'DUAL'


# ============================================================================
# Statistics Types
# ============================================================================

@dataclass
class ExtendedStatistics:
    """Extended statistics for cohort analysis."""
    min: float
    max: float
    mean: float
    std: float
    median: float
    q1: float  # 25th percentile
    q3: float  # 75th percentile
    iqr: float  # Interquartile range
    p5: float  # 5th percentile
    p95: float  # 95th percentile
    skewness: float
    count: int
    outliers: List[float] = field(default_factory=list)


@dataclass
class BoxPlotData:
    """Data for box plot visualization."""
    metric: str
    min: float
    q1: float
    median: float
    q3: float
    max: float
    mean: float
    whisker_low: float
    whisker_high: float
    outliers: List[float] = field(default_factory=list)
