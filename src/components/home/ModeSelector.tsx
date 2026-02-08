import { Link } from 'react-router-dom';
import { BarChart3, Package, Scale, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ModeCard {
  id: string;
  title: string;
  icon: React.ReactNode;
  shortDescription: string;
  features: string[];
  useCases: string[];
  path: string;
  badge?: string;
}

const ANALYSIS_MODES: ModeCard[] = [
  {
    id: 'single',
    title: 'Single Plan',
    icon: <BarChart3 className="h-8 w-8" />,
    shortDescription: 'Detailed analysis of one DICOM RT Plan',
    features: [
      'Comprehensive complexity metrics',
      'Interactive control point navigation',
      'Delivery timeline & dose rate visualization',
      'MLC aperture shape analysis',
      'Real-time playback simulation',
      'Detailed QA recommendations',
    ],
    useCases: [
      'In-depth plan validation',
      'Quality assurance emphasis',
      'Teaching & learning the metrics',
      'Detailed case reporting',
    ],
    path: '/',
    badge: 'Default',
  },
  {
    id: 'batch',
    title: 'Batch Analysis',
    icon: <Package className="h-8 w-8" />,
    shortDescription: 'Screen multiple plans efficiently',
    features: [
      'Bulk complexity assessment',
      'Automatic outlier detection',
      'Comparison across multiple files',
      'Summary statistics & trends',
      'Export results to CSV',
      'Benchmark comparisons',
    ],
    useCases: [
      'Screening clinic workload',
      'Finding outlier plans',
      'Institutional benchmarking',
      'Population trend analysis',
    ],
    path: '/batch',
  },
  {
    id: 'compare',
    title: 'Plan Comparison',
    icon: <Scale className="h-8 w-8" />,
    shortDescription: 'Compare two treatment plans side-by-side',
    features: [
      'Metrics comparison view',
      'Visual beam profile differences',
      'Dose distribution comparison',
      'Alternative plan A/B testing',
      'Impact analysis of modifications',
      'Difference highlighting',
    ],
    useCases: [
      'Testing plan variations',
      'Technique comparison',
      'Optimization validation',
      'Before/after modifications',
    ],
    path: '/compare',
  },
  {
    id: 'cohort',
    title: 'Cohort Analysis',
    icon: <TrendingUp className="h-8 w-8" />,
    shortDescription: 'Analyze patient population patterns',
    features: [
      'Statistical population analysis',
      'Automatic clustering',
      'Metric distribution visualization',
      'Subgroup comparisons',
      'Risk stratification',
      'Export with labels & clusters',
    ],
    useCases: [
      'Research & publications',
      'Population risk stratification',
      'Treatment planning guidelines',
      'Machine/technique benchmarking',
    ],
    path: '/cohort',
  },
];

export function ModeSelector() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Choose Your Analysis Mode</h2>
        <p className="text-sm text-muted-foreground">
          Select the analysis approach that best fits your workflow
        </p>
      </div>

      {/* Mode Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {ANALYSIS_MODES.map((mode) => (
          <Link key={mode.id} to={mode.path}>
            <Card className="group h-full cursor-pointer transition-all hover:border-primary hover:shadow-lg">
              <div className="flex h-full flex-col gap-4 p-4">
                {/* Badge */}
                {mode.badge && (
                  <div className="flex justify-end">
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      {mode.badge}
                    </span>
                  </div>
                )}

                {/* Icon & Title */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-primary/10 p-3 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {mode.icon}
                    </div>
                  </div>
                  <h3 className="font-semibold">{mode.title}</h3>
                  <p className="text-xs text-muted-foreground">{mode.shortDescription}</p>
                </div>

                {/* Features */}
                <div className="space-y-1 flex-grow">
                  <p className="text-xs font-semibold text-muted-foreground">Key Features:</p>
                  <ul className="space-y-1">
                    {mode.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground">
                        ✓ {feature}
                      </li>
                    ))}
                    {mode.features.length > 3 && (
                      <li className="text-xs text-muted-foreground">
                        + {mode.features.length - 3} more...
                      </li>
                    )}
                  </ul>
                </div>

                {/* Use Cases */}
                <div className="space-y-1 border-t pt-3">
                  <p className="text-xs font-semibold text-muted-foreground">Use When:</p>
                  <p className="text-xs text-muted-foreground">
                    {mode.useCases[0]}
                  </p>
                </div>

                {/* Button */}
                <Button
                  className="w-full group-hover:bg-primary"
                  variant="outline"
                  size="sm"
                >
                  Open {mode.title}
                </Button>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Reference */}
      <Card className="bg-muted/50 p-4">
        <div className="space-y-3">
          <h3 className="font-semibold">💡 Which Mode Should I Use?</h3>
          <div className="grid gap-2 text-sm">
            <div className="flex gap-2">
              <span className="font-semibold min-w-fit">Single Plan →</span>
              <span className="text-muted-foreground">Want to analyze one plan in detail</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold min-w-fit">Batch →</span>
              <span className="text-muted-foreground">Want to screen many plans quickly</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold min-w-fit">Comparison →</span>
              <span className="text-muted-foreground">Want to compare 2 variations</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold min-w-fit">Cohort →</span>
              <span className="text-muted-foreground">Want to understand population trends</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
