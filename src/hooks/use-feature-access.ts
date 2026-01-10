import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

interface FeatureFlag {
  id: string;
  feature_key: string;
  name: string;
  is_globally_enabled: boolean;
  is_beta: boolean;
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

// Hook pour récupérer les features de chaque plan depuis la BDD
export function useSubscriptionPlanFeatures() {
  return useQuery({
    queryKey: ["subscription-plan-features"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("name, features")
        .eq("is_active", true);

      if (error) throw error;
      
      // Créer un map dynamique des plans -> features
      const map: Record<string, string[]> = {};
      for (const plan of data || []) {
        const planName = plan.name?.toLowerCase() || "";
        // features est stocké comme JSON array
        const features = Array.isArray(plan.features) ? plan.features : [];
        map[planName] = features.map((f: unknown) => String(f));
      }
      return map;
    },
    staleTime: 2 * 60 * 1000, // Cache 2 minutes pour réactivité
  });
}

// Helper pour obtenir les features d'un plan - utilise les données de la query
export function getPlanFeatures(planName: string | undefined | null, planFeaturesMap?: Record<string, string[]>): string[] {
  if (!planName) return [];
  const normalizedPlan = planName.toLowerCase();
  return planFeaturesMap?.[normalizedPlan] || [];
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

// Plan order for determining next higher plan
const planOrder = ["gratuit", "starter", "premium"];

function getNextHigherPlan(currentPlan: string | undefined): string {
  const normalizedPlan = (currentPlan || "gratuit").toLowerCase();
  // Handle special cases
  if (normalizedPlan === "free_trial") return "Starter";
  
  const currentIndex = planOrder.indexOf(normalizedPlan);
  
  if (currentIndex === -1) return "Starter";
  if (currentIndex >= planOrder.length - 1) return "Premium"; // Already at max
  
  const nextPlan = planOrder[currentIndex + 1];
  return nextPlan.charAt(0).toUpperCase() + nextPlan.slice(1);
}

export interface FeatureAccessResult {
  hasAccess: boolean;
  loading: boolean;
  reason: string | null;
  isGloballyDisabled: boolean;
  isNotInPlan: boolean;
  isBeta: boolean;
  requiredPlan: string | null;
  nextPlan: string | null;
  currentPlan?: string;
  missingDependency?: string;
}

export function useFeatureAccess(featureKey: string): FeatureAccessResult {
  const { user } = useAuth();
  const { data: features, isLoading: featuresLoading } = useFeatureFlags();
  const { data: subscription, isLoading: subLoading } = useUserSubscription();
  const { data: planFeaturesMap, isLoading: planFeaturesLoading } = useSubscriptionPlanFeatures();

  const loading = featuresLoading || subLoading || planFeaturesLoading;

  // Default result while loading
  if (loading || !features || !planFeaturesMap) {
    return { 
      hasAccess: false, 
      loading: true, 
      reason: null,
      isGloballyDisabled: false,
      isNotInPlan: false,
      isBeta: false,
      requiredPlan: null,
      nextPlan: null,
    };
  }

  const feature = features.find(f => f.feature_key === featureKey);
  const currentPlan = subscription?.plan;
  const nextPlan = getNextHigherPlan(currentPlan);

  if (!feature) {
    return { 
      hasAccess: false, 
      loading: false, 
      reason: "feature_not_found",
      isGloballyDisabled: false,
      isNotInPlan: false,
      isBeta: false,
      requiredPlan: null,
      nextPlan,
    };
  }

  const isBeta = feature.is_beta || false;

  // 1. Check if globally disabled
  if (!feature.is_globally_enabled) {
    // Check if user is in enabled_for_users override
    if (user?.id && feature.enabled_for_users?.includes(user.id)) {
      // User is specifically enabled - continue checks
    } else {
      return { 
        hasAccess: false, 
        loading: false, 
        reason: "globally_disabled",
        isGloballyDisabled: true,
        isNotInPlan: false,
        isBeta,
        requiredPlan: null,
        nextPlan,
      };
    }
  }

  // 2. Check if user has NO active subscription
  if (!subscription || !subscription.is_active) {
    return { 
      hasAccess: false, 
      loading: false, 
      reason: "no_subscription",
      isGloballyDisabled: false,
      isNotInPlan: false,
      isBeta,
      requiredPlan: null,
      nextPlan,
    };
  }

  // 3. Check if feature is included in user's plan
  const userPlan = subscription.plan?.toLowerCase() || "gratuit";
  const planFeatures = getPlanFeatures(userPlan, planFeaturesMap);
  
  // Determine minimum required plan for this feature
  const getRequiredPlanForFeature = (fKey: string): string => {
    if (planFeaturesMap.gratuit?.includes(fKey)) return "Gratuit";
    if (planFeaturesMap.starter?.includes(fKey)) return "Starter";
    if (planFeaturesMap.premium?.includes(fKey)) return "Premium";
    return feature.min_plan_required || "Premium";
  };

  if (!planFeatures.includes(featureKey)) {
    const requiredPlan = getRequiredPlanForFeature(featureKey);
    return { 
      hasAccess: false, 
      loading: false, 
      reason: "not_in_plan",
      isGloballyDisabled: false,
      isNotInPlan: true,
      isBeta,
      requiredPlan,
      nextPlan,
      currentPlan: subscription.plan,
    };
  }

  // 4. Check minimum plan requirement - SKIP if feature is explicitly in subscription_plans.features
  // The plan's features list OVERRIDES min_plan_required (allows admin flexibility)
  if (feature.min_plan_required && !planFeatures.includes(featureKey)) {
    const requiredLevel = planHierarchy[feature.min_plan_required.toLowerCase()] ?? 0;
    const userLevel = planHierarchy[userPlan] ?? 0;

    if (userLevel < requiredLevel) {
      return { 
        hasAccess: false, 
        loading: false, 
        reason: "plan_required",
        isGloballyDisabled: false,
        isNotInPlan: true,
        isBeta,
        requiredPlan: feature.min_plan_required,
        nextPlan,
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
          isGloballyDisabled: false,
          isNotInPlan: false,
          isBeta,
          requiredPlan: null,
          nextPlan,
          missingDependency: depKey,
        };
      }
    }
  }

  // All checks passed
  return { 
    hasAccess: true, 
    loading: false, 
    reason: null,
    isGloballyDisabled: false,
    isNotInPlan: false,
    isBeta,
    requiredPlan: null,
    nextPlan,
  };
}

export function useAllFeatureAccess() {
  const { user } = useAuth();
  const { data: features, isLoading: featuresLoading } = useFeatureFlags();
  const { data: subscription, isLoading: subLoading } = useUserSubscription();
  const { data: planFeaturesMap, isLoading: planFeaturesLoading } = useSubscriptionPlanFeatures();

  const loading = featuresLoading || subLoading || planFeaturesLoading;

  if (loading || !features || !planFeaturesMap) {
    return { accessMap: {}, loading: true };
  }

  const accessMap: Record<string, boolean> = {};
  const userPlan = subscription?.plan?.toLowerCase() || "";
  const planFeatures = getPlanFeatures(userPlan, planFeaturesMap);
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

    // Check plan requirement - SKIP if feature is explicitly in plan's features list
    if (hasAccess && feature.min_plan_required && !planFeatures.includes(feature.feature_key)) {
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
