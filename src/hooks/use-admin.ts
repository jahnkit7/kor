import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";
import { supabase } from "@/integrations/supabase/client";

interface AdminState {
  isAdmin: boolean;
  loading: boolean;
  user: ReturnType<typeof useAuth>["user"];
}

export function useAdmin(): AdminState {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Wait for auth to be ready
    if (authLoading) {
      return;
    }

    if (!user) {
      setIsAdmin(false);
      setChecking(false);
      return;
    }

    const checkAdminRole = async () => {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) {
          console.error("Error checking admin role:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
        }
      } catch (error) {
        console.error("Error checking admin role:", error);
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    };

    checkAdminRole();
  }, [user, authLoading]);

  // Loading is true while auth is loading OR while checking role
  const loading = authLoading || checking;

  return { isAdmin, loading, user };
}
