# Installing rtplan-complexity

## 📦 Package Status

The `rtplan-complexity` package is **ready for pip installation**!

### Current Status
- ✅ Package structure configured with modern `pyproject.toml`
- ✅ All dependencies specified
- ✅ LICENSE file included (CC BY-NC-SA 4.0)
- ✅ README and documentation included
- ✅ Optional visualization dependencies available
- ✅ CLI entry point configured

---

## 🚀 Installation Methods

### Method 1: From Source (Local Development)

```bash
# Clone the repository
git clone https://github.com/matteomaspero/rt-complexity-lens.git
cd rt-complexity-lens/python

# Install in editable mode (for development)
pip install -e .

# Or install with visualization support
pip install -e ".[viz]"

# Or install with all optional dependencies
pip install -e ".[all]"
```

### Method 2: Build and Install Locally

```bash
cd python

# Install build tools
pip install build wheel

# Build the package
python -m build

# Install from the built wheel
pip install dist/rtplan_complexity-1.0.0-py3-none-any.whl
```

### Method 3: Quick Build Script

```bash
cd python
python build_package.py
```

---

## 📋 Dependencies

### Core (Required)
- Python >= 3.9
- pydicom >= 2.4.0
- numpy >= 1.24.0
- scipy >= 1.11.0
- pandas >= 2.0.0

### Visualization (Optional)
```bash
pip install rtplan-complexity[viz]
```
- matplotlib >= 3.7.0
- seaborn >= 0.12.0

### Development (Optional)
```bash
pip install rtplan-complexity[dev]
```
- pytest >= 7.0.0
- pytest-cov >= 4.0.0
- black >= 23.0.0
- mypy >= 1.0.0
- ruff >= 0.1.0

---

## 🧪 Verify Installation

```python
# Test import
from rtplan_complexity import parse_rtplan, calculate_plan_metrics

# Check version
import rtplan_complexity
print(rtplan_complexity.__version__)  # Should print: 1.0.0

# Test with a file
plan = parse_rtplan("path/to/RTPLAN.dcm")
metrics = calculate_plan_metrics(plan)
print(f"MCS: {metrics.MCS:.4f}")
```

---

## 🌐 Future: PyPI Distribution

To make the package available via `pip install rtplan-complexity` globally, it needs to be uploaded to PyPI:

### Steps to Publish to PyPI

1. **Create PyPI account** at https://pypi.org/account/register/

2. **Install twine**:
   ```bash
   pip install twine
   ```

3. **Build the package**:
   ```bash
   cd python
   python -m build
   ```

4. **Check the distribution**:
   ```bash
   twine check dist/*
   ```

5. **Upload to Test PyPI** (recommended first):
   ```bash
   twine upload --repository testpypi dist/*
   ```

6. **Test installation from Test PyPI**:
   ```bash
   pip install --index-url https://test.pypi.org/simple/ rtplan-complexity
   ```

7. **Upload to PyPI** (production):
   ```bash
   twine upload dist/*
   ```

8. **After upload, anyone can install with**:
   ```bash
   pip install rtplan-complexity
   ```

---

## 🔧 Troubleshooting

### Issue: ModuleNotFoundError after installation

**Solution**: Ensure you're using the correct Python environment:
```bash
python -m pip install -e .
python -c "import rtplan_complexity; print(rtplan_complexity.__version__)"
```

### Issue: Dependency conflicts

**Solution**: Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e .
```

### Issue: Build fails

**Solution**: Upgrade build tools:
```bash
pip install --upgrade pip setuptools wheel build
```

---

## 📚 Usage Examples

### Basic Usage

```python
from rtplan_complexity import parse_rtplan, calculate_plan_metrics

# Parse DICOM RT Plan
plan = parse_rtplan("RTPLAN.dcm")

# Calculate metrics
metrics = calculate_plan_metrics(plan)

# Access metrics
print(f"Modulation Complexity Score: {metrics.MCS:.4f}")
print(f"Leaf Sequence Variability: {metrics.LSV:.4f}")
print(f"Aperture Area Variability: {metrics.AAV:.4f}")
print(f"Total Monitor Units: {metrics.total_mu:.1f}")
```

### Batch Processing

```python
from rtplan_complexity import parse_rtplan, calculate_plan_metrics
from pathlib import Path

# Process multiple plans
results = []
for dcm_file in Path("plans/").glob("*.dcm"):
    plan = parse_rtplan(str(dcm_file))
    metrics = calculate_plan_metrics(plan)
    results.append({
        "file": dcm_file.name,
        "MCS": metrics.MCS,
        "LSV": metrics.LSV,
        "total_mu": metrics.total_mu
    })

# Export to CSV
import pandas as pd
df = pd.DataFrame(results)
df.to_csv("plan_metrics.csv", index=False)
```

---

## 📄 License

CC BY-NC-SA 4.0 - Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International

- ✅ Free for research and educational use
- ✅ Must attribute the source
- ❌ No commercial use without permission
- ✅ Modifications must use the same license

---

## 🤝 Support

- **Web App**: https://rt-complexity-lens.lovable.app
- **Documentation**: https://rt-complexity-lens.lovable.app/help
- **Repository**: https://github.com/matteomaspero/rt-complexity-lens
- **Issues**: https://github.com/matteomaspero/rt-complexity-lens/issues
