import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentHistoryItem {
  id: string;
  user_id: string;
  subscription_id: string | null;
  plan_name: string;
  amount_original: number;
  discount_applied: number;
  promo_code_used: string | null;
  amount_paid: number;
  payment_method: string;
  transaction_ref: string | null;
  status: "success" | "pending" | "failed";
  invoice_number: string;
  created_at: string;
}

export function usePaymentHistory() {
  return useQuery({
    queryKey: ["payment-history"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("payment_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PaymentHistoryItem[];
    },
  });
}

export function useAdminPaymentHistory() {
  return useQuery({
    queryKey: ["admin-payment-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as PaymentHistoryItem[];
    },
  });
}
