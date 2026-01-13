import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { OfflineProvider } from "./contexts/OfflineContext";
import { FeatureNotificationsProvider } from "./contexts/FeatureNotificationsContext";
import { SubscriptionNotificationsProvider } from "./contexts/SubscriptionNotificationsContext";
import { PlanGuardProvider } from "./contexts/PlanGuardContext";
import { PWAStatus } from "./components/PWAStatus";
import { AnimatedRoutes } from "./components/layout/AnimatedRoutes";
import { CacheVersionChecker } from "./components/CacheVersionChecker";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - données considérées fraîches
      gcTime: 30 * 60 * 1000,   // 30 minutes - garder en cache
      refetchOnWindowFocus: false, // Ne pas re-fetch au focus
      refetchOnMount: false,       // Ne pas re-fetch au montage si données fraîches
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <OfflineProvider>
      <FeatureNotificationsProvider>
        <TooltipProvider>
          <CacheVersionChecker />
          <Toaster />
          <Sonner />
          <PWAStatus />
          <BrowserRouter>
            <PlanGuardProvider>
              <SubscriptionNotificationsProvider>
                <AnimatedRoutes />
              </SubscriptionNotificationsProvider>
            </PlanGuardProvider>
          </BrowserRouter>
        </TooltipProvider>
      </FeatureNotificationsProvider>
    </OfflineProvider>
  </QueryClientProvider>
);

export default App;
