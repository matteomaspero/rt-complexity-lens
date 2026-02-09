"""
Cross-validation of PAM/BAM metrics across multiple test plans.

This script:
1. Loads multiple DICOM test plans from testdata/reference_dataset_v1.1
2. Computes PAM/BAM metrics using the Python implementation
3. Exports results for comparison with TypeScript implementation

NOTE: TypeScript implementation uses simplified geometry (bounding boxes).
Python implementation uses exact polygon clipping (Shapely).
For full validation, both should converge to similar PAM ranges.
"""

import sys
from pathlib import Path
from typing import Optional

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from rtplan_complexity import parse_rtplan, calculate_plan_metrics
from rtplan_complexity.parser import parse_rtstruct, get_structure_by_name
import json


TEST_DATA_DIR = Path(__file__).parent.parent.parent / "testdata" / "reference_dataset_v1.1" / "Linac" / "Eclipse"
RTPLAN_DIR = TEST_DATA_DIR / "RP_RD"
RTSTRUCT_DIR = TEST_DATA_DIR / "CT_RS"


def find_matching_rtstruct(plan_filename: str) -> Optional[Path]:
    """Find matching RTSTRUCT for a given plan type.
    
    Args:
        plan_filename: Plan filename like 'RP.TG119.CS_ETH_2A_#1.dcm'
    """
    if RTSTRUCT_DIR.exists():
        # Extract plan type: CS, HN, MT, PR from filenames like "RP.TG119.CS_ETH_2A_#1.dcm"
        parts = plan_filename.replace('.dcm', '').split('.')
        if len(parts) >= 3:
            plan_suffix = parts[2]  # e.g., "CS_ETH_2A_#1"
            plan_type = plan_suffix.split('_')[0]  # e.g., "CS"
            
            # Map plan types to RTSTRUCT names
            type_mappings = {
                'CS': 'CShape',
                'HN': 'HN',
                'MT': 'Multi',
                'PR': 'Prostate',
            }
            
            target_name = type_mappings.get(plan_type)
            if target_name:
                for rs_file in RTSTRUCT_DIR.glob("RS.*.dcm"):
                    if target_name in rs_file.stem:
                        return rs_file
    return None


def validate_pam_single_plan(rtplan_file: Path, rtstruct_file: Optional[Path] = None) -> dict:
    """
    Validate PAM calculation for a single plan.
    
    Returns:
        Dictionary with plan info and PAM results
    """
    print(f"\n{'='*70}")
    print(f"Processing Plan: {rtplan_file.name}")
    print(f"{'='*70}")
    
    try:
        # Parse RTPLAN
        print(f"  Loading RTPLAN...")
        rtplan = parse_rtplan(str(rtplan_file))
        print(f"    [OK] Plan loaded: {rtplan.plan_label}")
        print(f"      - Beams: {len(rtplan.beams)}")
        print(f"      - Total MU: {rtplan.total_mu:.1f}")
        
        # Try to find and parse RTSTRUCT
        structures_dict = {}
        if rtstruct_file is None:
            rtstruct_file = find_matching_rtstruct(rtplan_file.name)
        
        if rtstruct_file and rtstruct_file.exists():
            print(f"  Loading RTSTRUCT: {rtstruct_file.name}")
            try:
                structures_dict = parse_rtstruct(str(rtstruct_file))
                print(f"    [OK] Structures loaded: {list(structures_dict.keys())}")
            except ValueError as e:
                print(f"    [WARN] {e} (PAM calculation not possible)")
        else:
            print(f"  [WARN] RTSTRUCT not found (PAM will be N/A)")
        
        # Calculate metrics
        print(f"  Calculating metrics...")
        
        # Without structure
        metrics_no_struct = calculate_plan_metrics(rtplan)
        print(f"    [OK] Metrics without target: MCS={metrics_no_struct.MCS:.4f}, AAV={metrics_no_struct.AAV:.4f}")
        
        # With each available structure
        results = {
            "file": rtplan_file.name,
            "plan_label": rtplan.plan_label,
            "total_mu": rtplan.total_mu,
            "num_beams": len(rtplan.beams),
            "metrics_without_target": {
                "MCS": metrics_no_struct.MCS,
                "AAV": metrics_no_struct.AAV,
                "MFA": metrics_no_struct.MFA,
                "LT": metrics_no_struct.LT,
                "PAM": metrics_no_struct.PAM,
            },
            "metrics_by_structure": {},
        }
        
        for struct_name, structure in structures_dict.items():
            print(f"    Calculating with target: {struct_name}")
            metrics_with_struct = calculate_plan_metrics(rtplan, structure=structure)
            
            pam_value = metrics_with_struct.PAM
            if pam_value is not None:
                print(f"      [OK] PAM = {pam_value:.4f}", end="")
                if pam_value < 0.1:
                    print(" (Very low - target almost always unblocked)")
                elif pam_value < 0.3:
                    print(" (Low - target mostly unblocked)")
                elif pam_value < 0.5:
                    print(" (Moderate modulation)")
                elif pam_value < 0.7:
                    print(" (High modulation)")
                else:
                    print(" (Very high - target frequently blocked)")
            else:
                print(f"      [WARN] PAM = N/A (calculation not possible)")
            
            # Store per-beam BAM values
            beam_bam_values = []
            for beam_metrics in metrics_with_struct.beam_metrics:
                if beam_metrics.BAM is not None:
                    beam_bam_values.append({
                        "beam": beam_metrics.beam_number,
                        "BAM": beam_metrics.BAM,
                    })
            
            results["metrics_by_structure"][struct_name] = {
                "PAM": pam_value,
                "beam_BAM_values": beam_bam_values,
                "MCS": metrics_with_struct.MCS,
                "AAV": metrics_with_struct.AAV,
            }
        
        return results
    
    except Exception as e:
        print(f"  [ERR] Error processing plan: {e}")
        import traceback
        traceback.print_exc()
        return {"file": rtplan_file.name, "error": str(e)}


