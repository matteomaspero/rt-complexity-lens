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
            if prev_open:
                perimeter += (prev_b - prev_a)
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


def calculate_mad(mlc_positions: MLCLeafPositions) -> float:
    """Calculate Mean Asymmetry Distance (MAD)."""
    bank_a = mlc_positions.bank_a
    bank_b = mlc_positions.bank_b
    
    if len(bank_a) == 0 or len(bank_b) == 0:
        return 0.0
    
    total_asymmetry = 0.0
    open_count = 0
    central_axis = 0.0  # Assume isocenter at 0
    
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
    """Calculate Jaw Area (JA) in cm²."""
    width = jaw_positions.x2 - jaw_positions.x1
    height = jaw_positions.y2 - jaw_positions.y1
    return (width * height) / 100  # mm² to cm²


def calculate_tongue_and_groove(
    mlc_positions: MLCLeafPositions,
    leaf_widths: List[float]
) -> float:
    """
    Calculate Tongue-and-Groove index.
    T&G effect occurs when adjacent leaves have different positions.
    """
    bank_a = mlc_positions.bank_a
    bank_b = mlc_positions.bank_b
    
    if len(bank_a) < 2 or len(bank_b) < 2:
        return 0.0
    
    tg_exposure = 0.0
    total_area = 0.0
    num_pairs = min(len(bank_a), len(bank_b))
    
    for i in range(num_pairs - 1):
        gap_current = bank_b[i] - bank_a[i]
        gap_next = bank_b[i + 1] - bank_a[i + 1]
        leaf_width = leaf_widths[i] if i < len(leaf_widths) else 5.0
        
        if gap_current > 0:
            total_area += gap_current * leaf_width
            
            if gap_next <= 0:
                # Adjacent leaf is closed
                tg_exposure += gap_current * 0.5
            else:
                # Both open but at different positions
                position_diff_a = abs(bank_a[i + 1] - bank_a[i])
                position_diff_b = abs(bank_b[i + 1] - bank_b[i])
                tg_exposure += (position_diff_a + position_diff_b) * 0.25
    
    return tg_exposure / total_area if total_area > 0 else 0.0


def check_small_apertures(mlc_positions: MLCLeafPositions) -> SmallApertureFlags:
    """Check for small apertures (for SAS calculation)."""
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
    """Calculate leaf travel between two control points in mm."""
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
    aav = 0.0
    
    if previous_cp:
        leaf_travel = calculate_leaf_travel(previous_cp.mlc_positions, current_cp.mlc_positions)
        
        prev_area = calculate_aperture_area(
            previous_cp.mlc_positions,
            leaf_widths,
            previous_cp.jaw_positions
        )
        
        # AAV: relative change in aperture area
        if prev_area > 0:
            aav = abs(aperture_area - prev_area) / prev_area
    
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


