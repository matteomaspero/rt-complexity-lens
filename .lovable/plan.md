
# Plan: Python Offline Toolkit for RT Plan Complexity Analysis

## Summary

Create a standalone Python package (`rtplan_complexity`) that mirrors the TypeScript metrics calculations from the web application, allowing users to run identical analyses on their local workstations. The package will be placed in a `python/` directory at the project root with comprehensive documentation.

---

## Design Philosophy: Minimizing Maintenance Overhead

To reduce the overhead of keeping Python and TypeScript implementations synchronized:

### Strategy 1: Shared Metric Definitions via JSON

Export the `METRIC_DEFINITIONS` from TypeScript to a JSON file that Python can also read. This ensures:
- Metric names, descriptions, units, and formulas are defined once
- Changes to metric metadata propagate to both implementations automatically

### Strategy 2: Algorithm Documentation

Create a shared `ALGORITHMS.md` document that precisely describes each metric calculation with pseudocode. Both implementations reference this document, making discrepancies easy to identify.

### Strategy 3: Cross-Validation Test Suite

Generate test cases from the TypeScript implementation that Python can verify against:
- Parse the same DICOM files
- Export expected metric values to JSON
- Python tests validate against these reference values

### Strategy 4: Clear Module Structure Mirroring

Match the Python module structure to TypeScript:

```text
TypeScript                          Python
-----------                         ------
src/lib/dicom/types.ts         ->   rtplan_complexity/types.py
src/lib/dicom/parser.ts        ->   rtplan_complexity/parser.py
src/lib/dicom/metrics.ts       ->   rtplan_complexity/metrics.py
src/lib/cohort/extended-statistics.ts -> rtplan_complexity/statistics.py
src/lib/cohort/clustering.ts   ->   rtplan_complexity/clustering.py
src/lib/cohort/correlation.ts  ->   rtplan_complexity/correlation.py
```

---

## Package Structure

```text
python/
├── README.md                    # Installation and usage guide
├── pyproject.toml               # Modern Python packaging (PEP 517/518)
├── requirements.txt             # Dependencies for pip users
├── rtplan_complexity/
│   ├── __init__.py              # Package exports
│   ├── types.py                 # Data classes matching TypeScript types
│   ├── parser.py                # DICOM RT Plan parsing
│   ├── metrics.py               # UCoMX metric calculations
│   ├── statistics.py            # Extended statistics (quartiles, IQR, etc.)
│   ├── clustering.py            # Plan clustering logic
│   ├── correlation.py           # Pearson correlation matrix
│   ├── export.py                # CSV/JSON export utilities
│   └── visualization/
│       ├── __init__.py
│       ├── box_plots.py         # Box plot generation
│       ├── scatter_matrix.py    # Pairwise scatter plots
│       ├── heatmap.py           # Correlation heatmap
│       └── violin.py            # Violin/density plots
├── examples/
│   ├── single_plan_analysis.py  # Analyze one DICOM file
│   ├── batch_analysis.py        # Batch processing multiple files
│   ├── cohort_analysis.py       # Full cohort workflow with clustering
│   └── custom_visualization.py  # Custom plot configurations
├── tests/
│   ├── test_parser.py
│   ├── test_metrics.py
│   ├── test_statistics.py
│   └── reference_data/          # Expected values from TypeScript
│       └── expected_metrics.json
└── scripts/
    └── generate_reference_data.ts  # Node script to export test data
```

---

## Core Dependencies

```text
# requirements.txt
pydicom>=2.4.0          # DICOM parsing
numpy>=1.24.0           # Numerical operations
scipy>=1.11.0           # Statistical functions
pandas>=2.0.0           # Data manipulation
matplotlib>=3.7.0       # Plotting (optional)
seaborn>=0.12.0         # Enhanced visualizations (optional)
```

---

## Data Types (types.py)

Python dataclasses mirroring TypeScript interfaces:

