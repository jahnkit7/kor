import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  features: string[];
  is_active: boolean;
}

// Features par plan (à synchroniser avec la base de données)
const planFeaturesMap: Record<string, string[]> = {
  gratuit: ["sales", "stock", "clients", "debts"],
  free_trial: ["sales", "stock", "clients", "debts", "reports", "employees"],
  starter: ["sales", "stock", "clients", "debts", "reports", "employees", "voice_input"],
  premium: ["sales", "stock", "clients", "debts", "reports", "employees", "voice_input", "network", "analytics"],
  annuel: ["sales", "stock", "clients", "debts", "reports", "employees", "voice_input", "network", "analytics"],
  "annuel premium": ["sales", "stock", "clients", "debts", "reports", "employees", "voice_input", "network", "analytics"],
};

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
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

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
    refetch: query.refetch,
  };
}
