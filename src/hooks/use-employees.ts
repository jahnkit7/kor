import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";
import { toast } from "sonner";

export interface EmployeeInvite {
  id: string;
  employee_phone: string;
  status: "pending" | "accepted" | "expired";
  expires_at: string;
  created_at: string;
  owner_user_id: string;
}

interface EmployeesState {
  invites: EmployeeInvite[];
  loading: boolean;
  refetch: () => Promise<void>;
  sendInvite: (phone: string) => Promise<boolean>;
  cancelInvite: (id: string) => Promise<void>;
}

export function useEmployees(): EmployeesState {
  const { user } = useAuth();
  const [invites, setInvites] = useState<EmployeeInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("employee_invites")
        .select("*")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching invites:", error);
        return;
      }

      // Update expired invites
      const now = new Date();
      const updatedInvites = data.map(invite => ({
        ...invite,
        status: new Date(invite.expires_at) < now && invite.status === "pending" 
          ? "expired" as const 
          : invite.status as EmployeeInvite["status"],
      }));

      setInvites(updatedInvites);
    } catch (error) {
      console.error("Error fetching invites:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const sendInvite = useCallback(async (phone: string): Promise<boolean> => {
    if (!user || !isSupabaseConfigured()) return false;

    // Validate phone number
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 8) {
      toast.error("Numéro de téléphone invalide");
      return false;
    }

    try {
      const supabase = await getSupabaseClient();
      
      // Check if invite already exists for this phone
      const { data: existing } = await supabase
        .from("employee_invites")
        .select("id, status")
        .eq("owner_user_id", user.id)
        .eq("employee_phone", cleanPhone)
        .eq("status", "pending")
        .maybeSingle();

      if (existing) {
        toast.error("Une invitation est déjà en cours pour ce numéro");
        return false;
      }

      const { data, error } = await supabase
        .from("employee_invites")
        .insert({
          owner_user_id: user.id,
          employee_phone: cleanPhone,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("Error sending invite:", error);
        toast.error("Erreur lors de l'envoi de l'invitation");
        return false;
      }

      setInvites(prev => [data as EmployeeInvite, ...prev]);
      toast.success("Invitation envoyée");
      return true;
    } catch (error) {
      console.error("Error sending invite:", error);
      toast.error("Erreur lors de l'envoi de l'invitation");
      return false;
    }
  }, [user]);

  const cancelInvite = useCallback(async (id: string) => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase
        .from("employee_invites")
        .delete()
        .eq("id", id)
        .eq("owner_user_id", user.id);

      if (error) {
        console.error("Error canceling invite:", error);
        toast.error("Erreur lors de l'annulation");
        return;
      }

      setInvites(prev => prev.filter(i => i.id !== id));
      toast.success("Invitation annulée");
    } catch (error) {
      console.error("Error canceling invite:", error);
      toast.error("Erreur lors de l'annulation");
    }
  }, [user]);

  return {
    invites,
    loading,
    refetch: fetchInvites,
    sendInvite,
    cancelInvite,
  };
}