```python
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from datetime import datetime
from enum import Enum

class Technique(Enum):
    VMAT = "VMAT"
    IMRT = "IMRT"
    CONFORMAL = "CONFORMAL"
    UNKNOWN = "UNKNOWN"

@dataclass
class MLCLeafPositions:
    bank_a: List[float]
    bank_b: List[float]

@dataclass
class JawPositions:
    x1: float
    x2: float
    y1: float
    y2: float

@dataclass
class ControlPoint:
    index: int
    gantry_angle: float
    gantry_rotation_direction: str
    beam_limiting_device_angle: float
    cumulative_meterset_weight: float
    mlc_positions: MLCLeafPositions
    jaw_positions: JawPositions
    isocenter_position: Optional[Tuple[float, float, float]] = None
    patient_support_angle: Optional[float] = None
    table_top_vertical: Optional[float] = None
    table_top_longitudinal: Optional[float] = None
    table_top_lateral: Optional[float] = None

@dataclass
class Beam:
    beam_number: int
    beam_name: str
    beam_type: str
    radiation_type: str
    number_of_control_points: int
    control_points: List[ControlPoint]
    final_cumulative_meterset_weight: float
    gantry_angle_start: float
    gantry_angle_end: float
    is_arc: bool
    mlc_leaf_widths: List[float]
    number_of_leaves: int
    beam_dose: Optional[float] = None

@dataclass
class RTPlan:
    patient_id: str
    plan_label: str
    plan_name: str
    beams: List[Beam]
    total_mu: float
    technique: Technique
    treatment_machine_name: Optional[str] = None
    # ... additional fields

@dataclass
class BeamMetrics:
    beam_number: int
    beam_name: str
    MCS: float
    LSV: float
    AAV: float
    MFA: float
    LT: float
    LTMCS: float
    # UCoMX Accuracy Metrics
    LG: Optional[float] = None
    MAD: Optional[float] = None
    EFS: Optional[float] = None
    psmall: Optional[float] = None
    # UCoMX Deliverability Metrics
    MUCA: Optional[float] = None
    LTMU: Optional[float] = None
    # ... (all metrics from TypeScript)

@dataclass
class PlanMetrics:
    plan_label: str
    MCS: float
    LSV: float
    AAV: float
    MFA: float
    LT: float
    LTMCS: float
    total_mu: float
    beam_metrics: List[BeamMetrics]
    calculation_date: datetime = field(default_factory=datetime.now)
    # ... (all aggregated metrics)
```

---

## Parser Implementation (parser.py)

Using pydicom to match the TypeScript parser behavior:

```python
import pydicom
from .types import RTPlan, Beam, ControlPoint, MLCLeafPositions

def parse_rtplan(file_path: str) -> RTPlan:
    """Parse a DICOM RT Plan file and extract structure."""
    ds = pydicom.dcmread(file_path)
    
    # Validate SOP Class
    if ds.SOPClassUID != '1.2.840.10008.5.1.4.1.1.481.5':
        raise ValueError("File is not an RT Plan")
    
    beams = []
    beam_seq = getattr(ds, 'BeamSequence', [])
    
    for beam_ds in beam_seq:
        control_points = _parse_control_points(beam_ds)
        beams.append(Beam(
            beam_number=beam_ds.BeamNumber,
            beam_name=getattr(beam_ds, 'BeamName', f'Beam {beam_ds.BeamNumber}'),
            beam_type=beam_ds.BeamType,
            # ... extract all fields
        ))
    
    # Determine technique
    technique = _determine_technique(beams)
    
    return RTPlan(
        patient_id=_anonymize_id(getattr(ds, 'PatientID', '')),
        plan_label=getattr(ds, 'RTPlanLabel', ''),
        # ...
    )

def _parse_control_points(beam_ds) -> List[ControlPoint]:
    """Parse control point sequence with inheritance handling."""
    # Implement CP attribute inheritance matching TypeScript
    ...
```

---

## Metrics Implementation (metrics.py)

Direct translation of TypeScript algorithms:

