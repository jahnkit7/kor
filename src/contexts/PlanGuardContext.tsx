import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useEnsureSubscription } from "@/hooks/use-ensure-subscription";
import { usePlanLimits, type CheckResult } from "@/hooks/use-plan-limits";
import { LimitReachedDialog, type LimitDialogType, type LimitDialogData } from "@/components/LimitReachedDialog";
import { getCachedSubscription } from "@/lib/plan-cache";

interface PlanGuardContextType {
  // Show limit reached dialog
  showLimitDialog: (type: LimitDialogType, data?: LimitDialogData) => void;
  
  // Close dialog
  closeLimitDialog: () => void;
  
  // Plan limit checks (exposed for UI components)
  checkCanAddClient: () => Promise<CheckResult>;
  checkCanAddSale: (count?: number) => Promise<CheckResult>;
  checkSubscriptionValid: () => CheckResult;
  
  // Invalidate counts cache (after creating client/sale)
  invalidateCountsCache: () => void;
  
  // Is subscription data available?
  hasSubscriptionData: boolean;
}

const PlanGuardContext = createContext<PlanGuardContextType | null>(null);

export function PlanGuardProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const { ensureSubscription, refreshSubscriptionCache } = useEnsureSubscription();
  const planLimits = usePlanLimits();
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<LimitDialogType>("clients");
  const [dialogData, setDialogData] = useState<LimitDialogData | undefined>();
  
  // Track if we have subscription data
  const [hasSubscriptionData, setHasSubscriptionData] = useState(false);
  
  // Ensure subscription exists on login (when online)
  useEffect(() => {
    if (user?.id && isOnline) {
      ensureSubscription(user.id).then((sub) => {
        setHasSubscriptionData(!!sub);
      });
    } else if (user?.id) {
      // Offline - check cache
      const cached = getCachedSubscription(user.id);
      setHasSubscriptionData(!!cached);
    }
  }, [user?.id, isOnline, ensureSubscription]);
  
  // Refresh cache periodically when online
  useEffect(() => {
    if (!user?.id || !isOnline) return;
    
    // Refresh every 5 minutes when online
    const interval = setInterval(() => {
      refreshSubscriptionCache(user.id);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user?.id, isOnline, refreshSubscriptionCache]);
  
  const showLimitDialog = useCallback((type: LimitDialogType, data?: LimitDialogData) => {
    // Add plan name from cache if not provided
    if (!data?.planName && user?.id) {
      const cached = getCachedSubscription(user.id);
      data = { ...data, planName: cached?.plan };
    }
    
    setDialogType(type);
    setDialogData(data);
    setDialogOpen(true);
  }, [user?.id]);
  
  const closeLimitDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);
  
  const value: PlanGuardContextType = {
    showLimitDialog,
    closeLimitDialog,
    checkCanAddClient: planLimits.checkCanAddClient,
    checkCanAddSale: planLimits.checkCanAddSale,
    checkSubscriptionValid: planLimits.checkSubscriptionValid,
    invalidateCountsCache: planLimits.invalidateCountsCache,
    hasSubscriptionData,
  };
  
  return (
    <PlanGuardContext.Provider value={value}>
      {children}
      <LimitReachedDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type={dialogType}
        data={dialogData}
      />
    </PlanGuardContext.Provider>
  );
}

export function usePlanGuard() {
  const context = useContext(PlanGuardContext);
  if (!context) {
    throw new Error("usePlanGuard must be used within PlanGuardProvider");
  }
  return context;
}
