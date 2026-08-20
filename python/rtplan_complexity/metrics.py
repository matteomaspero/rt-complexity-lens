"""
UCoMX Complexity Metrics Implementation

Direct translation of the TypeScript implementation in src/lib/dicom/metrics.ts
Based on UCoMX v1.1 MATLAB implementation (Cavinato et al., Med Phys 2024)
Uses Control Arc (CA) midpoint interpolation, active leaf filtering,
and union aperture A_max per the UCoMx paper.
Extended with SAS, EM, PI metrics and delivery time estimation.

See docs/ALGORITHMS.md for detailed algorithm descriptions.
"""

import math
from typing import List, Optional, Tuple

import numpy as np
from shapely.geometry import Polygon
from shapely.ops import unary_union

from .conformality import (
    DEFAULT_SAD,
    BeamConformality,
    build_aperture_polygon,
    calculate_beam_conformality,
    calculate_plan_conformality,
    compute_conformality,
    pick_default_target,
    project_patient_point_to_bev,
    project_target_to_bev,
)

from .types import (
    RTPlan,
    Beam,
    ControlPoint,
    PlanMetrics,
    BeamMetrics,
    ControlPointMetrics,
    MLCLeafPositions,
    JawPositions,
    MachineDeliveryParams,
    SmallApertureFlags,
    Structure,
)


# Default machine parameters
DEFAULT_MACHINE_PARAMS = MachineDeliveryParams(
    max_dose_rate=600,
    max_gantry_speed=4.8,
    max_mlc_speed=25,
    mlc_type="MLCX",
)


# ===================================================================
# CA-based UCoMx helper functions
# ===================================================================

def compute_leaf_boundaries(leaf_widths: List[float], num_pairs: int) -> List[float]:
    """
    Compute leaf boundaries from widths if not directly available.
    Returns N+1 boundary positions centered at 0.
    """
    n = min(len(leaf_widths), num_pairs)
    boundaries = [0.0]
    for i in range(n):
        boundaries.append(boundaries[i] + (leaf_widths[i] if i < len(leaf_widths) else 5.0))
    total_width = boundaries[-1]
    offset = total_width / 2.0
    return [b - offset for b in boundaries]


def get_effective_leaf_boundaries(beam: Beam) -> List[float]:
    """
    Get effective leaf boundaries for a beam.
    Uses stored DICOM boundaries if available, otherwise computes from widths.
    """
    if beam.mlc_leaf_boundaries and len(beam.mlc_leaf_boundaries) > 0:
        return beam.mlc_leaf_boundaries
    return compute_leaf_boundaries(
        beam.mlc_leaf_widths, beam.number_of_leaves or len(beam.mlc_leaf_widths)
    )


def determine_active_leaves(
    gaps: List[float],
    leaf_bounds: List[float],
    jaw_y1: float,
    jaw_y2: float,
    min_gap: float
) -> List[bool]:
    """
    Determine active leaf pairs for a control arc midpoint.
    Active = gap > minGap AND leaf pair overlaps with Y-jaw opening.
    Per UCoMx: minGap is the minimum gap found anywhere in the entire plan.
    """
    n_pairs = len(gaps)
    active = [False] * n_pairs
    for k in range(n_pairs):
        within_jaw = leaf_bounds[k + 1] > jaw_y1 and leaf_bounds[k] < jaw_y2
        active[k] = within_jaw and gaps[k] > min_gap
    return active


def calculate_area_ca(
    bank_a: List[float],
    bank_b: List[float],
    leaf_bounds: List[float],
    jaw_y1: float,
    jaw_y2: float,
    active_mask: List[bool]
) -> float:
    """
    Calculate aperture area at a CA midpoint with Y-jaw clipping for active leaves.
    Area = Σ (gap_k × effective_width_k) for active leaves only.
    """
    area = 0.0
    for k in range(len(bank_a)):
        if not active_mask[k]:
            continue
        gap = bank_b[k] - bank_a[k]
        if gap <= 0:
            continue
        eff_width = max(0.0, min(leaf_bounds[k + 1], jaw_y2) - max(leaf_bounds[k], jaw_y1))
        area += gap * eff_width
    return area


def calculate_lsv_bank(positions: List[float], active_mask: List[bool]) -> float:
    """
    LSV per bank using Masi (2008) position-based formula.
    For adjacent active leaves: mean(1 - |diff(pos)| / max|diff(pos)|)
    Returns 1.0 for uniform positions, 0.0 for maximum variability.
    """
    active_idx = [i for i in range(len(positions)) if active_mask[i]]
    if len(active_idx) < 2:
        return 1.0

    diffs = []
    for i in range(1, len(active_idx)):
        diffs.append(abs(positions[active_idx[i]] - positions[active_idx[i - 1]]))

    max_diff = max(diffs)
    if max_diff == 0:
        return 1.0

    total = sum(1.0 - d / max_diff for d in diffs)
    return total / len(diffs)


def calculate_aperture_area(
    mlc_positions: MLCLeafPositions,
    leaf_widths: List[float],
    jaw_positions: JawPositions
) -> float:
    """
    Calculate the aperture area for a given control point with full X+Y jaw clipping.
    Matches ComplexityCalc's area calculation.
    
    Returns area in mm².
    """
    bank_a = mlc_positions.bank_a
    bank_b = mlc_positions.bank_b
    
    if len(bank_a) == 0 or len(bank_b) == 0:
        return 0.0
    
    total_area = 0.0
    n = min(len(bank_a), len(bank_b), len(leaf_widths) if leaf_widths else len(bank_a))
    default_width = 5.0
    has_x_jaw = jaw_positions.x1 != 0 or jaw_positions.x2 != 0

    # Compute leaf Y-boundaries (cumulative widths centered at 0)
    total_width = sum(leaf_widths[i] if i < len(leaf_widths) else default_width for i in range(n))
    y_pos = -total_width / 2.0
    
    for i in range(n):
        w = leaf_widths[i] if i < len(leaf_widths) else default_width
        leaf_top = y_pos
        leaf_bot = y_pos + w
        y_pos = leaf_bot

        # Clip leaf width to Y-jaw
        eff_width = max(0.0, min(leaf_bot, jaw_positions.y2) - max(leaf_top, jaw_positions.y1))
        if eff_width <= 0:
            continue

        # Clip leaf opening to X-jaw
        a = max(bank_a[i], jaw_positions.x1) if has_x_jaw else bank_a[i]
        b = min(bank_b[i], jaw_positions.x2) if has_x_jaw else bank_b[i]
        gap = b - a
        if gap <= 0:
            continue

        total_area += gap * eff_width
    
    return total_area


