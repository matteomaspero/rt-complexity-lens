import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MetricsConfigProvider } from "@/contexts/MetricsConfigContext";
import { ThresholdConfigProvider } from "@/contexts/ThresholdConfigContext";
import { BatchProvider } from "@/contexts/BatchContext";
import { ThemeProvider } from "@/components/ThemeProvider";

// Eager load the main page for best FCP
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy load secondary pages to reduce initial bundle size
const Help = lazy(() => import("./pages/Help"));
const MetricsReference = lazy(() => import("./pages/MetricsReference"));
const TechnicalReference = lazy(() => import("./pages/TechnicalReference"));
const BatchDashboard = lazy(() => import("./pages/BatchDashboard"));
const ComparePlans = lazy(() => import("./pages/ComparePlans"));
const CohortAnalysis = lazy(() => import("./pages/CohortAnalysis"));
const PythonDocs = lazy(() => import("./pages/PythonDocs"));

const queryClient = new QueryClient();

// Simple loading fallback
const PageLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MetricsConfigProvider>
          <ThresholdConfigProvider>
            <BatchProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/help" element={<Suspense fallback={<PageLoader />}><Help /></Suspense>} />
                  <Route path="/metrics" element={<Suspense fallback={<PageLoader />}><MetricsReference /></Suspense>} />
                  <Route path="/technical" element={<Suspense fallback={<PageLoader />}><TechnicalReference /></Suspense>} />
                  <Route path="/batch" element={<Suspense fallback={<PageLoader />}><BatchDashboard /></Suspense>} />
                  <Route path="/compare" element={<Suspense fallback={<PageLoader />}><ComparePlans /></Suspense>} />
                  <Route path="/cohort" element={<Suspense fallback={<PageLoader />}><CohortAnalysis /></Suspense>} />
                  <Route path="/python-docs" element={<Suspense fallback={<PageLoader />}><PythonDocs /></Suspense>} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </BatchProvider>
          </ThresholdConfigProvider>
        </MetricsConfigProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
