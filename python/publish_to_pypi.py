#!/usr/bin/env python3
"""
PyPI Publishing Script for rtplan-complexity

This script automates the process of publishing the package to PyPI.

Prerequisites:
1. Python >= 3.9 installed
2. PyPI account created at https://pypi.org
3. API token generated at https://pypi.org/manage/account/token/

Usage:
    python publish_to_pypi.py --test      # Publish to Test PyPI
    python publish_to_pypi.py --prod      # Publish to PyPI
    python publish_to_pypi.py --check     # Check package only
"""

import argparse
import subprocess
import sys
import os
from pathlib import Path
import shutil


def run_command(cmd, description, check=True):
    """Run a command and print status."""
    print(f"\n{'='*70}")
    print(f"🔄 {description}")
    print(f"{'='*70}")
    print(f"Command: {' '.join(cmd)}\n")
    
    result = subprocess.run(cmd, capture_output=False)
    
    if check and result.returncode != 0:
        print(f"\n❌ Failed: {description}")
        return False
    
    print(f"\n✅ Success: {description}")
    return True


def check_prerequisites():
    """Check if all prerequisites are met."""
    print("\n" + "="*70)
    print("🔍 Checking Prerequisites")
    print("="*70)
    
    # Check Python version
    print(f"\n✓ Python {sys.version}")
    
    if sys.version_info < (3, 9):
        print("❌ Python 3.9 or higher is required!")
        return False
    
    # Check if pyproject.toml exists
    if not Path("pyproject.toml").exists():
        print("❌ pyproject.toml not found! Run from the python/ directory.")
        return False
    
    print("✓ pyproject.toml found")
    
    # Check required packages
    required = ['build', 'twine']
    missing = []
    
    for package in required:
        try:
            __import__(package)
            print(f"✓ {package} is installed")
        except ImportError:
            missing.append(package)
            print(f"⚠ {package} not installed")
    
    if missing:
        print(f"\n📦 Installing missing packages: {', '.join(missing)}")
        if not run_command(
            [sys.executable, "-m", "pip", "install"] + missing,
            f"Installing {', '.join(missing)}",
            check=False
        ):
            print("⚠ Warning: Failed to install some packages. Please install manually:")
            print(f"   pip install {' '.join(missing)}")
    
    return True


def clean_build():
    """Clean previous build artifacts."""
    print("\n" + "="*70)
    print("🧹 Cleaning Previous Builds")
    print("="*70)
    
    dirs_to_clean = ['build', 'dist', '*.egg-info']
    
    for pattern in dirs_to_clean:
        for path in Path('.').glob(pattern):
            print(f"  Removing: {path}")
            if path.is_dir():
                shutil.rmtree(path)
            else:
                path.unlink()
    
    print("\n✅ Clean complete")


def build_package():
    """Build the package."""
    if not run_command(
        [sys.executable, "-m", "build"],
        "Building package (wheel and sdist)"
    ):
        return False
    
    # List built files
    print("\n" + "="*70)
    print("📦 Built Artifacts")
    print("="*70)
    
    dist_dir = Path("dist")
    if dist_dir.exists():
        for file in sorted(dist_dir.iterdir()):
            size = file.stat().st_size / 1024
            print(f"  ✓ {file.name} ({size:.1f} KB)")
    
    return True


def check_package():
    """Check the package with twine."""
    return run_command(
        [sys.executable, "-m", "twine", "check", "dist/*"],
        "Checking package with twine"
    )


def get_pypi_credentials(test_pypi=False):
    """Get PyPI credentials from environment or user input."""
    env_var = "TESTPYPI_TOKEN" if test_pypi else "PYPI_TOKEN"
    token = os.environ.get(env_var)
    
    if token:
        print(f"✓ Using token from environment variable {env_var}")
        return token
    
    print(f"\n{'='*70}")
    print(f"🔑 PyPI {'Test ' if test_pypi else ''}Authentication")
    print(f"{'='*70}")
    print("\nOptions:")
    print("1. Set environment variable:")
    print(f"   export {env_var}=pypi-...")
    print("2. Enter token now (will not be stored)")
    print("3. Use ~/.pypirc file")
    print("\nPress Enter to continue with interactive authentication...")
    input()
    
    return None


