import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PromoCode {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  applies_to_plan: string | null;
  applies_to_duration: "first_month" | "all";
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export function usePromoCodes() {
  return useQuery({
    queryKey: ["promo-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PromoCode[];
    },
  });
}

export function useValidatePromoCode() {
  return useMutation({
    mutationFn: async ({ code, planId }: { code: string; planId?: string }) => {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", code.toUpperCase())
        .eq("is_active", true)
        .single();

      if (error || !data) {
        throw new Error("Code promo invalide");
      }

      const promo = data as PromoCode;

      // Check validity
      if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
        throw new Error("Ce code promo a expiré");
      }

      if (promo.max_uses && promo.used_count >= promo.max_uses) {
        throw new Error("Ce code promo a atteint sa limite d'utilisation");
      }

      if (promo.applies_to_plan && planId && promo.applies_to_plan !== planId) {
        throw new Error("Ce code promo n'est pas valide pour ce plan");
      }

      return promo;
    },
  });
}

export function useCreatePromoCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (promoData: Omit<PromoCode, "id" | "used_count" | "created_at">) => {
      const { data, error } = await supabase
        .from("promo_codes")
        .insert({
          ...promoData,
          code: promoData.code.toUpperCase(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
      toast.success("Code promo créé avec succès");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePromoCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PromoCode> & { id: string }) => {
      const { data, error } = await supabase
        .from("promo_codes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
      toast.success("Code promo mis à jour");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useIncrementPromoCodeUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const { data: promo, error: fetchError } = await supabase
        .from("promo_codes")
        .select("used_count")
        .eq("code", code.toUpperCase())
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("promo_codes")
        .update({ used_count: (promo?.used_count || 0) + 1 })
        .eq("code", code.toUpperCase());

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
    },
  });
}

export function useDeletePromoCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("promo_codes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo-codes"] });
      toast.success("Code promo supprimé");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
