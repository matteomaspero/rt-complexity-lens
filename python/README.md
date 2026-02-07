# RTplan Complexity Lens - Python Toolkit

Offline Python implementation of RTp-lens metrics, producing results identical to the web application.

## Installation

### Using pip

```bash
pip install rtplan-complexity
```

### With Visualization Support

```bash
pip install rtplan-complexity[viz]
```

### From Source (Development)

```bash
cd python
pip install -e .
```

### Requirements

| Package | Version |
|---------|---------|
| Python | ≥ 3.9 |
| pydicom | ≥ 2.4.0 |
| numpy | ≥ 1.24.0 |
| scipy | ≥ 1.11.0 |
| pandas | ≥ 2.0.0 |
| matplotlib | ≥ 3.7.0 (optional) |
| seaborn | ≥ 0.12.0 (optional) |

---

## Quick Start

### Single Plan Analysis

```python
from rtplan_complexity import parse_rtplan, calculate_plan_metrics

# Parse the plan
plan = parse_rtplan("RTPLAN.dcm")

# Calculate metrics
metrics = calculate_plan_metrics(plan)

# Display results
print(f"Plan: {plan.plan_label}")
print(f"MCS: {metrics.MCS:.4f}")
print(f"LSV: {metrics.LSV:.4f}")
print(f"AAV: {metrics.AAV:.4f}")
print(f"MFA: {metrics.MFA:.2f} cm²")
print(f"LT: {metrics.LT:.1f} mm")
print(f"Total MU: {metrics.total_mu:.1f}")
```

### Batch Analysis

```python
import glob
from rtplan_complexity import parse_rtplan, calculate_plan_metrics
from rtplan_complexity.statistics import calculate_extended_statistics

# Load all plans
dcm_files = glob.glob("plans/*.dcm")
all_metrics = []

for f in dcm_files:
    plan = parse_rtplan(f)
    metrics = calculate_plan_metrics(plan)
    all_metrics.append(metrics)

# Calculate statistics
mcs_values = [m.MCS for m in all_metrics]
stats = calculate_extended_statistics(mcs_values)

print(f"MCS Statistics (n={stats.count}):")
print(f"  Mean: {stats.mean:.4f} ± {stats.std:.4f}")
print(f"  Median: {stats.median:.4f}")
print(f"  IQR: [{stats.q1:.4f}, {stats.q3:.4f}]")
print(f"  Outliers: {len(stats.outliers)}")
```

### Cohort Analysis with Clustering

```python
from rtplan_complexity import parse_rtplan, calculate_plan_metrics
from rtplan_complexity.clustering import generate_clusters, ClusterDimension
from rtplan_complexity.visualization import (
    create_box_plots,
    create_correlation_heatmap,
    create_scatter_matrix,
    create_violin_plot
)

# Load plans
plans_and_metrics = []
for f in dcm_files:
    plan = parse_rtplan(f)
    metrics = calculate_plan_metrics(plan)
    plans_and_metrics.append((plan, metrics))

# Cluster by technique
clusters = generate_clusters(plans_and_metrics, ClusterDimension.TECHNIQUE)

for cluster in clusters:
    print(f"{cluster.name}: {len(cluster.plan_indices)} plans")

# Generate visualizations
all_metrics = [m for _, m in plans_and_metrics]
create_box_plots(all_metrics, save_path="output/box_plots.png")
create_correlation_heatmap(all_metrics, save_path="output/correlation.png")
create_scatter_matrix(all_metrics, save_path="output/scatter_matrix.png")
```

---

## Analysis Modes

### 1. Single Plan Analysis

Analyze individual DICOM RT Plan files with full metric output:

- **Primary Metrics**: MCS, LSV, AAV, MFA
- **Secondary Metrics**: LT, LTMCS, SAS5, SAS10, EM, PI
- **Accuracy Metrics**: LG, MAD, EFS, psmall
- **Deliverability Metrics**: MUCA, LTMU, GT, GS, LS, LSV_del, TG
- Delivery time estimation
- Per-beam breakdown

### 2. Batch Analysis

Process multiple plans with aggregate statistics:

- Distribution analysis for each metric
- Summary statistics (mean, median, std, min, max)
- Outlier detection
- Export to CSV/JSON

### 3. Cohort Analysis

Population-level analysis with clustering:

- Cluster by technique, beam count, complexity, MU level, or treatment site
- Extended statistics (quartiles, IQR, percentiles, skewness, kurtosis)
- Correlation matrix between metrics
- Visualizations (box plots, scatter matrix, heatmap, violin plots)

---

## Clustering Dimensions

The `ClusterDimension` enum provides these grouping options:

