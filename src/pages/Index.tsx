import { useState, Suspense, lazy } from 'react';
import { ModeSelector, WorkflowGuide } from '@/components/home';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const InteractiveViewer = lazy(() => import('@/components/viewer').then(
  (mod) => ({ default: () => <mod.InteractiveViewer /> })
));

const PageLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const Index = () => {
  const [planLoaded, setPlanLoaded] = useState(false);

  if (planLoaded) {
    return (
      <Suspense fallback={<PageLoader />}>
        <InteractiveViewer />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="border-b bg-background/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">RTplan Complexity Lens v1.0</h1>
              <p className="text-sm text-muted-foreground">
                Analyze DICOM RT treatment plans for delivery complexity
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        {/* Quick Info Alert */}
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="ml-2 text-sm text-blue-600 dark:text-blue-400">
            New in v1.0: Metrics reorganized by clinical priority, multi-rotation charts fixed with color-coding!
          </AlertDescription>
        </Alert>

        {/* Main Content Tabs */}
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <span>⬆️ Upload Files</span>
            </TabsTrigger>
            <TabsTrigger value="modes" className="flex items-center gap-2">
              <span>📋 Choose Mode</span>
            </TabsTrigger>
            <TabsTrigger value="workflow" className="flex items-center gap-2">
              <span>🔄 Workflow Tips</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Upload */}
          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Upload DICOM RT Plans</h3>
                <p className="text-sm text-muted-foreground">
                  Upload DICOM RT Plan files (.dcm) to begin analysis. You can upload single or multiple files.
                </p>
              </div>

              {/* File Upload Component */}
              <Card className="p-6 min-h-[400px]">
                <Suspense fallback={<PageLoader />}>
                  <InteractiveViewer />
                </Suspense>
              </Card>

              <div className="grid gap-4 md:grid-cols-3 text-sm">
                <div className="space-y-2 rounded-lg border p-3">
                  <h4 className="font-semibold">📁 Single Plan</h4>
                  <p className="text-xs text-muted-foreground">
                    Upload one file for detailed analysis and visualization
                  </p>
                </div>
                <div className="space-y-2 rounded-lg border p-3">
                  <h4 className="font-semibold">📦 Multiple Plans</h4>
                  <p className="text-xs text-muted-foreground">
                    Upload 5-100+ files for batch analysis and screening
                  </p>
                </div>
                <div className="space-y-2 rounded-lg border p-3">
                  <h4 className="font-semibold">✓ DICOM-RT Format</h4>
                  <p className="text-xs text-muted-foreground">
                    Supports standard DICOM RT Plan files with MLC data
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Mode Selection */}
          <TabsContent value="modes" className="space-y-4">
            <ModeSelector />
          </TabsContent>

          {/* Tab 3: Workflow Guide */}
          <TabsContent value="workflow" className="space-y-4">
            <WorkflowGuide />
          </TabsContent>
        </Tabs>

        {/* Bottom CTA - Reference & Help */}
        <Separator />

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4 space-y-2 hover:border-primary cursor-pointer transition-colors">
            <h4 className="font-semibold">📊 Metrics Reference</h4>
            <p className="text-xs text-muted-foreground">
              Learn about all complexity metrics and their interpretation
            </p>
            <a
              href="/metrics"
              className="text-xs text-primary hover:underline font-semibold"
            >
              View Reference →
            </a>
          </Card>

          <Card className="p-4 space-y-2 hover:border-primary cursor-pointer transition-colors">
            <h4 className="font-semibold">❓ Help & FAQ</h4>
            <p className="text-xs text-muted-foreground">
              Detailed guides for each analysis mode and common questions
            </p>
            <a href="/help" className="text-xs text-primary hover:underline font-semibold">
              Open Help →
            </a>
          </Card>

          <Card className="p-4 space-y-2 hover:border-primary cursor-pointer transition-colors">
            <h4 className="font-semibold">🔧 Technical Docs</h4>
            <p className="text-xs text-muted-foreground">
              Python API documentation and algorithm details
            </p>
            <a
              href="/technical"
              className="text-xs text-primary hover:underline font-semibold"
            >
              View Docs →
            </a>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;