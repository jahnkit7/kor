import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

interface FeatureFlag {
  id: string;
  feature_key: string;
  name: string;
  is_globally_enabled: boolean;
  min_plan_required: string | null;
  depends_on: string[] | null;
  enabled_for_users: string[] | null;
  disabled_countries: string[] | null;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan: string;
  is_active: boolean;
  trial_started_at: string;
  trial_ends_at: string;
  max_clients: number | null;
  created_at: string;
  updated_at: string;
}

const planHierarchy: Record<string, number> = {
  free_trial: 0,
  gratuit: 0,
  starter: 1,
  premium: 2,
  annuel: 2,
  "annuel premium": 2,
};

// Features par plan - source de vérité
const planFeaturesMap: Record<string, string[]> = {
  gratuit: ["sales", "stock", "clients", "debts"],
  free_trial: ["sales", "stock", "clients", "debts", "reports", "employees"],
  starter: ["sales", "stock", "clients", "debts", "reports", "employees", "voice_input"],
  premium: ["sales", "stock", "clients", "debts", "reports", "employees", "voice_input", "network", "analytics"],
  annuel: ["sales", "stock", "clients", "debts", "reports", "employees", "voice_input", "network", "analytics"],
  "annuel premium": ["sales", "stock", "clients", "debts", "reports", "employees", "voice_input", "network", "analytics"],
};

// Helper pour obtenir les features d'un plan
export function getPlanFeatures(planName: string | undefined | null): string[] {
  if (!planName) return [];
  const normalizedPlan = planName.toLowerCase();
  return planFeaturesMap[normalizedPlan] || [];
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("feature_key");

      if (error) throw error;
      return data as FeatureFlag[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useUserSubscription() {
  const { user, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ["user-subscription", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as UserSubscription | null;
    },
    enabled: !!user?.id,
  });

  // CRITICAL FIX: isLoading doit être true tant que:
  // 1. L'auth est en cours de chargement
  // 2. OU on a un user mais la requête subscription n'est pas encore terminée
  // Cela évite la race condition où isLoading=false avant même que la requête ne démarre
  const isLoading = authLoading || (!authLoading && !!user?.id && query.isLoading);

  return {
    ...query,
    isLoading,
  };
}

export function useFeatureAccess(featureKey: string) {
  const { user } = useAuth();
  const { data: features, isLoading: featuresLoading } = useFeatureFlags();
  const { data: subscription, isLoading: subLoading } = useUserSubscription();

  const loading = featuresLoading || subLoading;

  if (loading || !features) {
    return { hasAccess: false, loading: true, reason: null };
  }

  const feature = features.find(f => f.feature_key === featureKey);

  if (!feature) {
    return { hasAccess: false, loading: false, reason: "feature_not_found" };
  }

  // 1. Check if globally disabled
  if (!feature.is_globally_enabled) {
    // 2. But check if user is in enabled_for_users override
    if (user?.id && feature.enabled_for_users?.includes(user.id)) {
      // User is specifically enabled
    } else {
      return { hasAccess: false, loading: false, reason: "globally_disabled" };
    }
  }

  // 2. Check if user has NO active subscription
  if (!subscription || !subscription.is_active) {
    return { 
      hasAccess: false, 
      loading: false, 
      reason: "no_subscription",
    };
  }

  // 3. Check if feature is included in user's plan
  const userPlan = subscription.plan?.toLowerCase() || "gratuit";
  const planFeatures = getPlanFeatures(userPlan);
  
  if (!planFeatures.includes(featureKey)) {
    return { 
      hasAccess: false, 
      loading: false, 
      reason: "not_in_plan",
      currentPlan: subscription.plan,
    };
  }

  // 4. Check minimum plan requirement (for upgraded features within plan)
  if (feature.min_plan_required) {
    const requiredLevel = planHierarchy[feature.min_plan_required.toLowerCase()] ?? 0;
    const userLevel = planHierarchy[userPlan] ?? 0;

    if (userLevel < requiredLevel) {
      return { 
        hasAccess: false, 
        loading: false, 
        reason: "plan_required",
        requiredPlan: feature.min_plan_required,
      };
    }
  }

  // 5. Check dependencies
  if (feature.depends_on && feature.depends_on.length > 0) {
    for (const depKey of feature.depends_on) {
      const depFeature = features.find(f => f.feature_key === depKey);
      if (!depFeature || !depFeature.is_globally_enabled) {
        return { 
          hasAccess: false, 
          loading: false, 
          reason: "dependency_disabled",
          missingDependency: depKey,
        };
      }
    }
  }

  // All checks passed
  return { hasAccess: true, loading: false, reason: null };
}

export function useAllFeatureAccess() {
  const { user } = useAuth();
  const { data: features, isLoading: featuresLoading } = useFeatureFlags();
  const { data: subscription, isLoading: subLoading } = useUserSubscription();

  const loading = featuresLoading || subLoading;

  if (loading || !features) {
    return { accessMap: {}, loading: true };
  }

  const accessMap: Record<string, boolean> = {};
  const userPlan = subscription?.plan?.toLowerCase() || "";
  const planFeatures = getPlanFeatures(userPlan);
  const hasActiveSubscription = subscription?.is_active === true;

  for (const feature of features) {
    let hasAccess = true;

    // Check globally enabled
    if (!feature.is_globally_enabled) {
      if (user?.id && feature.enabled_for_users?.includes(user.id)) {
        hasAccess = true;
      } else {
        hasAccess = false;
      }
    }

    // Check active subscription
    if (hasAccess && !hasActiveSubscription) {
      hasAccess = false;
    }

    // Check if feature is in plan
    if (hasAccess && !planFeatures.includes(feature.feature_key)) {
      hasAccess = false;
    }

    // Check plan requirement
    if (hasAccess && feature.min_plan_required) {
      const requiredLevel = planHierarchy[feature.min_plan_required.toLowerCase()] ?? 0;
      const userLevel = planHierarchy[userPlan] ?? 0;
      
      if (userLevel < requiredLevel) {
        hasAccess = false;
      }
    }

    // Check dependencies
    if (hasAccess && feature.depends_on && feature.depends_on.length > 0) {
      for (const depKey of feature.depends_on) {
        const depFeature = features.find(f => f.feature_key === depKey);
        if (!depFeature || !depFeature.is_globally_enabled) {
          hasAccess = false;
          break;
        }
      }
    }

    accessMap[feature.feature_key] = hasAccess;
  }

  return { accessMap, loading: false };
}