```python
import numpy as np
from typing import List, Tuple
from .types import (
    RTPlan, Beam, ControlPoint, BeamMetrics, PlanMetrics,
    ControlPointMetrics, MachineDeliveryParams
)

def calculate_aperture_area(
    mlc_positions: MLCLeafPositions,
    leaf_widths: List[float],
    jaw_positions: JawPositions
) -> float:
    """Calculate aperture area in mm^2."""
    bank_a = np.array(mlc_positions.bank_a)
    bank_b = np.array(mlc_positions.bank_b)
    widths = np.array(leaf_widths[:len(bank_a)])
    
    # Opening = bankB - bankA (bankB is positive side)
    openings = np.maximum(bank_b - bank_a, 0)
    
    # Clip to jaw positions
    effective_openings = np.minimum(openings, jaw_positions.x2 - jaw_positions.x1)
    effective_openings = np.maximum(effective_openings, 0)
    
    return float(np.sum(effective_openings * widths))

def calculate_lsv(mlc_positions: MLCLeafPositions, leaf_widths: List[float]) -> float:
    """Calculate Leaf Sequence Variability."""
    bank_a = np.array(mlc_positions.bank_a)
    bank_b = np.array(mlc_positions.bank_b)
    
    if len(bank_a) < 2:
        return 0.0
    
    # Position differences between adjacent leaves
    diff_a = np.abs(np.diff(bank_a))
    diff_b = np.abs(np.diff(bank_b))
    
    sum_pos_max_a = np.sum(diff_a)
    sum_pos_max_b = np.sum(diff_b)
    
    pos_max = max(
        np.max(bank_a) - np.min(bank_a),
        np.max(bank_b) - np.min(bank_b),
        1.0
    )
    
    n = len(bank_a) - 1
    lsv_a = sum_pos_max_a / (n * pos_max)
    lsv_b = sum_pos_max_b / (n * pos_max)
    
    return 1.0 - min((lsv_a + lsv_b) / 2, 1.0)

def calculate_beam_metrics(
    beam: Beam,
    machine_params: MachineDeliveryParams = None
) -> BeamMetrics:
    """Calculate all UCoMX metrics for a single beam."""
    # Implementation matches TypeScript calculateBeamMetrics()
    ...

def calculate_plan_metrics(
    plan: RTPlan,
    machine_params: MachineDeliveryParams = None
) -> PlanMetrics:
    """Calculate MU-weighted plan-level metrics."""
    beam_metrics = [calculate_beam_metrics(beam, machine_params) 
                    for beam in plan.beams]
    
    # MU-weighted aggregation (matching TypeScript logic)
    total_mu = sum(bm.beam_mu for bm in beam_metrics)
    
    if total_mu > 0:
        MCS = sum(bm.MCS * bm.beam_mu for bm in beam_metrics) / total_mu
        LSV = sum(bm.LSV * bm.beam_mu for bm in beam_metrics) / total_mu
        # ... all weighted metrics
    else:
        MCS = LSV = 0.0
    
    return PlanMetrics(
        plan_label=plan.plan_label,
        MCS=MCS,
        LSV=LSV,
        # ...
    )
```

---

## Statistics Implementation (statistics.py)

Matching cohort/extended-statistics.ts:

```python
from dataclasses import dataclass
from typing import List
import numpy as np
from scipy import stats

@dataclass
class ExtendedStatistics:
    min: float
    max: float
    mean: float
    std: float
    median: float
    q1: float
    q3: float
    iqr: float
    p5: float
    p95: float
    skewness: float
    count: int
    outliers: List[float]

def calculate_extended_statistics(values: List[float]) -> ExtendedStatistics:
    """Calculate extended statistics matching TypeScript implementation."""
    if len(values) == 0:
        return ExtendedStatistics(
            min=0, max=0, mean=0, std=0, median=0,
            q1=0, q3=0, iqr=0, p5=0, p95=0,
            skewness=0, count=0, outliers=[]
        )
    
    arr = np.array(values)
    
    q1, median, q3 = np.percentile(arr, [25, 50, 75])
    iqr = q3 - q1
    
    # Outliers: 1.5 x IQR rule
    lower_fence = q1 - 1.5 * iqr
    upper_fence = q3 + 1.5 * iqr
    outliers = arr[(arr < lower_fence) | (arr > upper_fence)].tolist()
    
    # Fisher-Pearson skewness
    skewness = float(stats.skew(arr)) if len(arr) > 2 else 0.0
    
    return ExtendedStatistics(
        min=float(np.min(arr)),
        max=float(np.max(arr)),
        mean=float(np.mean(arr)),
        std=float(np.std(arr)),
        median=float(median),
        q1=float(q1),
        q3=float(q3),
        iqr=float(iqr),
        p5=float(np.percentile(arr, 5)),
        p95=float(np.percentile(arr, 95)),
        skewness=skewness,
        count=len(arr),
        outliers=outliers,
    )
```