def _estimate_beam_delivery_time(
    beam: Beam,
    control_point_metrics: List[ControlPointMetrics],
    machine_params: MachineDeliveryParams
) -> Tuple[float, str, float, float, Optional[float]]:
    """
    Estimate delivery time for a beam.
    
    Returns tuple of:
        - delivery_time (seconds)
        - limiting_factor ('doseRate', 'gantrySpeed', 'mlcSpeed')
        - avg_dose_rate (MU/min)
        - avg_mlc_speed (mm/s)
        - MU_per_degree (optional)
    """
    total_time = 0.0
    dose_rate_limited_time = 0.0
    gantry_limited_time = 0.0
    mlc_limited_time = 0.0
    
    beam_mu = beam.beam_dose or 100.0
    
    for i in range(1, len(beam.control_points)):
        cp = beam.control_points[i]
        prev_cp = beam.control_points[i - 1]
        cpm = control_point_metrics[i]
        
        # MU for this segment
        segment_mu = cpm.meterset_weight * beam_mu
        
        # Time limited by dose rate
        dose_rate_time = segment_mu / (machine_params.max_dose_rate / 60)
        
        # Time limited by gantry speed (for arcs)
        gantry_angle_diff = abs(cp.gantry_angle - prev_cp.gantry_angle)
        gantry_time = gantry_angle_diff / machine_params.max_gantry_speed if beam.is_arc else 0
        
        # Time limited by MLC speed
        max_leaf_travel = get_max_leaf_travel(prev_cp.mlc_positions, cp.mlc_positions)
        mlc_time = max_leaf_travel / machine_params.max_mlc_speed
        
        # The limiting factor determines actual time
        segment_time = max(dose_rate_time, gantry_time, mlc_time)
        total_time += segment_time
        
        if dose_rate_time >= gantry_time and dose_rate_time >= mlc_time:
            dose_rate_limited_time += segment_time
        elif gantry_time >= mlc_time:
            gantry_limited_time += segment_time
        else:
            mlc_limited_time += segment_time
    
    # Determine overall limiting factor
    if dose_rate_limited_time >= gantry_limited_time and dose_rate_limited_time >= mlc_limited_time:
        limiting_factor = "doseRate"
    elif gantry_limited_time >= mlc_limited_time:
        limiting_factor = "gantrySpeed"
    else:
        limiting_factor = "mlcSpeed"
    
    # Calculate average rates
    avg_dose_rate = (beam_mu / total_time) * 60 if total_time > 0 else 0
    total_leaf_travel = sum(cpm.leaf_travel for cpm in control_point_metrics)
    avg_mlc_speed = total_leaf_travel / total_time / beam.number_of_leaves if total_time > 0 else 0
    
    # MU per degree for arcs
    mu_per_degree: Optional[float] = None
    if beam.is_arc:
        arc_length = abs(beam.gantry_angle_end - beam.gantry_angle_start)
        if arc_length > 0:
            mu_per_degree = beam_mu / arc_length
    
    return (total_time, limiting_factor, avg_dose_rate, avg_mlc_speed, mu_per_degree)


