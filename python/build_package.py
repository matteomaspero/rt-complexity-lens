#!/usr/bin/env python3
"""
Build script for rtplan-complexity package

Usage:
    python build_package.py
"""

import subprocess
import sys
from pathlib import Path


def run_command(cmd, description):
    """Run a command and print status."""
    print(f"\n{'='*60}")
    print(f"{description}")
    print(f"{'='*60}")
    print(f"Running: {' '.join(cmd)}\n")
    
    result = subprocess.run(cmd, capture_output=False)
    if result.returncode != 0:
        print(f"\n❌ Failed: {description}")
        return False
    print(f"\n✅ Success: {description}")
    return True


def main():
    """Main build workflow."""
    # Ensure we're in the python directory
    python_dir = Path(__file__).parent
    
    print("\n" + "="*60)
    print("RT Plan Complexity Lens - Python Package Builder")
    print("="*60)
    
    # Step 1: Clean previous builds
    if run_command(
        [sys.executable, "-m", "pip", "install", "--upgrade", "pip", "build", "wheel"],
        "Installing/upgrading build tools"
    ):
        print("\n✓ Build tools ready")
    else:
        print("\n⚠ Warning: Could not upgrade build tools")
    
    # Step 2: Clean old builds
    print("\n" + "="*60)
    print("Cleaning previous builds")
    print("="*60)
    
    for dir_name in ["build", "dist", "*.egg-info"]:
        for path in python_dir.glob(dir_name):
            print(f"  Removing: {path}")
            if path.is_dir():
                import shutil
                shutil.rmtree(path)
            else:
                path.unlink()
    
    # Step 3: Build the package
    if not run_command(
        [sys.executable, "-m", "build"],
        "Building package (wheel & sdist)"
    ):
        print("\n❌ Build failed!")
        return 1
    
    # Step 4: Show what was built
    print("\n" + "="*60)
    print("Build Artifacts")
    print("="*60)
    
    dist_dir = python_dir / "dist"
    if dist_dir.exists():
        for file in sorted(dist_dir.iterdir()):
            size = file.stat().st_size / 1024  # KB
            print(f"  ✓ {file.name} ({size:.1f} KB)")
    
    # Step 5: Verify package
    print("\n" + "="*60)
    print("Package Verification")
    print("="*60)
    
    run_command(
        [sys.executable, "-m", "pip", "check"],
        "Checking for dependency conflicts"
    )
    
    # Final instructions
    print("\n" + "="*60)
    print("✅ Package Built Successfully!")
    print("="*60)
    print("\nNext steps:")
    print("\n1. Test installation locally:")
    print(f"   pip install {python_dir / 'dist' / '*.whl'}")
    print("\n2. Or install in editable mode for development:")
    print(f"   pip install -e {python_dir}")
    print("\n3. To upload to PyPI (requires account):")
    print("   pip install twine")
    print("   twine check dist/*")
    print("   twine upload dist/*")
    print("\n4. To upload to Test PyPI first:")
    print("   twine upload --repository testpypi dist/*")
    print("")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
