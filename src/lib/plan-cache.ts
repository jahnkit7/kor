/**
 * Secure localStorage cache for subscription data
 * - TTL: 7 days max
 * - User binding: cache is tied to specific user ID
 * - Version control: cache invalidated on version change
 */

const CACHE_VERSION = 1;
const CACHE_TTL_DAYS = 7;

// Cache keys
const SUBSCRIPTION_CACHE_KEY = "kor_subscription_cache";
const PLAN_LIMITS_CACHE_KEY = "kor_plan_limits_cache";

export interface CachedSubscription {
  id: string;
  plan: string;
  trial_ends_at: string;
  trial_started_at: string;
  is_active: boolean;
  max_clients: number | null;
  max_sales_per_day: number | null;
}

export interface PlanLimitsMap {
  [planName: string]: {
    maxClients: number | null;
    maxSalesPerDay: number | null;
    durationDays: number;
    commissionReduction: number;
  };
}

interface SecureCache<T> {
  userId: string;
  cachedAt: string;
  cacheVersion: number;
  data: T;
}

/**
 * Check if cache is valid (within TTL and correct version/user)
 */
function isCacheValid<T>(cache: SecureCache<T> | null, userId: string): boolean {
  if (!cache) return false;
  if (cache.userId !== userId) return false;
  if (cache.cacheVersion !== CACHE_VERSION) return false;
  
  const cachedDate = new Date(cache.cachedAt);
  const now = new Date();
  const daysSinceCached = (now.getTime() - cachedDate.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysSinceCached <= CACHE_TTL_DAYS;
}

/**
 * Cache subscription data securely
 */
export function cacheSubscription(userId: string, data: CachedSubscription): void {
  try {
    const cache: SecureCache<CachedSubscription> = {
      userId,
      cachedAt: new Date().toISOString(),
      cacheVersion: CACHE_VERSION,
      data,
    };
    localStorage.setItem(SUBSCRIPTION_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error("Failed to cache subscription:", error);
  }
}

/**
 * Get cached subscription (returns null if cache is invalid or expired)
 */
export function getCachedSubscription(userId: string): CachedSubscription | null {
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (!raw) return null;
    
    const cache: SecureCache<CachedSubscription> = JSON.parse(raw);
    
    if (!isCacheValid(cache, userId)) {
      // Clear invalid cache
      localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
      return null;
    }
    
    return cache.data;
  } catch {
    localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
    return null;
  }
}

/**
 * Cache plan limits map securely
 */
export function cachePlanLimits(userId: string, plans: PlanLimitsMap): void {
  try {
    const cache: SecureCache<PlanLimitsMap> = {
      userId,
      cachedAt: new Date().toISOString(),
      cacheVersion: CACHE_VERSION,
      data: plans,
    };
    localStorage.setItem(PLAN_LIMITS_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error("Failed to cache plan limits:", error);
  }
}

/**
 * Get cached plan limits (returns null if cache is invalid or expired)
 */
export function getCachedPlanLimits(userId: string): PlanLimitsMap | null {
  try {
    const raw = localStorage.getItem(PLAN_LIMITS_CACHE_KEY);
    if (!raw) return null;
    
    const cache: SecureCache<PlanLimitsMap> = JSON.parse(raw);
    
    if (!isCacheValid(cache, userId)) {
      localStorage.removeItem(PLAN_LIMITS_CACHE_KEY);
      return null;
    }
    
    return cache.data;
  } catch {
    localStorage.removeItem(PLAN_LIMITS_CACHE_KEY);
    return null;
  }
}

/**
 * Clear all subscription-related caches
 */
export function clearSubscriptionCache(): void {
  localStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
  localStorage.removeItem(PLAN_LIMITS_CACHE_KEY);
}

/**
 * Get cache age in hours (for debugging)
 */
export function getCacheAge(): number | null {
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (!raw) return null;
    
    const cache: SecureCache<CachedSubscription> = JSON.parse(raw);
    const cachedDate = new Date(cache.cachedAt);
    const now = new Date();
    
    return (now.getTime() - cachedDate.getTime()) / (1000 * 60 * 60);
  } catch {
    return null;
  }
}
