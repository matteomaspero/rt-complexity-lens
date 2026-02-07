"""
RT Plan Complexity Analyzer - Python Toolkit

Offline Python implementation of the RT Plan Complexity Analyzer metrics,
producing results identical to the web application.

Usage:
    from rtplan_complexity import parse_rtplan, calculate_plan_metrics
    
    plan = parse_rtplan("RTPLAN.dcm")
    metrics = calculate_plan_metrics(plan)
    
    print(f"MCS: {metrics.MCS:.4f}")
"""

from .types import (
    RTPlan,
    Beam,
    ControlPoint,
    MLCLeafPositions,
    JawPositions,
    FractionGroup,
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

__version__ = "1.0.0"
__all__ = [
    # Types
    "RTPlan",
    "Beam",
    "ControlPoint",
    "MLCLeafPositions",
    "JawPositions",
    "FractionGroup",
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