def calculate_aperture_perimeter(
    mlc_positions: MLCLeafPositions,
    leaf_widths: List[float],
    jaw_positions: JawPositions
) -> float:
    """
    Calculate aperture perimeter using ComplexityCalc's side_perimeter algorithm.
    Walks contiguous open leaf groups, adds horizontal edges at group boundaries,
    vertical steps between adjacent open leaves, and left/right end-caps (effWidth×2).
    Full X+Y jaw clipping on both leaf positions and effective widths.
    """
    bank_a = mlc_positions.bank_a
    bank_b = mlc_positions.bank_b
    n = min(len(bank_a), len(bank_b))
    if n == 0:
        return 0.0

    default_width = 5.0

    # Compute leaf Y-boundaries (cumulative widths centered at 0)
    total_width = sum(leaf_widths[i] if i < len(leaf_widths) else default_width for i in range(n))
    leaf_bounds = []
    y_pos = -total_width / 2.0
    for i in range(n + 1):
        leaf_bounds.append(y_pos)
        if i < n:
            y_pos += leaf_widths[i] if i < len(leaf_widths) else default_width

    jaw_x1 = jaw_positions.x1
    jaw_x2 = jaw_positions.x2
    jaw_y1 = jaw_positions.y1
    jaw_y2 = jaw_positions.y2

    perimeter = 0.0
    prev_open = False
    prev_a = 0.0
    prev_b = 0.0

    for i in range(n):
        # Clip leaf to Y-jaw
        leaf_top = leaf_bounds[i]
        leaf_bot = leaf_bounds[i + 1]
        eff_width = max(0.0, min(leaf_bot, jaw_y2) - max(leaf_top, jaw_y1))
        if eff_width <= 0:
            # Match TS: skip silently, do not close prior group with a
            # bottom horizontal edge. The TS perimeter algorithm only
            # closes a group on a closed leaf or at the final iteration.
            prev_open = False
            continue

        # Clip leaf positions to X-jaw
        a = max(bank_a[i], jaw_x1)
        b = min(bank_b[i], jaw_x2)
        gap = b - a

        if gap <= 0:
            if prev_open:
                perimeter += (prev_b - prev_a)
            prev_open = False
            continue

        # Leaf is open
        if not prev_open:
            perimeter += gap  # top horizontal
        else:
            perimeter += abs(a - prev_a)  # left bank step
            perimeter += abs(b - prev_b)  # right bank step

        # Left and right end-caps
        perimeter += eff_width * 2

        prev_open = True
        prev_a = a
        prev_b = b

    # Close final group
    if prev_open:
        perimeter += (prev_b - prev_a)

    return perimeter


def calculate_leaf_gap(mlc_positions: MLCLeafPositions) -> float:
    """Calculate average leaf gap (LG) for a control point."""
    bank_a = mlc_positions.bank_a
    bank_b = mlc_positions.bank_b
    
    if len(bank_a) == 0 or len(bank_b) == 0:
        return 0.0
    
    total_gap = 0.0
    open_count = 0
    
    for i in range(min(len(bank_a), len(bank_b))):
        gap = bank_b[i] - bank_a[i]
        if gap > 0:
            total_gap += gap
            open_count += 1
    
    return total_gap / open_count if open_count > 0 else 0.0


def calculate_mad(
    mlc_positions: MLCLeafPositions,
    jaw_positions: Optional[JawPositions] = None,
) -> float:
    """Calculate Mean Asymmetry Distance (MAD).

    Reference axis is the jaw center (X1+X2)/2 — not the isocenter.
    For symmetric jaws this is identical; for off-axis fields it avoids
    overstating asymmetry. Aligns with PyComplexityMetric/ComplexityCalc.
    """
    bank_a = mlc_positions.bank_a
    bank_b = mlc_positions.bank_b

    if len(bank_a) == 0 or len(bank_b) == 0:
        return 0.0

    central_axis = (jaw_positions.x1 + jaw_positions.x2) / 2.0 if jaw_positions else 0.0
    total_asymmetry = 0.0
    open_count = 0

    for i in range(min(len(bank_a), len(bank_b))):
        gap = bank_b[i] - bank_a[i]
        if gap > 0:
            center_position = (bank_a[i] + bank_b[i]) / 2
            total_asymmetry += abs(center_position - central_axis)
            open_count += 1

    return total_asymmetry / open_count if open_count > 0 else 0.0


def calculate_efs(area: float, perimeter: float) -> float:
    """Calculate Equivalent Field Size (EFS) using Sterling's formula."""
    if perimeter <= 0:
        return 0.0
    return (4 * area) / perimeter


def calculate_jaw_area(jaw_positions: JawPositions) -> float:
    """Calculate Jaw Area (JA) in cm².
    
    Uses absolute values for jaw opening dimensions.
    Only counts area when both jaws are actually open (non-zero difference).
    """
    width = abs(jaw_positions.x2 - jaw_positions.x1)
    height = abs(jaw_positions.y2 - jaw_positions.y1)
    
    # Return 0 if jaws are effectively closed
    if width < 0.1 or height < 0.1:
        return 0.0
    
    return (width * height) / 100  # mm² to cm²


def calculate_tongue_and_groove(
    mlc_positions: MLCLeafPositions,
    leaf_widths: List[float]
) -> float:
    """Calculate Tongue-and-Groove index (Webb 2001 / Younge 2016 -style).

    TGI = Σ_pairs (|ΔA| + |ΔB|) / Σ_pairs (gap_i + gap_{i+1})

    Removes the legacy 0.5 mm magic constant. Dimensionless, in [0, 1].
    """
    bank_a = mlc_positions.bank_a
    bank_b = mlc_positions.bank_b

    if len(bank_a) < 2 or len(bank_b) < 2:
        return 0.0

    num_pairs = min(len(bank_a), len(bank_b))
    step_sum = 0.0
    gap_sum = 0.0

    for i in range(num_pairs - 1):
        gap_current = max(0.0, bank_b[i] - bank_a[i])
        gap_next = max(0.0, bank_b[i + 1] - bank_a[i + 1])
        if gap_current <= 0 and gap_next <= 0:
            continue
        step_a = abs(bank_a[i + 1] - bank_a[i])
        step_b = abs(bank_b[i + 1] - bank_b[i])
        step_sum += step_a + step_b
        gap_sum += gap_current + gap_next

    return step_sum / gap_sum if gap_sum > 0 else 0.0


def check_small_apertures(mlc_positions: MLCLeafPositions) -> SmallApertureFlags:
    """
    Check for small apertures (for SAS calculation).
    Returns whether this control point has any gaps below each threshold.
    """
    bank_a = mlc_positions.bank_a
    bank_b = mlc_positions.bank_b
    
    min_gap = float('inf')
    
    for i in range(min(len(bank_a), len(bank_b))):
        gap = bank_b[i] - bank_a[i]
        if gap > 0 and gap < min_gap:
            min_gap = gap
    
    return SmallApertureFlags(
        below_2mm=min_gap < 2,
        below_5mm=min_gap < 5,
        below_10mm=min_gap < 10,
        below_20mm=min_gap < 20,
    )


def calculate_leaf_pair_fraction_below_threshold(mlc_positions: MLCLeafPositions, threshold_mm: float) -> float:
    """Calculate fraction of leaf pairs with gap below threshold."""
    bank_a =mlc_positions.bank_a
    bank_b = mlc_positions.bank_b
    
    if not bank_a or not bank_b:
        return 0.0
    
    count_below = 0
    for i in range(min(len(bank_a), len(bank_b))):
        gap = bank_b[i] - bank_a[i]
        if 0 < gap < threshold_mm:
            count_below += 1
    
    total_pairs = min(len(bank_a), len(bank_b))
    return count_below / total_pairs if total_pairs > 0 else 0.0


