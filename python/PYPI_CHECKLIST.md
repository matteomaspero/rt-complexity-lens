# 🚀 PyPI Publishing Checklist

Use this checklist before publishing rtplan-complexity to PyPI.

---

## ✅ Pre-Publishing Checklist

### 1️⃣ Code Quality
- [ ] All tests pass: `pytest tests/ -v`
- [ ] Code is formatted: `black .` (if using)
- [ ] No linting errors: `ruff check .` (if using)
- [ ] Type hints are correct: `mypy rtplan_complexity` (if using)
- [ ] Documentation is up-to-date

### 2️⃣ Version Management
- [ ] Version number is updated in `pyproject.toml`
- [ ] Version follows semantic versioning (MAJOR.MINOR.PATCH)
- [ ] CHANGELOG entries added (if you have one)
- [ ] Version tag created in git (optional but recommended)

### 3️⃣ Package Metadata
- [ ] `pyproject.toml` is complete and accurate
- [ ] README.md is comprehensive
- [ ] LICENSE file is present (CC BY-NC-SA 4.0)
- [ ] MANIFEST.in includes all necessary files
- [ ] Dependencies are up-to-date and specified correctly

### 4️⃣ Documentation
- [ ] README has installation instructions
- [ ] Usage examples are clear and tested
- [ ] API documentation is complete
- [ ] Links are working (repository, homepage, docs)

### 5️⃣ Build Environment
- [ ] Python >= 3.9 is installed
- [ ] Build tools installed: `pip install build twine`
- [ ] Previous builds are cleaned: `rm -rf build dist *.egg-info`

---

## 🔐 PyPI Account Setup

### Test PyPI (Always test here first!)
- [ ] Account created: https://test.pypi.org/account/register/
- [ ] Email verified
- [ ] API token generated: https://test.pypi.org/manage/account/token/
- [ ] Token saved securely (password manager or environment variable)

### Production PyPI
- [ ] Account created: https://pypi.org/account/register/
- [ ] Email verified
- [ ] API token generated: https://pypi.org/manage/account/token/
- [ ] Token saved securely (password manager or environment variable)

---

## 📦 Build Process

### Clean and Build
```bash
cd python

# Clean previous builds
rm -rf build dist *.egg-info

# Build package
python -m build
```

- [ ] Build completed without errors
- [ ] Wheel file created: `dist/rtplan_complexity-*.whl`
- [ ] Source distribution created: `dist/rtplan_complexity-*.tar.gz`
- [ ] File sizes are reasonable (< 1 MB for this package)

### Package Check
```bash
python -m twine check dist/*
```

- [ ] All checks PASSED
- [ ] No warnings about README
- [ ] No warnings about metadata

---

## 🧪 Test PyPI Upload

### Upload to Test PyPI
```bash
python -m twine upload --repository testpypi dist/*
# Or
python publish_to_pypi.py --test
```

- [ ] Upload successful
- [ ] Package visible at: https://test.pypi.org/project/rtplan-complexity/
- [ ] Version number is correct
- [ ] Description renders correctly

### Test Installation
```bash
# Create clean environment
python -m venv test_env
source test_env/bin/activate  # Windows: test_env\Scripts\activate

# Install from Test PyPI
pip install --index-url https://test.pypi.org/simple/ rtplan-complexity

# Test import
python -c "from rtplan_complexity import calculate_plan_metrics; print('✅ Works!')"

# Run a quick test
python -c "
from rtplan_complexity import calculate_beam_metrics
from rtplan_complexity.types import *

cp = ControlPoint(
    index=0, gantry_angle=0.0, gantry_rotation_direction='CW',
    beam_limiting_device_angle=0.0, cumulative_meterset_weight=1.0,
    mlc_positions=MLCLeafPositions(bank_a=[-10.0]*60, bank_b=[10.0]*60),
    jaw_positions=JawPositions(x1=-50, x2=50, y1=-50, y2=50)
)
beam = Beam(
    beam_number=1, beam_name='Test', beam_type='DYNAMIC',
    radiation_type='PHOTON', treatment_delivery_type='TREATMENT',
    number_of_control_points=1, control_points=[cp],
    final_cumulative_meterset_weight=1.0, beam_dose=100.0,
    gantry_angle_start=0.0, gantry_angle_end=0.0, is_arc=False,
    mlc_leaf_widths=[5.0]*60, number_of_leaves=60
)
metrics = calculate_beam_metrics(beam)
print(f'MCS: {metrics.MCS:.4f}')
"

# Clean up
deactivate
rm -rf test_env
```

- [ ] Package installs successfully
- [ ] All imports work
- [ ] Basic functionality works
- [ ] No import errors
- [ ] No dependency conflicts

---

## 🚀 Production PyPI Upload

### Final Checks
- [ ] Test PyPI version works perfectly
- [ ] Version number is final (can't be changed once uploaded!)
- [ ] All documentation is accurate
- [ ] You've double-checked everything above

### Upload to PyPI
```bash
python -m twine upload dist/*
# Or
python publish_to_pypi.py --prod
```

- [ ] Upload successful
- [ ] Package visible at: https://pypi.org/project/rtplan-complexity/
- [ ] Version number is correct
- [ ] Description renders correctly
- [ ] All links work

### Verify Production
```bash
# Wait 1-2 minutes for indexing

# Install from PyPI
pip install rtplan-complexity

# Test
python -c "from rtplan_complexity import calculate_plan_metrics; print('✅ Live!')"
```

- [ ] Package installs from PyPI
- [ ] All functionality works
- [ ] No errors or warnings

---

## 📢 Post-Publication Tasks

### Immediate
- [ ] Test installation one more time: `pip install rtplan-complexity`
- [ ] Verify package page: https://pypi.org/project/rtplan-complexity/
- [ ] Update GitHub README with PyPI badge
- [ ] Create GitHub release with tag (e.g., v1.0.0)
- [ ] Update project documentation with PyPI installation instructions

### Communication
- [ ] Announce on project channels
- [ ] Update website if applicable
- [ ] Social media announcement (if desired)
- [ ] Email collaborators/users

### Monitoring
- [ ] Check for download statistics (after 24 hours)
- [ ] Monitor GitHub issues for installation problems
- [ ] Watch for user feedback

---

## 🔄 Future Releases

For next release, remember to:
1. Update version number
2. Run through this checklist again
3. Always test on Test PyPI first
4. Keep CHANGELOG updated (if you have one)

---

## ❌ Common Issues

### "File already exists"
→ Version is already on PyPI. Increment version number.

### "Invalid credentials"
→ Check token. Username should be `__token__`.

### "Package name taken"
→ Check if it's yours at pypi.org/project/rtplan-complexity/

### Build fails
→ Run: `pip install --upgrade pip build wheel setuptools`

### Import fails after install
→ Check for naming conflicts or missing dependencies

---

## 🎉 Success Criteria

You know you're done when:
✅ Package is on PyPI: https://pypi.org/project/rtplan-complexity/
✅ `pip install rtplan-complexity` works globally
✅ Tests pass after fresh install
✅ Documentation is updated
✅ Users can follow installation instructions

---

## 📝 Notes Section

Use this space to track your publishing attempts:

### Attempt 1: [Date]
- Version:
- Status:
- Issues:
- Notes:

### Attempt 2: [Date]
- Version:
- Status:
- Issues:
- Notes:

---

**Last Updated**: [Your Date]
**Current Version**: 1.0.0
**Next Version**: 1.0.1 (or 1.1.0, or 2.0.0)
