"""
Example: Computing PAM (Plan Aperture Modulation) for a target structure.

This example demonstrates how to:
1. Load an RTPLAN and RTSTRUCT DICOM file
2. Extract a target structure
3. Calculate PAM (Plan Aperture Modulation) and BAM (Beam Aperture Modulation)
4. Interpret the results

PAM quantifies the average fraction of a target's projected area that is blocked
by the MLC/jaws across the entire treatment plan. It provides a geometric measure
of aperture complexity relative to a specific anatomical target.
"""

import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from rtplan_complexity import parse_rtplan, calculate_plan_metrics
from rtplan_complexity.parser import parse_rtstruct, get_structure_by_name


def compute_pam_example(rtplan_path: str, rtstruct_path: str, target_label: str = "PTV"):
    """
    Compute PAM for a specific target structure.
    
    Args:
        rtplan_path: Path to RTPLAN DICOM file
        rtstruct_path: Path to RTSTRUCT DICOM file  
        target_label: Name/label of target structure (case-insensitive, partial match supported)
    
    Returns:
        Dictionary containing PAM results
    """
    print(f"Loading RTPLAN: {rtplan_path}")
    rtplan = parse_rtplan(rtplan_path)
    
    print(f"Loading RTSTRUCT: {rtstruct_path}")
    structures_dict = parse_rtstruct(rtstruct_path)
    
    print(f"Available structures: {list(structures_dict.keys())}")
    
    # Find target structure
    target_structure = get_structure_by_name(structures_dict, target_label)
    if target_structure is None:
        print(f"ERROR: Target structure {target_label} not found")
        return None
    
    print(f"Found target structure: {target_structure.name}")
    print(f"  - Number of contours: {len(target_structure.contours)}")
    total_points = sum(c.number_of_points for c in target_structure.contours)
    print(f"  - Total contour points: {total_points}")
    
    # Calculate metrics with PAM
    print("\nCalculating metrics...")
    plan_metrics = calculate_plan_metrics(rtplan, structure=target_structure)
    
    # Extract PAM result
    pam = plan_metrics.PAM
    
    print("\n" + "="*60)
    print("RESULTS")
    print("="*60)
    
    if pam is not None:
        print(f"\nPlan Aperture Modulation (PAM): {pam:.4f}")
        print(f"  Interpretation:")
        if pam < 0.1:
            print(f"    - Very low modulation: Target almost always fully within aperture")
        elif pam < 0.3:
            print(f"    - Low modulation: Target mostly unblocked")
        elif pam < 0.5:
            print(f"    - Moderate modulation: Reasonable aperture complexity")
        elif pam < 0.7:
            print(f"    - High modulation: Significant target blockage")
        else:
            print(f"    - Very high modulation: Target frequently blocked")
    else:
        print("PAM: Could not be calculated (check structure and plan validity)")
    
    # Per-beam results
    print(f"\nPer-Beam Aperture Modulation (BAM):")
    for i, beam_metrics in enumerate(plan_metrics.beam_metrics):
        if beam_metrics.BAM is not None:
            print(f"  Beam {beam_metrics.beam_number} ({beam_metrics.beam_name}): {beam_metrics.BAM:.4f}")
        else:
            print(f"  Beam {beam_metrics.beam_number} ({beam_metrics.beam_name}): N/A")
    
    # Additional context
    print(f"\nPlan Summary:")
    print(f"  - Total MU: {plan_metrics.total_mu:.1f}")
    print(f"  - Number of beams: {len(plan_metrics.beam_metrics)}")
    print(f"  - Total LT (Leaf Travel): {plan_metrics.LT:.1f} mm")
    print(f"  - MCS (Modulation Complexity Score): {plan_metrics.MCS:.4f}")
    
    return {
        "target_structure": target_structure.name,
        "PAM": pam,
        "beam_metrics": plan_metrics.beam_metrics,
        "plan_metrics": plan_metrics,
    }


if __name__ == "__main__":
    # Example usage (requires actual DICOM files)
    import argparse
    
    parser = argparse.ArgumentParser(description="Compute PAM for a treatment plan")
    parser.add_argument("rtplan", help="Path to RTPLAN DICOM file")
    parser.add_argument("rtstruct", help="Path to RTSTRUCT DICOM file")
    parser.add_argument("--target", default="PTV", help="Target structure label (default: PTV)")
    
    args = parser.parse_args()
    
    result = compute_pam_example(args.rtplan, args.rtstruct, args.target)
    
    if result:
        print("\n✓ Analysis complete")
        if result["PAM"] is not None:
            print(f"✓ PAM successfully calculated: {result['PAM']:.4f}")
    else:
        print("\n✗ Analysis failed")
        sys.exit(1)