def calculate_aperture_irregularity(
    mlc_positions: MLCLeafPositions,
    leaf_widths: List[float],
    jaw_positions: JawPositions
) -> float:
    """
    Calculate Aperture Irregularity (AI) for Plan Irregularity metric.
    AI = perimeter² / (4π × area) = 1 for circle
    """
    area = calculate_aperture_area(mlc_positions, leaf_widths, jaw_positions)
    perimeter = calculate_aperture_perimeter(mlc_positions, leaf_widths, jaw_positions)
    
    if area <= 0:
        return 1.0
    
    return (perimeter * perimeter) / (4 * math.pi * area)


def calculate_lsv(mlc_positions: MLCLeafPositions, leaf_widths: List[float]) -> float:
    """
    Calculate Leaf Sequence Variability (LSV) for a control point (legacy per-CP version).
    Used for per-CP display; beam-level LSV uses the CA-based Masi formula.
    
    Returns value from 0 to 1, where 1 = perfectly uniform.
    """
    bank_a = mlc_positions.bank_a
    bank_b = mlc_positions.bank_b
    
    if len(bank_a) < 2 or len(bank_b) < 2:
        return 0.0
    
    num_pairs = min(len(bank_a), len(bank_b))
    
    # Per-CP LSV: use simplified Masi formula on all open leaves
    open_mask = [bank_b[i] - bank_a[i] > 0 for i in range(num_pairs)]
    
    lsv_a = calculate_lsv_bank(list(bank_a[:num_pairs]), open_mask)
    lsv_b = calculate_lsv_bank(list(bank_b[:num_pairs]), open_mask)
    
    # Product of banks per UCoMx Eq. (31)
    return lsv_a * lsv_b


def calculate_leaf_travel(
    prev_positions: MLCLeafPositions,
    curr_positions: MLCLeafPositions
) -> float:
    """Calculate leaf travel between two control points in mm.
    
    Sums absolute position changes for both MLC banks across all leaves.
    This is the raw per-CP leaf travel. Active leaf filtering happens
    separately at the Control Arc level for UCoMX metrics.
    """
    if len(prev_positions.bank_a) == 0 or len(curr_positions.bank_a) == 0:
        return 0.0
    
    num_pairs = min(len(prev_positions.bank_a), len(curr_positions.bank_a))
    
    total_travel = 0.0
    for i in range(num_pairs):
        total_travel += abs(curr_positions.bank_a[i] - prev_positions.bank_a[i])
        total_travel += abs(curr_positions.bank_b[i] - prev_positions.bank_b[i])
    
    return total_travel


def get_max_leaf_travel(
    prev_positions: MLCLeafPositions,
    curr_positions: MLCLeafPositions
) -> float:
    """Get maximum leaf travel between two control points."""
    if len(prev_positions.bank_a) == 0 or len(curr_positions.bank_a) == 0:
        return 0.0
    
    max_travel = 0.0
    num_pairs = min(len(prev_positions.bank_a), len(curr_positions.bank_a))
    
    for i in range(num_pairs):
        max_travel = max(max_travel, abs(curr_positions.bank_a[i] - prev_positions.bank_a[i]))
        max_travel = max(max_travel, abs(curr_positions.bank_b[i] - prev_positions.bank_b[i]))
    
    return max_travel


def calculate_control_point_metrics(
    current_cp: ControlPoint,
    previous_cp: Optional[ControlPoint],
    leaf_widths: List[float]
) -> ControlPointMetrics:
    """Calculate metrics for a single control point."""
    aperture_area = calculate_aperture_area(
        current_cp.mlc_positions,
        leaf_widths,
        current_cp.jaw_positions
    )
    
    lsv = calculate_lsv(current_cp.mlc_positions, leaf_widths)
    aperture_perimeter = calculate_aperture_perimeter(current_cp.mlc_positions, leaf_widths, current_cp.jaw_positions)
    small_aperture_flags = check_small_apertures(current_cp.mlc_positions)
    
    leaf_travel = 0.0
    # aperture_aav is filled in later (in calculate_beam_metrics) using the
    # beam-level union aperture A_max so that it matches the literature
    # definition AAV = A_cp / A_max_union (McNiven 2010, UCoMx Eq. 29–30).
    aav = 0.0

    if previous_cp:
        leaf_travel = calculate_leaf_travel(previous_cp.mlc_positions, current_cp.mlc_positions)
    
    meterset_weight = current_cp.cumulative_meterset_weight - (
        previous_cp.cumulative_meterset_weight if previous_cp else 0
    )
    
    return ControlPointMetrics(
        control_point_index=current_cp.index,
        aperture_lsv=lsv,
        aperture_aav=aav,
        aperture_area=aperture_area,
        leaf_travel=leaf_travel,
        meterset_weight=max(0, meterset_weight),
        aperture_perimeter=aperture_perimeter,
        small_aperture_flags=small_aperture_flags,
    )


def _cumulative_arc_span(beam: Beam) -> float:
    """Cumulative gantry arc span in degrees.

    Sums per-segment shortest-arc deltas between consecutive control points
    so 270° / 358° single arcs are reported accurately. Mirrors the TS
    `computeCumulativeArcSpan` and the parser's `gantry_span`.
    """
    cps = beam.control_points
    if len(cps) < 2:
        return 0.0
    total = 0.0
    for i in range(1, len(cps)):
        d = abs(cps[i].gantry_angle - cps[i - 1].gantry_angle)
        if d > 180:
            d = 360 - d
        total += d
    return total


def _estimate_beam_delivery_time(
    beam: Beam,
    control_point_metrics: List[ControlPointMetrics],
    machine_params: MachineDeliveryParams
) -> Tuple[float, str, float, float, Optional[float]]:
    """
    Estimate delivery time for a beam.

    For arcs: gantry moves continuously; time = max(MU_time, arc_time, mlc_time)
    For static: gantry doesn't move; time = max(MU_time, mlc_time)

    Arc length uses cumulative CP-by-CP shortest-arc summation so that
    >180° single arcs (e.g., 270°, 358°) are not collapsed to (360 − span).

    Returns tuple of:
        - delivery_time (seconds)
        - limiting_factor ('doseRate', 'gantrySpeed', 'mlcSpeed')
        - avg_dose_rate (MU/min)
        - avg_mlc_speed (mm/s)
        - MU_per_degree (optional)
    """
    beam_mu = beam.beam_dose or 100.0

    total_dose_time = beam_mu / (machine_params.max_dose_rate / 60)

    arc_length = _cumulative_arc_span(beam) if beam.is_arc else 0.0
    total_gantry_time = arc_length / machine_params.max_gantry_speed if arc_length > 0 else 0.0

    # MLC time gated by per-segment max single-leaf travel (slowest leaf)
    total_max_per_segment_leaf_travel = 0.0
    for i in range(1, len(beam.control_points)):
        cp = beam.control_points[i]
        prev_cp = beam.control_points[i - 1]
        total_max_per_segment_leaf_travel += get_max_leaf_travel(prev_cp.mlc_positions, cp.mlc_positions)
    total_mlc_time = (
        total_max_per_segment_leaf_travel / machine_params.max_mlc_speed
        if total_max_per_segment_leaf_travel > 0 else 0.0
    )

    delivery_time = max(total_dose_time, total_gantry_time, total_mlc_time)

    if total_dose_time >= total_gantry_time and total_dose_time >= total_mlc_time:
        limiting_factor = "doseRate"
    elif total_gantry_time >= total_mlc_time:
        limiting_factor = "gantrySpeed"
    else:
        limiting_factor = "mlcSpeed"

    avg_dose_rate = (beam_mu / delivery_time) * 60 if delivery_time > 0 else 0
    avg_mlc_speed = (
        total_max_per_segment_leaf_travel / delivery_time if delivery_time > 0 else 0
    )
    mu_per_degree: Optional[float] = beam_mu / arc_length if arc_length > 0 else None

    return (delivery_time, limiting_factor, avg_dose_rate, avg_mlc_speed, mu_per_degree)


