import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface CommissionBalance {
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_paid: number;
  created_at: string;
  updated_at: string;
}

export interface CommissionPayment {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string | null;
  proof_url: string | null;
  status: string;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
}

// Hook pour récupérer le solde de commissions de l'utilisateur
export function useCommissionBalance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["commission-balance", user?.id],
    queryFn: async (): Promise<CommissionBalance | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("commission_balances")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

// Hook pour récupérer l'historique des paiements de commissions de l'utilisateur
export function useCommissionPayments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["commission-payments", user?.id],
    queryFn: async (): Promise<CommissionPayment[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("commission_payments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

// Hook pour créer un paiement de commission (utilisateur)
export function useCreateCommissionPayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payment: {
      amount: number;
      payment_method: string;
      proof_url?: string;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("commission_payments")
        .insert({
          user_id: user.id,
          amount: payment.amount,
          payment_method: payment.payment_method,
          proof_url: payment.proof_url,
          notes: payment.notes,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-payments"] });
    },
  });
}

// === HOOKS ADMIN ===

// Hook admin pour récupérer tous les soldes de commissions
export function useAdminCommissionBalances() {
  return useQuery({
    queryKey: ["admin-commission-balances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_balances")
        .select("*")
        .order("balance", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

// Hook admin pour récupérer tous les paiements en attente
export function useAdminPendingPayments() {
  return useQuery({
    queryKey: ["admin-pending-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_payments")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

// Hook admin pour vérifier un paiement
export function useVerifyCommissionPayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      paymentId,
      status,
      notes,
    }: {
      paymentId: string;
      status: "verified" | "rejected";
      notes?: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("commission_payments")
        .update({
          status,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          notes,
        })
        .eq("id", paymentId)
        .select()
        .single();

      if (error) throw error;

      // Si vérifié, mettre à jour le solde
      if (status === "verified" && data) {
        const { data: balance } = await supabase
          .from("commission_balances")
          .select("*")
          .eq("user_id", data.user_id)
          .single();

        if (balance) {
          await supabase
            .from("commission_balances")
            .update({
              balance: Math.max(0, balance.balance - data.amount),
              total_paid: balance.total_paid + data.amount,
            })
            .eq("id", balance.id);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-commission-balances"] });
      queryClient.invalidateQueries({ queryKey: ["commission-balance"] });
      queryClient.invalidateQueries({ queryKey: ["commission-payments"] });
    },
  });
}

// Hook admin pour collecter manuellement une commission
export function useCollectCommission() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      userId,
      amount,
      paymentMethod,
      notes,
    }: {
      userId: string;
      amount: number;
      paymentMethod: string;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Créer le paiement
      const { data: payment, error: paymentError } = await supabase
        .from("commission_payments")
        .insert({
          user_id: userId,
          amount,
          payment_method: paymentMethod,
          status: "verified",
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          notes: notes || "Collecte manuelle par admin",
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Mettre à jour le solde
      const { data: balance } = await supabase
        .from("commission_balances")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (balance) {
        await supabase
          .from("commission_balances")
          .update({
            balance: Math.max(0, balance.balance - amount),
            total_paid: balance.total_paid + amount,
          })
          .eq("id", balance.id);
      }

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-commission-balances"] });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-payments"] });
    },
  });
}
