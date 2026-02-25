"""
Export utilities for metrics data.

Provides CSV and JSON export functionality matching the TypeScript web application
output format (src/lib/export-utils.ts). Uses a two-row header CSV with category
labels, plan-total + per-beam rows, and comprehensive column coverage.
"""

import csv
import json
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

from .types import RTPlan, PlanMetrics, BeamMetrics


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize_datetime(obj):
    """JSON serializer for datetime objects."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def _fmt_num(value, decimals: int) -> str:
    """Format a number to fixed decimal places, or empty string if None/NaN."""
    if value is None:
        return ""
    try:
        v = float(value)
        if v != v:  # NaN check
            return ""
        return f"{v:.{decimals}f}"
    except (TypeError, ValueError):
        return ""


def _escape_csv(value) -> str:
    """Escape a value for CSV output."""
    if value is None:
        return ""
    s = str(value)
    if "," in s or '"' in s or "\n" in s:
        return f'"{s.replace(chr(34), chr(34)+chr(34))}"'
    return s


def _get_dominant_radiation_type(plan: RTPlan) -> str:
    """Get dominant radiation type across beams."""
    if not plan.beams:
        return ""
    types = set(b.radiation_type for b in plan.beams if b.radiation_type)
    if len(types) == 0:
        return ""
    if len(types) == 1:
        return types.pop()
    return "Mixed"


def _get_dominant_energy(plan: RTPlan) -> str:
    """Get dominant energy label across beams."""
    if not plan.beams:
        return ""
    labels = set(b.energy_label for b in plan.beams if b.energy_label)
    if len(labels) == 1:
        return labels.pop()
    if len(labels) > 1:
        return "Mixed"
    energies = set(b.nominal_beam_energy for b in plan.beams if b.nominal_beam_energy is not None)
    if len(energies) == 1:
        return f"{energies.pop()} MeV"
    if len(energies) > 1:
        return "Mixed"
    return ""


def _format_isocenter(bm: BeamMetrics) -> str:
    """Format isocenter position as string."""
    if not bm.isocenter_position:
        return ""
    x, y, z = bm.isocenter_position
    return f"{x:.1f} {y:.1f} {z:.1f}"


def _format_table_pos(bm: BeamMetrics) -> str:
    """Format table position (V, L, Lat) as string."""
    parts = []
    if bm.table_top_vertical is not None:
        parts.append(f"{bm.table_top_vertical:.1f}")
    if bm.table_top_longitudinal is not None:
        parts.append(f"{bm.table_top_longitudinal:.1f}")
    if bm.table_top_lateral is not None:
        parts.append(f"{bm.table_top_lateral:.1f}")
    return " ".join(parts) if parts else ""


# ---------------------------------------------------------------------------
# Column Definitions — mirrors TS PLAN_COLUMNS in src/lib/export-utils.ts
# ---------------------------------------------------------------------------

class ColumnDef:
    """Column definition for CSV/JSON export."""

    def __init__(
        self,
        key: str,
        header: str,
        category: str,
        decimals: int,
        extract_plan: Callable,
        extract_beam: Optional[Callable] = None,
        beam_only: bool = False,
        plan_only: bool = False,
    ):
        self.key = key
        self.header = header
        self.category = category
        self.decimals = decimals
        self.extract_plan = extract_plan
        self.extract_beam = extract_beam
        self.beam_only = beam_only
        self.plan_only = plan_only


def _metric_val(metrics: PlanMetrics, key: str):
    """Get a metric value from PlanMetrics by name."""
    return getattr(metrics, key, None)


def _beam_metric_val(bm: BeamMetrics, key: str):
    """Get a metric value from BeamMetrics by name."""
    return getattr(bm, key, None)


def _build_columns(plan: RTPlan, metrics: PlanMetrics) -> List[ColumnDef]:
    """
    Build the full column list matching the TS export-utils.ts PLAN_COLUMNS.
    Each column knows how to extract its value from plan-level or beam-level data.
    """
    def _avg_dose_rate(m: PlanMetrics):
        rates = [b.avg_dose_rate for b in m.beam_metrics if b.avg_dose_rate is not None]
        return sum(rates) / len(rates) if rates else None

    return [
        # ── Plan Info ──
        ColumnDef("fileName", "File", "Plan Info", 0,
                  lambda p, m: None,  # Filled by caller
                  lambda bm: None),
        ColumnDef("patientId", "Patient ID", "Plan Info", 0,
                  lambda p, m: p.patient_id,
                  lambda bm: None),
        ColumnDef("patientName", "Patient Name", "Plan Info", 0,
                  lambda p, m: p.patient_name,
                  lambda bm: None),
        ColumnDef("planLabel", "Plan Label", "Plan Info", 0,
                  lambda p, m: p.plan_label,
                  lambda bm: None),
        ColumnDef("technique", "Technique", "Plan Info", 0,
                  lambda p, m: p.technique.value if hasattr(p.technique, 'value') else str(p.technique),
                  lambda bm: None),
        ColumnDef("beamCount", "Beam Count", "Plan Info", 0,
                  lambda p, m: len(p.beams) if p.beams else 0,
                  lambda bm: None),
        ColumnDef("cpCount", "CP Count", "Plan Info", 0,
                  lambda p, m: sum(b.number_of_control_points or 0 for b in p.beams) if p.beams else 0,
                  lambda bm: bm.number_of_control_points),
        ColumnDef("radiationType", "Radiation Type", "Plan Info", 0,
                  lambda p, m: _get_dominant_radiation_type(p),
                  lambda bm: bm.radiation_type or ""),
        ColumnDef("energy", "Energy", "Plan Info", 0,
                  lambda p, m: _get_dominant_energy(p),
                  lambda bm: bm.energy_label or (f"{bm.nominal_beam_energy} MeV" if bm.nominal_beam_energy else "")),
        ColumnDef("machine", "Machine", "Plan Info", 0,
                  lambda p, m: p.treatment_machine_name or "",
                  lambda bm: None),
        ColumnDef("institution", "Institution", "Plan Info", 0,
                  lambda p, m: p.institution_name or "",
                  lambda bm: None),

        # ── Row Identifiers ──
        ColumnDef("beam", "Beam", "Row", 0,
                  lambda p, m: "ALL",
                  lambda bm: f"{bm.beam_number}-{bm.beam_name}"),
        ColumnDef("level", "Level", "Row", 0,
                  lambda p, m: "Plan",
                  lambda bm: "Beam"),

        # ── Beam Geometry (beam-only) ──
        ColumnDef("gantryRange", "Gantry Range", "Beam Geometry", 0,
                  lambda p, m: None,
                  lambda bm: (f"{bm.gantry_angle_start:.1f}→{bm.gantry_angle_end:.1f}"
                              if bm.gantry_angle_start is not None and bm.gantry_angle_end is not None
                              else ""),
                  beam_only=True),
        ColumnDef("collimator", "Collimator (°)", "Beam Geometry", 1,
                  lambda p, m: None,
                  lambda bm: bm.collimator_angle_start,
                  beam_only=True),
        ColumnDef("tableAngle", "Table Angle (°)", "Beam Geometry", 1,
                  lambda p, m: None,
                  lambda bm: bm.patient_support_angle,
                  beam_only=True),
        ColumnDef("isocenter", "Isocenter (mm)", "Beam Geometry", 0,
                  lambda p, m: None,
                  lambda bm: _format_isocenter(bm),
                  beam_only=True),
        ColumnDef("tablePosition", "Table Position (V,L,Lat)", "Beam Geometry", 0,
                  lambda p, m: None,
                  lambda bm: _format_table_pos(bm),
                  beam_only=True),

        # ── Prescription (plan-only) ──
        ColumnDef("prescribedDose", "Rx Dose (Gy)", "Prescription", 2,
                  lambda p, m: m.prescribed_dose,
                  lambda bm: None, plan_only=True),
        ColumnDef("dosePerFraction", "Dose/Fx (Gy)", "Prescription", 2,
                  lambda p, m: m.dose_per_fraction,
                  lambda bm: None, plan_only=True),
        ColumnDef("numberOfFractions", "Fractions", "Prescription", 0,
                  lambda p, m: m.number_of_fractions,
                  lambda bm: None, plan_only=True),
        ColumnDef("MUperGy", "MU/Gy", "Prescription", 1,
                  lambda p, m: m.mu_per_gy,
                  lambda bm: None, plan_only=True),

        # ── Delivery ──
        ColumnDef("totalMU", "Total MU", "Delivery", 1,
                  lambda p, m: m.total_mu,
                  lambda bm: bm.beam_mu),
        ColumnDef("totalDeliveryTime", "Delivery Time (s)", "Delivery", 1,
                  lambda p, m: m.total_delivery_time,
                  lambda bm: bm.estimated_delivery_time),
        ColumnDef("GT", "GT (°)", "Delivery", 1,
                  lambda p, m: m.GT,
                  lambda bm: bm.GT),
        ColumnDef("avgDoseRate", "Avg Dose Rate (MU/min)", "Delivery", 1,
                  lambda p, m: _avg_dose_rate(m),
                  lambda bm: bm.avg_dose_rate),
        ColumnDef("psmall", "psmall", "Delivery", 4,
                  lambda p, m: m.psmall,
                  lambda bm: bm.psmall),

        # ── Geometric ──
        ColumnDef("MFA", "MFA (cm²)", "Geometric", 2,
                  lambda p, m: m.MFA,
                  lambda bm: bm.MFA),
        ColumnDef("EFS", "EFS (mm)", "Geometric", 2,
                  lambda p, m: m.EFS,
                  lambda bm: bm.EFS),
        ColumnDef("PA", "PA (cm²)", "Geometric", 2,
                  lambda p, m: m.PA,
                  lambda bm: bm.PA),
        ColumnDef("JA", "JA (cm²)", "Geometric", 2,
                  lambda p, m: m.JA,
                  lambda bm: bm.JA),

        # ── Complexity (Primary) ──
        ColumnDef("MCS", "MCS", "Complexity (Primary)", 4,
                  lambda p, m: m.MCS,
                  lambda bm: bm.MCS),
        ColumnDef("LSV", "LSV", "Complexity (Primary)", 4,
                  lambda p, m: m.LSV,
                  lambda bm: bm.LSV),
        ColumnDef("AAV", "AAV", "Complexity (Primary)", 4,
                  lambda p, m: m.AAV,
                  lambda bm: bm.AAV),

        # ── Complexity (Secondary) ──
        ColumnDef("LT", "LT (mm)", "Complexity (Secondary)", 1,
                  lambda p, m: m.LT,
                  lambda bm: bm.LT),
        ColumnDef("LTMCS", "LTMCS", "Complexity (Secondary)", 1,
                  lambda p, m: m.LTMCS,
                  lambda bm: bm.LTMCS),
        ColumnDef("SAS5", "SAS5", "Complexity (Secondary)", 4,
                  lambda p, m: m.SAS5,
                  lambda bm: bm.SAS5),
        ColumnDef("SAS10", "SAS10", "Complexity (Secondary)", 4,
                  lambda p, m: m.SAS10,
                  lambda bm: bm.SAS10),
        ColumnDef("EM", "EM", "Complexity (Secondary)", 4,
                  lambda p, m: m.EM,
                  lambda bm: bm.EM),
        ColumnDef("PI", "PI", "Complexity (Secondary)", 4,
                  lambda p, m: m.PI,
                  lambda bm: bm.PI),
        ColumnDef("LG", "LG (mm)", "Complexity (Secondary)", 2,
                  lambda p, m: m.LG,
                  lambda bm: bm.LG),
        ColumnDef("MAD", "MAD (mm)", "Complexity (Secondary)", 2,
                  lambda p, m: m.MAD,
                  lambda bm: bm.MAD),
        ColumnDef("TG", "TG", "Complexity (Secondary)", 4,
                  lambda p, m: m.TG,
                  lambda bm: bm.TG),
        ColumnDef("PM", "PM", "Complexity (Secondary)", 4,
                  lambda p, m: m.PM,
                  lambda bm: bm.PM),
        ColumnDef("MD", "MD", "Complexity (Secondary)", 4,
                  lambda p, m: m.MD,
                  lambda bm: bm.MD),
        ColumnDef("MI", "MI", "Complexity (Secondary)", 4,
                  lambda p, m: m.MI,
                  lambda bm: bm.MI),

        # ── Deliverability ──
        ColumnDef("MUCA", "MUCA (MU/CP)", "Deliverability", 4,
                  lambda p, m: m.MUCA,
                  lambda bm: bm.MUCA),
        ColumnDef("LTMU", "LTMU (mm/MU)", "Deliverability", 4,
                  lambda p, m: m.LTMU,
                  lambda bm: bm.LTMU),
        ColumnDef("LTNLMU", "LTNLMU", "Deliverability", 6,
                  lambda p, m: m.LTNLMU,
                  lambda bm: bm.LTNLMU),
        ColumnDef("LNA", "LNA", "Deliverability", 4,
                  lambda p, m: m.LNA,
                  lambda bm: bm.LNA),
        ColumnDef("LTAL", "LTAL (mm/°)", "Deliverability", 2,
                  lambda p, m: m.LTAL,
                  lambda bm: bm.LTAL),
        ColumnDef("GS", "GS (°/s)", "Deliverability", 2,
                  lambda p, m: m.GS,
                  lambda bm: bm.GS),
        ColumnDef("mGSV", "mGSV (°/s)", "Deliverability", 4,
                  lambda p, m: m.mGSV,
                  lambda bm: bm.mGSV),
        ColumnDef("LS", "LS (mm/s)", "Deliverability", 2,
                  lambda p, m: m.LS,
                  lambda bm: bm.LS),
        ColumnDef("mDRV", "mDRV (MU/min)", "Deliverability", 2,
                  lambda p, m: m.mDRV,
                  lambda bm: bm.mDRV),
    ]


# Module-level dummy plan/metrics for building column list structure
_COLUMNS: Optional[List[ColumnDef]] = None


def _get_columns() -> List[ColumnDef]:
    """Get the column definitions (lazy singleton)."""
    global _COLUMNS
    if _COLUMNS is None:
        # Build with dummy objects — only structure matters for column defs
        _COLUMNS = _build_columns(None, None)  # type: ignore
    return _COLUMNS


# ---------------------------------------------------------------------------
# Exportable plan wrapper
# ---------------------------------------------------------------------------

class ExportablePlan:
    """Wrapper for plan + metrics for export."""

    def __init__(self, file_name: str, plan: RTPlan, metrics: PlanMetrics):
        self.file_name = file_name
        self.plan = plan
        self.metrics = metrics


# ---------------------------------------------------------------------------
# CSV Export
# ---------------------------------------------------------------------------

def _format_cell(col: ColumnDef, raw) -> str:
    """Format a single cell value for CSV."""
    if isinstance(raw, (int, float)):
        return _fmt_num(raw, col.decimals)
    return _escape_csv(raw)


def _build_category_row(columns: List[ColumnDef]) -> str:
    """Build the category row (first row of two-row header)."""
    last_category = ""
    cells = []
    for col in columns:
        if col.category != last_category:
            last_category = col.category
            cells.append(_escape_csv(col.category))
        else:
            cells.append("")
    return ",".join(cells)


def plans_to_csv(
    plans: List[ExportablePlan],
) -> str:
    """
    Export plans to CSV with two-row header (category + metric name),
    plan-total row + per-beam rows for each plan.

    Matches the TypeScript plansToCSV() format exactly.
    """
    columns = _get_columns()
    category_row = _build_category_row(columns)
    header_row = ",".join(col.header for col in columns)

    rows: List[str] = []
    for ep in plans:
        # Plan-total row
        plan_cells = []
        for col in columns:
            if col.beam_only:
                plan_cells.append("")
                continue
            val = col.extract_plan(ep.plan, ep.metrics)
            # Override fileName
            if col.key == "fileName":
                val = ep.file_name
            plan_cells.append(_format_cell(col, val))
        rows.append(",".join(plan_cells))

        # Per-beam rows
        for bm in ep.metrics.beam_metrics:
            beam_cells = []
            for col in columns:
                if col.plan_only:
                    beam_cells.append("")
                    continue
                if col.extract_beam is not None:
                    val = col.extract_beam(bm)
                    if val is None and not col.beam_only:
                        # Fall back to plan-level value for plan info columns
                        val = col.extract_plan(ep.plan, ep.metrics)
                        if col.key == "fileName":
                            val = ep.file_name
                    beam_cells.append(_format_cell(col, val))
                else:
                    val = col.extract_plan(ep.plan, ep.metrics)
                    if col.key == "fileName":
                        val = ep.file_name
                    beam_cells.append(_format_cell(col, val))
            rows.append(",".join(beam_cells))

    return "\n".join([category_row, header_row] + rows)


def plans_to_json(
    plans: List[ExportablePlan],
    export_type: str = "batch",
) -> str:
    """
    Export plans to JSON matching the TypeScript plansToJSON() format.

    Includes summary statistics, plan info, all metrics, and beam-level breakdown.
    """
    columns = _get_columns()

    # Compute summary statistics for numeric plan columns
    summary: Dict[str, Dict[str, float]] = {}
    numeric_cols = [
        col for col in columns
        if not col.beam_only and any(
            isinstance(col.extract_plan(ep.plan, ep.metrics), (int, float))
            for ep in plans
        )
    ]
    for col in numeric_cols:
        values = []
        for ep in plans:
            v = col.extract_plan(ep.plan, ep.metrics)
            if isinstance(v, (int, float)) and v == v:  # exclude NaN
                values.append(float(v))
        if values:
            mean = sum(values) / len(values)
            variance = sum((v - mean) ** 2 for v in values) / len(values)
            summary[col.key] = {
                "min": min(values),
                "max": max(values),
                "mean": mean,
                "std": variance ** 0.5,
            }

    plan_dicts = []
    for ep in plans:
        plan_data: Dict[str, Any] = {
            "fileName": ep.file_name,
            "patientId": ep.plan.patient_id,
            "patientName": ep.plan.patient_name,
            "planLabel": ep.plan.plan_label,
            "technique": ep.plan.technique.value if hasattr(ep.plan.technique, 'value') else str(ep.plan.technique),
            "beamCount": len(ep.plan.beams) if ep.plan.beams else 0,
            "radiationType": _get_dominant_radiation_type(ep.plan),
            "energy": _get_dominant_energy(ep.plan),
            "machine": ep.plan.treatment_machine_name,
            "institution": ep.plan.institution_name,
        }

        # All metrics as flat object
        skip_keys = {
            "fileName", "patientId", "patientName", "planLabel", "technique",
            "beamCount", "cpCount", "radiationType", "energy", "machine",
            "institution", "beam", "level",
        }
        metrics_dict: Dict[str, Any] = {}
        for col in columns:
            if col.key in skip_keys or col.beam_only:
                continue
            val = col.extract_plan(ep.plan, ep.metrics)
            if isinstance(val, (int, float)):
                metrics_dict[col.key] = val
        plan_data["metrics"] = metrics_dict

        # Beam-level metrics
        beam_dicts = []
        for bm in ep.metrics.beam_metrics:
            beam_data: Dict[str, Any] = {}
            for col in columns:
                if col.plan_only:
                    continue
                if col.extract_beam is not None:
                    val = col.extract_beam(bm)
                    if val is not None:
                        beam_data[col.key] = val
            beam_dicts.append(beam_data)
        plan_data["beamMetrics"] = beam_dicts

        plan_dicts.append(plan_data)

    export_data = {
        "tool": "RTp-lens",
        "toolUrl": "https://rt-complexity-lens.lovable.app",
        "pythonToolkit": "https://github.com/matteomaspero/rt-complexity-lens/blob/main/python/README.md",
        "exportDate": datetime.now().isoformat(),
        "exportType": export_type,
        "planCount": len(plans),
        "summary": summary,
        "plans": plan_dicts,
    }

    return json.dumps(export_data, indent=2, default=_serialize_datetime)


# ---------------------------------------------------------------------------
# Convenience wrappers (backwards-compatible API)
# ---------------------------------------------------------------------------

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
    include_beam_details: bool = True,
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
    include_beam_details: bool = True,
    plan_name: str = "Plan",
) -> None:
    """
    Export metrics to CSV format using the unified two-row header format.

    Args:
        metrics: Single PlanMetrics or list of PlanMetrics
        file_path: Path to save CSV file
        include_beam_details: Whether to include per-beam rows
        plan_name: File name to use in the export
    """
    if isinstance(metrics, PlanMetrics):
        metrics_list = [metrics]
    else:
        metrics_list = metrics

    exportable = [
        ExportablePlan(
            file_name=plan_name if len(metrics_list) == 1 else f"Plan_{i+1}",
            plan=RTPlan(
                patient_id="", patient_name="",
                plan_label=m.plan_label, plan_name=m.plan_label,
            ),
            metrics=m,
        )
        for i, m in enumerate(metrics_list)
    ]

    csv_str = plans_to_csv(exportable)

    Path(file_path).parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, "w", newline="") as f:
        f.write(csv_str)


def batch_to_csv(metrics_list: List[PlanMetrics], file_path: str) -> None:
    """Export batch metrics to CSV with the unified format."""
    metrics_to_csv(metrics_list, file_path, include_beam_details=True)


def batch_to_json(metrics_list: List[PlanMetrics], file_path: str) -> None:
    """Export batch metrics to JSON."""
    metrics_to_json(metrics_list, file_path, include_beam_details=True)