def calculate_beam_metrics(
    beam: Beam,
    machine_params: Optional[MachineDeliveryParams] = None,
    structure: Optional[Structure] = None,
    couch_angle: float = 0.0,
) -> BeamMetrics:
    """
    Calculate comprehensive beam-level complexity metrics.
    
    Core UCoMx metrics (LSV, AAV, MCS, LT) use Control Arc (CA) midpoint
    interpolation with active leaf filtering per Cavinato et al. (Med Phys, 2024):
    - CA midpoint: MLC/jaw positions averaged between adjacent CPs
    - Active leaves: gap > plan_min_gap AND within Y-jaw
    - A_max: union/envelope aperture (per-leaf max gap summed)
    - LSV: Masi (2008) per-bank position-based formula
    - AAV: A_ca / A_max_union (McNiven 2010)
    - MCS: LSV × AAV, aggregated with Eq. 2 (MU-weighted)
    
    Additional metrics calculated:
    - Deliverability: MUCA, LTMU, LTNLMU, LNA, NL, LTAL, mDRV, GT, GS, mGSV, LS
    - Accuracy: LG, MAD, EFS, psmall
    - Geometry: PA, JA, TG
    - Modulation: PM, MD, MI
    - Beam identification: radiation_type, nominal_beam_energy, energy_label
    
    Electron beam handling:
    - Electrons use fixed applicators (not MLCs), so MLC-based metrics are set to None
    - Preserved metrics: JA, PA, beam_mu, delivery estimates, beam identification
    
    If structure is provided, also calculates BAM (Beam Aperture Modulation).
    
    Args:
        beam: Beam object with control points and MLC data
        machine_params: Machine delivery constraints (dose rate, gantry/MLC speeds)
        structure: Optional target structure for BAM calculation
        couch_angle: Patient support angle in degrees (default: 0.0)
    
    Returns:
        BeamMetrics object with all calculated metrics
    """
    if machine_params is None:
        machine_params = DEFAULT_MACHINE_PARAMS
    
    # Check if this is an electron beam
    # Electron beams use fixed applicators/tubes, not MLCs (no modulation complexity metrics)
    is_electron = beam.radiation_type and "ELECTRON" in beam.radiation_type.upper()
    
    n_pairs = beam.number_of_leaves or len(beam.mlc_leaf_widths) or 60
    leaf_bounds = get_effective_leaf_boundaries(beam)
    n_cps = len(beam.control_points)
    n_ca = n_cps - 1
    
    # ===== Per-CP metrics (for UI display and delivery time estimation) =====
    control_point_metrics: List[ControlPointMetrics] = []
    for i, cp in enumerate(beam.control_points):
        prev_cp = beam.control_points[i - 1] if i > 0 else None
        control_point_metrics.append(
            calculate_control_point_metrics(cp, prev_cp, beam.mlc_leaf_widths)
        )
    
    # ===== CA-based UCoMx metrics =====
    # For electron beams: Initialize MLC-based metrics as None (electrons use fixed applicators, not MLCs)
    if is_electron:
        # Electron beams don't have MLC-based modulation complexity metrics
        MCS = None
        LSV = None
        AAV = None
        MFA = None
        LT = None
        LTMCS = None
        LG = None
        MAD_val = None
        EFS = None
        psmall = None
        MUCA = None
        LTMU = None
        LTNLMU = None
        LNA = None
        LTAL = None
        mDRV = None
        GT = None
        GS = None
        mGSV = None
        LS = None
        
        # Initialize NL for later use
        NL = None
        
        # Initialize lists for non-MLC metrics
        plan_min_gap = 0.0
        ca_areas = []
        ca_lsvs = []
        ca_lts = []
        ca_delta_mu = []
        ca_aavs = []
        ca_mcss = []
        per_leaf_max_contrib = []
        total_active_leaf_travel = 0.0
        ca_active_leaf_count = 0
        total_area = 0.0
        total_perimeter = 0.0
        area_count = 0
        sas5_count = 0
        sas10_count = 0
        small_field_count = 0
    else:
        # Pass 1: Find min_gap across ALL CPs
        plan_min_gap = float('inf')
        for i in range(n_cps):
            bank_a = beam.control_points[i].mlc_positions.bank_a
            bank_b = beam.control_points[i].mlc_positions.bank_b
            n = min(len(bank_a), len(bank_b), n_pairs)
            for k in range(n):
                gap = bank_b[k] - bank_a[k]
                if gap < plan_min_gap:
                    plan_min_gap = gap
        if not math.isfinite(plan_min_gap) or plan_min_gap < 0:
            plan_min_gap = 0.0
        
        # Pass 2: Compute per-CA metrics with midpoint interpolation
        ca_areas: List[float] = []
        ca_lsvs: List[float] = []
        ca_lts: List[float] = []
        ca_delta_mu: List[float] = []
        per_leaf_max_contrib = [0.0] * n_pairs  # for union A_max
        total_active_leaf_travel = 0.0
        ca_active_leaf_count = 0  # for NL computation
        
        # Also accumulate per-CP-like metrics for secondary computations
        total_area = 0.0
        total_perimeter = 0.0
        area_count = 0
        sas5_count = 0
        sas10_count = 0
        small_field_count = 0
    total_jaw_area = 0.0
    weighted_pi = 0.0
    weighted_em = 0.0
    weighted_lg = 0.0
    weighted_mad = 0.0
    weighted_efs = 0.0
    weighted_tg = 0.0
    weighted_sas2 = 0.0
    weighted_sas5 = 0.0
    weighted_sas10 = 0.0
    weighted_sas20 = 0.0
    weighted_bjar = 0.0
    total_meterset_weight = 0.0
    
    for i, cpm in enumerate(control_point_metrics):
        cp = beam.control_points[i]
        weight = cpm.meterset_weight
        total_meterset_weight += weight
        
        lg = calculate_leaf_gap(cp.mlc_positions)
        mad = calculate_mad(cp.mlc_positions, cp.jaw_positions)
        perimeter = cpm.aperture_perimeter or 0
        efs = calculate_efs(cpm.aperture_area, perimeter)
        tg = calculate_tongue_and_groove(cp.mlc_positions, beam.mlc_leaf_widths)
        jaw_area = calculate_jaw_area(cp.jaw_positions)
        
        if weight > 0:
            weighted_lg += lg * weight
            weighted_mad += mad * weight
            weighted_efs += efs * weight
            weighted_tg += tg * weight
            ai = calculate_aperture_irregularity(
                cp.mlc_positions, beam.mlc_leaf_widths, cp.jaw_positions
            )
            weighted_pi += ai * weight
            # Per-CP Edge Metric: P / (2A), ComplexityCalc definition
            cp_area = cpm.aperture_area
            cp_em = perimeter / (2 * cp_area) if cp_area > 0 else 0.0
            weighted_em += cp_em * weight
        
        if cpm.aperture_area > 0:
            total_area += cpm.aperture_area
            total_perimeter += perimeter
            area_count += 1
            if cpm.aperture_area < 400:
                small_field_count += 1
        
        total_jaw_area += jaw_area
        
        # SAS: accumulate fraction of leaf pairs with gap < threshold, weighted by MU
        if weight > 0:
            sas2_frac = calculate_leaf_pair_fraction_below_threshold(cp.mlc_positions, 2.0)
            sas5_frac = calculate_leaf_pair_fraction_below_threshold(cp.mlc_positions, 5.0)
            sas10_frac = calculate_leaf_pair_fraction_below_threshold(cp.mlc_positions, 10.0)
            sas20_frac = calculate_leaf_pair_fraction_below_threshold(cp.mlc_positions, 20.0)
            weighted_sas2 += sas2_frac * weight
            weighted_sas5 += sas5_frac * weight
            weighted_sas10 += sas10_frac * weight
            weighted_sas20 += sas20_frac * weight
            # BJAR: aperture area / jaw area (both mm²), MU-weighted
            if jaw_area > 0:
                weighted_bjar += (cpm.aperture_area / jaw_area) * weight
    
    # ===== CA-based UCoMX metrics calculation - only for photon beams (electrons have no MLCs) =====
    if not is_electron and n_ca > 0:
        for j in range(n_ca):
            cp1 = beam.control_points[j]
            cp2 = beam.control_points[j + 1]
            a1 = cp1.mlc_positions.bank_a
            b1 = cp1.mlc_positions.bank_b
            a2 = cp2.mlc_positions.bank_a
            b2 = cp2.mlc_positions.bank_b
            n = min(len(a1), len(b1), len(a2), len(b2), n_pairs)
            
            # CA midpoint interpolation
            mid_a = [(a1[k] + a2[k]) / 2.0 for k in range(n)]
            mid_b = [(b1[k] + b2[k]) / 2.0 for k in range(n)]
            gaps = [mid_b[k] - mid_a[k] for k in range(n)]
            
            mid_jaw_y1 = (cp1.jaw_positions.y1 + cp2.jaw_positions.y1) / 2.0
            mid_jaw_y2 = (cp1.jaw_positions.y2 + cp2.jaw_positions.y2) / 2.0
            
            # Active leaves
            active = determine_active_leaves(gaps, leaf_bounds, mid_jaw_y1, mid_jaw_y2, plan_min_gap)
            
            # Area with Y-jaw clipping
            area = calculate_area_ca(mid_a, mid_b, leaf_bounds, mid_jaw_y1, mid_jaw_y2, active)
            ca_areas.append(area)
            
            # Track per-leaf max contribution for union A_max
            for k in range(n):
                if active[k]:
                    eff_w = max(0.0, min(leaf_bounds[k + 1], mid_jaw_y2) - max(leaf_bounds[k], mid_jaw_y1))
                    contrib = gaps[k] * eff_w
                    if contrib > per_leaf_max_contrib[k]:
                        per_leaf_max_contrib[k] = contrib
            
            # LSV per bank (Masi formula), combined as product per UCoMx Eq. (31)
            lsv_a = calculate_lsv_bank(mid_a, active)
            lsv_b = calculate_lsv_bank(mid_b, active)
            ca_lsvs.append(lsv_a * lsv_b)
            
            # Active leaf travel (between actual CPs)
            # Sum movements of active leaves only (both banks)
            lt = 0.0
            active_count = 0
            for k in range(n):
                if active[k]:
                    # Both banks contribute to leaf travel
                    lt += abs(a2[k] - a1[k])
                    lt += abs(b2[k] - b1[k])
                    active_count += 1
            ca_lts.append(lt)
            total_active_leaf_travel += lt
            ca_active_leaf_count += active_count
            
            # Delta MU
            delta_mu = cp2.cumulative_meterset_weight - cp1.cumulative_meterset_weight
            ca_delta_mu.append(max(0.0, delta_mu))
    
    # ===== Union aperture A_max =====
    a_max_union = sum(per_leaf_max_contrib) if not is_electron else 0.0
    
    # ===== Compute AAV and MCS per CA =====
    ca_aavs = [a / a_max_union if a_max_union > 0 else 0.0 for a in ca_areas]
    ca_mcss = [ca_lsvs[i] * ca_aavs[i] for i in range(len(ca_lsvs))]
    
    # ===== Aggregate: Eq. (2) MU-weighted for LSV, AAV, MCS per UCoMx manual =====
    total_delta_mu = sum(ca_delta_mu)
    if not is_electron:
        if total_delta_mu > 0:
            LSV = sum(ca_lsvs[i] * ca_delta_mu[i] for i in range(len(ca_lsvs))) / total_delta_mu
            AAV = sum(ca_aavs[i] * ca_delta_mu[i] for i in range(len(ca_aavs))) / total_delta_mu
            MCS = sum(ca_mcss[i] * ca_delta_mu[i] for i in range(len(ca_mcss))) / total_delta_mu
        else:
            LSV = sum(ca_lsvs) / n_ca if n_ca > 0 else 0.0
            AAV = sum(ca_aavs) / n_ca if n_ca > 0 else 0.0
            MCS = LSV * AAV
        
        # LT: total active leaf travel from Control Arc midpoints (active leaves only)
        # Normalize by number of leaves to get per-leaf basis
        # This represents average leaf travel distance per leaf pair
        n_leaves = beam.number_of_leaves or len(beam.mlc_leaf_widths) or 80
        LT = total_active_leaf_travel / n_leaves if n_leaves > 0 else total_active_leaf_travel
        
        # NL: 2 × mean active leaf pairs per CA (both banks)
        NL = (2.0 * ca_active_leaf_count) / n_ca if n_ca > 0 else 0.0
    
    # Secondary metrics from per-CP data
    PI = weighted_pi / total_meterset_weight if total_meterset_weight > 0 else 1.0
    LG = weighted_lg / total_meterset_weight if total_meterset_weight > 0 else 0.0
    MAD_val = weighted_mad / total_meterset_weight if total_meterset_weight > 0 else 0.0
    EFS = weighted_efs / total_meterset_weight if total_meterset_weight > 0 else 0.0
    TG = weighted_tg / total_meterset_weight if total_meterset_weight > 0 else 0.0
    
    # PM (Plan Modulation) per UCoMx Eq. (38): 1 - Σ(MU_j × A_j) / (MU_beam × A^tot)
    if not is_electron:
        if a_max_union > 0 and total_delta_mu > 0:
            PM = 1 - sum(ca_delta_mu[i] * ca_areas[i] for i in range(len(ca_areas))) / (total_delta_mu * a_max_union)
        else:
            PM = 1 - MCS
        MFA = (total_area / area_count) / 100.0 if area_count > 0 else 0.0
    else:
        PM = None
        MFA = None
    
    EM = weighted_em / total_meterset_weight if total_meterset_weight > 0 else 0.0
    PA = total_area / 100.0
    JA = total_jaw_area / 100.0  # Convert mm² to cm² (same as PA conversion)
    
    total_cps = len(control_point_metrics)
    # SAS: MU-weighted average fraction of leaf pairs (not CP count!)
    SAS2 = weighted_sas2 / total_meterset_weight if total_meterset_weight > 0 else 0.0
    SAS5 = weighted_sas5 / total_meterset_weight if total_meterset_weight > 0 else 0.0
    SAS10 = weighted_sas10 / total_meterset_weight if total_meterset_weight > 0 else 0.0
    SAS20 = weighted_sas20 / total_meterset_weight if total_meterset_weight > 0 else 0.0
    psmall = small_field_count / total_cps if total_cps > 0 else 0.0

    # BJAR: MU-weighted mean of aperture-to-jaw area ratio
    BJAR: Optional[float] = (
        weighted_bjar / total_meterset_weight if total_meterset_weight > 0 else None
    )
    # MCSv: VMAT variant of MCS — equal to our MCS by construction
    # (CA-based MU-weighted LSV·AAV product, McNiven 2010).
    MCSv: Optional[float] = MCS if not is_electron else None
    # LTNL: Leaf Travel per Leaf (no MU norm) — equal to beam LT in our normalization.
    LTNL: Optional[float] = LT if not is_electron else None
    if is_electron:
        BJAR = None

    LTMCS = MCS / (1 + math.log10(1 + LT / 1000)) if LT > 0 else MCS
    
    # Calculate arc length and gantry travel via CP-by-CP summation
    # (fixes full-arc GT=0 bug, matches TS implementation)
    total_gantry_travel = 0.0
    arc_length: Optional[float] = None
    collimator_angle_start: Optional[float] = None
    collimator_angle_end: Optional[float] = None
    
    if beam.control_points:
        collimator_angle_start = beam.control_points[0].beam_limiting_device_angle
        collimator_angle_end = beam.control_points[-1].beam_limiting_device_angle
    
    if len(beam.control_points) > 1:
        for i in range(1, len(beam.control_points)):
            delta = abs(beam.control_points[i].gantry_angle - beam.control_points[i - 1].gantry_angle)
            if delta > 180:
                delta = 360 - delta
            total_gantry_travel += delta
    
    arc_length = total_gantry_travel if beam.is_arc and total_gantry_travel > 0 else None
    
    # Estimate delivery time
    delivery_time, limiting_factor, avg_dose_rate, avg_mlc_speed, mu_per_degree = \
        _estimate_beam_delivery_time(beam, control_point_metrics, machine_params)
    
    average_gantry_speed = arc_length / delivery_time if arc_length and delivery_time > 0 else None
    
    # Calculate UCoMX deliverability metrics
    beam_mu = beam.beam_dose or 0
    num_cps = beam.number_of_control_points
    num_leaves = beam.number_of_leaves or len(beam.mlc_leaf_widths) or 60
    
    # MUCA - MU per Control Arc (NCA = NCP - 1)
    MUCA = beam_mu / n_ca if n_ca > 0 else 0
    LTMU = LT / beam_mu if beam_mu > 0 else 0
    LTNLMU = LT / (num_leaves * beam_mu) if num_leaves > 0 and beam_mu > 0 else 0
    LNA = LT / (num_leaves * num_cps) if num_leaves > 0 and num_cps > 0 else 0
    LTAL = LT / arc_length if arc_length and arc_length > 0 else None
    
    # GT - Gantry Travel (total angle traversed across all CPs)
    # GS, LS only for photon beams (electrons don't have MLCs)
    if not is_electron:
        GT = total_gantry_travel if total_gantry_travel > 0 else None
        GS = arc_length / delivery_time if arc_length and delivery_time > 0 else None
        LS = avg_mlc_speed

    
    # Calculate dose rate and gantry speed variations
    mDRV: Optional[float] = None
    mGSV: Optional[float] = None
    
    if len(beam.control_points) > 1 and delivery_time > 0:
        segment_dose_rates: List[float] = []
        segment_gantry_speeds: List[float] = []
        
        for i in range(1, len(beam.control_points)):
            cpm = control_point_metrics[i]
            segment_mu = cpm.meterset_weight * beam_mu
            gantry_diff = abs(
                beam.control_points[i].gantry_angle - 
                beam.control_points[i - 1].gantry_angle
            )
            
            avg_segment_time = delivery_time / (len(beam.control_points) - 1)
            
            if avg_segment_time > 0:
                segment_dose_rates.append((segment_mu / avg_segment_time) * 60)
                if beam.is_arc and gantry_diff > 0:
                    segment_gantry_speeds.append(gantry_diff / avg_segment_time)
        
        if len(segment_dose_rates) > 1:
            drv_sum = sum(
                abs(segment_dose_rates[i] - segment_dose_rates[i - 1])
                for i in range(1, len(segment_dose_rates))
            )
            mDRV = drv_sum / (len(segment_dose_rates) - 1)
        
        if len(segment_gantry_speeds) > 1:
            gsv_sum = sum(
                abs(segment_gantry_speeds[i] - segment_gantry_speeds[i - 1])
                for i in range(1, len(segment_gantry_speeds))
            )
            mGSV = gsv_sum / (len(segment_gantry_speeds) - 1)
    
    # MD - Modulation Degree
    MD: Optional[float] = None
    if len(control_point_metrics) > 1:
        meterset_weights = [cpm.meterset_weight for cpm in control_point_metrics]
        avg_weight = sum(meterset_weights) / len(meterset_weights)
        if avg_weight > 0:
            variance = sum((w - avg_weight) ** 2 for w in meterset_weights) / len(meterset_weights)
            MD = math.sqrt(variance) / avg_weight
    
    # MI - Modulation Index
    MI: Optional[float] = None
    if len(control_point_metrics) > 1 and LT > 0:
        normalized_lt = LT / (num_leaves * num_cps)
        MI = normalized_lt
    
    # RTSTRUCT conformality (polygon-based BEV geometry); None without a target
    BAM: Optional[float] = None
    TCOV: Optional[float] = None
    ATR: Optional[float] = None
    MARG: Optional[float] = None
    MARGMIN: Optional[float] = None
    conformality: Optional[BeamConformality] = calculate_beam_conformality(
        beam, structure, beam.source_axis_distance or DEFAULT_SAD, leaf_bounds
    )
    if conformality is not None:
        BAM = conformality.BAM
        TCOV = conformality.TCOV
        ATR = conformality.ATR
        MARG = conformality.MARG
        MARGMIN = conformality.MARGMIN
        for i, res in enumerate(conformality.per_control_point):
            if res is None or i >= len(control_point_metrics):
                continue
            cpm = control_point_metrics[i]
            cpm.PAM = res.blocked_fraction
            cpm.TCOV = res.coverage
            cpm.ATR = res.aperture_target_ratio
            cpm.MARG = res.margin_mean
            cpm.MARGMIN = res.margin_min
    
    return BeamMetrics(
        beam_number=beam.beam_number,
        beam_name=beam.beam_name,
        MCS=MCS,
        LSV=LSV,
        AAV=AAV,
        MFA=MFA,
        LT=LT,
        LTMCS=LTMCS,
        # Radiation type and energy (DICOM standard nomenclature)
        radiation_type=beam.radiation_type,
        nominal_beam_energy=beam.nominal_beam_energy,
        energy_label=beam.energy_label,
        LG=LG,
        MAD=MAD_val,
        EFS=EFS,
        psmall=psmall,
        MUCA=MUCA,
        LTMU=LTMU,
        LTNLMU=LTNLMU,
        LNA=LNA,
        NL=NL,
        LTAL=LTAL,
        mDRV=mDRV,
        GT=GT,
        GS=GS,
        mGSV=mGSV,
        LS=LS,
        PA=PA,
        JA=JA,
        PM=PM,
        TG=TG,
        MD=MD,
        MI=MI,
        MCSv=MCSv,
        BJAR=BJAR,
        LTNL=LTNL,
        beam_mu=beam_mu,
        arc_length=arc_length,
        number_of_control_points=beam.number_of_control_points,
        average_gantry_speed=average_gantry_speed,
        estimated_delivery_time=delivery_time,
        MU_per_degree=mu_per_degree,
        avg_dose_rate=avg_dose_rate,
        avg_mlc_speed=avg_mlc_speed,
        limiting_factor=limiting_factor,
        collimator_angle_start=collimator_angle_start,
        collimator_angle_end=collimator_angle_end,
        # Beam geometry (from first control point)
        gantry_angle_start=beam.gantry_angle_start,
        gantry_angle_end=beam.gantry_angle_end,
        patient_support_angle=beam.control_points[0].patient_support_angle if beam.control_points else None,
        isocenter_position=beam.control_points[0].isocenter_position if beam.control_points else None,
        table_top_vertical=beam.control_points[0].table_top_vertical if beam.control_points else None,
        table_top_longitudinal=beam.control_points[0].table_top_longitudinal if beam.control_points else None,
        table_top_lateral=beam.control_points[0].table_top_lateral if beam.control_points else None,
        SAS2=SAS2,
        SAS5=SAS5,
        SAS10=SAS10,
        SAS20=SAS20,
        EM=EM,
        PI=PI,
        BAM=BAM,
        TCOV=TCOV,
        ATR=ATR,
        MARG=MARG,
        MARGMIN=MARGMIN,
        control_point_metrics=control_point_metrics,
    )


