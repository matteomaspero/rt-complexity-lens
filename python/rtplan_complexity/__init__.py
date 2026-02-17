"""
RT Plan Complexity Analyzer - Python Toolkit

Offline Python implementation of the RT Plan Complexity Analyzer metrics,
producing results identical to the web application.

Features:
- Comprehensive UCoMX-based complexity metrics (MCS, LSV, AAV, LT, etc.)
- Deliverability metrics (MUCA, LTMU, LTNLMU, LNA, NL, LTAL, mDRV, etc.)
- Target-based aperture modulation (PAM/BAM) with RTSTRUCT support
- Electron beam detection and proper handling
- Machine-specific delivery time estimation
- Batch processing and statistical analysis
- Cohort analysis with clustering

Basic Usage:
    from rtplan_complexity import parse_rtplan, calculate_plan_metrics
    
    plan = parse_rtplan("RTPLAN.dcm")
    metrics = calculate_plan_metrics(plan)
    
    print(f"MCS: {metrics.MCS:.4f}")
    print(f"LT: {metrics.LT:.1f} mm")
    print(f"Total MU: {metrics.total_mu:.1f}")

Target-Based Analysis:
    from rtplan_complexity import parse_rtplan, calculate_plan_metrics
    from rtplan_complexity.parser import parse_rtstruct, get_structure_by_name
    
    plan = parse_rtplan("RTPLAN.dcm")
    structures = parse_rtstruct("RTSTRUCT.dcm")
    target = get_structure_by_name(structures, "PTV")
    
    metrics = calculate_plan_metrics(plan, structure=target)
    print(f"PAM: {metrics.PAM:.4f}")
"""

from .types import (
    RTPlan,
    Beam,
    ControlPoint,
    MLCLeafPositions,
    JawPositions,
    FractionGroup,
    DoseReference,
    BeamMetrics,
    PlanMetrics,
    ControlPointMetrics,
    MachineDeliveryParams,
    Technique,
    ExtendedStatistics,
    BoxPlotData,
)
from .parser import parse_rtplan
from .metrics import (
    calculate_plan_metrics,
    calculate_beam_metrics,
    calculate_control_point_metrics,
)

__version__ = "1.1.0"
__all__ = [
    # Types
    "RTPlan",
    "Beam",
    "ControlPoint",
    "MLCLeafPositions",
    "JawPositions",
    "FractionGroup",
    "DoseReference",
    "BeamMetrics",
    "PlanMetrics",
    "ControlPointMetrics",
    "MachineDeliveryParams",
    "Technique",
    "ExtendedStatistics",
    "BoxPlotData",
    # Core functions
    "parse_rtplan",
    "calculate_plan_metrics",
    "calculate_beam_metrics",
    "calculate_control_point_metrics",
]