| Dimension | Description | Example Groups |
|-----------|-------------|----------------|
| `TECHNIQUE` | Treatment technique | VMAT, IMRT, 3DCRT |
| `BEAM_COUNT` | Number of beams | 1-2, 3-4, 5-6, 7+ |
| `COMPLEXITY` | MCS-based complexity level | Low, Medium, High, Very High |
| `MU_LEVEL` | Total MU range | <500, 500-1000, 1000-2000, >2000 |
| `SITE` | Treatment site (from plan name) | Brain, H&N, Thorax, Pelvis, etc. |

```python
from rtplan_complexity.clustering import ClusterDimension

# Available dimensions
ClusterDimension.TECHNIQUE      # VMAT vs IMRT
ClusterDimension.BEAM_COUNT     # Group by beam count
ClusterDimension.COMPLEXITY     # Group by MCS level
ClusterDimension.MU_LEVEL       # Group by total MU
ClusterDimension.SITE           # Group by treatment site
```

---

## Metrics Reference

### Primary Metrics

| Key | Name | Formula | Range |
|-----|------|---------|-------|
| `MCS` | Modulation Complexity Score | LSV × (1 - AAV) | 0–1 |
| `LSV` | Leaf Sequence Variability | 1 - mean(leaf_differences) | 0–1 |
| `AAV` | Aperture Area Variability | |area_i - area_{i-1}| / area_{i-1} | 0–∞ |
| `MFA` | Mean Field Area | mean(aperture_areas) | cm² |

### Secondary Metrics

| Key | Name | Unit |
|-----|------|------|
| `LT` | Leaf Travel | mm |
| `LTMCS` | Leaf Travel-weighted MCS | 1/mm |
| `SAS5` | Small Aperture Score (5mm) | ratio |
| `SAS10` | Small Aperture Score (10mm) | ratio |
| `EM` | Edge Metric | — |
| `PI` | Plan Irregularity | ≥1 |

### Accuracy Metrics

| Key | Name | Unit |
|-----|------|------|
| `LG` | Leaf Gap | mm |
| `MAD` | Mean Asymmetry Distance | mm |
| `EFS` | Equivalent Field Size | mm |
| `psmall` | Percentage Small Fields | ratio |

### Deliverability Metrics

| Key | Name | Unit |
|-----|------|------|
| `MUCA` | MU per Control Arc | MU/deg |
| `LTMU` | Leaf Travel per MU | mm/MU |
| `GT` | Gantry Time | s |
| `GS` | Gantry Speed Variation | ratio |
| `LS` | Leaf Speed | mm/s |
| `LSV_del` | Leaf Speed Variation | ratio |
| `TG` | Tongue-and-Groove Index | — |

---

## Machine Parameters

Customize delivery time estimation with machine-specific parameters:

```python
from rtplan_complexity.types import MachineDeliveryParams

# Custom machine configuration
machine = MachineDeliveryParams(
    max_dose_rate=600,     # MU/min
    max_gantry_speed=4.8,  # deg/s
    max_mlc_speed=25,      # mm/s
    mlc_type='MLCX'
)

metrics = calculate_plan_metrics(plan, machine_params=machine)
```

### Built-in Presets

```python
# Generic (conservative)
GENERIC = MachineDeliveryParams(
    max_dose_rate=600,
    max_gantry_speed=4.8,
    max_mlc_speed=25,
    mlc_type='MLCX'
)

# Varian TrueBeam
TRUEBEAM = MachineDeliveryParams(
    max_dose_rate=600,  # 1400 for FFF
    max_gantry_speed=6.0,
    max_mlc_speed=25,
    mlc_type='MLCX'
)

# Varian Halcyon
HALCYON = MachineDeliveryParams(
    max_dose_rate=800,
    max_gantry_speed=4.0,
    max_mlc_speed=50,
    mlc_type='DUAL'
)

# Elekta Versa HD
VERSA_HD = MachineDeliveryParams(
    max_dose_rate=600,
    max_gantry_speed=6.0,
    max_mlc_speed=35,
    mlc_type='MLCY'
)
```

---

## Visualization Examples

### Box Plots

```python
from rtplan_complexity.visualization import create_box_plots

# Create box plots for all primary metrics
fig = create_box_plots(
    all_metrics,
    metrics=['MCS', 'LSV', 'AAV', 'MFA'],
    save_path="output/box_plots.png",
    figsize=(12, 6),
    show_outliers=True
)
```

### Correlation Heatmap

```python
from rtplan_complexity.visualization import create_correlation_heatmap

# Create correlation matrix heatmap
fig = create_correlation_heatmap(
    all_metrics,
    metrics=['MCS', 'LSV', 'AAV', 'LT', 'SAS5'],
    save_path="output/correlation.png",
    cmap='RdBu_r',
    annotate=True
)
```