def calculate_plan_metrics(
    plan: RTPlan,
    machine_params: Optional[MachineDeliveryParams] = None,
    structure: Optional[Structure] = None,
) -> PlanMetrics:
    """
    Calculate plan-level complexity metrics aggregated from all beams.
    
    Aggregation Methods:
    - Primary metrics (MCS, LSV, AAV, MFA): MU-weighted average (UCoMx Eq. 2)
    - LT: Additive (sum of all beam leaf travel)
    - Deliverability metrics: MU-weighted average where applicable
    - PAM: MU-weighted average of beam BAM values (if structure provided)
    
    Prescription Information:
    - Extracted from DICOM DoseReferenceSequence and FractionGroupSequence
    - Calculates MU/Gy ratio if prescribed dose available
    
    Args:
        plan: RTPlan object with beam data
        machine_params: Machine delivery constraints
        structure: Optional target structure for PAM calculation
    
    Returns:
        PlanMetrics object with aggregated metrics and beam-level breakdown
    """
    beam_metrics = [
        calculate_beam_metrics(beam, machine_params, structure)
        for beam in plan.beams
    ]
    
    n_beams = len(beam_metrics) or 1
    total_mu = sum(bm.beam_mu for bm in beam_metrics)  # actual plan MU (for output)
    weight_mu = sum((bm.beam_mu or 1) for bm in beam_metrics)  # weighting denominator (matches TS || 1)
    
    # UCoMx Eq. (2): MU-weighted for LSV, AAV
    if weight_mu > 0:
        LSV = sum(bm.LSV * (bm.beam_mu or 1) for bm in beam_metrics) / weight_mu
        AAV = sum(bm.AAV * (bm.beam_mu or 1) for bm in beam_metrics) / weight_mu
    else:
        LSV = sum(bm.LSV for bm in beam_metrics) / n_beams
        AAV = sum(bm.AAV for bm in beam_metrics) / n_beams
    
    # UCoMx Eq. (2): MU-weighted for MCS
    if weight_mu > 0:
        MCS = sum(bm.MCS * (bm.beam_mu or 1) for bm in beam_metrics) / weight_mu
        MFA = sum(bm.MFA * (bm.beam_mu or 1) for bm in beam_metrics) / weight_mu
        
        # Weight optional metrics by MU
        def weighted_avg(attr: str) -> Optional[float]:
            values = [(getattr(bm, attr), bm.beam_mu or 1) for bm in beam_metrics]
            valid = [(v, mu) for v, mu in values if v is not None]
            if not valid:
                return None
            return sum(v * mu for v, mu in valid) / sum(mu for _, mu in valid)
        
        LG = weighted_avg("LG")
        MAD = weighted_avg("MAD")
        EFS = weighted_avg("EFS")
        psmall = weighted_avg("psmall")
        MUCA = weighted_avg("MUCA")
        LTMU_plan = None  # computed as total LT / total MU below
        LTNLMU = weighted_avg("LTNLMU")
        LNA = weighted_avg("LNA")
        LTAL = weighted_avg("LTAL")
        mDRV = weighted_avg("mDRV")
        GS = weighted_avg("GS")
        mGSV = weighted_avg("mGSV")
        LS = weighted_avg("LS")
        PM = weighted_avg("PM")
        TG = weighted_avg("TG")
        MD = weighted_avg("MD")
        MI = weighted_avg("MI")
        SAS2 = weighted_avg("SAS2")
        SAS5 = weighted_avg("SAS5")
        SAS10 = weighted_avg("SAS10")
        SAS20 = weighted_avg("SAS20")
        EM = weighted_avg("EM")
        PI = weighted_avg("PI")
        PAM = weighted_avg("BAM")  # PAM is the MU-weighted average of BAM
        TCOV = weighted_avg("TCOV")
        ATR = weighted_avg("ATR")
        MARG = weighted_avg("MARG")
        margins = [bm.MARGMIN for bm in beam_metrics if bm.MARGMIN is not None]
        MARGMIN = min(margins) if margins else None
        MCSv = weighted_avg("MCSv")
        BJAR = weighted_avg("BJAR")
        LTNL = weighted_avg("LTNL")
    else:
        MCS = MFA = 0.0
        LG = MAD = EFS = psmall = None
        MUCA = LTNLMU = LNA = LTAL = mDRV = None
        GS = mGSV = LS = PM = TG = MD = MI = None
        MCSv = BJAR = LTNL = None
        SAS2 = SAS5 = SAS10 = SAS20 = EM = PI = None
        PAM = None
        TCOV = ATR = MARG = MARGMIN = None
        LTMU_plan = None
    
    # Total metrics (sum, not weighted average)
    total_lt = sum(bm.LT for bm in beam_metrics)
    total_delivery_time = sum(bm.estimated_delivery_time or 0 for bm in beam_metrics)
    total_gt = sum(bm.GT or 0 for bm in beam_metrics)
    total_pa = sum(bm.PA or 0 for bm in beam_metrics)
    total_ja = sum(bm.JA or 0 for bm in beam_metrics) if beam_metrics else 0
    
    # Plan-level LTMU = total LT / total MU
    LTMU_plan = total_lt / total_mu if total_mu > 0 else None
    
    # LTMCS for plan
    LTMCS = MCS / (1 + math.log10(1 + total_lt / 1000)) if total_lt > 0 else MCS
    
    # Plan-level MUperDegree = total MU / total gantry travel
    mu_per_degree = (
        total_mu / total_gt if total_gt > 0 else None
    )
    
    # Plan-level avgDoseRate = total MU / total delivery time (MU/min)
    avg_dose_rate = (
        (total_mu / total_delivery_time * 60) if total_delivery_time > 0 else None
    )
    
    return PlanMetrics(
        plan_label=plan.plan_label,
        MCS=MCS,
        LSV=LSV,
        AAV=AAV,
        MFA=MFA,
        LT=total_lt,
        LTMCS=LTMCS,
        total_mu=total_mu,
        prescribed_dose=plan.prescribed_dose,
        dose_per_fraction=plan.dose_per_fraction,
        number_of_fractions=plan.number_of_fractions,
        mu_per_gy=(total_mu / plan.prescribed_dose
                   if plan.prescribed_dose and total_mu > 0 else None),
        LG=LG,
        MAD=MAD,
        EFS=EFS,
        psmall=psmall,
        MUCA=MUCA,
        LTMU=LTMU_plan,
        LTNLMU=LTNLMU,
        LNA=LNA,
        LTAL=LTAL,
        mDRV=mDRV,
        GT=total_gt if total_gt > 0 else None,
        GS=GS,
        mGSV=mGSV,
        LS=LS,
        PA=total_pa if total_pa > 0 else None,
        JA=total_ja if total_ja > 0 else None,
        PM=PM,
        TG=TG,
        MD=MD,
        MI=MI,
        MCSv=MCSv,
        BJAR=BJAR,
        LTNL=LTNL,
        PMU=(plan.total_mu / plan.number_of_fractions
             if plan.number_of_fractions and plan.total_mu > 0 else None),
        MUcGy=(plan.total_mu / (plan.prescribed_dose * 100)
               if plan.prescribed_dose and plan.total_mu > 0 else None),
        total_delivery_time=total_delivery_time if total_delivery_time > 0 else None,
        SAS2=SAS2,
        SAS5=SAS5,
        SAS10=SAS10,
        SAS20=SAS20,
        EM=EM,
        PI=PI,
        PAM=PAM,
        TCOV=TCOV,
        ATR=ATR,
        MARG=MARG,
        MARGMIN=MARGMIN,
        target_structure_name=structure.name if structure is not None else None,
        mu_per_degree=mu_per_degree,
        avg_dose_rate=avg_dose_rate,
        beam_metrics=beam_metrics,
    )

