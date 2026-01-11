import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";

type AppRole = "owner" | "employee" | "admin" | null;

// Cache key for role in sessionStorage
const ROLE_CACHE_KEY = "user_role_cache_";

interface RoleState {
  role: AppRole;
  loading: boolean;
  isOwner: boolean;
  isEmployee: boolean;
  isAdmin: boolean;
}

// Get cached role from sessionStorage
function getCachedRole(userId: string): AppRole | null {
  if (typeof window === 'undefined') return null;
  const cached = sessionStorage.getItem(`${ROLE_CACHE_KEY}${userId}`);
  if (cached === "admin" || cached === "owner" || cached === "employee") {
    return cached;
  }
  return null;
}

// Set role in sessionStorage cache
function setCachedRole(userId: string, role: AppRole): void {
  if (typeof window === 'undefined' || !role) return;
  sessionStorage.setItem(`${ROLE_CACHE_KEY}${userId}`, role);
}

export function useRole(): RoleState {
  const { user, loading: authLoading } = useAuth();
  
  // Initialize with cached role if available
  const [role, setRole] = useState<AppRole>(() => {
    if (user?.id) {
      return getCachedRole(user.id);
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading first
    if (authLoading) {
      return;
    }

    // No user = no role to fetch
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    // Check cache first - if we have a cached role, use it immediately
    const cachedRole = getCachedRole(user.id);
    if (cachedRole) {
      setRole(cachedRole);
      setLoading(false);
      // Still fetch in background to verify cache is valid
    }

    if (!isSupabaseConfigured()) {
      setRole("owner");
      setCachedRole(user.id, "owner");
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching role:", error);
          const fallback = cachedRole || "owner";
          setRole(fallback);
          setCachedRole(user.id, fallback);
        } else {
          const fetchedRole = data?.role || "owner";
          setRole(fetchedRole);
          setCachedRole(user.id, fetchedRole);
        }
      } catch (error) {
        console.error("Error fetching role:", error);
        const fallback = cachedRole || "owner";
        setRole(fallback);
        setCachedRole(user.id, fallback);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user, authLoading]);

  // Determine if still loading - use cache to avoid loading state
  const hasCache = user?.id ? !!getCachedRole(user.id) : false;
  const isStillLoading = loading && !hasCache;

  return {
    role: role ?? "owner",
    loading: isStillLoading,
    isOwner: role === "owner" || role === null,
    isEmployee: role === "employee",
    isAdmin: role === "admin",
  };
}

// Permissions helper
export function usePermissions() {
  const { role, isOwner, isEmployee, loading } = useRole();

  return {
    role,
    loading,
    // What can user do?
    canAddSales: true, // Both can add sales
    canDeleteData: isOwner, // Only owner
    canViewReports: isOwner, // Only owner
    canChangeSettings: isOwner, // Only owner
    canManageEmployees: isOwner, // Only owner
  };
}