### Scatter Matrix

```python
from rtplan_complexity.visualization import create_scatter_matrix

# Create pairwise scatter plots
fig = create_scatter_matrix(
    all_metrics,
    metrics=['MCS', 'LSV', 'AAV', 'LT'],
    save_path="output/scatter_matrix.png",
    color_by='technique'  # Optional: color points by cluster
)
```

### Violin Plot

```python
from rtplan_complexity.visualization import create_violin_plot

# Create violin/density plot for a single metric
fig = create_violin_plot(
    all_metrics,
    metric='MCS',
    group_by=ClusterDimension.TECHNIQUE,
    save_path="output/mcs_violin.png"
)
```

---

## Export Formats

### CSV Export

```python
from rtplan_complexity.export import metrics_to_csv, batch_to_csv

# Single plan
metrics_to_csv(metrics, "plan_metrics.csv")

# Batch export
batch_to_csv(all_metrics, "batch_metrics.csv", include_header=True)
```

**CSV columns**: `plan_name`, `beam_count`, `total_mu`, `MCS`, `LSV`, `AAV`, `MFA`, `LT`, ...

### JSON Export

```python
from rtplan_complexity.export import metrics_to_json, batch_to_json

# Single plan
metrics_to_json(metrics, "plan_metrics.json")

# Batch export with statistics
batch_to_json(all_metrics, "batch_metrics.json", include_stats=True)
```

**JSON structure**:
```json
{
  "plan_name": "VMAT_Prostate",
  "beam_count": 2,
  "total_mu": 1234.5,
  "metrics": {
    "MCS": 0.2345,
    "LSV": 0.7123,
    "AAV": 0.1456
  },
  "beams": [...]
}
```

---

## API Reference

### Core Functions

| Function | Description |
|----------|-------------|
| `parse_rtplan(file_path: str) -> RTPlan` | Parse a DICOM RT Plan file |
| `calculate_plan_metrics(plan, machine_params?) -> PlanMetrics` | Calculate all metrics for a plan |
| `calculate_beam_metrics(beam, machine_params?) -> BeamMetrics` | Calculate metrics for a single beam |

### Statistics Functions

| Function | Description |
|----------|-------------|
| `calculate_extended_statistics(values) -> ExtendedStatistics` | Compute mean, median, quartiles, IQR, skewness, outliers |
| `get_box_plot_data(stats, metric_name) -> BoxPlotData` | Format statistics for box plot rendering |

### Clustering Functions

| Function | Description |
|----------|-------------|
| `generate_clusters(plans, dimension) -> List[ClusterGroup]` | Group plans by specified dimension |
| `assign_cluster(plan, metrics, dimension) -> str` | Determine cluster assignment for a single plan |

### Correlation Functions

| Function | Description |
|----------|-------------|
| `calculate_correlation_matrix(metrics_list) -> CorrelationMatrix` | Compute Pearson correlations |
| `pearson_correlation(x, y) -> float` | Calculate correlation coefficient |

### Visualization Functions

| Function | Description |
|----------|-------------|
| `create_box_plots(metrics_list, save_path?) -> Figure` | Generate box plots for metric distributions |
| `create_correlation_heatmap(metrics_list, save_path?) -> Figure` | Create Pearson correlation heatmap |
| `create_scatter_matrix(metrics_list, save_path?) -> Figure` | Generate pairwise scatter plot matrix |
| `create_violin_plot(metrics_list, metric_name, save_path?) -> Figure` | Create violin/density plot |

---

## Cross-Validation with Web App

The Python implementation uses identical algorithms to the web application.
See `docs/ALGORITHMS.md` for shared algorithm documentation.

### Verification Workflow

1. **Generate reference data from TypeScript:**
   ```bash
   npm run generate-reference-data
   ```
   This creates `python/tests/reference_data/expected_metrics.json`

2. **Run Python tests:**
   ```bash
   cd python
   pytest tests/
   ```

3. **Tolerance**: All metrics should match within `1e-4`

---

## Example Scripts

See the `python/examples/` directory for complete examples:

| File | Description |
|------|-------------|
| `single_plan_analysis.py` | Analyze a single DICOM file |
| `batch_analysis.py` | Process multiple plans with statistics |
| `cohort_analysis.py` | Clustering and visualization |
| `custom_visualization.py` | Advanced plotting examples |

---

## License

MIT License — see LICENSE file for details.

---

## References

This implementation is inspired by published complexity metrics research including:

- UCoMX framework for plan complexity analysis
- Modulation Complexity Score (MCS) by McNiven et al.
- Leaf Sequence Variability (LSV) by Masi et al.

See `docs/ALGORITHMS.md` for detailed algorithm descriptions and full references.