def validate_pam_batch():
    """Validate PAM for all available test plans."""
    print("\n" + "="*70)
    print("RT-COMPLEXITY-LENS: PAM CROSS-VALIDATION")
    print("Python Implementation v1.0")
    print("="*70)
    print(f"Test Data Directory: {TEST_DATA_DIR}")
    
    results_all = {
        "test_date": str(Path(__file__).parent / "test_time.txt"),
        "test_directory": str(TEST_DATA_DIR),
        "plans": [],
    }
    
    if not RTPLAN_DIR.exists():
        print(f"ERROR: Test data directory not found: {RTPLAN_DIR}")
        return
    
    # Find all RTPLAN files (nested in subdirectories like TG119_CS/RP.*.dcm)
    rtplan_files = sorted(RTPLAN_DIR.glob("**/RP.*.dcm"))
    
    if not rtplan_files:
        print(f"WARNING: No RTPLAN files found in {RTPLAN_DIR}")
        return
    
    print(f"\nFound {len(rtplan_files)} RTPLAN files to process\n")
    
    # Process each plan
    for rtplan_file in rtplan_files:
        result = validate_pam_single_plan(rtplan_file)
        results_all["plans"].append(result)
    
    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    
    pam_values_with_struct = []
    for plan_result in results_all["plans"]:
        if "error" not in plan_result and plan_result["metrics_by_structure"]:
            for struct_name, metrics in plan_result["metrics_by_structure"].items():
                if metrics["PAM"] is not None:
                    pam_values_with_struct.append(metrics["PAM"])
                    print(f"{plan_result['file']:40s} + {struct_name:15s}: PAM = {metrics['PAM']:.4f}")
    
    if pam_values_with_struct:
        print(f"\nPAM Statistics:")
        print(f"  Min:    {min(pam_values_with_struct):.4f}")
        print(f"  Max:    {max(pam_values_with_struct):.4f}")
        print(f"  Mean:   {sum(pam_values_with_struct) / len(pam_values_with_struct):.4f}")
        print(f"  Median: {sorted(pam_values_with_struct)[len(pam_values_with_struct)//2]:.4f}")
        print(f"  N:      {len(pam_values_with_struct)}")
    
    # Export results
    results_file = Path(__file__).parent / "cross_validate_pam_results.json"
    with open(results_file, 'w') as f:
        json.dump(results_all, f, indent=2)
    print(f"\n[OK] Results exported to: {results_file}")
    
    print("\n" + "="*70)
    print("[OK] Cross-validation complete")
    print("="*70)


if __name__ == "__main__":
    validate_pam_batch()
