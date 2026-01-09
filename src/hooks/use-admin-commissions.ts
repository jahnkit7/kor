import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Commission = Tables<"commissions">;
export type CommissionInsert = TablesInsert<"commissions">;

export interface CommissionWithCountry extends Commission {
  country?: {
    name: string;
    code: string;
  } | null;
}

export interface CommissionStats {
  totalCommissions: number;
  totalAmount: number;
  todayAmount: number;
  activeRules: number;
}

// Fetch all commissions with country info
export function useAdminCommissions() {
  return useQuery({
    queryKey: ["admin-commissions"],
    queryFn: async (): Promise<CommissionWithCountry[]> => {
      const { data, error } = await supabase
        .from("commissions")
        .select(`
          *,
          country:countries(name, code)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

// Calculate commission for a sale
export function calculateCommission(
  saleAmount: number,
  saleType: string,
  rules: Commission[]
): number {
  let totalCommission = 0;

  for (const rule of rules) {
    if (!rule.is_active) continue;

    // Check if rule applies to this sale type
    const applies = 
      rule.applies_to === "all_sales" ||
      (rule.applies_to === "cash_only" && saleType === "cash") ||
      (rule.applies_to === "credit_only" && saleType === "credit");

    if (!applies) continue;

    if (rule.type === "percentage") {
      totalCommission += (saleAmount * rule.value) / 100;
    } else if (rule.type === "fixed") {
      totalCommission += rule.value;
    }
  }

  return Math.round(totalCommission);
}

// Get commission statistics
export function useCommissionStats() {
  return useQuery({
    queryKey: ["admin-commission-stats"],
    queryFn: async (): Promise<CommissionStats> => {
      // Get active rules count
      const { data: rules, error: rulesError } = await supabase
        .from("commissions")
        .select("*")
        .eq("is_active", true);

      if (rulesError) throw rulesError;

      // Get today's sales
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todaySales, error: todayError } = await supabase
        .from("sales")
        .select("amount, type")
        .gte("created_at", today.toISOString());

      if (todayError) throw todayError;

      // Get all sales for total
      const { data: allSales, error: allError } = await supabase
        .from("sales")
        .select("amount, type");

      if (allError) throw allError;

      // Calculate commissions
      let todayAmount = 0;
      let totalAmount = 0;

      if (rules && rules.length > 0) {
        todaySales?.forEach((sale) => {
          todayAmount += calculateCommission(sale.amount, sale.type, rules);
        });

        allSales?.forEach((sale) => {
          totalAmount += calculateCommission(sale.amount, sale.type, rules);
        });
      }

      return {
        totalCommissions: allSales?.length || 0,
        totalAmount,
        todayAmount,
        activeRules: rules?.length || 0,
      };
    },
    refetchInterval: 30000,
  });
}

// Create commission
export function useCreateCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commission: CommissionInsert) => {
      const { data, error } = await supabase
        .from("commissions")
        .insert(commission)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-commission-stats"] });
    },
  });
}

// Update commission
export function useUpdateCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Commission> & { id: string }) => {
      const { data, error } = await supabase
        .from("commissions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-commission-stats"] });
    },
  });
}

// Delete commission
export function useDeleteCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("commissions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-commission-stats"] });
    },
  });
}

// Toggle commission active status
export function useToggleCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("commissions")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-commissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-commission-stats"] });
    },
  });
}
