import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";

type AppRole = "owner" | "employee";

interface RoleState {
  role: AppRole;
  loading: boolean;
  isOwner: boolean;
  isEmployee: boolean;
}

export function useRole(): RoleState {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole>("owner");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) {
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
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user]);

  return {
    role,
    loading,
    isOwner: role === "owner",
    isEmployee: role === "employee",
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