# ============================================================================
# Plan Aperture Modulation (PAM) / conformality wrappers
# ============================================================================
# The geometry now lives in rtplan_complexity.conformality (polygon-based BEV
# projection with beam divergence, collimator and couch rotations). These thin
# wrappers are kept for API stability and mirror the TypeScript wrappers in
# src/lib/dicom/metrics.ts.


def project_point_to_bev(
    point_3d: Tuple[float, float, float],
    gantry_angle_deg: float,
    couch_angle_deg: float = 0.0,
    collimator_angle_deg: float = 0.0,
    isocenter: Optional[Tuple[float, float, float]] = None,
    sad: float = DEFAULT_SAD,
) -> Tuple[float, float]:
    """Project a patient point (DICOM LPS, mm) to the BEV plane at the isocentre."""
    return project_patient_point_to_bev(
        point_3d,
        gantry_angle=gantry_angle_deg,
        collimator_angle=collimator_angle_deg,
        patient_support_angle=couch_angle_deg,
        isocenter=isocenter,
        sad=sad,
    )


def contour_to_bev_polygon(
    contour_points_3d: List[Tuple[float, float, float]],
    gantry_angle_deg: float,
    couch_angle_deg: float = 0.0,
    collimator_angle_deg: float = 0.0,
    isocenter: Optional[Tuple[float, float, float]] = None,
    sad: float = DEFAULT_SAD,
) -> Optional[Polygon]:
    """Convex-hull silhouette of projected 3D contour points in the BEV/MLC frame."""
    if not contour_points_3d or len(contour_points_3d) < 3:
        return None
    from shapely.geometry import MultiPoint

    projected = [
        project_point_to_bev(
            pt, gantry_angle_deg, couch_angle_deg, collimator_angle_deg, isocenter, sad
        )
        for pt in contour_points_3d
    ]
    try:
        hull = MultiPoint(projected).convex_hull
    except Exception:
        return None
    return hull if isinstance(hull, Polygon) and hull.area > 1e-9 else None


