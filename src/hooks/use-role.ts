import { useState, useEffect, useMemo } from "react";
import { useAuth } from "./use-auth";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";

type AppRole = "owner" | "employee" | "admin" | null;

const ROLE_CACHE_KEY = "user_role_cache_";

interface RoleState {
  role: AppRole;
  loading: boolean;
  isOwner: boolean;
  isEmployee: boolean;
  isAdmin: boolean;
}

function getCachedRole(userId: string): AppRole | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem(`${ROLE_CACHE_KEY}${userId}`);
    if (cached === "admin" || cached === "owner" || cached === "employee") {
      return cached;
    }
  } catch {
    // Ignore sessionStorage errors
  }
  return null;
}

function setCachedRole(userId: string, role: AppRole): void {
  if (typeof window === 'undefined' || !role) return;
  try {
    sessionStorage.setItem(`${ROLE_CACHE_KEY}${userId}`, role);
  } catch {
    // Ignore sessionStorage errors
  }
}

export function useRole(): RoleState {
  const { user, loading: authLoading } = useAuth();
  
  // State for the role fetched from DB
  const [fetchedRole, setFetchedRole] = useState<AppRole>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // CRITICAL: Read cache SYNCHRONOUSLY via useMemo when user.id is available
  // This ensures we have the role immediately without waiting for useEffect
  const cachedRole = useMemo(() => {
    if (user?.id) {
      return getCachedRole(user.id);
    }
    return null;
  }, [user?.id]);

  // Effective role: cache takes priority over fetched
  const effectiveRole = cachedRole || fetchedRole;

  // Fetch role from DB only when needed
  useEffect(() => {
    // Wait for auth to be ready
    if (authLoading) return;
    
    // No user = reset everything
    if (!user) {
      setFetchedRole(null);
      setHasFetched(true);
      setIsFetching(false);
      return;
    }

    // Check if we have a cache - fetch will be non-blocking if we do
    const hasCache = !!getCachedRole(user.id);
    
    if (!isSupabaseConfigured()) {
      setCachedRole(user.id, "owner");
      setFetchedRole("owner");
      setHasFetched(true);
      return;
    }

    const fetchRole = async () => {
      // Only show loading state if we DON'T have a cache
      if (!hasCache) {
        setIsFetching(true);
      }
      
      try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching role:", error);
          const fallback = hasCache ? getCachedRole(user.id) : "owner";
          setCachedRole(user.id, fallback);
          setFetchedRole(fallback);
        } else {
          const role = data?.role || "owner";
          setCachedRole(user.id, role);
          setFetchedRole(role);
        }
      } catch (error) {
        console.error("Error fetching role:", error);
        const fallback = hasCache ? getCachedRole(user.id) : "owner";
        setCachedRole(user.id, fallback);
        setFetchedRole(fallback);
      } finally {
        setIsFetching(false);
        setHasFetched(true);
      }
    };

    fetchRole();
  }, [user?.id, authLoading]);

  // CRITICAL: Loading logic
  // - If auth is still loading -> loading = true
  // - If we have a cached role -> loading = false (even if fetching in background)
  // - If no cache AND fetching -> loading = true
  // - If no cache AND not yet fetched AND user exists -> loading = true
  const isLoading = authLoading || 
    (!cachedRole && isFetching) || 
    (!cachedRole && !hasFetched && !!user);

  return {
    role: effectiveRole ?? "owner",
    loading: isLoading,
    isOwner: effectiveRole === "owner" || effectiveRole === null,
    isEmployee: effectiveRole === "employee",
    isAdmin: effectiveRole === "admin",
  };
}

// Permissions helper
export function usePermissions() {
  const { role, isOwner, loading } = useRole();

  return {
    role,
    loading,
    canAddSales: true,
    canDeleteData: isOwner,
    canViewReports: isOwner,
    canChangeSettings: isOwner,
    canManageEmployees: isOwner,
  };
}
