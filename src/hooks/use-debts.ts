import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";
import { toast } from "sonner";

export interface Debt {
  id: string;
  client_id: string;
  amount: number;
  paid: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  // Computed
  remaining: number;
  // Joined data
  client_name?: string;
  client_phone?: string;
  client_is_risky?: boolean;
}

export interface Payment {
  id: string;
  debt_id: string;
  client_id: string;
  amount: number;
  user_id: string;
  created_at: string;
}

interface DebtsState {
  debts: Debt[];
  loading: boolean;
  totalDebts: number;
  clientsWithDebts: number;
  refetch: () => Promise<void>;
  addDebt: (debt: { client_id: string; amount: number }) => Promise<Debt | null>;
  addPayment: (debtId: string, amount: number) => Promise<void>;
  getDebtsByClient: (clientId: string) => Debt[];
  getPaymentsByDebt: (debtId: string) => Promise<Payment[]>;
}

export function useDebts(): DebtsState {
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDebts = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("debts")
        .select(`
          *,
          clients:client_id (name, phone, is_risky)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching debts:", error);
        return;
      }

      const debtsWithInfo = data.map(debt => ({
        ...debt,
        remaining: debt.amount - debt.paid,
        client_name: debt.clients?.name || "Client inconnu",
        client_phone: debt.clients?.phone || "",
        client_is_risky: debt.clients?.is_risky || false,
      }));

      setDebts(debtsWithInfo);
    } catch (error) {
      console.error("Error fetching debts:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  const addDebt = useCallback(async (debtData: { client_id: string; amount: number }): Promise<Debt | null> => {
    if (!user || !isSupabaseConfigured()) return null;

    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("debts")
        .insert({
          client_id: debtData.client_id,
          amount: debtData.amount,
          paid: 0,
          user_id: user.id,
        })
        .select(`
          *,
          clients:client_id (name, phone, is_risky)
        `)
        .single();

      if (error) {
        console.error("Error adding debt:", error);
        toast.error("Erreur lors de l'ajout de la dette");
        return null;
      }

      const debtWithInfo = {
        ...data,
        remaining: data.amount - data.paid,
        client_name: data.clients?.name || "Client inconnu",
        client_phone: data.clients?.phone || "",
        client_is_risky: data.clients?.is_risky || false,
      };

      setDebts(prev => [debtWithInfo, ...prev]);
      toast.success("Dette ajoutée");
      return debtWithInfo;
    } catch (error) {
      console.error("Error adding debt:", error);
      toast.error("Erreur lors de l'ajout de la dette");
      return null;
    }
  }, [user]);

  const addPayment = useCallback(async (debtId: string, amount: number) => {
    if (!user || !isSupabaseConfigured()) return;

    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    try {
      const supabase = await getSupabaseClient();
      
      // Add payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          debt_id: debtId,
          client_id: debt.client_id,
          amount,
          user_id: user.id,
        });

      if (paymentError) {
        console.error("Error adding payment:", paymentError);
        toast.error("Erreur lors de l'ajout du paiement");
        return;
      }

      // Update debt paid amount
      const newPaid = debt.paid + amount;
      const { error: updateError } = await supabase
        .from("debts")
        .update({ paid: newPaid })
        .eq("id", debtId);

      if (updateError) {
        console.error("Error updating debt:", updateError);
        toast.error("Erreur lors de la mise à jour de la dette");
        return;
      }

      setDebts(prev => prev.map(d => 
        d.id === debtId 
          ? { ...d, paid: newPaid, remaining: d.amount - newPaid }
          : d
      ));

      toast.success("Paiement enregistré");
    } catch (error) {
      console.error("Error adding payment:", error);
      toast.error("Erreur lors de l'ajout du paiement");
    }
  }, [user, debts]);

  const getDebtsByClient = useCallback((clientId: string) => {
    return debts.filter(d => d.client_id === clientId && d.remaining > 0);
  }, [debts]);

  const getPaymentsByDebt = useCallback(async (debtId: string): Promise<Payment[]> => {
    if (!user || !isSupabaseConfigured()) return [];

    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("debt_id", debtId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching payments:", error);
        return [];
      }

      return data;
    } catch (error) {
      console.error("Error fetching payments:", error);
      return [];
    }
  }, [user]);

  const totalDebts = debts.reduce((sum, d) => sum + d.remaining, 0);
  const clientsWithDebts = new Set(debts.filter(d => d.remaining > 0).map(d => d.client_id)).size;

  return {
    debts,
    loading,
    totalDebts,
    clientsWithDebts,
    refetch: fetchDebts,
    addDebt,
    addPayment,
    getDebtsByClient,
    getPaymentsByDebt,
  };
}