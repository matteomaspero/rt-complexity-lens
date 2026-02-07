"""
Metrics calculation tests for rtplan_complexity.

Tests metric calculations against reference data from TypeScript.
"""

import pytest
import json
from pathlib import Path
import sys

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from rtplan_complexity import (
    parse_rtplan,
    calculate_plan_metrics,
    calculate_beam_metrics,
)
from rtplan_complexity.types import (
    RTPlan, 
    Beam, 
    ControlPoint, 
    MLCLeafPositions,
    JawPositions,
    Technique,
)
from rtplan_complexity.metrics import (
    calculate_aperture_area,
    calculate_lsv,
    calculate_leaf_gap,
    calculate_mad,
)


class TestMetricFunctions:
    """Test individual metric calculation functions."""
    
    def test_aperture_area_simple(self):
        """Test aperture area calculation with simple case."""
        mlc = MLCLeafPositions(
            bank_a=[-10.0, -10.0, -10.0],
            bank_b=[10.0, 10.0, 10.0],
        )
        jaw = JawPositions(x1=-50, x2=50, y1=-50, y2=50)
        leaf_widths = [5.0, 5.0, 5.0]
        
        area = calculate_aperture_area(mlc, leaf_widths, jaw)
        
        # Each leaf has opening of 20mm, width of 5mm = 100mm² per leaf
        # 3 leaves = 300mm²
        assert area == pytest.approx(300.0, rel=0.01)
    
    def test_aperture_area_closed(self):
        """Test aperture area with closed leaves."""
        mlc = MLCLeafPositions(
            bank_a=[0.0, 0.0, 0.0],
            bank_b=[0.0, 0.0, 0.0],
        )
        jaw = JawPositions(x1=-50, x2=50, y1=-50, y2=50)
        leaf_widths = [5.0, 5.0, 5.0]
        
        area = calculate_aperture_area(mlc, leaf_widths, jaw)
        
        assert area == 0.0
    
    def test_lsv_uniform(self):
        """Test LSV with uniform leaf positions."""
        mlc = MLCLeafPositions(
            bank_a=[-10.0, -10.0, -10.0, -10.0],
            bank_b=[10.0, 10.0, 10.0, 10.0],
        )
        leaf_widths = [5.0, 5.0, 5.0, 5.0]
        
        lsv = calculate_lsv(mlc, leaf_widths)
        
        # Uniform positions should give high LSV (close to 1)
        assert lsv == pytest.approx(1.0, rel=0.01)
    
    def test_lsv_variable(self):
        """Test LSV with variable leaf positions."""
        mlc = MLCLeafPositions(
            bank_a=[-50.0, -10.0, -30.0, -20.0],
            bank_b=[50.0, 10.0, 30.0, 20.0],
        )
        leaf_widths = [5.0, 5.0, 5.0, 5.0]
        
        lsv = calculate_lsv(mlc, leaf_widths)
        
        # Variable positions should give lower LSV
        assert 0.0 < lsv < 1.0
    
    def test_leaf_gap(self):
        """Test average leaf gap calculation."""
        mlc = MLCLeafPositions(
            bank_a=[-10.0, -15.0, -5.0],
            bank_b=[10.0, 15.0, 5.0],
        )
        
        gap = calculate_leaf_gap(mlc)
        
        # Average gap: (20 + 30 + 10) / 3 = 20
        assert gap == pytest.approx(20.0, rel=0.01)
    
    def test_leaf_gap_partial_closed(self):
        """Test leaf gap with some closed leaves."""
        mlc = MLCLeafPositions(
            bank_a=[-10.0, 0.0, -10.0],
            bank_b=[10.0, 0.0, 10.0],
        )
        
        gap = calculate_leaf_gap(mlc)
        
        # Only 2 leaves are open: (20 + 20) / 2 = 20
        assert gap == pytest.approx(20.0, rel=0.01)
    
    def test_mad_centered(self):
        """Test MAD with centered apertures."""
        mlc = MLCLeafPositions(
            bank_a=[-10.0, -10.0, -10.0],
            bank_b=[10.0, 10.0, 10.0],
        )
        
        mad = calculate_mad(mlc)
        
        # All apertures centered at 0, MAD should be 0
        assert mad == pytest.approx(0.0, rel=0.01)
    
    def test_mad_asymmetric(self):
        """Test MAD with asymmetric apertures."""
        mlc = MLCLeafPositions(
            bank_a=[0.0, 0.0, 0.0],
            bank_b=[20.0, 20.0, 20.0],
        )
        
        mad = calculate_mad(mlc)
        
        # Center of each aperture is at +10, so MAD = 10
        assert mad == pytest.approx(10.0, rel=0.01)