def get_aperture_polygon(
    mlc_positions: MLCLeafPositions,
    jaw_positions: JawPositions,
    leaf_boundaries: List[float],
) -> Optional[Polygon]:
    """MLC + jaw aperture polygon for one control point (union of open leaf spans)."""
    cp = ControlPoint(
        index=0,
        gantry_angle=0.0,
        gantry_rotation_direction="NONE",
        beam_limiting_device_angle=0.0,
        cumulative_meterset_weight=0.0,
        mlc_positions=mlc_positions,
        jaw_positions=jaw_positions,
    )
    n = min(len(mlc_positions.bank_a), len(mlc_positions.bank_b))
    widths = None
    if leaf_boundaries and len(leaf_boundaries) == n + 1:
        bounds = list(leaf_boundaries)
    else:
        bounds = None
    return build_aperture_polygon(cp, bounds, widths)


def calculate_aperture_modulation(
    target_polygon: Polygon,
    aperture_polygon: Optional[Polygon],
) -> float:
    """Aperture Modulation: fraction of the projected target blocked by MLC/jaws."""
    result = compute_conformality(aperture_polygon, target_polygon)
    if result is None:
        return 0.0
    return result.blocked_fraction


def calculate_pam_control_point(
    structure: Structure,
    beam: Beam,
    cp_index: int,
    couch_angle: float = 0.0,
) -> Optional[float]:
    """Aperture Modulation at a single control point (blocked target fraction)."""
    if (
        structure is None
        or not structure.contours
        or cp_index < 0
        or cp_index >= len(beam.control_points)
    ):
        return None
    cp = beam.control_points[cp_index]
    sad = beam.source_axis_distance or DEFAULT_SAD
    target = project_target_to_bev(structure, cp, sad)
    if target is None:
        return None
    aperture = build_aperture_polygon(
        cp, get_effective_leaf_boundaries(beam), beam.mlc_leaf_widths
    )
    if aperture is None or aperture.is_empty:
        return 1.0
    result = compute_conformality(aperture, target)
    return result.blocked_fraction if result else None


def calculate_pam_beam(
    structure: Structure,
    beam: Beam,
    couch_angle: float = 0.0,
) -> Optional[float]:
    """Beam Aperture Modulation (BAM): MU-weighted mean blocked target fraction."""
    conf = calculate_beam_conformality(
        beam,
        structure,
        beam.source_axis_distance or DEFAULT_SAD,
        get_effective_leaf_boundaries(beam),
    )
    return conf.BAM if conf else None


def calculate_pam_plan(
    rtplan: RTPlan,
    structure: Optional[Structure],
) -> Optional[float]:
    """Plan Aperture Modulation (PAM): MU-weighted mean BAM across beams."""
    if not rtplan or not rtplan.beams or structure is None:
        return None
    beam_results = []
    for beam in rtplan.beams:
        conf = calculate_beam_conformality(
            beam,
            structure,
            beam.source_axis_distance or DEFAULT_SAD,
            get_effective_leaf_boundaries(beam),
        )
        beam_results.append((beam.final_cumulative_meterset_weight, conf))
    plan_conf = calculate_plan_conformality(rtplan, beam_results)
    return plan_conf.PAM if plan_conf else None
