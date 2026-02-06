import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBatch } from '@/contexts/BatchContext';
import {
  BatchUploadZone,
  BatchProgressBar,
  BatchSummaryStats,
  BatchResultsTable,
  BatchDistributionChart,
  BatchExportPanel,
} from '@/components/batch';

export default function BatchDashboard() {
  const { plans, clearAll, isProcessing } = useBatch();
  const hasPlans = plans.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Batch Analysis</h1>
          </div>
          <div className="flex items-center gap-2">
            {hasPlans && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={isProcessing}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
            )}
            <Link to="/help">
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 space-y-6">
        {/* Upload Zone */}
        <BatchUploadZone />

        {/* Progress */}
        <BatchProgressBar />

        {/* Stats and Export Row */}
        {hasPlans && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <BatchSummaryStats />
            </div>
            <div className="space-y-6">
              <BatchExportPanel />
              <BatchDistributionChart />
            </div>
          </div>
        )}

        {/* Results Table */}
        <BatchResultsTable />
      </main>
    </div>
  );
}
