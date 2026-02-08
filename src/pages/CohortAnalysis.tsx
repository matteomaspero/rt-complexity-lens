import { Link } from 'react-router-dom';
import { HelpCircle, Home, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { CohortProvider, useCohort } from '@/contexts/CohortContext';
import {
  CohortUploadZone,
  CohortProgressBar,
  ClusteringConfig,
  ClusterSummaryGrid,
  BoxPlotChart,
  CorrelationHeatmap,
  ScatterMatrix,
  ViolinPlot,
  ExtendedStatsTable,
  CohortExportPanel,
} from '@/components/cohort';
import { ClusteringSuggestions } from '@/components/cohort/ClusteringSuggestions';
import { suggestClusteringDimensions } from '@/lib/outlier-detection';
import { useMemo } from 'react';

function CohortAnalysisContent() {
  const { successfulPlans, clearAll, isProcessing } = useCohort();

  // Calculate clustering suggestions
  const clusteringSuggestions = useMemo(() => {
    if (successfulPlans.length < 5) return [];
    return suggestClusteringDimensions(successfulPlans, 3);
  }, [successfulPlans]);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Cohort Analysis</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Statistical clustering and distribution analysis for multiple RT plans
            </p>
          </div>
          <div className="flex items-center gap-2">
            {successfulPlans.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={isProcessing}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
            <Button variant="ghost" size="icon" asChild>
              <Link to="/" title="Home">
                <Home className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link to="/help" title="Help">
                <HelpCircle className="h-5 w-5" />
              </Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Upload Section */}
        <CohortUploadZone />
        <CohortProgressBar />

        {/* Analysis Section - Only show when plans are loaded */}
        {successfulPlans.length > 0 && (
          <>
            {/* Clustering Suggestions */}
            {clusteringSuggestions.length > 0 && (
              <ClusteringSuggestions 
                suggestions={clusteringSuggestions}
                onApplySuggestion={(metricKey) => {
                  // TODO: Auto-apply clustering dimension
                  console.log('Apply clustering dimension:', metricKey);
                }}
              />
            )}

            {/* Configuration and Summary Grid */}
            <div className="grid gap-6 lg:grid-cols-4">
              <div className="lg:col-span-1 space-y-4">
                <ClusteringConfig />
                <CohortExportPanel />
              </div>
              <div className="lg:col-span-3">
                <div className="rounded-lg border bg-card p-4">
                  <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <span className="w-1 h-4 bg-primary rounded-full" />
                    Cluster Summary
                  </h3>
                  <ClusterSummaryGrid />
                </div>
              </div>
            </div>

            {/* Visualization Tabs */}
            <Tabs defaultValue="boxplot" className="w-full">
              <TabsList className="grid w-full grid-cols-4 max-w-md">
                <TabsTrigger value="boxplot">Box Plots</TabsTrigger>
                <TabsTrigger value="scatter">Scatter</TabsTrigger>
                <TabsTrigger value="correlation">Correlation</TabsTrigger>
                <TabsTrigger value="violin">Violin</TabsTrigger>
              </TabsList>

              <TabsContent value="boxplot" className="mt-4">
                <BoxPlotChart />
              </TabsContent>

              <TabsContent value="scatter" className="mt-4">
                <ScatterMatrix />
              </TabsContent>

              <TabsContent value="correlation" className="mt-4">
                <CorrelationHeatmap />
              </TabsContent>

              <TabsContent value="violin" className="mt-4">
                <ViolinPlot />
              </TabsContent>
            </Tabs>

            {/* Extended Statistics Table */}
            <ExtendedStatsTable />
          </>
        )}

        {/* Empty State */}
        {successfulPlans.length === 0 && !isProcessing && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-2">No plans loaded</p>
            <p className="text-sm">
              Upload DICOM-RT Plan files or ZIP archives to begin cohort analysis
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function CohortAnalysis() {
  return (
    <CohortProvider>
      <CohortAnalysisContent />
    </CohortProvider>
  );
}
