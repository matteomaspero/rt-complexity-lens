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
    Calculate the aperture area for a given control point.
    Area is calculated as the sum of individual leaf pair openings
    weighted by their respective leaf widths.
    If jaw X limits are both 0 (e.g., Monaco with no ASYMX), no X clipping is applied.
    
    Returns area in mm².
    """
    bank_a = mlc_positions.bank_a
    bank_b = mlc_positions.bank_b
    
    if len(bank_a) == 0 or len(bank_b) == 0:
        return 0.0
    
    total_area = 0.0
    num_pairs = min(len(bank_a), len(bank_b), len(leaf_widths) if leaf_widths else len(bank_a))
    
    default_width = 5.0  # mm
    has_x_jaw = jaw_positions.x1 != 0 or jaw_positions.x2 != 0
    
    for i in range(num_pairs):
        leaf_width = leaf_widths[i] if i < len(leaf_widths) else default_width
        
        # Leaf opening = bankB - bankA (bankB is positive side)
        opening = bank_b[i] - bank_a[i]
        
        if opening > 0:
            # Clip to X-jaw if present, otherwise use full opening
            if has_x_jaw:
                effective_opening = max(0, min(opening, jaw_positions.x2 - jaw_positions.x1))
            else:
                effective_opening = opening
            total_area += effective_opening * leaf_width
    
    return total_area


def calculate_aperture_perimeter(
    mlc_positions: MLCLeafPositions,
    leaf_widths: List[float]
) -> float:
    """Calculate aperture perimeter (edge length) for Edge Metric."""
    bank_a = mlc_positions.bank_a
    bank_b = mlc_positions.bank_b
    
    if len(bank_a) < 2 or len(bank_b) < 2:
        return 0.0
    
    num_pairs = min(len(bank_a), len(bank_b))
    perimeter = 0.0
    
    for i in range(num_pairs):
        opening = bank_b[i] - bank_a[i]
        leaf_width = leaf_widths[i] if i < len(leaf_widths) else 5.0
        
        if opening > 0:
            # Add horizontal extent
            perimeter += opening * 2
            
            # Add vertical edges between adjacent open leaves
            if i > 0:
                prev_opening_a = bank_a[i] - bank_a[i - 1]
                prev_opening_b = bank_b[i] - bank_b[i - 1]
                perimeter += abs(prev_opening_a) + abs(prev_opening_b)
            
            # Add leaf width contribution
            perimeter += leaf_width * 2
    
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
    perimeter = calculate_aperture_perimeter(mlc_positions, leaf_widths)
    
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
    aperture_perimeter = calculate_aperture_perimeter(current_cp.mlc_positions, leaf_widths)
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
    machine_params: Optional[MachineDeliveryParams] = None
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
    EM = total_perimeter / total_area if total_area > 0 else 0.0
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
        control_point_metrics=control_point_metrics,
    )


def calculate_plan_metrics(
    plan: RTPlan,
    machine_params: Optional[MachineDeliveryParams] = None
) -> PlanMetrics:
    """
    Calculate plan-level UCoMX metrics.
    
    Aggregation:
    - UCoMx Eq. (2): MU-weighted for all metrics per UCoMx manual
    """
    beam_metrics = [
        calculate_beam_metrics(beam, machine_params)
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
    else:
        MCS = MFA = 0.0
        LG = MAD = EFS = psmall = None
        MUCA = LTNLMU = LNA = LTAL = mDRV = None
        GS = mGSV = LS = PM = TG = MD = MI = None
        SAS5 = SAS10 = EM = PI = None
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
        beam_metrics=beam_metrics,
    )
