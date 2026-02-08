# 📦 rtplan-complexity Package Status

## ✅ Package is Ready for pip Installation!

The Python package is **fully configured** and ready to be installed with pip, either from source or from PyPI (once published).

---

## 📋 What's Been Set Up

### ✅ Core Configuration Files

1. **`pyproject.toml`** - Modern Python package configuration
   - Package metadata (name, version, description)
   - Dependencies (core + optional)
   - Build system configuration
   - Entry points for CLI
   - Development tools configuration (pytest, black, mypy, ruff)

2. **`MANIFEST.in`** - Includes non-Python files in distribution
   - README.md
   - LICENSE
   - requirements.txt
   - Test files

3. **`LICENSE`** - CC BY-NC-SA 4.0 license file

4. **`README.md`** - Comprehensive documentation with examples

5. **`requirements.txt`** - Dependency list for pip

### ✅ Package Structure

```
python/
├── pyproject.toml          # Main package config (modern way)
├── MANIFEST.in             # Include non-Python files
├── LICENSE                 # CC BY-NC-SA 4.0
├── README.md               # Documentation
├── INSTALL.md              # Detailed install guide
├── requirements.txt        # Dependencies
├── build_package.py        # Build automation script
├── verify_package.py       # Test installation
│
├── rtplan_complexity/      # Main package
│   ├── __init__.py        # Exports all public API
│   ├── types.py           # Type definitions
│   ├── parser.py          # DICOM parser
│   ├── metrics.py         # Metrics calculation (30+ metrics)
│   ├── statistics.py      # Statistical analysis
│   ├── clustering.py      # Cohort clustering
│   ├── correlation.py     # Correlation analysis
│   ├── export.py          # CSV/JSON export
│   └── visualization/     # Plotting functions
│       ├── __init__.py
│       ├── box_plots.py
│       ├── heatmap.py
│       ├── scatter_matrix.py
│       └── violin.py
│
└── tests/                  # Test suite
    ├── test_metrics.py
    ├── test_parser.py
    ├── test_statistics.py
    └── reference_data/     # Cross-validation data
```

---

## 🚀 Installation Methods

### Method 1: Install from Source (Current)

```bash
# Clone repo
git clone https://github.com/matteomaspero/rt-complexity-lens.git
cd rt-complexity-lens/python

# Install
pip install -e .                  # Basic
pip install -e ".[viz]"           # With visualization
pip install -e ".[dev]"           # With dev tools
pip install -e ".[all]"           # Everything
```

### Method 2: Build and Install Wheel

```bash
cd python

# Build
python build_package.py
# Or manually:
# python -m build

# Install
pip install dist/rtplan_complexity-1.0.0-py3-none-any.whl
```

### Method 3: From PyPI (Future)

```bash
pip install rtplan-complexity        # Once published
```

---

## 🌐 Publishing to PyPI

To make `pip install rtplan-complexity` work globally, publish to PyPI:

### One-Time Setup

1. Create account at https://pypi.org/account/register/
2. Create API token at https://pypi.org/manage/account/token/
3. Install twine: `pip install twine`

### Publishing Workflow

```bash
cd python

# 1. Build package
python -m build

# 2. Check distribution
twine check dist/*

# 3. Upload to Test PyPI (optional but recommended)
twine upload --repository testpypi dist/*

# 4. Test from Test PyPI
pip install --index-url https://test.pypi.org/simple/ rtplan-complexity

# 5. Upload to PyPI (production)
twine upload dist/*

# 6. Now anyone can install!
pip install rtplan-complexity
```

---

## ✅ Verification

Run the verification script to check everything is working:

```bash
cd python
python verify_package.py
```

