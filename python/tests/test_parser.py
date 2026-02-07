"""
Parser tests for rtplan_complexity.

Tests DICOM RT Plan parsing against reference data.
"""

import pytest
from pathlib import Path
import sys

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from rtplan_complexity import parse_rtplan
from rtplan_complexity.types import RTPlan, Technique


class TestParser:
    """Test cases for DICOM parser."""
    
    def test_import(self):
        """Test that parse_rtplan can be imported."""
        assert parse_rtplan is not None
    
    def test_rtplan_dataclass(self):
        """Test RTPlan dataclass structure."""
        plan = RTPlan(
            patient_id="TEST123",
            patient_name="Test Patient",
            plan_label="Test Plan",
            plan_name="Test",
            beams=[],
            fraction_groups=[],
            total_mu=0,
            technique=Technique.UNKNOWN,
        )
        
        assert plan.patient_id == "TEST123"
        assert plan.plan_label == "Test Plan"
        assert plan.technique == Technique.UNKNOWN
        assert len(plan.beams) == 0
    
    def test_technique_enum(self):
        """Test Technique enum values."""
        assert Technique.VMAT.value == "VMAT"
        assert Technique.IMRT.value == "IMRT"
        assert Technique.CONFORMAL.value == "CONFORMAL"
        assert Technique.UNKNOWN.value == "UNKNOWN"


class TestParserWithFiles:
    """Test cases that require actual DICOM files."""
    
    @pytest.fixture
    def test_data_dir(self):
        """Get test data directory."""
        # Check multiple possible locations
        candidates = [
            Path(__file__).parent.parent.parent / "public" / "test-data",
            Path(__file__).parent / "reference_data",
        ]
        for path in candidates:
            if path.exists():
                return path
        pytest.skip("Test data directory not found")
    
    def test_parse_sample_file(self, test_data_dir):
        """Test parsing a sample DICOM file."""
        dcm_files = list(test_data_dir.glob("*.dcm"))
        
        if not dcm_files:
            pytest.skip("No DICOM files in test data directory")
        
        file_path = dcm_files[0]
        plan = parse_rtplan(str(file_path))
        
        # Basic validation
        assert isinstance(plan, RTPlan)
        assert plan.plan_label != ""
        assert len(plan.beams) > 0
        
        # Beam validation
        for beam in plan.beams:
            assert beam.beam_number > 0
            assert beam.beam_name != ""
            assert len(beam.control_points) > 0
    
    def test_parse_all_files(self, test_data_dir):
        """Test parsing all available DICOM files."""
        dcm_files = list(test_data_dir.glob("*.dcm"))
        
        if not dcm_files:
            pytest.skip("No DICOM files in test data directory")
        
        results = []
        for file_path in dcm_files:
            try:
                plan = parse_rtplan(str(file_path))
                results.append((file_path.name, "OK", plan))
            except Exception as e:
                results.append((file_path.name, "FAILED", str(e)))
        
        # At least some files should parse successfully
        successful = [r for r in results if r[1] == "OK"]
        assert len(successful) > 0, f"No files parsed successfully: {results}"
        
        # Print summary
        for name, status, data in results:
            if status == "OK":
                print(f"  {name}: {len(data.beams)} beams, {data.technique.value}")
            else:
                print(f"  {name}: {status} - {data}")


class TestMLCParsing:
    """Test MLC position parsing."""
    
    def test_mlc_positions_structure(self):
        """Test MLCLeafPositions structure."""
        from rtplan_complexity.types import MLCLeafPositions
        
        mlc = MLCLeafPositions(
            bank_a=[-50.0, -45.0, -40.0],
            bank_b=[50.0, 45.0, 40.0],
        )
        
        assert len(mlc.bank_a) == 3
        assert len(mlc.bank_b) == 3
        assert mlc.bank_a[0] == -50.0
        assert mlc.bank_b[0] == 50.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
