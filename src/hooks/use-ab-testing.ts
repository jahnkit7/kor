import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { Json } from "@/integrations/supabase/types";

interface FeatureVariant {
  id: string;
  feature_key: string;
  variant_key: string;
  name: string;
  description: string | null;
  config: Record<string, unknown>;
  traffic_percentage: number;
  is_control: boolean;
  is_active: boolean;
  created_at: string;
}

interface ABTestAssignment {
  id: string;
  user_id: string;
  feature_key: string;
  variant_id: string;
  assigned_at: string;
}

interface VariantAssignment {
  variantKey: string;
  variantId: string;
  config: Record<string, unknown>;
  isControl: boolean;
}

// Main hook for A/B testing
export function useABTest(featureKey: string): {
  variant: VariantAssignment | null;
  loading: boolean;
  trackConversion: (metricName: string, value?: number) => Promise<void>;
} {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get all active variants for this feature
  const { data: variants, isLoading: variantsLoading } = useQuery({
    queryKey: ["feature-variants", featureKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_variants")
        .select("*")
        .eq("feature_key", featureKey)
        .eq("is_active", true);

      if (error) throw error;
      return (data || []).map(v => ({
        ...v,
        config: (v.config as Record<string, unknown>) || {},
      })) as FeatureVariant[];
    },
    enabled: !!featureKey,
  });

  // Get existing assignment for user
  const { data: assignment, isLoading: assignmentLoading } = useQuery({
    queryKey: ["ab-assignment", featureKey, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("ab_test_assignments")
        .select("*")
        .eq("user_id", user.id)
        .eq("feature_key", featureKey)
        .maybeSingle();

      if (error) throw error;
      return data as ABTestAssignment | null;
    },
    enabled: !!user?.id && !!featureKey,
  });

  // Create assignment mutation
  const createAssignment = useMutation({
    mutationFn: async (variantId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error, data } = await supabase
        .from("ab_test_assignments")
        .insert({
          user_id: user.id,
          feature_key: featureKey,
          variant_id: variantId,
        })
        .select()
        .single();

      if (error && !error.message.includes("duplicate")) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ab-assignment", featureKey, user?.id] });
    },
  });

  // Track conversion
  const trackConversion = async (metricName: string, value: number = 1) => {
    if (!user?.id || !assignment?.variant_id) return;

    await supabase.from("ab_test_metrics").insert({
      user_id: user.id,
      feature_key: featureKey,
      variant_id: assignment.variant_id,
      metric_name: metricName,
      metric_value: value,
    });
  };

  // Assign user if no assignment exists
  const loading = variantsLoading || assignmentLoading;
  
  if (!loading && !assignment && variants?.length && user?.id) {
    // Randomly assign based on traffic percentages
    const totalTraffic = variants.reduce((sum, v) => sum + v.traffic_percentage, 0);
    const random = Math.random() * totalTraffic;
    
    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.traffic_percentage;
      if (random <= cumulative) {
        createAssignment.mutate(variant.id);
        break;
      }
    }
  }

  // Get the assigned variant
  const assignedVariant = assignment && variants
    ? variants.find(v => v.id === assignment.variant_id)
    : null;

  return {
    variant: assignedVariant ? {
      variantKey: assignedVariant.variant_key,
      variantId: assignedVariant.id,
      config: assignedVariant.config,
      isControl: assignedVariant.is_control,
    } : null,
    loading,
    trackConversion,
  };
}

// Admin hook for managing variants
export function useAdminVariants(featureKey?: string) {
  return useQuery({
    queryKey: ["admin-variants", featureKey],
    queryFn: async () => {
      let query = supabase
        .from("feature_variants")
        .select("*")
        .order("created_at", { ascending: false });

      if (featureKey) {
        query = query.eq("feature_key", featureKey);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(v => ({
        ...v,
        config: (v.config as Record<string, unknown>) || {},
      })) as FeatureVariant[];
    },
  });
}

export function useCreateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      feature_key: string;
      variant_key: string;
      name: string;
      description?: string;
      config?: Record<string, unknown>;
      traffic_percentage?: number;
      is_control?: boolean;
    }) => {
      const { error, data: variant } = await supabase
        .from("feature_variants")
        .insert({
          ...data,
          config: (data.config || {}) as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return variant;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-variants"] });
      queryClient.invalidateQueries({ queryKey: ["feature-variants", variables.feature_key] });
    },
  });
}

export function useUpdateVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      name?: string;
      description?: string;
      config?: Record<string, unknown>;
      traffic_percentage?: number;
      is_control?: boolean;
      is_active?: boolean;
    }) => {
      const updateData: Record<string, unknown> = { ...data };
      if (data.config) {
        updateData.config = data.config as Json;
      }

      const { error, data: variant } = await supabase
        .from("feature_variants")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return variant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-variants"] });
      queryClient.invalidateQueries({ queryKey: ["feature-variants"] });
    },
  });
}

export function useDeleteVariant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("feature_variants")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-variants"] });
      queryClient.invalidateQueries({ queryKey: ["feature-variants"] });
    },
  });
}

// Admin hook for A/B test metrics
export function useABTestMetrics(featureKey?: string) {
  return useQuery({
    queryKey: ["ab-metrics", featureKey],
    queryFn: async () => {
      let query = supabase
        .from("ab_test_metrics")
        .select(`
          *,
          feature_variants!inner(name, variant_key, is_control)
        `)
        .order("created_at", { ascending: false });

      if (featureKey) {
        query = query.eq("feature_key", featureKey);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}

// Get aggregated metrics per variant
export function useABTestResults(featureKey: string) {
  const { data: variants } = useAdminVariants(featureKey);
  const { data: metrics } = useABTestMetrics(featureKey);

  if (!variants || !metrics) {
    return { results: [], loading: true };
  }

  const results = variants.map(variant => {
    const variantMetrics = metrics.filter(m => m.variant_id === variant.id);
    
    // Get unique users assigned to this variant
    const uniqueUsers = new Set(variantMetrics.map(m => m.user_id));
    
    // Calculate conversions by metric type
    const conversionsByType: Record<string, number> = {};
    variantMetrics.forEach(m => {
      conversionsByType[m.metric_name] = (conversionsByType[m.metric_name] || 0) + Number(m.metric_value);
    });

    return {
      variant,
      totalUsers: uniqueUsers.size,
      totalConversions: variantMetrics.length,
      conversionsByType,
    };
  });

  return { results, loading: false };
}