---

## Clustering Implementation (clustering.py)

```python
from enum import Enum
from typing import List, Dict
from dataclasses import dataclass
from .types import PlanMetrics, RTPlan

class ClusterDimension(Enum):
    TECHNIQUE = "technique"
    BEAM_COUNT = "beamCount"
    CONTROL_POINTS = "controlPoints"
    DELIVERY_TIME = "deliveryTime"
    COMPLEXITY = "complexity"
    TOTAL_MU = "totalMU"
    MACHINE = "machine"

@dataclass
class ClusterGroup:
    id: str
    name: str
    description: str
    plan_indices: List[int]

def assign_cluster(
    plan: RTPlan,
    metrics: PlanMetrics,
    dimension: ClusterDimension
) -> str:
    """Assign a plan to a cluster based on dimension."""
    if dimension == ClusterDimension.TECHNIQUE:
        return plan.technique.value
    
    elif dimension == ClusterDimension.BEAM_COUNT:
        n = len(plan.beams)
        if n == 1: return "1 beam"
        if n == 2: return "2 beams"
        if n <= 4: return "3-4 beams"
        return "5+ beams"
    
    elif dimension == ClusterDimension.CONTROL_POINTS:
        total_cps = sum(b.number_of_control_points for b in plan.beams)
        if total_cps < 50: return "Low (<50 CPs)"
        if total_cps < 100: return "Medium (50-100 CPs)"
        return "High (>100 CPs)"
    
    # ... remaining dimensions matching TypeScript
```

---

## Visualization Module

### Box Plots (visualization/box_plots.py)

```python
import matplotlib.pyplot as plt
import seaborn as sns
from typing import List, Dict
from ..statistics import ExtendedStatistics

def create_box_plots(
    stats_dict: Dict[str, ExtendedStatistics],
    title: str = "Metric Distributions",
    figsize: tuple = (12, 6),
    save_path: str = None
) -> plt.Figure:
    """Create box plots matching web app visualization."""
    fig, ax = plt.subplots(figsize=figsize)
    
    # Prepare data for plotting
    positions = []
    labels = []
    data = []
    
    for i, (metric, stat) in enumerate(stats_dict.items()):
        # Create synthetic data from statistics for box plot
        box_data = {
            'whislo': max(stat.min, stat.q1 - 1.5 * stat.iqr),
            'q1': stat.q1,
            'med': stat.median,
            'q3': stat.q3,
            'whishi': min(stat.max, stat.q3 + 1.5 * stat.iqr),
            'fliers': stat.outliers,
            'mean': stat.mean
        }
        # ... render box plot
    
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches='tight')
    
    return fig
```

### Correlation Heatmap (visualization/heatmap.py)

```python
def create_correlation_heatmap(
    metrics_list: List[PlanMetrics],
    metrics_to_include: List[str] = None,
    save_path: str = None
) -> plt.Figure:
    """Create correlation heatmap matching web app."""
    import pandas as pd
    
    # Build DataFrame from metrics
    data = []
    for m in metrics_list:
        row = {
            'MCS': m.MCS,
            'LSV': m.LSV,
            'AAV': m.AAV,
            'MFA': m.MFA,
            'LT': m.LT,
            'totalMU': m.total_mu,
            'deliveryTime': m.total_delivery_time or 0,
        }
        data.append(row)
    
    df = pd.DataFrame(data)
    
    # Calculate Pearson correlation
    corr_matrix = df.corr()
    
    # Create heatmap
    fig, ax = plt.subplots(figsize=(10, 8))
    sns.heatmap(
        corr_matrix,
        annot=True,
        fmt='.2f',
        cmap='RdBu_r',
        center=0,
        vmin=-1,
        vmax=1,
        ax=ax
    )
    
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches='tight')
    
    return fig
```

