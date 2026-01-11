import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_CACHE_KEY = "admin_status_";

interface AdminState {
  isAdmin: boolean;
  loading: boolean;
  user: ReturnType<typeof useAuth>["user"];
}

export function useAdmin(): AdminState {
  const { user, loading: authLoading } = useAuth();
  
  // Initialize from cache for instant render
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window !== 'undefined' && user?.id) {
      const cached = sessionStorage.getItem(`${ADMIN_CACHE_KEY}${user.id}`);
      return cached === "admin";
    }
    return false;
  });
  
  const [checking, setChecking] = useState(() => {
    // If we have a cached value, don't show loading
    if (typeof window !== 'undefined' && user?.id) {
      const cached = sessionStorage.getItem(`${ADMIN_CACHE_KEY}${user.id}`);
      return cached === null; // Only checking if no cache
    }
    return true;
  });

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

    // Check cache first
    const cached = sessionStorage.getItem(`${ADMIN_CACHE_KEY}${user.id}`);
    if (cached !== null) {
      setIsAdmin(cached === "admin");
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
          sessionStorage.setItem(`${ADMIN_CACHE_KEY}${user.id}`, "not_admin");
        } else {
          const adminStatus = !!data;
          setIsAdmin(adminStatus);
          sessionStorage.setItem(`${ADMIN_CACHE_KEY}${user.id}`, adminStatus ? "admin" : "not_admin");
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
