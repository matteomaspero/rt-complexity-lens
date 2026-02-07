import { Link } from 'react-router-dom';
import { ArrowLeft, Terminal, Download, Github, ExternalLink, CheckCircle2, Code, BarChart3, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 overflow-hidden">
      {title && (
        <div className="px-4 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
          {title}
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-sm">
        <code className="font-mono text-foreground">{children}</code>
      </pre>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="text-xl font-semibold">{title}</h2>
    </div>
  );
}

export default function PythonDocs() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/help">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <Terminal className="h-8 w-8 text-primary" />
                Python Toolkit Documentation
              </h1>
              <p className="text-muted-foreground mt-1">
                rtplan-complexity — Offline analysis package
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://github.com/rtplan-complexity/rtplan-complexity"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Github className="h-4 w-4" />
                GitHub
              </a>
            </Button>
            <ThemeToggle />
          </div>
        </div>

        <div className="space-y-8">
          {/* Overview */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground leading-relaxed">
                The <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-sm">rtplan-complexity</code> Python 
                package provides identical metric calculations to this web application, allowing you to run analyses 
                offline on your local workstation. The package supports single-plan, batch, and cohort analysis modes 
                with matplotlib visualizations.
              </p>
            </CardContent>
          </Card>

          {/* Installation */}
          <Card id="installation">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Installation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Using pip</h4>
                <CodeBlock>pip install rtplan-complexity</CodeBlock>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm mb-2">From Source (Development)</h4>
                <CodeBlock>{`cd python
pip install -e .`}</CodeBlock>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">With Visualization Support</h4>
                <CodeBlock>pip install rtplan-complexity[viz]</CodeBlock>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold text-sm mb-3">Requirements</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    { pkg: 'Python', ver: '≥ 3.9' },
                    { pkg: 'pydicom', ver: '≥ 2.4.0' },
                    { pkg: 'numpy', ver: '≥ 1.24.0' },
                    { pkg: 'scipy', ver: '≥ 1.11.0' },
                    { pkg: 'pandas', ver: '≥ 2.0.0' },
                    { pkg: 'matplotlib', ver: '≥ 3.7.0 (optional)' },
                  ].map(({ pkg, ver }) => (
                    <div key={pkg} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-mono">{pkg}</span>
                      <span className="text-muted-foreground">{ver}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Start */}
          <Card id="quick-start">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Quick Start
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Single Plan */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary">Single Plan Analysis</Badge>
                </div>
                <CodeBlock title="single_plan_analysis.py">{`from rtplan_complexity import parse_rtplan, calculate_plan_metrics

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
print(f"Total MU: {metrics.total_mu:.1f}")`}</CodeBlock>
              </div>

              {/* Batch Analysis */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary">Batch Analysis</Badge>
                </div>
                <CodeBlock title="batch_analysis.py">{`import glob
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
print(f"  IQR: [{stats.q1:.4f}, {stats.q3:.4f}]")`}</CodeBlock>
              </div>

              {/* Cohort Analysis */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary">Cohort Analysis with Visualization</Badge>
                </div>
                <CodeBlock title="cohort_analysis.py">{`from rtplan_complexity import parse_rtplan, calculate_plan_metrics
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
all_metrics = [m for _, m in plans_and_metrics]
create_box_plots(all_metrics, save_path="output/box_plots.png")
create_correlation_heatmap(all_metrics, save_path="output/correlation.png")`}</CodeBlock>
              </div>
            </CardContent>
          </Card>

          {/* API Reference */}
          <Card id="api-reference">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                API Reference
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Core Functions */}
              <div>
                <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-primary rounded-full" />
                  Core Functions
                </h4>
                <div className="space-y-3">
                  {[
                    { fn: 'parse_rtplan(file_path: str) -> RTPlan', desc: 'Parse a DICOM RT Plan file' },
                    { fn: 'calculate_plan_metrics(plan: RTPlan, machine_params?) -> PlanMetrics', desc: 'Calculate all metrics for a plan' },
                    { fn: 'calculate_beam_metrics(beam: Beam, machine_params?) -> BeamMetrics', desc: 'Calculate metrics for a single beam' },
                  ].map(({ fn, desc }) => (
                    <div key={fn} className="rounded-lg border p-3 bg-card">
                      <code className="font-mono text-sm text-primary">{fn}</code>
                      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistics Functions */}
              <div>
                <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-primary rounded-full" />
                  Statistics Functions
                </h4>
                <div className="space-y-3">
                  {[
                    { fn: 'calculate_extended_statistics(values: List[float]) -> ExtendedStatistics', desc: 'Compute mean, median, quartiles, IQR, skewness, and outliers' },
                    { fn: 'get_box_plot_data(stats: ExtendedStatistics, metric_name: str) -> BoxPlotData', desc: 'Format statistics for box plot rendering' },
                  ].map(({ fn, desc }) => (
                    <div key={fn} className="rounded-lg border p-3 bg-card">
                      <code className="font-mono text-sm text-primary">{fn}</code>
                      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clustering Functions */}
              <div>
                <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-primary rounded-full" />
                  Clustering Functions
                </h4>
                <div className="space-y-3">
                  {[
                    { fn: 'generate_clusters(plans, dimension: ClusterDimension) -> List[ClusterGroup]', desc: 'Group plans by technique, beam count, complexity, etc.' },
                    { fn: 'assign_cluster(plan, metrics, dimension) -> str', desc: 'Determine cluster assignment for a single plan' },
                  ].map(({ fn, desc }) => (
                    <div key={fn} className="rounded-lg border p-3 bg-card">
                      <code className="font-mono text-sm text-primary">{fn}</code>
                      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visualization Functions */}
              <div>
                <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-primary rounded-full" />
                  Visualization Functions
                </h4>
                <div className="space-y-3">
                  {[
                    { fn: 'create_box_plots(metrics_list, save_path?) -> Figure', desc: 'Generate box plots for metric distributions' },
                    { fn: 'create_correlation_heatmap(metrics_list, save_path?) -> Figure', desc: 'Create Pearson correlation heatmap' },
                    { fn: 'create_scatter_matrix(metrics_list, save_path?) -> Figure', desc: 'Generate pairwise scatter plot matrix' },
                    { fn: 'create_violin_plot(metrics_list, metric_name, save_path?) -> Figure', desc: 'Create violin/density plot for a metric' },
                  ].map(({ fn, desc }) => (
                    <div key={fn} className="rounded-lg border p-3 bg-card">
                      <code className="font-mono text-sm text-primary">{fn}</code>
                      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Machine Parameters */}
          <Card id="machine-params">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Machine Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Customize delivery time estimation with machine-specific parameters:
              </p>
              <CodeBlock>{`from rtplan_complexity.types import MachineDeliveryParams

machine = MachineDeliveryParams(
    max_dose_rate=600,     # MU/min
    max_gantry_speed=4.8,  # deg/s
    max_mlc_speed=25,      # mm/s
    mlc_type='MLCX'
)

metrics = calculate_plan_metrics(plan, machine_params=machine)`}</CodeBlock>
            </CardContent>
          </Card>

          {/* Export Formats */}
          <Card id="export">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Export Formats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">CSV Export</h4>
                  <CodeBlock>{`from rtplan_complexity.export import metrics_to_csv

metrics_to_csv(metrics, "plan_metrics.csv")`}</CodeBlock>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2">JSON Export</h4>
                  <CodeBlock>{`from rtplan_complexity.export import metrics_to_json

metrics_to_json(metrics, "plan_metrics.json")`}</CodeBlock>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cross-Validation */}
          <Card id="cross-validation">
            <CardHeader>
              <CardTitle>Cross-Validation with Web App</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                The Python implementation uses identical algorithms to the web application. 
                To verify results match:
              </p>
              <ol className="space-y-2 text-sm">
                {[
                  'Generate reference data from the web app: npm run generate-reference-data',
                  'Run Python tests: pytest python/tests/',
                  'All metrics should match within floating-point tolerance (1e-6)',
                ].map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 p-4 rounded-lg bg-muted/30 border">
                <p className="text-sm text-muted-foreground">
                  See <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">docs/ALGORITHMS.md</code> for 
                  shared algorithm documentation between TypeScript and Python implementations.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Links */}
          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Button asChild>
              <a
                href="https://github.com/rtplan-complexity/rtplan-complexity"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Github className="h-4 w-4" />
                View on GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/help">← Back to Help</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