def calculate_beam_metrics(
    beam: Beam,
    machine_params: Optional[MachineDeliveryParams] = None,
    structure: Optional[Structure] = None,
    couch_angle: float = 0.0,
) -> BeamMetrics:
    """
    Calculate beam-level UCoMX metrics using CA midpoint interpolation.
    
    Core UCoMx metrics (LSV, AAV, MCS, LT) use Control Arc (CA) midpoint
    interpolation with active leaf filtering per Cavinato et al. (Med Phys, 2024):
    - CA midpoint: MLC/jaw positions averaged between adjacent CPs
    - Active leaves: gap > plan_min_gap AND within Y-jaw
    - A_max: union/envelope aperture (per-leaf max gap summed)
    - LSV: Masi (2008) per-bank position-based formula
    - AAV: A_ca / A_max_union (McNiven 2010)
    - MCS: LSV × AAV, aggregated with Eq. 2 (MU-weighted)
    
    If structure is provided, also calculates BAM (Beam Aperture Modulation).
    """
    if machine_params is None:
        machine_params = DEFAULT_MACHINE_PARAMS
    
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
    total_meterset_weight = 0.0
    
    for i, cpm in enumerate(control_point_metrics):
        cp = beam.control_points[i]
        weight = cpm.meterset_weight
        total_meterset_weight += weight
        
        lg = calculate_leaf_gap(cp.mlc_positions)
        mad = calculate_mad(cp.mlc_positions)
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
        
        if cpm.small_aperture_flags:
            if cpm.small_aperture_flags.below_5mm:
                sas5_count += 1
            if cpm.small_aperture_flags.below_10mm:
                sas10_count += 1
    
    if n_ca > 0:
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
            lt = 0.0
            active_count = 0
            for k in range(n):
                if active[k]:
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
    a_max_union = sum(per_leaf_max_contrib)
    
    # ===== Compute AAV and MCS per CA =====
    ca_aavs = [a / a_max_union if a_max_union > 0 else 0.0 for a in ca_areas]
    ca_mcss = [ca_lsvs[i] * ca_aavs[i] for i in range(len(ca_lsvs))]
    
    # ===== Aggregate: Eq. (2) MU-weighted for LSV, AAV, MCS per UCoMx manual =====
    total_delta_mu = sum(ca_delta_mu)
    if total_delta_mu > 0:
        LSV = sum(ca_lsvs[i] * ca_delta_mu[i] for i in range(len(ca_lsvs))) / total_delta_mu
        AAV = sum(ca_aavs[i] * ca_delta_mu[i] for i in range(len(ca_aavs))) / total_delta_mu
        MCS = sum(ca_mcss[i] * ca_delta_mu[i] for i in range(len(ca_mcss))) / total_delta_mu
    else:
        LSV = sum(ca_lsvs) / n_ca if n_ca > 0 else 0.0
        AAV = sum(ca_aavs) / n_ca if n_ca > 0 else 0.0
        MCS = LSV * AAV
    
    # LT: total active leaf travel
    LT = total_active_leaf_travel
    
    # NL: 2 × mean active leaf pairs per CA (both banks)
    NL = (2.0 * ca_active_leaf_count) / n_ca if n_ca > 0 else 0.0
    
    # Secondary metrics from per-CP data
    PI = weighted_pi / total_meterset_weight if total_meterset_weight > 0 else 1.0
    LG = weighted_lg / total_meterset_weight if total_meterset_weight > 0 else 0.0
    MAD_val = weighted_mad / total_meterset_weight if total_meterset_weight > 0 else 0.0
    EFS = weighted_efs / total_meterset_weight if total_meterset_weight > 0 else 0.0
    TG = weighted_tg / total_meterset_weight if total_meterset_weight > 0 else 0.0
    
    # PM (Plan Modulation) per UCoMx Eq. (38): 1 - Σ(MU_j × A_j) / (MU_beam × A^tot)
    if a_max_union > 0 and total_delta_mu > 0:
        PM = 1 - sum(ca_delta_mu[i] * ca_areas[i] for i in range(len(ca_areas))) / (total_delta_mu * a_max_union)
    else:
        PM = 1 - MCS
    MFA = (total_area / area_count) / 100.0 if area_count > 0 else 0.0
    EM = weighted_em / total_meterset_weight if total_meterset_weight > 0 else 0.0
    PA = total_area / 100.0
    JA = total_jaw_area / area_count if area_count > 0 else 0.0
    
    total_cps = len(control_point_metrics)
    SAS5 = sas5_count / total_cps if total_cps > 0 else 0.0
    SAS10 = sas10_count / total_cps if total_cps > 0 else 0.0
    psmall = small_field_count / total_cps if total_cps > 0 else 0.0
    
    LTMCS = MCS / (1 + math.log10(1 + LT / 1000)) if LT > 0 else MCS
    
    # Arc length and collimator angles
    arc_length: Optional[float] = None
    collimator_angle_start: Optional[float] = None
    collimator_angle_end: Optional[float] = None
    
    if beam.control_points:
        collimator_angle_start = beam.control_points[0].beam_limiting_device_angle
        collimator_angle_end = beam.control_points[-1].beam_limiting_device_angle
    
    if beam.is_arc and len(beam.control_points) > 1:
        arc_length = abs(beam.gantry_angle_end - beam.gantry_angle_start)
        if arc_length > 180:
            arc_length = 360 - arc_length
    
    # Estimate delivery time
    delivery_time, limiting_factor, avg_dose_rate, avg_mlc_speed, mu_per_degree = \
        _estimate_beam_delivery_time(beam, control_point_metrics, machine_params)
    
    average_gantry_speed = arc_length / delivery_time if arc_length and delivery_time > 0 else None
    
    # Calculate UCoMX deliverability metrics
    beam_mu = beam.beam_dose or 0
    num_cps = beam.number_of_control_points
    num_leaves = beam.number_of_leaves or 60
    
    # MUCA - MU per Control Arc (NCA = NCP - 1)
    MUCA = beam_mu / n_ca if n_ca > 0 else 0
    LTMU = LT / beam_mu if beam_mu > 0 else 0
    LTNLMU = LT / (num_leaves * beam_mu) if num_leaves > 0 and beam_mu > 0 else 0
    LNA = LT / (num_leaves * num_cps) if num_leaves > 0 and num_cps > 0 else 0
    LTAL = LT / arc_length if arc_length and arc_length > 0 else None
    
    GT = arc_length
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
    
    # BAM - Beam Aperture Modulation (if structure provided)
    BAM: Optional[float] = None
    if structure is not None:
        BAM = calculate_pam_beam(structure, beam, couch_angle)
    
    return BeamMetrics(
        beam_number=beam.beam_number,
        beam_name=beam.beam_name,
        MCS=MCS,
        LSV=LSV,
        AAV=AAV,
        MFA=MFA,
        LT=LT,
        LTMCS=LTMCS,
        LG=LG,
        MAD=MAD_val,
        EFS=EFS,
        psmall=psmall,
        MUCA=MUCA,
        LTMU=LTMU,
        LTNLMU=LTNLMU,
        LNA=LNA,
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
        SAS5=SAS5,
        SAS10=SAS10,
        EM=EM,
        PI=PI,
        BAM=BAM,
        control_point_metrics=control_point_metrics,
    )