class TestBeamMetrics:
    """Test beam-level metrics calculation."""
    
    def create_simple_beam(self) -> Beam:
        """Create a simple beam for testing."""
        control_points = [
            ControlPoint(
                index=0,
                gantry_angle=0.0,
                gantry_rotation_direction="CW",
                beam_limiting_device_angle=0.0,
                cumulative_meterset_weight=0.0,
                mlc_positions=MLCLeafPositions(
                    bank_a=[-10.0] * 60,
                    bank_b=[10.0] * 60,
                ),
                jaw_positions=JawPositions(x1=-50, x2=50, y1=-50, y2=50),
            ),
            ControlPoint(
                index=1,
                gantry_angle=90.0,
                gantry_rotation_direction="CW",
                beam_limiting_device_angle=0.0,
                cumulative_meterset_weight=1.0,
                mlc_positions=MLCLeafPositions(
                    bank_a=[-15.0] * 60,
                    bank_b=[15.0] * 60,
                ),
                jaw_positions=JawPositions(x1=-50, x2=50, y1=-50, y2=50),
            ),
        ]
        
        return Beam(
            beam_number=1,
            beam_name="Test Arc",
            beam_type="DYNAMIC",
            radiation_type="PHOTON",
            treatment_delivery_type="TREATMENT",
            number_of_control_points=2,
            control_points=control_points,
            final_cumulative_meterset_weight=1.0,
            beam_dose=100.0,
            gantry_angle_start=0.0,
            gantry_angle_end=90.0,
            is_arc=True,
            mlc_leaf_widths=[5.0] * 60,
            number_of_leaves=60,
        )
    
    def test_beam_metrics_calculation(self):
        """Test beam metrics calculation."""
        beam = self.create_simple_beam()
        metrics = calculate_beam_metrics(beam)
        
        assert metrics.beam_number == 1
        assert metrics.beam_name == "Test Arc"
        assert metrics.beam_mu == 100.0
        assert metrics.number_of_control_points == 2
        
        # Check that primary metrics are calculated
        assert 0.0 <= metrics.MCS <= 1.0
        assert 0.0 <= metrics.LSV <= 1.0
        assert metrics.AAV >= 0.0
        assert metrics.MFA >= 0.0
        assert metrics.LT >= 0.0


class TestPlanMetrics:
    """Test plan-level metrics calculation."""
    
    def create_simple_plan(self) -> RTPlan:
        """Create a simple plan for testing."""
        control_points = [
            ControlPoint(
                index=0,
                gantry_angle=0.0,
                gantry_rotation_direction="CW",
                beam_limiting_device_angle=0.0,
                cumulative_meterset_weight=0.0,
                mlc_positions=MLCLeafPositions(
                    bank_a=[-10.0] * 60,
                    bank_b=[10.0] * 60,
                ),
                jaw_positions=JawPositions(x1=-50, x2=50, y1=-50, y2=50),
            ),
            ControlPoint(
                index=1,
                gantry_angle=180.0,
                gantry_rotation_direction="CW",
                beam_limiting_device_angle=0.0,
                cumulative_meterset_weight=1.0,
                mlc_positions=MLCLeafPositions(
                    bank_a=[-20.0] * 60,
                    bank_b=[20.0] * 60,
                ),
                jaw_positions=JawPositions(x1=-50, x2=50, y1=-50, y2=50),
            ),
        ]
        
        beam = Beam(
            beam_number=1,
            beam_name="Arc 1",
            beam_type="DYNAMIC",
            radiation_type="PHOTON",
            treatment_delivery_type="TREATMENT",
            number_of_control_points=2,
            control_points=control_points,
            final_cumulative_meterset_weight=1.0,
            beam_dose=500.0,
            gantry_angle_start=0.0,
            gantry_angle_end=180.0,
            is_arc=True,
            mlc_leaf_widths=[5.0] * 60,
            number_of_leaves=60,
        )
        
        return RTPlan(
            patient_id="TEST",
            patient_name="Test",
            plan_label="Test Plan",
            plan_name="Test",
            beams=[beam],
            fraction_groups=[],
            total_mu=500.0,
            technique=Technique.VMAT,
        )
    
    def test_plan_metrics_calculation(self):
        """Test plan metrics calculation."""
        plan = self.create_simple_plan()
        metrics = calculate_plan_metrics(plan)
        
        assert metrics.plan_label == "Test Plan"
        assert metrics.total_mu == 500.0
        assert len(metrics.beam_metrics) == 1
        
        # Primary metrics should be valid
        assert 0.0 <= metrics.MCS <= 1.0
        assert 0.0 <= metrics.LSV <= 1.0
        assert metrics.AAV >= 0.0
        assert metrics.MFA >= 0.0
        assert metrics.LT >= 0.0


class TestReferenceData:
    """Test metrics against reference data from TypeScript."""
    
    @pytest.fixture
    def reference_data(self):
        """Load reference data if available."""
        ref_path = Path(__file__).parent / "reference_data" / "expected_metrics.json"
        if not ref_path.exists():
            pytest.skip("Reference data not found. Run generate_reference_data.ts first.")
        
        with open(ref_path) as f:
            return json.load(f)
    
    @pytest.fixture
    def test_data_dir(self):
        """Get test data directory."""
        candidates = [
            Path(__file__).parent.parent.parent / "public" / "test-data",
        ]
        for path in candidates:
            if path.exists():
                return path
        pytest.skip("Test data directory not found")
    
    def test_metrics_match_reference(self, reference_data, test_data_dir):
        """Test that calculated metrics match TypeScript reference."""
        tolerance = 1e-4  # Allow small floating-point differences
        
        for filename, expected in reference_data.items():
            file_path = test_data_dir / filename
            if not file_path.exists():
                continue
            
            plan = parse_rtplan(str(file_path))
            metrics = calculate_plan_metrics(plan)
            
            # Compare primary metrics
            assert metrics.MCS == pytest.approx(expected["MCS"], abs=tolerance), \
                f"{filename}: MCS mismatch"
            assert metrics.LSV == pytest.approx(expected["LSV"], abs=tolerance), \
                f"{filename}: LSV mismatch"
            assert metrics.AAV == pytest.approx(expected["AAV"], abs=tolerance), \
                f"{filename}: AAV mismatch"
            assert metrics.MFA == pytest.approx(expected["MFA"], abs=tolerance), \
                f"{filename}: MFA mismatch"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
