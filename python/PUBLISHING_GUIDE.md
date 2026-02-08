# 📤 Publishing rtplan-complexity to PyPI

Complete step-by-step guide to publish the package to PyPI.

---

## 🎯 Overview

Publishing to PyPI makes your package installable worldwide with:
```bash
pip install rtplan-complexity
```

This guide covers both **Test PyPI** (for testing) and **Production PyPI** (for release).

---

## ⚙️ Prerequisites

### 1. Python Environment

Ensure Python 3.9+ is installed:
```bash
python --version    # Should be >= 3.9
```

If Python is not installed:
- **Windows**: Download from https://python.org or Microsoft Store
- **Linux**: `sudo apt install python3 python3-pip`
- **macOS**: `brew install python@3.9`

### 2. PyPI Account

Create accounts (both free):

**Test PyPI** (for practice):
- Sign up: https://test.pypi.org/account/register/
- Generate token: https://test.pypi.org/manage/account/token/
- Save token securely!

**Production PyPI**:
- Sign up: https://pypi.org/account/register/
- Generate token: https://pypi.org/manage/account/token/
- Save token securely!

### 3. Install Build Tools

```bash
cd python
pip install build twine
```

---

## 🚀 Quick Start (Automated)

### Option 1: Use Publishing Script

```bash
cd python

# Build and check (no upload)
python publish_to_pypi.py --check

# Upload to Test PyPI
python publish_to_pypi.py --test

# Upload to Production PyPI
python publish_to_pypi.py --prod
```

### Option 2: Use Build Script
```bash
cd python
python build_package.py
```

---

## 📝 Step-by-Step Manual Process

### Step 1: Clean Previous Builds

```bash
cd python

# Windows PowerShell
Remove-Item -Recurse -Force build, dist, *.egg-info -ErrorAction SilentlyContinue

# Linux/macOS
rm -rf build dist *.egg-info
```

### Step 2: Update Version (if needed)

Edit `pyproject.toml`:
```toml
[project]
name = "rtplan-complexity"
version = "1.0.0"  # ← Change this for new releases
```

Version format: `MAJOR.MINOR.PATCH`
- `1.0.0` → `1.0.1` (bug fixes)
- `1.0.0` → `1.1.0` (new features)
- `1.0.0` → `2.0.0` (breaking changes)

### Step 3: Build Package

```bash
python -m build
```

This creates:
- `dist/rtplan_complexity-1.0.0-py3-none-any.whl` (wheel)
- `dist/rtplan_complexity-1.0.0.tar.gz` (source)

### Step 4: Check Package

```bash
python -m twine check dist/*
```

Expected output:
```
Checking dist/rtplan_complexity-1.0.0-py3-none-any.whl: PASSED
Checking dist/rtplan_complexity-1.0.0.tar.gz: PASSED
```

### Step 5a: Upload to Test PyPI (Recommended First)

```bash
python -m twine upload --repository testpypi dist/*
```

When prompted:
- Username: `__token__`
- Password: `pypi-...` (your Test PyPI token)

Or set environment variable:
```bash
# Windows PowerShell
$env:TESTPYPI_TOKEN="pypi-..."
python -m twine upload --repository testpypi --username __token__ --password $env:TESTPYPI_TOKEN dist/*

# Linux/macOS
export TESTPYPI_TOKEN="pypi-..."
python -m twine upload --repository testpypi --username __token__ --password $TESTPYPI_TOKEN dist/*
```

### Step 5b: Test Installation from Test PyPI

```bash
# Create test environment
python -m venv test_env
source test_env/bin/activate  # Windows: test_env\Scripts\activate

# Install from Test PyPI
pip install --index-url https://test.pypi.org/simple/ rtplan-complexity

# Test it
python -c "from rtplan_complexity import calculate_plan_metrics; print('✅ Works!')"

# Clean up
deactivate
rm -rf test_env
```

### Step 6: Upload to Production PyPI

⚠️ **WARNING**: Production uploads are permanent for each version!

```bash
python -m twine upload dist/*
```

When prompted:
- Username: `__token__`
- Password: `pypi-...` (your Production PyPI token)

Or with environment variable:
```bash
# Windows PowerShell
$env:PYPI_TOKEN="pypi-..."
python -m twine upload --username __token__ --password $env:PYPI_TOKEN dist/*

# Linux/macOS
export PYPI_TOKEN="pypi-..."
python -m twine upload --username __token__ --password $PYPI_TOKEN dist/*
```

### Step 7: Verify Production Release

```bash
# Wait 1-2 minutes for PyPI to index

# Fresh install
pip install rtplan-complexity

# Test
python -c "from rtplan_complexity import calculate_plan_metrics; print('✅ Published!')"
```

🎉 **Your package is now live!** Anyone can install it with:
```bash
pip install rtplan-complexity
```

---

## 🔐 Best Practices for Tokens

