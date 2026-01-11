import { useEffect, ReactNode, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

interface RequireProfileProps {
  children: ReactNode;
}

// Session cache key prefix
const PROFILE_CACHE_KEY = "profile_status_";

/**
 * NON-BLOCKING profile guard.
 * Renders children immediately (optimistic) and redirects in background if profile incomplete.
 * This prevents the BottomNav from disappearing during navigation.
 */
export function RequireProfile({ children }: RequireProfileProps) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const checkedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const checkProfile = async () => {
      // Still loading auth - wait
      if (authLoading) return;

      // Not authenticated - let auth guard handle
      if (!user) return;

      // Check session cache first
      const cached = sessionStorage.getItem(`${PROFILE_CACHE_KEY}${user.id}`);
      if (cached === "complete") return;

      // Already checked this session
      if (checkedRef.current) return;
      checkedRef.current = true;

      // No Supabase configured
      if (!isSupabaseConfigured()) {
        sessionStorage.setItem(`${PROFILE_CACHE_KEY}${user.id}`, "complete");
        return;
      }

      try {
        const supabase = await getSupabaseClient();
        
        const { data, error } = await supabase
          .from("profiles")
          .select("shop_name, owner_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("RequireProfile: error fetching profile", error);
          return; // Don't block on error
        }

        const isComplete = Boolean(
          data?.shop_name &&
          data.shop_name !== "Ma Boutique" &&
          data?.owner_name
        );

        if (isComplete) {
          sessionStorage.setItem(`${PROFILE_CACHE_KEY}${user.id}`, "complete");
        } else if (location.pathname !== "/profile-setup") {
          // Redirect to profile setup without blocking
          navigate("/profile-setup", { replace: true });
        }
      } catch (e) {
        console.error("RequireProfile: unexpected error", e);
      }
    };

    checkProfile();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, location.pathname, navigate]);

  // Always render children immediately - non-blocking
  return <>{children}</>;
}
