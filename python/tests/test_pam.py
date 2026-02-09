"""
Plan Aperture Modulation (PAM) metric tests.

Tests PAM calculation functions including:
- BEV projection and polygon generation
- Aperture polygon creation
- Aperture modulation calculation
- Full PAM/BAM computation
"""

import pytest
import math
from pathlib import Path
import sys

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from rtplan_complexity.types import (
    Structure,
    ContourSequence,
    Beam,
    ControlPoint,
    MLCLeafPositions,
    JawPositions,
    RTPlan,
)
from rtplan_complexity.metrics import (
    project_point_to_bev,
    contour_to_bev_polygon,
    get_aperture_polygon,
    calculate_aperture_modulation,
    calculate_pam_control_point,
    calculate_pam_beam,
    calculate_pam_plan,
)


class TestBEVProjection:
    """Test BEV (Beam's Eye View) projection functions."""
    
    def test_project_point_to_bev_zero_gantry(self):
        """Test BEV projection with 0° gantry angle."""
        # At 0° gantry, X-axis should align with patient X, Y stays same
        point_3d = (10.0, 20.0, 5.0)
        x_bev, y_bev = project_point_to_bev(point_3d, gantry_angle_deg=0.0)
        
        # Z projects to X in BEV, Y stays same
        assert x_bev == pytest.approx(10.0, abs=0.01)
        assert y_bev == pytest.approx(20.0, abs=0.01)
    
    def test_project_point_to_bev_90_degree_gantry(self):
        """Test BEV projection with 90° gantry angle."""
        # At 90° gantry, X-axis should go towards patient Z
        point_3d = (10.0, 20.0, 5.0)
        x_bev, y_bev = project_point_to_bev(point_3d, gantry_angle_deg=90.0)
        
        # Z projects to X in BEV (sin(90°)=1), Y stays same
        assert x_bev == pytest.approx(5.0, abs=0.01)
        assert y_bev == pytest.approx(20.0, abs=0.01)
    
    def test_project_point_to_bev_180_degree_gantry(self):
        """Test BEV projection with 180° gantry angle."""
        point_3d = (10.0, 20.0, 5.0)
        x_bev, y_bev = project_point_to_bev(point_3d, gantry_angle_deg=180.0)
        
        # X-axis inverts (cos(180°)=-1), Z projects to -X (sin(180°)≈0)
        assert x_bev == pytest.approx(-10.0, abs=0.01)
        assert y_bev == pytest.approx(20.0, abs=0.01)


class TestBEVPolygonGeneration:
    """Test conversion of 3D contours to BEV polygons."""
    
    def test_contour_to_bev_polygon_square(self):
        """Test creating a square polygon in BEV."""
        # Square target in XY plane, centered at isocenter
        contour_points = [
            (-5.0, -5.0, 0.0),
            (5.0, -5.0, 0.0),
            (5.0, 5.0, 0.0),
            (-5.0, 5.0, 0.0),
        ]
        
        poly = contour_to_bev_polygon(contour_points, gantry_angle_deg=0.0)
        
        assert poly is not None
        assert poly.is_valid
        # Square with 10x10 area
        assert poly.area == pytest.approx(100.0, rel=0.01)
    
    def test_contour_to_bev_polygon_empty(self):
        """Test that empty contour returns None."""
        poly = contour_to_bev_polygon([], gantry_angle_deg=0.0)
        assert poly is None
    
    def test_contour_to_bev_polygon_too_few_points(self):
        """Test that contour with < 3 points returns None."""
        contour_points = [(0.0, 0.0, 0.0), (1.0, 0.0, 0.0)]
        poly = contour_to_bev_polygon(contour_points, gantry_angle_deg=0.0)
        assert poly is None


