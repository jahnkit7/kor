import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEnsureSubscription } from "./use-ensure-subscription";
import { usePlanGuard } from "@/contexts/PlanGuardContext";
import { toast } from "sonner";

interface PlanData {
  id: string;
  name: string;
  duration_days: number;
  max_clients?: number | null;
  max_sales_per_day?: number | null;
  price?: number;
}

interface ApplyPlanOptions {
  /** If true, extends from current subscription end date if still active */
  extendFromCurrent?: boolean;
  /** If true, marks trial as used (for upgrade from gratuit) */
  markTrialUsed?: boolean;
}

/**
 * Centralized hook for subscription upgrades
 * Handles: DB update + cache refresh + query invalidation
 * Fixes Bug 1: ensures max_clients and max_sales_per_day are always updated
 */
export function useSubscriptionUpgrade() {
  const queryClient = useQueryClient();
  const { refreshSubscriptionCache } = useEnsureSubscription();
  const { invalidateCountsCache } = usePlanGuard();

  /**
   * Apply a plan to a user's subscription
   * This is the SINGLE source of truth for subscription updates
   */
  const applyPlanToSubscription = useCallback(async (
    userId: string,
    plan: PlanData,
    options?: ApplyPlanOptions
  ): Promise<boolean> => {
    try {
      // 1. Get current subscription to check if upgrading from trial
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("trial_ends_at, plan, trial_used_at")
        .eq("user_id", userId)
        .maybeSingle();

      // 2. Calculate new end date
      let endDate = new Date();
      
      if (options?.extendFromCurrent && existingSub?.trial_ends_at) {
        const currentEnd = new Date(existingSub.trial_ends_at);
        if (currentEnd > new Date()) {
          // Extend from current end date if still active
          endDate = new Date(currentEnd.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);
        } else {
          endDate.setDate(endDate.getDate() + plan.duration_days);
        }
      } else {
        endDate.setDate(endDate.getDate() + plan.duration_days);
      }

      // 3. Determine if we should mark trial as used
      const isUpgradeFromTrial = existingSub?.plan?.toLowerCase() === 'gratuit' && 
                                  plan.name.toLowerCase() !== 'gratuit';
      const shouldMarkTrialUsed = options?.markTrialUsed || isUpgradeFromTrial;

      // 4. Build update data with ALL limits (fixes Bug 1)
      const updateData: Record<string, unknown> = {
        user_id: userId,
        plan: plan.name.toLowerCase(),
        is_active: true,
        trial_started_at: new Date().toISOString(),
        trial_ends_at: endDate.toISOString(),
        max_clients: plan.max_clients ?? null,
        max_sales_per_day: plan.max_sales_per_day ?? null,
      };

      // Mark trial as used if upgrading from gratuit (Bug 3)
      if (shouldMarkTrialUsed && !existingSub?.trial_used_at) {
        updateData.trial_used_at = new Date().toISOString();
      }

      // 5. Upsert subscription
      const { error } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: userId,
          plan: updateData.plan as string,
          is_active: updateData.is_active as boolean,
          trial_started_at: updateData.trial_started_at as string,
          trial_ends_at: updateData.trial_ends_at as string,
          max_clients: updateData.max_clients as number | null,
          max_sales_per_day: updateData.max_sales_per_day as number | null,
          trial_used_at: updateData.trial_used_at as string | undefined,
        }, { onConflict: "user_id" });

      if (error) throw error;

      // 6. CRITICAL: Refresh cache IMMEDIATELY after DB update
      await refreshSubscriptionCache(userId);

      // 7. Invalidate counts cache (so next limit check uses fresh data)
      invalidateCountsCache();

      // 8. Invalidate TanStack queries
      await queryClient.invalidateQueries({ queryKey: ["user-subscription"] });

      if (import.meta.env.DEV) {
        console.log("[useSubscriptionUpgrade] Applied plan:", {
          plan: plan.name,
          max_clients: plan.max_clients,
          max_sales_per_day: plan.max_sales_per_day,
          trial_used_at: shouldMarkTrialUsed ? "set" : "unchanged",
        });
      }

      return true;
    } catch (error) {
      console.error("[useSubscriptionUpgrade] Error applying plan:", error);
      toast.error("Erreur lors de la mise à jour de l'abonnement");
      return false;
    }
  }, [queryClient, refreshSubscriptionCache, invalidateCountsCache]);

  /**
   * Get plan data from subscription_plans table
   */
  const fetchPlanData = useCallback(async (planName: string): Promise<PlanData | null> => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("id, name, duration_days, max_clients, max_sales_per_day, price")
        .ilike("name", planName)
        .maybeSingle();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.name,
        duration_days: data.duration_days,
        max_clients: data.max_clients,
        max_sales_per_day: data.max_sales_per_day,
        price: data.price,
      };
    } catch {
      return null;
    }
  }, []);

  return { 
    applyPlanToSubscription,
    fetchPlanData,
  };
}
