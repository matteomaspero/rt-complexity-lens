# PyPI Upload Instructions

## Quick Setup

Your package is built and ready to upload!

### 1. Configure Your Token

Edit the `.pypirc` file in this directory and replace the placeholder with your actual PyPI token:

```ini
[pypi]
repository = https://upload.pypi.org/legacy/
username = __token__
password = pypi-YOUR_ACTUAL_TOKEN_HERE
```

**Important:** Your token should start with `pypi-` for production PyPI or `pypi-test-` for Test PyPI.

### 2. Option A: Upload Using `.pypirc` File

```powershell
# Test PyPI (recommended first)
py -m twine upload --config-file .pypirc --repository testpypi dist/*

# Production PyPI
py -m twine upload --config-file .pypirc --repository pypi dist/*
```

### 2. Option B: Upload With Token on Command Line

```powershell
# Test PyPI
py -m twine upload --repository testpypi -u __token__ -p YOUR_TOKEN_HERE dist/*

# Production PyPI
py -m twine upload -u __token__ -p YOUR_TOKEN_HERE dist/*
```

### 3. Verify Installation

After uploading to Test PyPI:
```powershell
pip install --index-url https://test.pypi.org/simple/ --no-deps rtplan-complexity
python -c "import rtplan_complexity; print(rtplan_complexity.__version__)"
```

After uploading to Production PyPI:
```powershell
pip install rtplan-complexity
python -c "import rtplan_complexity; print(rtplan_complexity.__version__)"
```

## Package Information

- **Package Name:** rtplan-complexity
- **Version:** 1.0.0
- **Python Support:** 3.9, 3.10, 3.11, 3.12, 3.13, 3.14
- **License:** CC BY-NC-SA 4.0

## Built Files

Your distribution files are ready in `dist/`:
- `rtplan_complexity-1.0.0-py3-none-any.whl` (wheel)
- `rtplan_complexity-1.0.0.tar.gz` (source distribution)

Both files have **PASSED** twine checks ✓

## Security Note

**Never commit `.pypirc` with your actual token to git!** 

The file is already in `.gitignore`. Keep your token secure.

## Next Steps After Upload

1. Visit https://pypi.org/project/rtplan-complexity/ to see your live package
2. Update the README or documentation with pip install instructions
3. Create a GitHub release tag for version 1.0.0
4. Consider setting up automated publishing with GitHub Actions

## Troubleshooting

- **403 Forbidden:** Token might be invalid or you don't have permission
- **400 Bad Request:** Package name might already exist (you need to be added as maintainer)
- **File already exists:** Version 1.0.0 is already uploaded, increment version in pyproject.toml

For more help, see: https://packaging.python.org/en/latest/tutorials/packaging-projects/
