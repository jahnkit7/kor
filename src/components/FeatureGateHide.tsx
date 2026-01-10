import { ReactNode } from "react";
import { useFeatureAccess } from "@/hooks/use-feature-access";

interface FeatureGateHideProps {
  featureKey: string;
  children: ReactNode;
}

/**
 * Component that completely hides its children if the feature is globally disabled.
 * Use this for navigation items and elements that should be invisible when disabled.
 */
export function FeatureGateHide({ featureKey, children }: FeatureGateHideProps) {
  const { loading, isGloballyDisabled } = useFeatureAccess(featureKey);
  
  // While loading, show nothing to prevent flash
  if (loading) {
    return null;
  }
  
  // If globally disabled by admin, hide completely
  if (isGloballyDisabled) {
    return null;
  }
  
  return <>{children}</>;
}

/**
 * Hook to check if a feature is globally disabled (for use in conditional rendering)
 */
export function useFeatureVisibility(featureKey: string) {
  const { loading, isGloballyDisabled, hasAccess, isNotInPlan, requiredPlan } = useFeatureAccess(featureKey);
  
  return {
    loading,
    isHidden: isGloballyDisabled,
    isDisabledByPlan: isNotInPlan,
    hasAccess,
    requiredPlan,
  };
}
