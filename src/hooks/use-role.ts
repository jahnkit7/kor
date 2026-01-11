import { useState, useEffect } from "react";
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

// CRITICAL: Unified state to prevent race conditions
interface UnifiedState {
  role: AppRole;
  loading: boolean;
}

export function useRole(): RoleState {
  const { user, loading: authLoading } = useAuth();
  
  // CRITICAL: Single unified state - role and loading MUST be updated together
  const [state, setState] = useState<UnifiedState>(() => {
    // Try to initialize with cached role immediately
    if (user?.id) {
      const cachedRole = getCachedRole(user.id);
      if (cachedRole) {
        return { role: cachedRole, loading: false };
      }
    }
    return { role: null, loading: true };
  });

  useEffect(() => {
    // Wait for auth to finish loading first
    if (authLoading) {
      return;
    }

    // No user = no role to fetch
    if (!user) {
      setState({ role: null, loading: false });
      return;
    }

    // Check cache and apply ATOMICALLY
    const cachedRole = getCachedRole(user.id);
    if (cachedRole) {
      // CRITICAL: Set role AND loading together in one atomic update
      setState({ role: cachedRole, loading: false });
    } else {
      // No cache - ensure we're in loading state
      setState(prev => ({ ...prev, loading: true }));
    }

    if (!isSupabaseConfigured()) {
      setCachedRole(user.id, "owner");
      setState({ role: "owner", loading: false });
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
          setCachedRole(user.id, fallback);
          setState({ role: fallback, loading: false });
        } else {
          const fetchedRole = data?.role || "owner";
          setCachedRole(user.id, fetchedRole);
          setState({ role: fetchedRole, loading: false });
        }
      } catch (error) {
        console.error("Error fetching role:", error);
        const fallback = cachedRole || "owner";
        setCachedRole(user.id, fallback);
        setState({ role: fallback, loading: false });
      }
    };

    fetchRole();
  }, [user?.id, authLoading]);

  // CRITICAL: Include authLoading in final loading state
  const finalLoading = authLoading || state.loading;

  return {
    role: state.role ?? "owner",
    loading: finalLoading,
    isOwner: state.role === "owner" || state.role === null,
    isEmployee: state.role === "employee",
    isAdmin: state.role === "admin",
  };
}

// Permissions helper
export function usePermissions() {
  const { role, isOwner, loading } = useRole();

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
