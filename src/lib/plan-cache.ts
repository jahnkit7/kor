/**
 * Secure localStorage cache for subscription data
 * - TTL: 7 days max
 * - User binding: cache is tied to specific user ID
 * - Version control: cache invalidated on version change
 * - Grace period: 14 days for offline access (Bug 4 fix)
 * - Global invalidation: admin can force cache refresh for all users
 */

const CACHE_VERSION = 2; // Bumped for lastVerifiedAt field
const CACHE_TTL_DAYS = 7;
const GRACE_PERIOD_DAYS = 14; // Extended offline grace period

// Cache keys
const SUBSCRIPTION_CACHE_KEY = "kor_subscription_cache";
const PLAN_LIMITS_CACHE_KEY = "kor_plan_limits_cache";
const CACHE_VERSION_KEY = "kor_cache_version";

export interface CachedSubscription {
  id: string;
  plan: string;
  trial_ends_at: string;
  trial_started_at: string;
  is_active: boolean;
  max_clients: number | null;
  max_sales_per_day: number | null;
  trial_used_at?: string | null; // Bug 3: track trial usage
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
  lastVerifiedAt: string; // Bug 4: Last time we verified online
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
  
  const lastVerified = new Date(cache.lastVerifiedAt || cache.cachedAt);
  const now = new Date();
  const daysSinceVerified = (now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysSinceVerified <= CACHE_TTL_DAYS;
}

/**
 * Check if cache is valid for OFFLINE use (with grace period)
 * Bug 4 fix: Allows extended offline access with grace period
 */
export function isCacheValidForOffline(userId: string): { valid: boolean; inGracePeriod: boolean } {
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (!raw) return { valid: false, inGracePeriod: false };
    
    const cache: SecureCache<CachedSubscription> = JSON.parse(raw);
    if (cache.userId !== userId) return { valid: false, inGracePeriod: false };
    // Allow old cache version for offline grace period
    if (cache.cacheVersion !== CACHE_VERSION && cache.cacheVersion !== CACHE_VERSION - 1) {
      return { valid: false, inGracePeriod: false };
    }
    
    const lastVerified = new Date(cache.lastVerifiedAt || cache.cachedAt);
    const daysSinceVerified = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceVerified <= CACHE_TTL_DAYS) {
      return { valid: true, inGracePeriod: false };
    }
    
    if (daysSinceVerified <= GRACE_PERIOD_DAYS) {
      return { valid: true, inGracePeriod: true };
    }
    
    return { valid: false, inGracePeriod: false };
  } catch {
    return { valid: false, inGracePeriod: false };
  }
}

/**
 * Cache subscription data securely
 */
export function cacheSubscription(userId: string, data: CachedSubscription): void {
  try {
    const now = new Date().toISOString();
    const cache: SecureCache<CachedSubscription> = {
      userId,
      cachedAt: now,
      lastVerifiedAt: now, // Set on cache creation/update
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
    const now = new Date().toISOString();
    const cache: SecureCache<PlanLimitsMap> = {
      userId,
      cachedAt: now,
      lastVerifiedAt: now,
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
 * Clear ALL app caches (for admin use)
 */
export function clearAllAppCaches(): void {
  const keysToRemove = Object.keys(localStorage).filter(key => 
    key.startsWith("kor_") && key !== CACHE_VERSION_KEY
  );
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * Get the global cache version (for checking if cache should be invalidated)
 */
export function getGlobalCacheVersion(): string | null {
  return localStorage.getItem(CACHE_VERSION_KEY);
}

/**
 * Set the global cache version (triggers cache invalidation for all users)
 */
export function setGlobalCacheVersion(version: string): void {
  localStorage.setItem(CACHE_VERSION_KEY, version);
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