def upload_to_pypi(test_pypi=False):
    """Upload package to PyPI or Test PyPI."""
    repo_name = "Test PyPI" if test_pypi else "PyPI"
    repo_arg = "--repository" if test_pypi else None
    repo_value = "testpypi" if test_pypi else None
    
    print("\n" + "="*70)
    print(f"🚀 Uploading to {repo_name}")
    print("="*70)
    
    # Get credentials
    token = get_pypi_credentials(test_pypi)
    
    # Build command
    cmd = [sys.executable, "-m", "twine", "upload"]
    
    if test_pypi:
        cmd.extend(["--repository", "testpypi"])
    
    if token:
        cmd.extend(["--username", "__token__", "--password", token])
    
    cmd.append("dist/*")
    
    print(f"\nUploading to {repo_name}...")
    print("Please enter your credentials when prompted.\n")
    
    result = subprocess.run(cmd)
    
    if result.returncode == 0:
        print(f"\n✅ Successfully uploaded to {repo_name}!")
        
        if test_pypi:
            print("\n📝 Test installation:")
            print("   pip install --index-url https://test.pypi.org/simple/ rtplan-complexity")
        else:
            print("\n🎉 Package is now live on PyPI!")
            print("   pip install rtplan-complexity")
        
        return True
    else:
        print(f"\n❌ Upload to {repo_name} failed!")
        print("\nCommon issues:")
        print("1. Invalid credentials - check your API token")
        print("2. Version already exists - update version in pyproject.toml")
        print("3. Package name taken - check availability on PyPI")
        return False


def main():
    """Main publishing workflow."""
    parser = argparse.ArgumentParser(
        description="Publish rtplan-complexity to PyPI"
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Upload to Test PyPI instead of PyPI"
    )
    parser.add_argument(
        "--prod",
        action="store_true",
        help="Upload to production PyPI"
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Only build and check package, don't upload"
    )
    parser.add_argument(
        "--no-clean",
        action="store_true",
        help="Skip cleaning previous builds"
    )
    
    args = parser.parse_args()
    
    print("\n" + "="*70)
    print("🐍 RTplan Complexity Lens - PyPI Publisher")
    print("="*70)
    
    # Check prerequisites
    if not check_prerequisites():
        print("\n❌ Prerequisites not met. Please fix the issues above.")
        return 1
    
    # Clean previous builds
    if not args.no_clean:
        clean_build()
    
    # Build package
    if not build_package():
        print("\n❌ Build failed. Cannot proceed with upload.")
        return 1
    
    # Check package
    if not check_package():
        print("\n❌ Package check failed. Please fix the issues.")
        return 1
    
    # Upload if requested
    if args.check:
        print("\n" + "="*70)
        print("✅ Package is ready for upload!")
        print("="*70)
        print("\nTo upload:")
        print("  python publish_to_pypi.py --test    # Upload to Test PyPI")
        print("  python publish_to_pypi.py --prod    # Upload to PyPI")
        return 0
    
    if args.test:
        if not upload_to_pypi(test_pypi=True):
            return 1
    elif args.prod:
        print("\n⚠️  WARNING: You are about to publish to PRODUCTION PyPI!")
        print("This action cannot be undone for this version number.")
        confirm = input("\nType 'yes' to confirm: ")
        if confirm.lower() != 'yes':
            print("❌ Upload cancelled.")
            return 1
        
        if not upload_to_pypi(test_pypi=False):
            return 1
    else:
        print("\n" + "="*70)
        print("ℹ️  Build Complete - No Upload Requested")
        print("="*70)
        print("\nPackage is built and checked.")
        print("To upload, run:")
        print("  python publish_to_pypi.py --test    # Test PyPI first")
        print("  python publish_to_pypi.py --prod    # Production PyPI")
        print("\nOr check only:")
        print("  python publish_to_pypi.py --check")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
