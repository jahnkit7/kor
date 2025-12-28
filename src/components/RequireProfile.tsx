import { useEffect, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

interface RequireProfileProps {
  children: ReactNode;
}

export function RequireProfile({ children }: RequireProfileProps) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [status, setStatus] = useState<"loading" | "complete" | "incomplete">("loading");

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

      // No Supabase configured
      if (!isSupabaseConfigured()) {
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

        setStatus(isComplete ? "complete" : "incomplete");
      } catch (e) {
        console.error("RequireProfile: unexpected error", e);
        setStatus("complete"); // Don't block on error
      }
    };

    setStatus("loading");
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

  // Show loading spinner while checking
  if (status === "loading" || status === "incomplete") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}
