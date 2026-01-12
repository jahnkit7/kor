import { useEffect, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { useNetworkStatus } from "@/hooks/use-network-status";

interface RequireProfileProps {
  children: ReactNode;
}

// Session cache key prefix
const PROFILE_CACHE_KEY = "profile_status_";

/**
 * Clear profile cache - call this when profile is updated
 */
export function clearProfileCache(userId?: string) {
  if (userId) {
    sessionStorage.removeItem(`${PROFILE_CACHE_KEY}${userId}`);
  } else {
    // Clear all profile caches
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith(PROFILE_CACHE_KEY)) {
        sessionStorage.removeItem(key);
      }
    });
  }
}

/**
 * NON-BLOCKING profile guard.
 * Renders children immediately (optimistic) and redirects in background if profile incomplete.
 * This prevents the BottomNav from disappearing during navigation.
 * CRITICAL: NEVER redirect when offline!
 */
export function RequireProfile({ children }: RequireProfileProps) {
  const { user, loading: authLoading } = useAuth();
  const { isOnline } = useNetworkStatus();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const checkProfile = async () => {
      // CRITICAL: Skip profile check when offline - let user continue using app
      if (!isOnline) return;
      
      // Still loading auth - wait
      if (authLoading) return;

      // Not authenticated - let auth guard handle
      if (!user) return;

      // Check session cache first - but ALWAYS check on first load after auth
      const cached = sessionStorage.getItem(`${PROFILE_CACHE_KEY}${user.id}`);
      if (cached === "complete") return;

      // No Supabase configured
      if (!isSupabaseConfigured()) {
        sessionStorage.setItem(`${PROFILE_CACHE_KEY}${user.id}`, "complete");
        return;
      }

      try {
        const supabase = await getSupabaseClient();
        
        const { data, error } = await supabase
          .from("profiles")
          .select("shop_name, owner_name, specialty")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("RequireProfile: error fetching profile", error);
          // On error, redirect to setup to be safe
          if (location.pathname !== "/profile-setup") {
            navigate("/profile-setup", { replace: true });
          }
          return;
        }

        const isComplete = Boolean(
          data?.shop_name &&
          data.shop_name !== "Ma Boutique" &&
          data?.owner_name &&
          data?.specialty // NEW: Require specialty (activity type) for old accounts
        );

        if (isComplete) {
          sessionStorage.setItem(`${PROFILE_CACHE_KEY}${user.id}`, "complete");
        } else if (location.pathname !== "/profile-setup") {
          // Redirect to profile setup without blocking
          navigate("/profile-setup", { replace: true });
        }
      } catch (e) {
        console.error("RequireProfile: unexpected error", e);
        // On error, redirect to setup to be safe
        if (location.pathname !== "/profile-setup") {
          navigate("/profile-setup", { replace: true });
        }
      }
    };

    checkProfile();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, location.pathname, navigate, isOnline]);

  // Always render children immediately - non-blocking
  return <>{children}</>;
}
