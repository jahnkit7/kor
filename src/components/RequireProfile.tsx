import { useEffect, useState, ReactNode, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

interface RequireProfileProps {
  children: ReactNode;
}

// Session cache key prefix
const PROFILE_CACHE_KEY = "profile_status_";

export function RequireProfile({ children }: RequireProfileProps) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<"loading" | "complete" | "incomplete">(() => {
    // Check session cache immediately on mount
    if (user?.id) {
      const cached = sessionStorage.getItem(`${PROFILE_CACHE_KEY}${user.id}`);
      if (cached === "complete") return "complete";
    }
    return "loading";
  });
  const checkedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const checkProfile = async () => {
      // Still loading auth
      if (authLoading) return;

      // Not authenticated - let useRequireAuth handle this
      if (!user) {
        setStatus("complete"); // Don't block, auth guard will redirect
        return;
      }

      // Check session cache first
      const cached = sessionStorage.getItem(`${PROFILE_CACHE_KEY}${user.id}`);
      if (cached === "complete") {
        setStatus("complete");
        return;
      }

      // Already checked this session
      if (checkedRef.current) return;
      checkedRef.current = true;

      // No Supabase configured
      if (!isSupabaseConfigured()) {
        sessionStorage.setItem(`${PROFILE_CACHE_KEY}${user.id}`, "complete");
        setStatus("complete");
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
          setStatus("complete"); // Don't block on error
          return;
        }

        const isComplete = Boolean(
          data?.shop_name &&
          data.shop_name !== "Ma Boutique" &&
          data?.owner_name
        );

        if (isComplete) {
          sessionStorage.setItem(`${PROFILE_CACHE_KEY}${user.id}`, "complete");
        }

        setStatus(isComplete ? "complete" : "incomplete");
      } catch (e) {
        console.error("RequireProfile: unexpected error", e);
        setStatus("complete"); // Don't block on error
      }
    };

    checkProfile();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // Redirect to profile-setup if incomplete
  useEffect(() => {
    if (status === "incomplete" && location.pathname !== "/profile-setup") {
      try {
        window.location.assign("/profile-setup");
      } catch (e) {
        console.error("RequireProfile: redirect failed", e);
      }
    }
  }, [status, location.pathname]);

  // Show loading spinner only on first check
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // If incomplete, still render spinner while redirecting
  if (status === "incomplete") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}