def calculate_plan_metrics(
    plan: RTPlan,
    machine_params: Optional[MachineDeliveryParams] = None,
    structure: Optional[Structure] = None,
) -> PlanMetrics:
    """
    Calculate plan-level UCoMX metrics.
    
    Aggregation:
    - UCoMx Eq. (2): MU-weighted for all metrics per UCoMx manual
    - PAM: Plan Aperture Modulation (if structure provided)
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
        SAS5 = weighted_avg("SAS5")
        SAS10 = weighted_avg("SAS10")
        EM = weighted_avg("EM")
        PI = weighted_avg("PI")
        PAM = weighted_avg("BAM")  # PAM is the MU-weighted average of BAM
    else:
        MCS = MFA = 0.0
        LG = MAD = EFS = psmall = None
        MUCA = LTNLMU = LNA = LTAL = mDRV = None
        GS = mGSV = LS = PM = TG = MD = MI = None
        SAS5 = SAS10 = EM = PI = None
        PAM = None
        LTMU_plan = None
    
    # Total metrics (sum, not weighted average)
    total_lt = sum(bm.LT for bm in beam_metrics)
    total_delivery_time = sum(bm.estimated_delivery_time or 0 for bm in beam_metrics)
    total_gt = sum(bm.GT or 0 for bm in beam_metrics)
    total_pa = sum(bm.PA or 0 for bm in beam_metrics)
    total_ja = sum(bm.JA or 0 for bm in beam_metrics) / n_beams if beam_metrics else 0
    
    # Plan-level LTMU = total LT / total MU
    LTMU_plan = total_lt / total_mu if total_mu > 0 else None
    
    # LTMCS for plan
    LTMCS = MCS / (1 + math.log10(1 + total_lt / 1000)) if total_lt > 0 else MCS
    
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
        total_delivery_time=total_delivery_time if total_delivery_time > 0 else None,
        SAS5=SAS5,
        SAS10=SAS10,
        EM=EM,
        PI=PI,
        PAM=PAM,
        beam_metrics=beam_metrics,
    )


# ============================================================================
# Plan Aperture Modulation (PAM) Functions
# ============================================================================

def project_point_to_bev(
    point_3d: Tuple[float, float, float],
    gantry_angle_deg: float,
    couch_angle_deg: float = 0.0,
) -> Tuple[float, float]:
    """
    Project a 3D patient point to the 2D Beam's Eye View (BEV) plane.
    
    The BEV coordinate system is defined with origin at isocenter:
    - X-axis (horizontal): perpendicular to gantry rotation, positive to right
    - Y-axis (vertical): along gantry rotation axis, positive up
    - Z-axis (along beam): positive from target toward gantry
    
    Args:
        point_3d: (x, y, z) patient coordinates (mm), at isocenter z=0
        gantry_angle_deg: Gantry angle in degrees (0-360)
        couch_angle_deg: Couch angle in degrees (not yet implemented)
    
    Returns:
        (x_bev, y_bev): 2D BEV coordinates in mm
    """
    x, y, z = point_3d
    
    # Convert angles to radians
    gantry_rad = math.radians(gantry_angle_deg)
    
    # Rotate around Y-axis by gantry angle (BEV projection plane is perpendicular to beam)
    # After rotation: X stays same (horizontal), Y stays same (vertical)
    # Z component maps to BEV X (depth direction)
    x_bev = z * math.sin(gantry_rad) + x * math.cos(gantry_rad)
    y_bev = y
    
    return (x_bev, y_bev)


def contour_to_bev_polygon(
    contour_points_3d: List[Tuple[float, float, float]],
    gantry_angle_deg: float,
    couch_angle_deg: float = 0.0,
) -> Optional[Polygon]:
    """
    Convert a 3D contour to a 2D BEV Polygon.
    
    Projects all 3D contour points to BEV plane and creates a 2D polygon.
    Handles degenerate cases (collinear points, empty contours).
    
    Args:
        contour_points_3d: List of (x, y, z) points in patient coordinates
        gantry_angle_deg: Gantry angle in degrees
        couch_angle_deg: Couch angle in degrees
    
    Returns:
        Shapely Polygon if valid, None if contour is degenerate
    """
    if not contour_points_3d or len(contour_points_3d) < 3:
        return None
    
    # Project all points to BEV
    bev_points = [
        project_point_to_bev(pt, gantry_angle_deg, couch_angle_deg)
        for pt in contour_points_3d
    ]
    
    try:
        # Create polygon (Shapely automatically handles orientation)
        poly = Polygon(bev_points)
        
        # Check if valid
        if not poly.is_valid:
            # Try to fix with buffer(0) convex hull
            poly = poly.convex_hull
        
        # Return only if it's a valid polygon with area
        if isinstance(poly, Polygon) and poly.area > 1e-6:
            return poly
    except Exception:
        pass
    
    return None


def get_aperture_polygon(
    mlc_positions: MLCLeafPositions,
    jaw_positions: JawPositions,
    leaf_boundaries: List[float],
) -> Optional[Polygon]:
    """
    Create a 2D aperture polygon from MLC and jaw positions in BEV.
    
    The aperture defines the opening where radiation passes through.
    Each leaf pair contributes a rectangular opening between its bank_a and bank_b positions.
    The aperture is further clipped by jaw positions.
    
    Args:
        mlc_positions: MLC leaf positions for both banks
        jaw_positions: X and Y jaw positions
        leaf_boundaries: Leaf Y-boundaries (N+1 values for N leaf pairs)
    
    Returns:
        Shapely Polygon representing aperture, or None if aperture is empty
    """
    try:
        # X-axis aperture: between jaw_x1 and jaw_x2
        x_min = jaw_positions.x1
        x_max = jaw_positions.x2
        
        # Y-axis aperture: between jaw_y1 and jaw_y2
        y_min = jaw_positions.y1
        y_max = jaw_positions.y2
        
        # Collect all aperture rectangles from active leaves
        aperture_rects = []
        n_pairs = min(len(mlc_positions.bank_a), len(mlc_positions.bank_b), len(leaf_boundaries) - 1)
        
        for k in range(n_pairs):
            y_lower = leaf_boundaries[k]
            y_upper = leaf_boundaries[k + 1]
            
            # Skip leaves fully outside jaw opening
            if y_upper < y_min or y_lower > y_max:
                continue
            
            # Clip leaf opening to jaw Y boundaries
            y_lower_clipped = max(y_lower, y_min)
            y_upper_clipped = min(y_upper, y_max)
            
            # Leaf opening in X direction
            x_left = mlc_positions.bank_a[k]
            x_right = mlc_positions.bank_b[k]
            
            # Clip to jaw X boundaries
            x_left_clipped = max(x_left, x_min)
            x_right_clipped = min(x_right, x_max)
            
            # If valid opening, add rectangle
            if x_left_clipped < x_right_clipped and y_lower_clipped < y_upper_clipped:
                rect = Polygon([
                    (x_left_clipped, y_lower_clipped),
                    (x_right_clipped, y_lower_clipped),
                    (x_right_clipped, y_upper_clipped),
                    (x_left_clipped, y_upper_clipped),
                ])
                aperture_rects.append(rect)
        
        if not aperture_rects:
            return None
        
        # Union all rectangles into single aperture polygon
        if len(aperture_rects) == 1:
            aperture_poly = aperture_rects[0]
        else:
            aperture_poly = unary_union(aperture_rects)
        
        return aperture_poly if isinstance(aperture_poly, Polygon) else None
    
    except Exception:
        return None


def calculate_aperture_modulation(
    target_polygon: Polygon,
    aperture_polygon: Polygon,
) -> float:
    """
    Calculate Aperture Modulation (AM) as the ratio of blocked target area to total target area.
    
    AM = (Target area outside aperture) / (Total target area)
    
    Ranges from 0 (target fully within aperture) to 1 (target fully blocked).
    
    Args:
        target_polygon: 2D target projection polygon in BEV
        aperture_polygon: 2D aperture polygon in BEV
    
    Returns:
        AM value in [0, 1]
    """
    if not target_polygon.is_valid or target_polygon.area < 1e-6:
        return 0.0
    
    if not aperture_polygon.is_valid or aperture_polygon.area < 1e-6:
        # Aperture is empty, entire target is blocked
        return 1.0
    
    # Calculate blocked area = target - (target AND aperture)
    intersection = target_polygon.intersection(aperture_polygon)
    unblocked_area = intersection.area
    total_area = target_polygon.area
    
    am = 1.0 - (unblocked_area / total_area) if total_area > 0 else 1.0
    
    # Clamp to [0, 1]
    return max(0.0, min(1.0, am))


def calculate_pam_control_point(
    structure: Structure,
    beam: Beam,
    cp_index: int,
    couch_angle: float = 0.0,
) -> Optional[float]:
    """
    Calculate Aperture Modulation (AM) at a single control point.
    
    This is the per-control-point aperture modulation, before MU-weighting.
    
    Args:
        structure: Target structure with 3D contours
        beam: Beam containing control point
        cp_index: Index of control point in beam.control_points
        couch_angle: Couch angle in degrees
    
    Returns:
        AM value in [0, 1], or None if calculation fails
    """
    if not structure or not structure.contours or cp_index < 0 or cp_index >= len(beam.control_points):
        return None
    
    cp = beam.control_points[cp_index]
    
    # Get all contour points from structure
    all_contour_points = structure.get_all_points()
    if not all_contour_points or len(all_contour_points) < 3:
        return None
    
    # Create target projection polygon
    target_poly = contour_to_bev_polygon(all_contour_points, cp.gantry_angle, couch_angle)
    if not target_poly or target_poly.area < 1e-6:
        return None
    
    # Create aperture polygon
    leaf_boundaries = get_effective_leaf_boundaries(beam)
    aperture_poly = get_aperture_polygon(cp.mlc_positions, cp.jaw_positions, leaf_boundaries)
    if not aperture_poly:
        # No aperture opening = fully blocked
        return 1.0
    
    # Calculate AM
    am = calculate_aperture_modulation(target_poly, aperture_poly)
    return am


def calculate_pam_beam(
    structure: Structure,
    beam: Beam,
    couch_angle: float = 0.0,
) -> Optional[float]:
    """
    Calculate Beam Aperture Modulation (BAM) for a single beam.
    
    BAM is the MU-weighted average of AM across all control points in the beam.
    This follows the existing CA (Control Arc) midpoint interpolation pattern
    used for other beam metrics.
    
    Args:
        structure: Target structure
        beam: Beam to analyze
        couch_angle: Couch angle in degrees
    
    Returns:
        BAM value in [0, 1], or None if calculation fails
    """
    if not structure or not beam.control_points or len(beam.control_points) < 2:
        return None
    
    cps = beam.control_points
    n_cps = len(cps)
    
    # Calculate AM for each control point and accumulate weighted sum
    total_weighted_am = 0.0
    total_mu = 0.0
    
    for i in range(n_cps):
        am = calculate_pam_control_point(structure, beam, i, couch_angle)
        if am is None:
            continue
        
        # Get MU weight for this control point
        # Use difference from previous CP (except for first CP which uses its own weight)
        if i == 0:
            delta_mu = cps[i].cumulative_meterset_weight
        else:
            delta_mu = cps[i].cumulative_meterset_weight - cps[i - 1].cumulative_meterset_weight
        
        total_weighted_am += am * delta_mu
        total_mu += delta_mu
    
    if total_mu > 1e-6:
        bam = total_weighted_am / total_mu
        return max(0.0, min(1.0, bam))
    
    return None


def calculate_pam_plan(
    rtplan: RTPlan,
    structure: Structure,
) -> Optional[float]:
    """
    Calculate Plan Aperture Modulation (PAM) for the entire treatment plan.
    
    PAM is the MU-weighted average of BAM across all beams.
    This represents the average fraction of target projection that is blocked
    by MLC/jaws across the entire plan.
    
    Args:
        rtplan: Complete RT plan
        structure: Target structure
    
    Returns:
        PAM value in [0, 1], or None if calculation fails
    """
    if not rtplan or not rtplan.beams or not structure:
        return None
    
    total_weighted_pam = 0.0
    total_mu = 0.0
    
    for beam in rtplan.beams:
        bam = calculate_pam_beam(structure, beam)
        if bam is None:
            continue
        
        # Get total MU for this beam
        beam_mu = beam.final_cumulative_meterset_weight
        
        total_weighted_pam += bam * beam_mu
        total_mu += beam_mu
    
    if total_mu > 1e-6:
        pam = total_weighted_pam / total_mu
        return max(0.0, min(1.0, pam))
    
    return None

