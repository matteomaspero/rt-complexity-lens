"""
Export utilities for metrics data.

Provides CSV and JSON export functionality matching web application output.
"""

import csv
import json
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Union

from .types import PlanMetrics, BeamMetrics


def _serialize_datetime(obj):
    """JSON serializer for datetime objects."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def metrics_to_dict(metrics: PlanMetrics) -> dict:
    """Convert PlanMetrics to a dictionary, handling nested objects."""
    result = asdict(metrics)
    
    # Convert datetime objects
    if "calculation_date" in result and isinstance(result["calculation_date"], datetime):
        result["calculation_date"] = result["calculation_date"].isoformat()
    
    # Remove control_point_metrics from beam_metrics to reduce size
    for bm in result.get("beam_metrics", []):
        if "control_point_metrics" in bm:
            del bm["control_point_metrics"]
    
    return result


def metrics_to_json(
    metrics: Union[PlanMetrics, List[PlanMetrics]],
    file_path: Optional[str] = None,
    include_beam_details: bool = True
) -> str:
    """
    Export metrics to JSON format.
    
    Args:
        metrics: Single PlanMetrics or list of PlanMetrics
        file_path: Optional path to save JSON file
        include_beam_details: Whether to include per-beam breakdown
        
    Returns:
        JSON string
    """
    if isinstance(metrics, list):
        data = [metrics_to_dict(m) for m in metrics]
    else:
        data = metrics_to_dict(metrics)
    
    if not include_beam_details:
        if isinstance(data, list):
            for item in data:
                item.pop("beam_metrics", None)
        else:
            data.pop("beam_metrics", None)
    
    json_str = json.dumps(data, indent=2, default=_serialize_datetime)
    
    if file_path:
        Path(file_path).parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, "w") as f:
            f.write(json_str)
    
    return json_str


def metrics_to_csv(
    metrics: Union[PlanMetrics, List[PlanMetrics]],
    file_path: str,
    include_beam_details: bool = False
) -> None:
    """
    Export metrics to CSV format.
    
    Args:
        metrics: Single PlanMetrics or list of PlanMetrics
        file_path: Path to save CSV file
        include_beam_details: Whether to include per-beam rows
    """
    if isinstance(metrics, PlanMetrics):
        metrics_list = [metrics]
    else:
        metrics_list = metrics
    
    # Define columns for plan-level metrics
    plan_columns = [
        "plan_label",
        "MCS",
        "LSV",
        "AAV",
        "MFA",
        "LT",
        "LTMCS",
        "total_mu",
        "total_delivery_time",
        "LG",
        "MAD",
        "EFS",
        "psmall",
        "MUCA",
        "LTMU",
        "GT",
        "GS",
        "LS",
        "PA",
        "JA",
        "PM",
        "TG",
        "SAS5",
        "SAS10",
        "EM",
        "PI",
    ]
    
    # Define columns for beam-level metrics
    beam_columns = [
        "beam_number",
        "beam_name",
        "MCS",
        "LSV",
        "AAV",
        "MFA",
        "LT",
        "beam_mu",
        "arc_length",
        "number_of_control_points",
        "estimated_delivery_time",
    ]
    
    Path(file_path).parent.mkdir(parents=True, exist_ok=True)
    
    with open(file_path, "w", newline="") as f:
        if include_beam_details:
            # Write beam-level data with plan label
            writer = csv.writer(f)
            header = ["plan_label"] + beam_columns
            writer.writerow(header)
            
            for plan_metrics in metrics_list:
                for bm in plan_metrics.beam_metrics:
                    row = [plan_metrics.plan_label]
                    for col in beam_columns:
                        value = getattr(bm, col, "")
                        if value is None:
                            value = ""
                        row.append(value)
                    writer.writerow(row)
        else:
            # Write plan-level data
            writer = csv.DictWriter(f, fieldnames=plan_columns)
            writer.writeheader()
            
            for plan_metrics in metrics_list:
                row = {}
                for col in plan_columns:
                    value = getattr(plan_metrics, col, None)
                    if value is None:
                        row[col] = ""
                    else:
                        row[col] = value
                writer.writerow(row)


def batch_to_csv(
    metrics_list: List[PlanMetrics],
    file_path: str
) -> None:
    """
    Export batch metrics to CSV with summary statistics.
    
    Args:
        metrics_list: List of PlanMetrics from batch analysis
        file_path: Path to save CSV file
    """
    metrics_to_csv(metrics_list, file_path, include_beam_details=False)


def batch_to_json(
    metrics_list: List[PlanMetrics],
    file_path: str
) -> None:
    """
    Export batch metrics to JSON.
    
    Args:
        metrics_list: List of PlanMetrics from batch analysis
        file_path: Path to save JSON file
    """
    metrics_to_json(metrics_list, file_path, include_beam_details=True)