---

## Example Scripts

### Single Plan Analysis (examples/single_plan_analysis.py)

```python
#!/usr/bin/env python3
"""Analyze a single DICOM RT Plan file."""
from rtplan_complexity import parse_rtplan, calculate_plan_metrics
from rtplan_complexity.export import metrics_to_csv, metrics_to_json

# Parse the plan
plan = parse_rtplan("path/to/RTPLAN.dcm")
print(f"Plan: {plan.plan_label}")
print(f"Technique: {plan.technique.value}")
print(f"Beams: {len(plan.beams)}")

# Calculate metrics
metrics = calculate_plan_metrics(plan)

# Display results
print(f"\n--- Plan Metrics ---")
print(f"MCS:  {metrics.MCS:.4f}")
print(f"LSV:  {metrics.LSV:.4f}")
print(f"AAV:  {metrics.AAV:.4f}")
print(f"MFA:  {metrics.MFA:.2f} cm²")
print(f"LT:   {metrics.LT:.1f} mm")
print(f"Total MU: {metrics.total_mu:.1f}")

# Per-beam breakdown
print(f"\n--- Beam Metrics ---")
for bm in metrics.beam_metrics:
    print(f"{bm.beam_name}: MCS={bm.MCS:.4f}, LSV={bm.LSV:.4f}")

# Export
metrics_to_csv(metrics, "output/plan_metrics.csv")
metrics_to_json(metrics, "output/plan_metrics.json")
```

### Cohort Analysis (examples/cohort_analysis.py)

```python
#!/usr/bin/env python3
"""Full cohort analysis with clustering and visualization."""
import glob
from rtplan_complexity import parse_rtplan, calculate_plan_metrics
from rtplan_complexity.clustering import generate_clusters, ClusterDimension
from rtplan_complexity.statistics import calculate_extended_statistics
from rtplan_complexity.visualization import (
    create_box_plots,
    create_correlation_heatmap,
    create_scatter_matrix,
    create_violin_plot
)

# Load all plans
dcm_files = glob.glob("plans/*.dcm")
plans_and_metrics = []

for f in dcm_files:
    plan = parse_rtplan(f)
    metrics = calculate_plan_metrics(plan)
    plans_and_metrics.append((plan, metrics))

print(f"Loaded {len(plans_and_metrics)} plans")

# Cluster by technique
clusters = generate_clusters(
    plans_and_metrics,
    dimension=ClusterDimension.TECHNIQUE
)

for cluster in clusters:
    print(f"{cluster.name}: {len(cluster.plan_indices)} plans")

# Calculate statistics for each metric
mcs_values = [m.MCS for _, m in plans_and_metrics]
lsv_values = [m.LSV for _, m in plans_and_metrics]

mcs_stats = calculate_extended_statistics(mcs_values)
print(f"\nMCS Statistics:")
print(f"  Mean: {mcs_stats.mean:.4f} ± {mcs_stats.std:.4f}")
print(f"  Median: {mcs_stats.median:.4f}")
print(f"  IQR: [{mcs_stats.q1:.4f}, {mcs_stats.q3:.4f}]")
print(f"  Outliers: {len(mcs_stats.outliers)}")

# Generate visualizations
all_metrics = [m for _, m in plans_and_metrics]

create_box_plots(
    {"MCS": mcs_stats, "LSV": calculate_extended_statistics(lsv_values)},
    save_path="output/box_plots.png"
)

create_correlation_heatmap(all_metrics, save_path="output/correlation.png")
create_scatter_matrix(all_metrics, save_path="output/scatter_matrix.png")

print("\nVisualizations saved to output/")
```

---

## Cross-Validation Script

To generate reference data from TypeScript for Python validation:

### scripts/generate_reference_data.ts

