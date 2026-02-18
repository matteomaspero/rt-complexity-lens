#!/usr/bin/env python3
"""
Generate TypeScript metrics reference data from Python implementation.

This script parses all test DICOM files and generates reference metrics
that cross-validation tests use to validate Python ↔ UCoMX comparisons.

Usage: python generate_ts_reference.py
"""

import json
import sys
from pathlib import Path
from datetime import datetime

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent))

from rtplan_complexity.parser import parse_rtplan
from rtplan_complexity.metrics import calculate_plan_metrics


def snake_to_camel(snake_str: str) -> str:
    """
    Convert snake_case to camelCase with special handling for metrics naming.
    
    Examples:
      total_mu → totalMU
      mu_per_gy → MUperGy
      beam_metrics → beamMetrics
      calculation_date → calculationDate
      avg_dose_rate → avgDoseRate
      mu_per_degree → MUperDegree
    """
    # Special case mappings for known metrics
    special_cases = {
        'mu_per_gy': 'MUperGy',
        'mu_per_degree': 'MUperDegree',
        'mu_per_ca': 'MUperCA',
        'mu_per_fraction': 'MUperFraction',
        'avg_dose_rate': 'avgDoseRate',
        'avg_mlc_speed': 'avgMLCSpeed',
        'avg_gantry_speed': 'avgGantrySpeed',
        'total_delivery_time': 'totalDeliveryTime',
        'total_mu': 'totalMU',
        'beam_metrics': 'beamMetrics',
        'calculation_date': 'calculationDate',
        'dose_per_fraction': 'dosePerFraction',
        'number_of_fractions': 'numberOfFractions',
        'number_of_leaves': 'numberOfLeaves',
        'plan_label': 'planLabel',
        'prescribed_dose': 'prescribedDose',
        'control_point_metrics': 'controlPointMetrics',
        'small_aperture_flags': 'smallApertureFlags',
        'control_point_index': 'controlPointIndex',
        'aperture_lsv': 'apertureLSV',
        'aperture_aav': 'apertureAAV',
        'aperture_area': 'apertureArea',
        'aperture_perimeter': 'aperturePerimeter',
        'meterset_weight': 'metersetWeight',
        'beam_number': 'beamNumber',
        'beam_name': 'beamName',
        'beam_type': 'beamType',
        'radiation_type': 'radiationType',
        'nominal_beam_energy': 'nominalBeamEnergy',
        'energy_label': 'energyLabel',
        'beam_mu': 'beamMU',
        'number_of_control_points': 'numberOfControlPoints',
        'arc_length': 'arcLength',
        'average_gantry_speed': 'averageGantrySpeed',
        'estimated_delivery_time': 'estimatedDeliveryTime',
        'mlc_leaf_widths': 'mlcLeafWidths',
        'mlc_leaf_boundaries': 'mlcLeafBoundaries',
        'mlc_positions': 'mlcPositions',
        'jaw_positions': 'jawPositions',
        'gantry_angle': 'gantryAngle',
        'beam_limiting_device_angle': 'beamLimitingDeviceAngle',
        'cumulative_meterset_weight': 'cumulativeMetersetWeight',
    }
    
    # Return special case if it matches
    if snake_str in special_cases:
        return special_cases[snake_str]
    
    # Generic conversion for other cases
    acronyms_caps = {'mu', 'mlc', 'rt', 'roi', 'lsv', 'aav', 'mcs', 'fa', 'lt', 'ca', 'dr', 'hu'}
    units = {'gy', 'cm', 'mm', 's', 'mev', 'deg', 'deg/s', 'mm/s'}
    
    components = snake_str.split('_')
    result = []
    
    for i, component in enumerate(components):
        lower_comp = component.lower()
        
        if lower_comp in acronyms_caps:
            result.append(component.upper())
        elif lower_comp in units:
            result.append(component[0].upper() + component[1:].lower() if component else '')
        elif i == 0:
            result.append(component)
        else:
            result.append(component.title() if component else '')
    
    return ''.join(result)


def to_serializable(obj, convert_keys=True):
    """
    Convert objects to JSON-serializable format.
    
    If convert_keys=True, converts snake_case keys to camelCase to match
    TypeScript conventions, with special handling for acronyms like MU and Gy.
    """
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif hasattr(obj, '__dict__'):
        d = vars(obj).copy()
        result = {}
        for k, v in d.items():
            # Convert snake_case key to camelCase if needed
            key = snake_to_camel(k) if convert_keys else k
            result[key] = to_serializable(v, convert_keys=convert_keys)
        return result
    elif isinstance(obj, (list, tuple)):
        return [to_serializable(item, convert_keys=convert_keys) for item in obj]
    elif isinstance(obj, dict):
        result = {}
        for k, v in obj.items():
            # Convert keys if they're strings
            key = snake_to_camel(k) if (convert_keys and isinstance(k, str)) else k
            result[key] = to_serializable(v, convert_keys=convert_keys)
        return result
    else:
        return obj


def main():
    print("=" * 80)
    print("TypeScript Reference Metrics Generator (Python Implementation)")
    print("=" * 80)

    # Find test DICOM files
    test_data_dir = Path(__file__).parent.parent / "public" / "test-data"
    dicom_files = sorted(test_data_dir.glob("*.dcm"))

    print(f"\nSource directory: {test_data_dir}")
    print(f"Found {len(dicom_files)} DICOM files\n")

    if not dicom_files:
        print("ERROR: No DICOM files found!")
        return 1

    # Parse and calculate metrics for all files
    plans = {}
    success_count = 0
    error_count = 0

    for dicom_file in dicom_files:
        fname = dicom_file.name
        try:
            print(f"Processing: {fname}...", end=" ")
            
            # Parse DICOM
            plan = parse_rtplan(str(dicom_file))
            
            # Calculate metrics
            metrics = calculate_plan_metrics(plan)
            
            # Convert to serializable dict
            metrics_dict = to_serializable(metrics)
            
            plans[fname] = metrics_dict
            success_count += 1
            
            # Print summary (plain ASCII for Windows compatibility)
            print(f"OK (MCS={metrics.MCS:.4f}, LT={metrics.LT:.2f}, JA={metrics.JA:.2f})")
            
        except Exception as e:
            error_count += 1
            error_msg = str(e)[:80]
            print(f"ERROR: {error_msg}")

    # Build output
    output = {
        "metadata": {
            "generatedAt": datetime.now().isoformat(),
            "generator": "generate_ts_reference.py",
            "description": "Python implementation reference metrics for cross-validation",
            "planCount": success_count,
            "errorCount": error_count,
        },
        "plans": plans,
    }

    # Write to file
    output_file = Path(__file__).parent / "tests" / "reference_data" / "reference_metrics_ts.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, "w") as f:
        json.dump(output, f, indent=2)

    print("\n" + "=" * 80)
    print("Generation Complete")
    print("=" * 80)
    print(f"\nResults:")
    print(f"  [OK] Success: {success_count} files")
    print(f"  [FAILED] Errors: {error_count} files")
    print(f"\nReference data written to:")
    print(f"  {output_file}")
    print(f"\nFile format: JSON with full metrics for all plans")
    print(f"\nTo validate against UCoMX:")
    print(f"  python tests/cross_validate_ucomx.py")
    print()

    return 0 if error_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
