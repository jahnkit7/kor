import { useCallback, useRef } from "react";
import { useAuth } from "./use-auth";
import { getCachedSubscription, type CachedSubscription } from "@/lib/plan-cache";
import * as localDB from "@/lib/db";

/**
 * Result of a plan limit check
 */
export interface CheckResult {
  allowed: boolean;
  reason?: "limit_reached" | "expired" | "no_data" | "no_subscription";
  currentCount?: number;
  maxAllowed?: number;
  daysRemaining?: number;
  wouldExceedBy?: number;
}

/**
 * Current plan limits derived from subscription
 */
export interface CurrentLimits {
  maxClients: number | null;      // null = unlimited
  maxSalesPerDay: number | null;  // null = unlimited
  trialEndsAt: Date | null;
  isActive: boolean;
  planName: string;
}

// Cache TTL for in-memory counts (30 seconds)
const COUNTS_CACHE_TTL_MS = 30 * 1000;

interface CountsCache {
  clientsCount: number;
  salesTodayCount: number;
  cachedAt: number;
}

/**
 * Get the current local day string in YYYY-MM-DD format (local timezone)
 */
export function getLocalDayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Hook for strict plan limit enforcement
 * 
 * CRITICAL: This hook reads ONLY from subscriptions table (via cache)
 * subscription_plans is NEVER used at runtime for limit checks
 */
export function usePlanLimits() {
  const { user } = useAuth();
  
  // In-memory counts cache to avoid excessive IndexedDB reads
  const countsCacheRef = useRef<CountsCache | null>(null);
  
  /**
   * Get current limits from cached subscription
   * Returns null if no valid cache (triggers STRICT MODE)
   */
  const getCurrentLimits = useCallback((): CurrentLimits | null => {
    if (!user?.id) return null;
    
    const subscription = getCachedSubscription(user.id);
    if (!subscription) return null;
    
    return {
      maxClients: subscription.max_clients,
      maxSalesPerDay: subscription.max_sales_per_day,
      trialEndsAt: subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null,
      isActive: subscription.is_active,
      planName: subscription.plan,
    };
  }, [user?.id]);
  
  /**
   * Get client count (uses in-memory cache if valid)
   */
  const getClientCount = useCallback(async (): Promise<number> => {
    const now = Date.now();
    
    // Use cache if valid
    if (countsCacheRef.current && (now - countsCacheRef.current.cachedAt) < COUNTS_CACHE_TTL_MS) {
      return countsCacheRef.current.clientsCount;
    }
    
    // Fetch from IndexedDB
    const clients = await localDB.getClients();
    const count = clients.length;
    
    // Update cache
    countsCacheRef.current = {
      clientsCount: count,
      salesTodayCount: countsCacheRef.current?.salesTodayCount || 0,
      cachedAt: now,
    };
    
    return count;
  }, []);
  
  /**
   * Get today's sales count (uses in-memory cache if valid)
   */
  const getTodaySalesCount = useCallback(async (): Promise<number> => {
    const now = Date.now();
    
    // Use cache if valid
    if (countsCacheRef.current && (now - countsCacheRef.current.cachedAt) < COUNTS_CACHE_TTL_MS) {
      return countsCacheRef.current.salesTodayCount;
    }
    
    // Fetch from IndexedDB - use new timezone-safe function
    const count = await localDB.getTodaySalesCount();
    
    // Update cache
    countsCacheRef.current = {
      clientsCount: countsCacheRef.current?.clientsCount || 0,
      salesTodayCount: count,
      cachedAt: now,
    };
    
    return count;
  }, []);
  
  /**
   * Invalidate in-memory counts cache (call after creating client/sale)
   */
  const invalidateCountsCache = useCallback(() => {
    countsCacheRef.current = null;
  }, []);
  
  /**
   * Check if subscription is valid (not expired)
   * STRICT MODE: Returns not allowed if no data
   */
  const checkSubscriptionValid = useCallback((): CheckResult => {
    const limits = getCurrentLimits();
    
    // NO DATA → STRICT MODE
    if (!limits) {
      return { allowed: false, reason: "no_data" };
    }
    
    // Check if subscription is active
    if (!limits.isActive) {
      return { allowed: false, reason: "expired" };
    }
    
    // Check expiration
    if (limits.trialEndsAt) {
      const now = new Date();
      const daysRemaining = Math.ceil((limits.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (now > limits.trialEndsAt) {
        return { 
          allowed: false, 
          reason: "expired",
          daysRemaining: 0,
        };
      }
      
      return { 
        allowed: true,
        daysRemaining,
      };
    }
    
    return { allowed: true };
  }, [getCurrentLimits]);
  
  /**
   * Check if user can add a client
   * STRICT MODE: Returns not allowed if no data
   */
  const checkCanAddClient = useCallback(async (): Promise<CheckResult> => {
    const limits = getCurrentLimits();
    
    // NO DATA → STRICT MODE
    if (!limits) {
      return { allowed: false, reason: "no_data" };
    }
    
    // Check expiration first
    const subCheck = checkSubscriptionValid();
    if (!subCheck.allowed) {
      return subCheck;
    }
    
    // Unlimited clients
    if (limits.maxClients === null) {
      return { allowed: true };
    }
    
    // Check current count
    const currentCount = await getClientCount();
    
    if (currentCount >= limits.maxClients) {
      return {
        allowed: false,
        reason: "limit_reached",
        currentCount,
        maxAllowed: limits.maxClients,
      };
    }
    
    return { 
      allowed: true,
      currentCount,
      maxAllowed: limits.maxClients,
    };
  }, [getCurrentLimits, getClientCount, checkSubscriptionValid]);
  
  /**
   * Check if user can add N sales (for multi-sale voice input)
   * STRICT MODE: Returns not allowed if no data
   */
  const checkCanAddSale = useCallback(async (count: number = 1): Promise<CheckResult> => {
    const limits = getCurrentLimits();
    
    // NO DATA → STRICT MODE
    if (!limits) {
      return { allowed: false, reason: "no_data" };
    }
    
    // Check expiration first
    const subCheck = checkSubscriptionValid();
    if (!subCheck.allowed) {
      return subCheck;
    }
    
    // Unlimited sales
    if (limits.maxSalesPerDay === null) {
      return { allowed: true };
    }
    
    // Check current count + proposed count
    const todayCount = await getTodaySalesCount();
    
    if (todayCount + count > limits.maxSalesPerDay) {
      return {
        allowed: false,
        reason: "limit_reached",
        currentCount: todayCount,
        maxAllowed: limits.maxSalesPerDay,
        wouldExceedBy: (todayCount + count) - limits.maxSalesPerDay,
      };
    }
    
    return { 
      allowed: true,
      currentCount: todayCount,
      maxAllowed: limits.maxSalesPerDay,
    };
  }, [getCurrentLimits, getTodaySalesCount, checkSubscriptionValid]);
  
  /**
   * Get raw subscription data from cache
   */
  const getSubscription = useCallback((): CachedSubscription | null => {
    if (!user?.id) return null;
    return getCachedSubscription(user.id);
  }, [user?.id]);
  
  return {
    getCurrentLimits,
    checkSubscriptionValid,
    checkCanAddClient,
    checkCanAddSale,
    getClientCount,
    getTodaySalesCount,
    invalidateCountsCache,
    getSubscription,
  };
}
