import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Package, Scale, TrendingUp, BookOpen, Calculator, Wrench, Terminal, HelpCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const InteractiveViewer = lazy(() => import('@/components/viewer').then(
  (mod) => ({ default: () => <mod.InteractiveViewer /> })
));

const PageLoader = () => (
  <div className="flex items-center justify-center py-24">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const MODES = [
  { title: 'Single Plan', desc: 'Detailed metrics & visualizations', icon: BarChart3, path: '/' },
  { title: 'Batch', desc: 'Screen multiple plans at once', icon: Package, path: '/batch' },
  { title: 'Comparison', desc: 'Side-by-side plan differences', icon: Scale, path: '/compare' },
  { title: 'Cohort', desc: 'Population statistics & clustering', icon: TrendingUp, path: '/cohort' },
] as const;

const NAV_LINKS = [
  { label: 'Metrics Reference', icon: Calculator, path: '/metrics' },
  { label: 'Help & FAQ', icon: HelpCircle, path: '/help' },
  { label: 'Technical Docs', icon: Wrench, path: '/technical' },
  { label: 'Python Toolkit', icon: Terminal, path: '/python-docs' },
] as const;

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-lg font-semibold leading-tight">RTplan Complexity Lens</h1>
              <p className="text-xs text-muted-foreground">DICOM RT plan complexity analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link to="/help">
              <button className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <HelpCircle className="h-4 w-4" />
              </button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
        {/* Upload Area — the primary action */}
        <Suspense fallback={<PageLoader />}>
          <InteractiveViewer />
        </Suspense>

        {/* Mode Navigation */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Or choose an analysis mode
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MODES.map(({ title, desc, icon: Icon, path }) => (
              <Link
                key={path}
                to={path}
                className="group flex flex-col gap-2 rounded-lg border bg-card p-3 transition-colors hover:border-primary hover:bg-primary/5"
              >
                <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <div>
                  <div className="text-sm font-medium">{title}</div>
                  <div className="text-xs text-muted-foreground leading-snug">{desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer Links */}
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
          {NAV_LINKS.map(({ label, icon: Icon, path }) => (
            <Link
              key={path}
              to={path}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
};

export default Index;