### Option 1: Environment Variables (Recommended)

```bash
# Windows PowerShell (session)
$env:TESTPYPI_TOKEN="pypi-..."
$env:PYPI_TOKEN="pypi-..."

# Linux/macOS (add to ~/.bashrc or ~/.zshrc)
export TESTPYPI_TOKEN="pypi-..."
export PYPI_TOKEN="pypi-..."
```

### Option 2: .pypirc File

Create `~/.pypirc`:
```ini
[distutils]
index-servers =
    pypi
    testpypi

[pypi]
repository = https://upload.pypi.org/legacy/
username = __token__
password = pypi-YOUR_PRODUCTION_TOKEN

[testpypi]
repository = https://test.pypi.org/legacy/
username = __token__
password = pypi-YOUR_TEST_TOKEN
```

**Security**: 
- Never commit `.pypirc` or tokens to git
- Add to `.gitignore`
- Use tokens, not passwords
- One token per project is good practice

---

## 🔄 Release Workflow

### For Bug Fixes (Patch)

```bash
# 1. Fix bug in code
# 2. Update version: 1.0.0 → 1.0.1
# 3. Build and publish
python publish_to_pypi.py --prod
```

### For New Features (Minor)

```bash
# 1. Add new features
# 2. Update version: 1.0.0 → 1.1.0
# 3. Test on Test PyPI first
python publish_to_pypi.py --test
# 4. Verify, then publish production
python publish_to_pypi.py --prod
```

### For Breaking Changes (Major)

```bash
# 1. Make breaking changes
# 2. Update version: 1.0.0 → 2.0.0
# 3. Update README with migration guide
# 4. Test extensively
python publish_to_pypi.py --test
# 5. Publish production
python publish_to_pypi.py --prod
```

---

## ❌ Troubleshooting

### Error: "File already exists"

**Cause**: Version 1.0.0 is already published

**Solution**: Increment version in `pyproject.toml`
```toml
version = "1.0.1"  # or 1.1.0, or 2.0.0
```

### Error: "Invalid credentials"

**Cause**: Wrong token or username

**Solution**:
1. Regenerate token at PyPI
2. Ensure username is `__token__` (not your username!)
3. Check you're using the right token (test vs prod)

### Error: "Package name unavailable"

**Cause**: Name `rtplan-complexity` is taken

**Solution**: 
1. Check if it's your own package
2. If not, choose a different name in `pyproject.toml`

### Error: "Build failed"

**Cause**: Missing dependencies or syntax errors

**Solution**:
```bash
# Upgrade tools
pip install --upgrade pip build wheel setuptools

# Check for errors
python -c "import rtplan_complexity; print(rtplan_complexity.__version__)"
```

### Error: "Python not found"

**Cause**: Python not in PATH

**Windows Solution**:
1. Install Python from Microsoft Store or python.org
2. Check "Add to PATH" during installation
3. Or manually add to PATH

**PowerShell alternative**: Use `py` instead of `python`
```bash
py -m build
py -m twine upload dist/*
```

---

## 📊 Post-Publication Checklist

After successful publication:

- [ ] Verify package is visible on PyPI: https://pypi.org/project/rtplan-complexity/
- [ ] Test installation: `pip install rtplan-complexity`
- [ ] Update documentation with installation instructions
- [ ] Create GitHub release tag: `git tag v1.0.0 && git push --tags`
- [ ] Announce on relevant platforms
- [ ] Monitor for user feedback and issues

---

## 🔗 Useful Links

- **PyPI (Production)**: https://pypi.org/
- **Test PyPI**: https://test.pypi.org/
- **Packaging Guide**: https://packaging.python.org/
- **Twine Documentation**: https://twine.readthedocs.io/
- **Package Page**: https://pypi.org/project/rtplan-complexity/ (after publishing)
- **GitHub Releases**: https://github.com/matteomaspero/rt-complexity-lens/releases

---

## 🎯 Quick Reference

```bash
# Setup
pip install build twine

# Build
python -m build

# Check
python -m twine check dist/*

# Upload to Test PyPI
python -m twine upload --repository testpypi dist/*

# Upload to PyPI
python -m twine upload dist/*

# Or use the script
python publish_to_pypi.py --check   # Build and check
python publish_to_pypi.py --test    # Upload to Test PyPI
python publish_to_pypi.py --prod    # Upload to PyPI
```

---

## 📄 License Reminder

The package is licensed under **CC BY-NC-SA 4.0**:
- ✅ Free for research and education
- ✅ Attribution required
- ❌ No commercial use without permission
- ✅ Share-alike for derivatives

Ensure users are aware of these terms!

---

## 🎉 Success!

Once published, your package will be available at:
- **PyPI**: https://pypi.org/project/rtplan-complexity/
- **Install**: `pip install rtplan-complexity`
- **Docs**: Link from your README

Congratulations on publishing your first (or next) Python package! 🚀
