# RTplan Complexity Lens - Python Toolkit

Offline Python implementation of RTp-lens metrics,
producing results identical to the web application.

## Installation

### From Source (Development)

```bash
cd python
pip install -e .
```

### Using pip

```bash
pip install rtplan-complexity
```

### Requirements

- Python 3.9+
- pydicom >= 2.4.0
- numpy >= 1.24.0
- scipy >= 1.11.0
- pandas >= 2.0.0
- matplotlib >= 3.7.0 (optional, for visualizations)
- seaborn >= 0.12.0 (optional, for enhanced visualizations)

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
    create_scatter_matrix
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
create_box_plots(all_metrics, save_path="output/box_plots.png")
create_correlation_heatmap(all_metrics, save_path="output/correlation.png")
```

## Analysis Modes

### 1. Single Plan Analysis

Analyze individual DICOM RT Plan files with full metric output including:
- UCoMX Primary Metrics (MCS, LSV, AAV, MFA, LT, LTMCS)
- Accuracy Metrics (LG, MAD, EFS, psmall, EM)
- Deliverability Metrics (MUCA, LTMU, GT, GS, LS, etc.)
- Delivery time estimation
- Per-beam breakdown

### 2. Batch Analysis

Process multiple plans with aggregate statistics:
- Distribution analysis for each metric
- Summary statistics (mean, median, std, range)
- Export to CSV/JSON

### 3. Cohort Analysis

Population-level analysis with clustering:
- Cluster by technique, beam count, complexity, etc.
- Extended statistics (quartiles, IQR, percentiles)
- Correlation matrix between metrics
- Visualizations (box plots, scatter matrix, heatmap, violin plots)

## Matching Web Application Results

The Python implementation uses identical algorithms to the web application.
See `docs/ALGORITHMS.md` for the shared algorithm documentation.

### Cross-Validation

To verify Python and TypeScript implementations produce identical results:

1. Generate reference data from TypeScript:
   ```bash
   npm run generate-reference-data
   ```

2. Run Python tests:
   ```bash
   cd python
   pytest tests/
   ```

All metrics should match within floating-point tolerance (1e-6).

## Export Formats

### CSV Export

```python
from rtplan_complexity.export import metrics_to_csv, batch_to_csv

# Single plan
metrics_to_csv(metrics, "plan_metrics.csv")

# Batch
batch_to_csv(all_metrics, "batch_metrics.csv")
```

### JSON Export

```python
from rtplan_complexity.export import metrics_to_json

metrics_to_json(metrics, "plan_metrics.json")
```

## Machine Parameters

Customize delivery time estimation with machine-specific parameters:

```python
from rtplan_complexity.types import MachineDeliveryParams

machine = MachineDeliveryParams(
    max_dose_rate=600,     # MU/min
    max_gantry_speed=4.8,  # deg/s
    max_mlc_speed=25,      # mm/s
    mlc_type='MLCX'
)

metrics = calculate_plan_metrics(plan, machine_params=machine)
```

## API Reference

### Core Functions

- `parse_rtplan(file_path: str) -> RTPlan`: Parse a DICOM RT Plan file
- `calculate_plan_metrics(plan: RTPlan, machine_params?) -> PlanMetrics`: Calculate all metrics
- `calculate_beam_metrics(beam: Beam, machine_params?) -> BeamMetrics`: Calculate beam metrics

### Statistics

- `calculate_extended_statistics(values: List[float]) -> ExtendedStatistics`
- `get_box_plot_data(stats: ExtendedStatistics, metric_name: str) -> BoxPlotData`

### Clustering

- `generate_clusters(plans, dimension: ClusterDimension) -> List[ClusterGroup]`
- `assign_cluster(plan, metrics, dimension) -> str`

### Correlation

- `calculate_correlation_matrix(metrics_list) -> CorrelationMatrix`
- `pearson_correlation(x, y) -> float`

### Visualization

- `create_box_plots(metrics_list, save_path?) -> Figure`
- `create_correlation_heatmap(metrics_list, save_path?) -> Figure`
- `create_scatter_matrix(metrics_list, save_path?) -> Figure`
- `create_violin_plot(metrics_list, metric_name, save_path?) -> Figure`

## License

MIT License - see LICENSE file for details.

## References

This implementation is inspired by published complexity metrics research including:
- UCoMX framework for plan complexity analysis
- Modulation Complexity Score (MCS) by McNiven et al.
- Leaf Sequence Variability (LSV) metrics

See `docs/ALGORITHMS.md` for detailed algorithm descriptions and references.
