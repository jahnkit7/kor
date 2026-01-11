import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";

type AppRole = "owner" | "employee" | "admin" | null;

interface RoleState {
  role: AppRole;
  loading: boolean;
  isOwner: boolean;
  isEmployee: boolean;
  isAdmin: boolean;
}

export function useRole(): RoleState {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole>(null);
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

    if (!isSupabaseConfigured()) {
      setRole("owner");
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
          setRole("owner"); // Default to owner if error
        } else {
          setRole(data?.role || "owner");
        }
      } catch (error) {
        console.error("Error fetching role:", error);
        setRole("owner");
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user, authLoading]);

  return {
    role: role ?? "owner", // Return "owner" if null for compatibility
    loading: loading || role === null, // Still loading if role is null
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