class TestAperturePolygon:
    """Test aperture polygon generation from MLC/jaw positions."""
    
    def test_aperture_polygon_simple_symmetric(self):
        """Test simple symmetric aperture."""
        mlc_pos = MLCLeafPositions(
            bank_a=[-10.0, -10.0],
            bank_b=[10.0, 10.0],
        )
        jaw_pos = JawPositions(x1=-50, x2=50, y1=-10, y2=10)
        leaf_bounds = [-10.0, 0.0, 10.0]  # 2 leaf pairs
        
        aperture_poly = get_aperture_polygon(mlc_pos, jaw_pos, leaf_bounds)
        
        assert aperture_poly is not None
        # 2 leaves, each 10mm wide, 20mm opening = 2 * 10 * 20 = 400 mm²
        assert aperture_poly.area == pytest.approx(400.0, rel=0.01)
    
    def test_aperture_polygon_fully_blocked(self):
        """Test aperture with no opening (fully blocked)."""
        mlc_pos = MLCLeafPositions(
            bank_a=[10.0],  # Bank A to right
            bank_b=[15.0],  # Bank B to far right, no opening
        )
        jaw_pos = JawPositions(x1=-50, x2=50, y1=-10, y2=10)
        leaf_bounds = [-10.0, 10.0]
        
        aperture_poly = get_aperture_polygon(mlc_pos, jaw_pos, leaf_bounds)
        
        assert aperture_poly is None  # No opening
    
    def test_aperture_polygon_clipped_by_jaw(self):
        """Test aperture clipping by jaw boundaries."""
        mlc_pos = MLCLeafPositions(
            bank_a=[-20.0],
            bank_b=[20.0],
        )
        # Narrow Y-jaw opening
        jaw_pos = JawPositions(x1=-50, x2=50, y1=-5, y2=5)
        leaf_bounds = [-20.0, 20.0]
        
        aperture_poly = get_aperture_polygon(mlc_pos, jaw_pos, leaf_bounds)
        
        assert aperture_poly is not None
        # Opening narrowed to 10mm by jaws (y: -5 to 5), width 40mm (x)
        assert aperture_poly.area == pytest.approx(400.0, rel=0.01)


class TestApertureModulation:
    """Test aperture modulation calculation."""
    
    def test_aperture_modulation_fully_unblocked(self):
        """Test when target is fully within aperture."""
        from shapely.geometry import Polygon
        
        # Target: 10x10 square
        target_poly = Polygon([[-5, -5], [5, -5], [5, 5], [-5, 5]])
        # Aperture: larger 20x20 square
        aperture_poly = Polygon([[-10, -10], [10, -10], [10, 10], [-10, 10]])
        
        am = calculate_aperture_modulation(target_poly, aperture_poly)
        
        # Target fully within aperture = 0% blocked = AM = 0
        assert am == pytest.approx(0.0, abs=0.01)
    
    def test_aperture_modulation_fully_blocked(self):
        """Test when target is fully outside aperture."""
        from shapely.geometry import Polygon
        
        # Target: 10x10 square at left
        target_poly = Polygon([[-15, -5], [-5, -5], [-5, 5], [-15, 5]])
        # Aperture: 10x10 square at right
        aperture_poly = Polygon([[5, -5], [15, -5], [15, 5], [5, 5]])
        
        am = calculate_aperture_modulation(target_poly, aperture_poly)
        
        # No overlap = 100% blocked = AM = 1
        assert am == pytest.approx(1.0, abs=0.01)
    
    def test_aperture_modulation_partial_overlap(self):
        """Test partial overlap between target and aperture."""
        from shapely.geometry import Polygon
        
        # Target: 10x10 square from -5 to 5
        target_poly = Polygon([[-5, -5], [5, -5], [5, 5], [-5, 5]])
        # Aperture: 10x10 square from 0 to 10 (half overlap)
        aperture_poly = Polygon([[0, -5], [10, -5], [10, 5], [0, 5]])
        
        am = calculate_aperture_modulation(target_poly, aperture_poly)
        
        # 50% overlap = 50% unblocked = AM = 0.5
        assert am == pytest.approx(0.5, abs=0.01)


