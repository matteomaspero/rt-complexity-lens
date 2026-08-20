"""
RTSTRUCT conformality tests (BAM/PAM, TCOV, ATR, MARG, MARGMIN).

Mirrors src/test/conformality.test.ts: the same analytic cases are asserted on
both sides so TypeScript and Python geometry stay in lockstep.
"""

import pytest
import math
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from shapely.geometry import Polygon

from rtplan_complexity.types import (
    Structure,
    ContourSequence,
    Beam,
    ControlPoint,
    MLCLeafPositions,
    JawPositions,
    RTPlan,
)
from rtplan_complexity.conformality import (
    DEFAULT_SAD,
    build_aperture_polygon,
    calculate_beam_conformality,
    compute_conformality,
    pick_default_target,
    project_patient_point_to_bev,
    project_target_to_bev,
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


def _square(cx, cy, half):
    return Polygon([
        (cx - half, cy - half),
        (cx + half, cy - half),
        (cx + half, cy + half),
        (cx - half, cy + half),
    ])


class TestBEVProjection:
    """Divergent BEV projection (IEC 61217 couch -> gantry -> collimator)."""

    def test_isocentre_maps_to_origin(self):
        assert project_patient_point_to_bev((0.0, 0.0, 0.0), 0.0) == (0.0, 0.0)

    def test_in_plane_point_no_divergence(self):
        # Patient x -> BEV x, patient z (superior) -> BEV y; depth = 0 here
        x, y = project_patient_point_to_bev((10.0, 0.0, 20.0), gantry_angle=0.0)
        assert x == pytest.approx(10.0, abs=1e-9)
        assert y == pytest.approx(20.0, abs=1e-9)

    def test_divergence_scales_upstream_point(self):
        # 100 mm anterior of isocentre at gantry 0 -> closer to the source
        x, y = project_patient_point_to_bev((10.0, -100.0, 0.0), gantry_angle=0.0)
        assert x == pytest.approx(10.0 * DEFAULT_SAD / 900.0, abs=1e-6)
        assert y == pytest.approx(0.0, abs=1e-9)

    def test_gantry_90(self):
        x, y = project_patient_point_to_bev((10.0, 0.0, 20.0), gantry_angle=90.0)
        scale = DEFAULT_SAD / 990.0
        assert x == pytest.approx(0.0, abs=1e-6)
        assert y == pytest.approx(20.0 * scale, abs=1e-6)

    def test_collimator_90_rotates_mlc_frame(self):
        x, y = project_patient_point_to_bev(
            (10.0, 0.0, 20.0), gantry_angle=0.0, collimator_angle=90.0
        )
        assert x == pytest.approx(20.0, abs=1e-6)
        assert y == pytest.approx(-10.0, abs=1e-6)


class TestTargetSilhouette:
    """Convex-hull silhouette of the projected contour cloud."""

    def make_box_structure(self):
        """20 mm cube around isocentre, two contour slices."""
        contours = []
        for z in (-10.0, 10.0):
            contours.append(ContourSequence(points=[
                (-10.0, -10.0, z),
                (10.0, -10.0, z),
                (10.0, 10.0, z),
                (-10.0, 10.0, z),
            ]))
        return Structure(name="PTV", number=1, contours=contours)

    def make_cp(self, gantry=0.0):
        return ControlPoint(
            index=0,
            gantry_angle=gantry,
            gantry_rotation_direction="NONE",
            beam_limiting_device_angle=0.0,
            cumulative_meterset_weight=1.0,
            mlc_positions=MLCLeafPositions(bank_a=[-30.0], bank_b=[30.0]),
            jaw_positions=JawPositions(x1=-40, x2=40, y1=-20, y2=20),
        )

    def test_projected_cube_is_about_20x20(self):
        poly = project_target_to_bev(self.make_box_structure(), self.make_cp())
        assert poly is not None
        # 20 x 20 silhouette, slightly magnified by divergence (< 3%)
        assert poly.area == pytest.approx(400.0, rel=0.05)

    def test_too_few_points_returns_none(self):
        s = Structure(name="X", number=1, contours=[
            ContourSequence(points=[(0.0, 0.0, 0.0), (1.0, 0.0, 0.0)])
        ])
        assert project_target_to_bev(s, self.make_cp()) is None

    def test_contour_to_bev_polygon_wrapper(self):
        pts = [(-10.0, -10.0, -10.0), (10.0, -10.0, -10.0), (10.0, 10.0, 10.0), (-10.0, 10.0, 10.0)]
        poly = contour_to_bev_polygon(pts, gantry_angle_deg=0.0)
        assert poly is not None and poly.area > 0
        assert contour_to_bev_polygon([], gantry_angle_deg=0.0) is None


class TestAperturePolygon:
    """MLC + jaw aperture polygon."""

    def test_symmetric_two_leaf_pairs(self):
        poly = get_aperture_polygon(
            MLCLeafPositions(bank_a=[-10.0, -10.0], bank_b=[10.0, 10.0]),
            JawPositions(x1=-50, x2=50, y1=-10, y2=10),
            [-10.0, 0.0, 10.0],
        )
        assert poly is not None
        assert poly.area == pytest.approx(400.0, rel=0.01)

    def test_closed_leaves_return_none(self):
        poly = get_aperture_polygon(
            MLCLeafPositions(bank_a=[10.0], bank_b=[15.0]),
            JawPositions(x1=-50, x2=50, y1=-10, y2=10),
            [-10.0, 10.0],
        )
        # bank_b > bank_a means an open 5 mm gap; a truly closed pair is a == b
        assert poly is not None
        closed = get_aperture_polygon(
            MLCLeafPositions(bank_a=[0.0], bank_b=[0.0]),
            JawPositions(x1=-50, x2=50, y1=-10, y2=10),
            [-10.0, 10.0],
        )
        assert closed is None

    def test_y_jaw_clipping(self):
        poly = get_aperture_polygon(
            MLCLeafPositions(bank_a=[-20.0], bank_b=[20.0]),
            JawPositions(x1=-50, x2=50, y1=-5, y2=5),
            [-20.0, 20.0],
        )
        assert poly is not None
        assert poly.area == pytest.approx(400.0, rel=0.01)


class TestConformalityQuantities:
    """Analytic coverage / ratio / margin cases."""

    def test_concentric_squares(self):
        res = compute_conformality(_square(0, 0, 30), _square(0, 0, 20))
        assert res is not None
        assert res.coverage == pytest.approx(1.0, abs=1e-9)
        assert res.blocked_fraction == pytest.approx(0.0, abs=1e-9)
        assert res.aperture_target_ratio == pytest.approx(3600.0 / 1600.0, rel=1e-9)
        assert res.margin_min == pytest.approx(10.0, abs=1e-6)
        assert res.margin_mean >= res.margin_min

    def test_half_covered_target(self):
        aperture = Polygon([(0, -20), (40, -20), (40, 20), (0, 20)])
        res = compute_conformality(aperture, _square(0, 0, 20))
        assert res is not None
        assert res.coverage == pytest.approx(0.5, abs=1e-9)
        assert res.aperture_target_ratio == pytest.approx(1.0, rel=1e-9)

    def test_no_target_returns_none(self):
        assert compute_conformality(_square(0, 0, 30), None) is None

    def test_empty_aperture_blocks_target(self):
        res = compute_conformality(None, _square(0, 0, 20))
        assert res is not None
        assert res.coverage == pytest.approx(0.0, abs=1e-9)
        assert res.blocked_fraction == pytest.approx(1.0, abs=1e-9)
        assert res.aperture_target_ratio == pytest.approx(0.0, abs=1e-9)


class TestBeamAndPlanAggregation:
    """MU-weighted aggregation across control points and beams."""

    def make_structure(self):
        contours = []
        for z in (-10.0, 10.0):
            contours.append(ContourSequence(points=[
                (-10.0, -10.0, z),
                (10.0, -10.0, z),
                (10.0, 10.0, z),
                (-10.0, 10.0, z),
            ]))
        return Structure(name="PTV", number=1, contours=contours)

    def make_beam(self, bank_a=-30.0, bank_b=30.0):
        cps = []
        for i, w in enumerate((0.0, 1.0)):
            cps.append(ControlPoint(
                index=i,
                gantry_angle=0.0,
                gantry_rotation_direction="NONE",
                beam_limiting_device_angle=0.0,
                cumulative_meterset_weight=w,
                mlc_positions=MLCLeafPositions(bank_a=[bank_a], bank_b=[bank_b]),
                jaw_positions=JawPositions(x1=-40, x2=40, y1=-30, y2=30),
            ))
        return Beam(
            beam_number=1,
            beam_name="B1",
            beam_type="STATIC",
            radiation_type="PHOTON",
            treatment_delivery_type="TREATMENT",
            number_of_control_points=2,
            control_points=cps,
            number_of_leaves=1,
            mlc_leaf_widths=[60.0],
            mlc_leaf_boundaries=[-30.0, 30.0],
        )

    def test_open_aperture_covers_target(self):
        conf = calculate_beam_conformality(self.make_beam(), self.make_structure())
        assert conf is not None
        assert conf.TCOV == pytest.approx(1.0, abs=1e-6)
        assert conf.BAM == pytest.approx(0.0, abs=1e-6)
        assert conf.ATR > 1.0
        assert conf.MARGMIN > 0.0

    def test_closed_aperture_blocks_target(self):
        conf = calculate_beam_conformality(self.make_beam(0.0, 0.0), self.make_structure())
        assert conf is not None
        assert conf.TCOV == pytest.approx(0.0, abs=1e-9)
        assert conf.BAM == pytest.approx(1.0, abs=1e-9)

    def test_no_structure_returns_none(self):
        assert calculate_beam_conformality(self.make_beam(), None) is None

    def test_wrappers(self):
        beam = self.make_beam()
        structure = self.make_structure()
        assert calculate_pam_control_point(structure, beam, 1) == pytest.approx(0.0, abs=1e-6)
        assert calculate_pam_beam(structure, beam) == pytest.approx(0.0, abs=1e-6)

        plan = RTPlan(
            patient_id="TEST",
            patient_name="Test",
            plan_label="TestPlan",
            plan_name="TestPlan",
            beams=[beam],
        )
        assert calculate_pam_plan(plan, structure) == pytest.approx(0.0, abs=1e-6)
        assert calculate_pam_plan(plan, None) is None

    def test_aperture_modulation_wrapper(self):
        am = calculate_aperture_modulation(_square(0, 0, 20), _square(0, 0, 30))
        assert am == pytest.approx(0.0, abs=1e-9)
        am_blocked = calculate_aperture_modulation(
            Polygon([(-30, -5), (-10, -5), (-10, 5), (-30, 5)]),
            Polygon([(10, -5), (30, -5), (30, 5), (10, 5)]),
        )
        assert am_blocked == pytest.approx(1.0, abs=1e-9)

    def test_project_point_to_bev_wrapper_matches_core(self):
        assert project_point_to_bev((10.0, 0.0, 20.0), 0.0) == project_patient_point_to_bev(
            (10.0, 0.0, 20.0), 0.0
        )


class TestDefaultTargetPick:
    def test_prefers_ptv_then_ctv_then_gtv(self):
        structures = {
            "Bladder": Structure(name="Bladder", number=1, contours=[ContourSequence(points=[(0, 0, 0)])]),
            "CTV_1": Structure(name="CTV_1", number=2, contours=[ContourSequence(points=[(0, 0, 0)])]),
            "PTV_high": Structure(name="PTV_high", number=3, contours=[ContourSequence(points=[(0, 0, 0)])]),
        }
        assert pick_default_target(structures).name == "PTV_high"
        del structures["PTV_high"]
        assert pick_default_target(structures).name == "CTV_1"
        assert pick_default_target({}) is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