```typescript
// Run with: npx ts-node scripts/generate_reference_data.ts
import { parseRTPlan } from '../src/lib/dicom/parser';
import { calculatePlanMetrics } from '../src/lib/dicom/metrics';
import * as fs from 'fs';
import * as path from 'path';

const testDir = './public/test-data';
const outputPath = './python/tests/reference_data/expected_metrics.json';

const results: Record<string, any> = {};

const files = fs.readdirSync(testDir).filter(f => f.endsWith('.dcm'));

for (const file of files) {
  const buffer = fs.readFileSync(path.join(testDir, file));
  const plan = parseRTPlan(buffer.buffer, file);
  const metrics = calculatePlanMetrics(plan);
  
  results[file] = {
    planLabel: metrics.planLabel,
    MCS: metrics.MCS,
    LSV: metrics.LSV,
    AAV: metrics.AAV,
    MFA: metrics.MFA,
    LT: metrics.LT,
    totalMU: metrics.totalMU,
    beamCount: metrics.beamMetrics.length,
    // Add all metrics for comparison
  };
}

fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`Generated reference data for ${files.length} plans`);
```

---

## README.md Content

```markdown
# RT Plan Complexity Analyzer - Python Toolkit

Offline Python implementation of the RT Plan Complexity Analyzer metrics,
producing results identical to the web application.

## Installation

```bash
pip install -e python/
# or
pip install rtplan-complexity
```

## Quick Start

```python
from rtplan_complexity import parse_rtplan, calculate_plan_metrics

plan = parse_rtplan("RTPLAN.dcm")
metrics = calculate_plan_metrics(plan)

print(f"MCS: {metrics.MCS:.4f}")
print(f"LSV: {metrics.LSV:.4f}")
```

## Modes

### Single Plan Analysis
Analyze individual DICOM RT Plan files with full metric output.

### Batch Analysis  
Process multiple plans with aggregate statistics.

### Cohort Analysis
Cluster plans by characteristics and perform population-level analysis.

## Matching Web Application Results

The Python implementation uses identical algorithms to the web application.
To verify:

1. Run `npm run generate-reference-data`
2. Run `pytest python/tests/`

All metrics should match within floating-point tolerance.
```

---

## Files to Create

| File | Description |
|------|-------------|
| `python/README.md` | Installation and usage documentation |
| `python/pyproject.toml` | Package configuration |
| `python/requirements.txt` | Dependencies |
| `python/rtplan_complexity/__init__.py` | Package exports |
| `python/rtplan_complexity/types.py` | Data classes |
| `python/rtplan_complexity/parser.py` | DICOM parsing |
| `python/rtplan_complexity/metrics.py` | UCoMX calculations |
| `python/rtplan_complexity/statistics.py` | Extended statistics |
| `python/rtplan_complexity/clustering.py` | Plan clustering |
| `python/rtplan_complexity/correlation.py` | Correlation matrix |
| `python/rtplan_complexity/export.py` | CSV/JSON export |
| `python/rtplan_complexity/visualization/__init__.py` | Viz module init |
| `python/rtplan_complexity/visualization/box_plots.py` | Box plots |
| `python/rtplan_complexity/visualization/scatter_matrix.py` | Scatter matrix |
| `python/rtplan_complexity/visualization/heatmap.py` | Correlation heatmap |
| `python/rtplan_complexity/visualization/violin.py` | Violin plots |
| `python/examples/single_plan_analysis.py` | Example script |
| `python/examples/batch_analysis.py` | Batch example |
| `python/examples/cohort_analysis.py` | Cohort example |
| `python/tests/test_parser.py` | Parser tests |
| `python/tests/test_metrics.py` | Metrics validation |
| `python/tests/reference_data/.gitkeep` | Reference data dir |
| `scripts/generate_reference_data.ts` | Cross-validation script |
| `docs/ALGORITHMS.md` | Shared algorithm documentation |

**Total: 23 new files**

---

## Synchronization Workflow

When TypeScript metrics change:

1. Update `docs/ALGORITHMS.md` with the algorithm change
2. Regenerate reference data: `npm run generate-reference-data`
3. Update Python implementation in `metrics.py`
4. Run Python tests: `pytest python/tests/`
5. Verify all tests pass

This workflow ensures both implementations stay synchronized with minimal overhead.
