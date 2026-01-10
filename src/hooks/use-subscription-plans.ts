import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  features: string[];
  is_active: boolean;
  description?: string;
  currency?: string;
  max_clients?: number;
  max_sales_per_day?: number;
  sort_order?: number;
}

export function useSubscriptionPlans() {
  const query = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
    staleTime: 2 * 60 * 1000, // Cache 2 minutes pour réactivité aux changements admin
  });

  // Créer dynamiquement le map des features depuis les données de la BDD
  const planFeaturesMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const plan of query.data || []) {
      const planName = plan.name?.toLowerCase() || "";
      // features est stocké comme JSON array dans Supabase
      const features = Array.isArray(plan.features) ? plan.features : [];
      map[planName] = features.map((f: unknown) => String(f));
    }
    return map;
  }, [query.data]);

  const getPlanFeatures = (planName: string | undefined | null): string[] => {
    if (!planName) return [];
    const normalizedPlan = planName.toLowerCase();
    return planFeaturesMap[normalizedPlan] || [];
  };

  const isPlanFeature = (planName: string | undefined | null, featureKey: string): boolean => {
    const features = getPlanFeatures(planName);
    return features.includes(featureKey);
  };

  return {
    plans: query.data || [],
    loading: query.isLoading,
    error: query.error,
    getPlanFeatures,
    isPlanFeature,
    planFeaturesMap,
    refetch: query.refetch,
  };
}
