import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MetricsConfigProvider } from "@/contexts/MetricsConfigContext";
import { ThresholdConfigProvider } from "@/contexts/ThresholdConfigContext";
import { BatchProvider } from "@/contexts/BatchContext";
import Index from "./pages/Index";
import Help from "./pages/Help";
import BatchDashboard from "./pages/BatchDashboard";
import ComparePlans from "./pages/ComparePlans";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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
                <Route path="/help" element={<Help />} />
                <Route path="/batch" element={<BatchDashboard />} />
                <Route path="/compare" element={<ComparePlans />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </BatchProvider>
        </ThresholdConfigProvider>
      </MetricsConfigProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
