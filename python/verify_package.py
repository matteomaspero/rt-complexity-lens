#!/usr/bin/env python3
"""
Quick verification script for rtplan-complexity package

Tests that the package is properly installed and functional.
"""

import sys


def test_imports():
    """Test that all modules can be imported."""
    print("="*60)
    print("Testing Package Imports")
    print("="*60)
    
    try:
        import rtplan_complexity
        print(f"✓ rtplan_complexity (v{rtplan_complexity.__version__})")
    except ImportError as e:
        print(f"✗ Failed to import rtplan_complexity: {e}")
        return False
    
    try:
        from rtplan_complexity import (
            parse_rtplan,
            calculate_plan_metrics,
            calculate_beam_metrics,
        )
        print("✓ Core functions imported")
    except ImportError as e:
        print(f"✗ Failed to import core functions: {e}")
        return False
    
    try:
        from rtplan_complexity import (
            RTPlan, Beam, ControlPoint,
            BeamMetrics, PlanMetrics,
            MLCLeafPositions, JawPositions
        )
        print("✓ Type definitions imported")
    except ImportError as e:
        print(f"✗ Failed to import types: {e}")
        return False
    
    return True


def test_dependencies():
    """Test that all required dependencies are available."""
    print("\n" + "="*60)
    print("Testing Dependencies")
    print("="*60)
    
    dependencies = {
        "pydicom": "2.4.0",
        "numpy": "1.24.0",
        "scipy": "1.11.0",
        "pandas": "2.0.0",
    }
    
    all_ok = True
    for package, min_version in dependencies.items():
        try:
            mod = __import__(package)
            version = getattr(mod, "__version__", "unknown")
            print(f"✓ {package} (v{version})")
        except ImportError:
            print(f"✗ {package} not found (required >= {min_version})")
            all_ok = False
    
    return all_ok


def test_optional_dependencies():
    """Test optional visualization dependencies."""
    print("\n" + "="*60)
    print("Testing Optional Dependencies")
    print("="*60)
    
    optional = {
        "matplotlib": "Visualization",
        "seaborn": "Enhanced plots",
    }
    
    for package, purpose in optional.items():
        try:
            mod = __import__(package)
            version = getattr(mod, "__version__", "unknown")
            print(f"✓ {package} (v{version}) - {purpose}")
        except ImportError:
            print(f"○ {package} not installed - {purpose}")


def test_basic_functionality():
    """Test basic package functionality."""
    print("\n" + "="*60)
    print("Testing Basic Functionality")
    print("="*60)
    
    try:
        from rtplan_complexity.types import (
            Beam, ControlPoint, MLCLeafPositions,
            JawPositions, RTPlan, Technique
        )
        from rtplan_complexity.metrics import calculate_beam_metrics
        
        # Create a minimal test beam
        cp = ControlPoint(
            index=0,
            gantry_angle=0.0,
            gantry_rotation_direction="CW",
            beam_limiting_device_angle=0.0,
            cumulative_meterset_weight=1.0,
            mlc_positions=MLCLeafPositions(
                bank_a=[-10.0] * 60,
                bank_b=[10.0] * 60,
            ),
            jaw_positions=JawPositions(x1=-50, x2=50, y1=-50, y2=50),
        )
        
        beam = Beam(
            beam_number=1,
            beam_name="Test Beam",
            beam_type="DYNAMIC",
            radiation_type="PHOTON",
            treatment_delivery_type="TREATMENT",
            number_of_control_points=1,
            control_points=[cp],
            final_cumulative_meterset_weight=1.0,
            beam_dose=100.0,
            gantry_angle_start=0.0,
            gantry_angle_end=0.0,
            is_arc=False,
            mlc_leaf_widths=[5.0] * 60,
            number_of_leaves=60,
        )
        
        # Calculate metrics
        metrics = calculate_beam_metrics(beam)
        
        print(f"✓ Created test beam")
        print(f"✓ Calculated metrics:")
        print(f"  - MCS: {metrics.MCS:.4f}")
        print(f"  - LSV: {metrics.LSV:.4f}")
        print(f"  - AAV: {metrics.AAV:.4f}")
        
        # Verify metrics are in expected ranges
        assert 0 <= metrics.MCS <= 1, f"MCS out of range: {metrics.MCS}"
        assert 0 <= metrics.LSV <= 1, f"LSV out of range: {metrics.LSV}"
        assert metrics.AAV >= 0, f"AAV negative: {metrics.AAV}"
        
        print(f"✓ Metrics are in valid ranges")
        
        return True
        
    except Exception as e:
        print(f"✗ Functionality test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all verification tests."""
    print("\n" + "="*60)
    print("RTplan Complexity Lens - Package Verification")
    print("="*60)
    print()
    
    results = {
        "Imports": test_imports(),
        "Dependencies": test_dependencies(),
        "Functionality": test_basic_functionality(),
    }
    
    test_optional_dependencies()
    
    # Summary
    print("\n" + "="*60)
    print("Verification Summary")
    print("="*60)
    
    for test_name, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{test_name:20s}: {status}")
    
    all_passed = all(results.values())
    
    if all_passed:
        print("\n✅ All critical tests passed!")
        print("\nThe package is ready to use.")
        print("\nTry:")
        print("  python -c 'from rtplan_complexity import calculate_plan_metrics; print(\"Success!\")'")
        return 0
    else:
        print("\n❌ Some tests failed!")
        print("\nPlease check the error messages above.")
        print("\nTo reinstall:")
        print("  pip install -e .")
        return 1


if __name__ == "__main__":
    sys.exit(main())
