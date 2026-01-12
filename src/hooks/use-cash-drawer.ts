import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { useProfile } from "./use-profile";
import { useRole } from "./use-role";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";
import { toast } from "sonner";

export interface CashDrawerEntry {
  id: string;
  user_id: string;
  owner_user_id: string | null;
  opening_amount: number;
  closing_amount: number | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
}

interface CashDrawerState {
  todayEntry: CashDrawerEntry | null;
  loading: boolean;
  isDrawerOpen: boolean;
  needsOpening: boolean;
  openDrawer: (amount: number, notes?: string) => Promise<boolean>;
  closeDrawer: (amount: number, todayCashSales?: number) => Promise<boolean>;
  refetch: () => Promise<void>;
}

// Check if a date is today in local timezone
const isToday = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

export function useCashDrawer(): CashDrawerState {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { role } = useRole();
  const [todayEntry, setTodayEntry] = useState<CashDrawerEntry | null>(null);
  const [loading, setLoading] = useState(true);

  // Determine the effective owner_user_id for employees
  const effectiveOwnerId = profile?.linked_owner_id || user?.id;

  const fetchTodayEntry = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const supabase = await getSupabaseClient();
      
      // Get today's start in local timezone
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from("cash_drawer")
        .select("*")
        .eq("user_id", user.id)
        .gte("opened_at", today.toISOString())
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching cash drawer:", error);
        setTodayEntry(null);
      } else if (data && isToday(data.opened_at)) {
        setTodayEntry(data as CashDrawerEntry);
      } else {
        setTodayEntry(null);
      }
    } catch (error) {
      console.error("Error fetching cash drawer:", error);
      setTodayEntry(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTodayEntry();
  }, [fetchTodayEntry]);

  const openDrawer = useCallback(async (amount: number, notes?: string): Promise<boolean> => {
    if (!user || !isSupabaseConfigured()) return false;

    try {
      const supabase = await getSupabaseClient();
      
      const { data, error } = await supabase
        .from("cash_drawer")
        .insert({
          user_id: user.id,
          owner_user_id: profile?.linked_owner_id || null,
          opening_amount: amount,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error opening cash drawer:", error);
        toast.error("Erreur lors de l'ouverture de la caisse");
        return false;
      }

      setTodayEntry(data as CashDrawerEntry);
      toast.success(`Caisse ouverte avec ${amount.toLocaleString("fr-FR")} CFA`);
      return true;
    } catch (error) {
      console.error("Error opening cash drawer:", error);
      toast.error("Erreur lors de l'ouverture de la caisse");
      return false;
    }
  }, [user, profile]);

  const closeDrawer = useCallback(async (amount: number, todayCashSales: number = 0): Promise<boolean> => {
    if (!user || !todayEntry || !isSupabaseConfigured()) return false;

    try {
      const supabase = await getSupabaseClient();
      
      const { data, error } = await supabase
        .from("cash_drawer")
        .update({
          closing_amount: amount,
          closed_at: new Date().toISOString(),
        })
        .eq("id", todayEntry.id)
        .select()
        .single();

      if (error) {
        console.error("Error closing cash drawer:", error);
        toast.error("Erreur lors de la clôture de la caisse");
        return false;
      }

      setTodayEntry(data as CashDrawerEntry);
      toast.success(`Caisse clôturée avec ${amount.toLocaleString("fr-FR")} CFA`);

      // Send notification to owner if employee closes with significant difference
      if (role === "employee" && profile?.linked_owner_id) {
        const expectedAmount = todayEntry.opening_amount + todayCashSales;
        const difference = amount - expectedAmount;
        const percentDiff = expectedAmount > 0 ? Math.abs(difference / expectedAmount) : 0;

        // Notify if difference > 10%
        if (percentDiff > 0.1 && difference !== 0) {
          try {
            const employeeName = profile.owner_name || "Un employé";
            const diffText = difference > 0 
              ? `+${difference.toLocaleString("fr-FR")} CFA (excédent)`
              : `${difference.toLocaleString("fr-FR")} CFA (manquant)`;
            
            await supabase.rpc("send_notification", {
              target_user_id: profile.linked_owner_id,
              notification_title: "⚠️ Écart de caisse important",
              notification_message: `${employeeName} a clôturé la caisse avec un écart de ${diffText}. Montant attendu: ${expectedAmount.toLocaleString("fr-FR")} CFA, Montant réel: ${amount.toLocaleString("fr-FR")} CFA.`,
              notification_type: "cash_drawer_alert",
              notification_action_url: "/reports",
            });
          } catch (notifError) {
            console.error("Error sending cash drawer notification:", notifError);
            // Don't fail the operation if notification fails
          }
        }
      }

      return true;
    } catch (error) {
      console.error("Error closing cash drawer:", error);
      toast.error("Erreur lors de la clôture de la caisse");
      return false;
    }
  }, [user, todayEntry, role, profile]);

  const isDrawerOpen = todayEntry !== null && todayEntry.closed_at === null;
  const needsOpening = todayEntry === null;

  return {
    todayEntry,
    loading,
    isDrawerOpen,
    needsOpening,
    openDrawer,
    closeDrawer,
    refetch: fetchTodayEntry,
  };
}