Expected output:
```
============================================================
RTplan Complexity Lens - Package Verification
============================================================

============================================================
Testing Package Imports
============================================================
✓ rtplan_complexity (v1.0.0)
✓ Core functions imported
✓ Type definitions imported

============================================================
Testing Dependencies
============================================================
✓ pydicom (v2.x.x)
✓ numpy (v1.x.x)
✓ scipy (v1.x.x)
✓ pandas (v2.x.x)

============================================================
Testing Basic Functionality
============================================================
✓ Created test beam
✓ Calculated metrics:
  - MCS: 0.9500
  - LSV: 0.9500
  - AAV: 0.0000
✓ Metrics are in valid ranges

============================================================
Verification Summary
============================================================
Imports             : ✓ PASS
Dependencies        : ✓ PASS
Functionality       : ✓ PASS

✅ All critical tests passed!
```

---

## 📊 Package Features

### ✅ Implemented

- [x] 30+ complexity metrics (identical to web app)
- [x] DICOM RT Plan parser
- [x] Single plan analysis
- [x] Batch processing
- [x] Cohort analysis with clustering
- [x] Statistical analysis (extended stats, outliers)
- [x] Correlation analysis
- [x] CSV/JSON export
- [x] Visualization (box plots, heatmaps, scatter matrices, violin plots)
- [x] Type hints throughout
- [x] Comprehensive tests
- [x] CLI entry point (rtplan-analyze command)

### 📦 Dependencies

**Core (Required):**
- pydicom >= 2.4.0  # DICOM file parsing
- numpy >= 1.24.0   # Array operations
- scipy >= 1.11.0   # Statistical functions
- pandas >= 2.0.0   # Data manipulation

**Visualization (Optional - `[viz]`):**
- matplotlib >= 3.7.0  # Plotting
- seaborn >= 0.12.0    # Enhanced plots

**Development (Optional - `[dev]`):**
- pytest >= 7.0.0       # Testing
- pytest-cov >= 4.0.0   # Coverage
- black >= 23.0.0       # Code formatting
- mypy >= 1.0.0         # Type checking
- ruff >= 0.1.0         # Linting

---

## 🎯 Current Status

| Item | Status | Notes |
|------|--------|-------|
| Package Configuration | ✅ Complete | pyproject.toml ready |
| Code Implementation | ✅ Complete | All metrics implemented |
| Documentation | ✅ Complete | README, INSTALL.md |
| Tests | ✅ Complete | Unit and integration tests |
| Build System | ✅ Complete | Modern build with setuptools |
| Local Installation | ✅ Works | `pip install -e .` |
| Build Distribution | ✅ Works | `python -m build` |
| PyPI Publication | ⏳ Pending | Requires PyPI account |

---

## 📝 Quick Start After Installation

```python
# Import
from rtplan_complexity import parse_rtplan, calculate_plan_metrics

# Analyze a plan
plan = parse_rtplan("RTPLAN.dcm")
metrics = calculate_plan_metrics(plan)

# View results
print(f"MCS: {metrics.MCS:.4f}")
print(f"LSV: {metrics.LSV:.4f}")
print(f"Total MU: {metrics.total_mu:.1f}")

# Export to CSV
from rtplan_complexity.export import export_to_csv
export_to_csv([metrics], "results.csv")
```

---

## 🔄 Cross-Platform Validation

The Python implementation produces **identical results** to the TypeScript web application:

- ✅ All 30+ metrics use the same formulas
- ✅ Same aggregation methods
- ✅ Cross-validation framework in place
- ✅ Reference data generation script available

See the main verification report for detailed code-level comparison.

---

## 📄 License

**CC BY-NC-SA 4.0** - Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International

- ✅ Free for research and education
- ✅ Attribution required
- ❌ No commercial use without permission
- ✅ Share-alike for derivatives

---

## 🤝 Support

- **Web App**: https://rt-complexity-lens.lovable.app
- **Documentation**: https://rt-complexity-lens.lovable.app/help
- **Repository**: https://github.com/matteomaspero/rt-complexity-lens
- **Issues**: https://github.com/matteomaspero/rt-complexity-lens/issues

---

## 🎉 Summary

**The package IS pip-installable!**

✅ **Current**: Install from source with `pip install -e .`  
⏳ **Future**: Install from PyPI with `pip install rtplan-complexity` (after publishing)

All tools and documentation are in place. The package just needs to be published to PyPI to enable global installation.