class TestPAMCalculation:
    """Test complete PAM/BAM calculation."""
    
    def create_test_structure(self):
        """Helper to create a simple test structure (10x10 box at isocenter)."""
        contour_points = [
            (-5.0, -5.0, 0.0),
            (5.0, -5.0, 0.0),
            (5.0, 5.0, 0.0),
            (-5.0, 5.0, 0.0),
        ]
        contour = ContourSequence(points=contour_points)
        return Structure(name="Target", number=1, contours=[contour])
    
    def create_test_beam(self):
        """Helper to create a simple test beam."""
        # Single control point with symmetric aperture
        cp1 = ControlPoint(
            index=0,
            gantry_angle=0.0,
            gantry_rotation_direction="NONE",
            beam_limiting_device_angle=0.0,
            cumulative_meterset_weight=0.0,
            mlc_positions=MLCLeafPositions(bank_a=[-10.0], bank_b=[10.0]),
            jaw_positions=JawPositions(x1=-50, x2=50, y1=-50, y2=50),
        )
        cp2 = ControlPoint(
            index=1,
            gantry_angle=0.0,
            gantry_rotation_direction="NONE",
            beam_limiting_device_angle=0.0,
            cumulative_meterset_weight=1.0,
            mlc_positions=MLCLeafPositions(bank_a=[-10.0], bank_b=[10.0]),
            jaw_positions=JawPositions(x1=-50, x2=50, y1=-50, y2=50),
        )
        
        beam = Beam(
            beam_number=1,
            beam_name="Beam 1",
            beam_type="STATIC",
            radiation_type="PHOTON",
            treatment_delivery_type="TREATMENT",
            number_of_control_points=2,
            control_points=[cp1, cp2],
            number_of_leaves=1,
            mlc_leaf_widths=[20.0],
            mlc_leaf_boundaries=[-10.0, 10.0],
        )
        return beam
    
    def test_pam_fully_unblocked(self):
        """Test PAM when target is fully unblocked."""
        structure = self.create_test_structure()
        beam = self.create_test_beam()
        
        # With large aperture, target should be fully unblocked
        am = calculate_pam_control_point(structure, beam, 1)
        assert am is not None
        assert am == pytest.approx(0.0, abs=0.01)
    
    def test_pam_fully_blocked(self):
        """Test PAM when target is fully blocked by MLC."""
        structure = self.create_test_structure()
        
        # Create beam where both MLCs are closed
        cp1 = ControlPoint(
            index=0,
            gantry_angle=0.0,
            gantry_rotation_direction="NONE",
            beam_limiting_device_angle=0.0,
            cumulative_meterset_weight=0.0,
            mlc_positions=MLCLeafPositions(bank_a=[0.0], bank_b=[0.0]),  # Closed
            jaw_positions=JawPositions(x1=-50, x2=50, y1=-50, y2=50),
        )
        cp2 = ControlPoint(
            index=1,
            gantry_angle=0.0,
            gantry_rotation_direction="NONE",
            beam_limiting_device_angle=0.0,
            cumulative_meterset_weight=1.0,
            mlc_positions=MLCLeafPositions(bank_a=[0.0], bank_b=[0.0]),  # Closed
            jaw_positions=JawPositions(x1=-50, x2=50, y1=-50, y2=50),
        )
        
        beam = Beam(
            beam_number=1,
            beam_name="Beam 1",
            beam_type="STATIC",
            radiation_type="PHOTON",
            treatment_delivery_type="TREATMENT",
            number_of_control_points=2,
            control_points=[cp1, cp2],
            number_of_leaves=1,
            mlc_leaf_widths=[20.0],
            mlc_leaf_boundaries=[-10.0, 10.0],
        )
        
        am = calculate_pam_control_point(structure, beam, 1)
        # With closed aperture, target fully blocked
        assert am == pytest.approx(1.0, abs=0.01)
    
    def test_bam_calculation(self):
        """Test BAM (Beam Aperture Modulation) calculation."""
        structure = self.create_test_structure()
        beam = self.create_test_beam()
        
        bam = calculate_pam_beam(structure, beam)
        
        assert bam is not None
        # With large aperture, target fully unblocked
        assert bam == pytest.approx(0.0, abs=0.05)
    
    def test_pam_calculation(self):
        """Test full PAM calculation with complete plan."""
        structure = self.create_test_structure()
        beam = self.create_test_beam()
        
        plan = RTPlan(
            patient_id="TEST001",
            patient_name="Test Patient",
            plan_label="TestPlan",
            plan_name="TestPlan",
            beams=[beam],
        )
        
        pam = calculate_pam_plan(plan, structure)
        
        assert pam is not None
        # With large aperture, target fully unblocked
        assert pam == pytest.approx(0.0, abs=0.05)


class TestPAMEdgeCases:
    """Test edge cases and error handling."""
    
    def test_pam_with_none_structure(self):
        """Test that None structure returns None."""
        beam = Beam(
            beam_number=1,
            beam_name="Beam 1",
            beam_type="STATIC",
            radiation_type="PHOTON",
            treatment_delivery_type="TREATMENT",
            number_of_control_points=1,
            control_points=[ControlPoint(
                index=0,
                gantry_angle=0.0,
                gantry_rotation_direction="NONE",
                beam_limiting_device_angle=0.0,
                cumulative_meterset_weight=1.0,
            )],
        )
        plan = RTPlan(
            patient_id="TEST",
            patient_name="Test",
            plan_label="Test",
            plan_name="Test",
            beams=[beam],
        )
        
        pam = calculate_pam_plan(plan, None)
        assert pam is None
    
    def test_pam_with_empty_structure(self):
        """Test that structure with no contours returns None."""
        structure = Structure(name="Empty", number=1, contours=[])
        beam = Beam(
            beam_number=1,
            beam_name="Beam 1",
            beam_type="STATIC",
            radiation_type="PHOTON",
            treatment_delivery_type="TREATMENT",
            number_of_control_points=1,
            control_points=[ControlPoint(
                index=0,
                gantry_angle=0.0,
                gantry_rotation_direction="NONE",
                beam_limiting_device_angle=0.0,
                cumulative_meterset_weight=1.0,
            )],
        )
        
        am = calculate_pam_control_point(structure, beam, 0)
        assert am is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
