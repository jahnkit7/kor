import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  cacheSubscription, 
  cachePlanLimits, 
  getCachedSubscription,
  type CachedSubscription,
  type PlanLimitsMap 
} from "@/lib/plan-cache";

/**
 * Hook to ensure user has a subscription record on login
 * - Creates subscription if missing (Gratuit plan)
 * - Handles duplicate key errors gracefully
 * - Caches subscription and plan limits locally
 */
export function useEnsureSubscription() {
  
  /**
   * Ensure subscription exists for user (call on login when online)
   */
  const ensureSubscription = useCallback(async (userId: string): Promise<CachedSubscription | null> => {
    try {
      // 1. Try to fetch existing subscription with maybeSingle (no error if not found)
      const { data: existing, error: fetchError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error fetching subscription:", fetchError);
        return null;
      }
      
      if (existing) {
        // Cache and return existing subscription
        const cached: CachedSubscription = {
          id: existing.id,
          plan: existing.plan,
          trial_ends_at: existing.trial_ends_at,
          trial_started_at: existing.trial_started_at,
          is_active: existing.is_active ?? true,
          max_clients: existing.max_clients,
          max_sales_per_day: existing.max_sales_per_day,
        };
        cacheSubscription(userId, cached);
        
        // Also fetch and cache plan limits
        await fetchAndCachePlanLimits(userId);
        
        return cached;
      }
      
      // 2. No subscription found, fetch Gratuit plan to create one
      const { data: freePlan, error: planError } = await supabase
        .from("subscription_plans")
        .select("*")
        .ilike("name", "gratuit")
        .maybeSingle();
      
      if (planError || !freePlan) {
        console.error("Could not fetch Gratuit plan:", planError);
        return null;
      }
      
      // 3. Create new subscription
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + freePlan.duration_days * 24 * 60 * 60 * 1000);
      
      const { data: newSub, error: insertError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: userId,
          plan: "gratuit",
          is_active: true,
          trial_started_at: now.toISOString(),
          trial_ends_at: trialEndsAt.toISOString(),
          max_clients: freePlan.max_clients,
          max_sales_per_day: freePlan.max_sales_per_day,
        })
        .select()
        .single();
      
      // 4. Handle duplicate key error (race condition)
      if (insertError) {
        if (insertError.code === "23505") {
          // Duplicate key - subscription was created by another request
          // Refetch and cache
          const { data: refetched } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", userId)
            .single();
          
          if (refetched) {
            const cached: CachedSubscription = {
              id: refetched.id,
              plan: refetched.plan,
              trial_ends_at: refetched.trial_ends_at,
              trial_started_at: refetched.trial_started_at,
              is_active: refetched.is_active ?? true,
              max_clients: refetched.max_clients,
              max_sales_per_day: refetched.max_sales_per_day,
            };
            cacheSubscription(userId, cached);
            await fetchAndCachePlanLimits(userId);
            return cached;
          }
        }
        console.error("Error creating subscription:", insertError);
        return null;
      }
      
      // 5. Cache new subscription
      if (newSub) {
        const cached: CachedSubscription = {
          id: newSub.id,
          plan: newSub.plan,
          trial_ends_at: newSub.trial_ends_at,
          trial_started_at: newSub.trial_started_at,
          is_active: newSub.is_active ?? true,
          max_clients: newSub.max_clients,
          max_sales_per_day: newSub.max_sales_per_day,
        };
        cacheSubscription(userId, cached);
        await fetchAndCachePlanLimits(userId);
        return cached;
      }
      
      return null;
    } catch (error) {
      console.error("Error in ensureSubscription:", error);
      return null;
    }
  }, []);
  
  /**
   * Refresh subscription cache (call when online to update cache)
   */
  const refreshSubscriptionCache = useCallback(async (userId: string): Promise<CachedSubscription | null> => {
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (error || !data) {
        console.error("Error refreshing subscription:", error);
        return null;
      }
      
      const cached: CachedSubscription = {
        id: data.id,
        plan: data.plan,
        trial_ends_at: data.trial_ends_at,
        trial_started_at: data.trial_started_at,
        is_active: data.is_active ?? true,
        max_clients: data.max_clients,
        max_sales_per_day: data.max_sales_per_day,
      };
      cacheSubscription(userId, cached);
      await fetchAndCachePlanLimits(userId);
      
      return cached;
    } catch (error) {
      console.error("Error refreshing subscription cache:", error);
      return null;
    }
  }, []);
  
  /**
   * Get cached subscription (no network call)
   */
  const getCached = useCallback((userId: string): CachedSubscription | null => {
    return getCachedSubscription(userId);
  }, []);
  
  return {
    ensureSubscription,
    refreshSubscriptionCache,
    getCached,
  };
}

/**
 * Fetch all plans and cache as limits map
 */
async function fetchAndCachePlanLimits(userId: string): Promise<void> {
  try {
    const { data: plans, error } = await supabase
      .from("subscription_plans")
      .select("name, max_clients, max_sales_per_day, duration_days, commission_reduction")
      .eq("is_active", true);
    
    if (error || !plans) return;
    
    const limitsMap: PlanLimitsMap = {};
    for (const plan of plans) {
      const key = plan.name?.toLowerCase() || "";
      limitsMap[key] = {
        maxClients: plan.max_clients,
        maxSalesPerDay: plan.max_sales_per_day,
        durationDays: plan.duration_days,
        commissionReduction: plan.commission_reduction || 0,
      };
    }
    
    cachePlanLimits(userId, limitsMap);
  } catch (error) {
    console.error("Error fetching plan limits:", error);
  }
}
