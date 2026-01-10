import { ReactNode } from "react";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FeatureGateProps {
  featureKey: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  silentFail?: boolean;
  /**
   * If true, completely hides content when globally disabled (default: true)
   * If false, shows "temporarily unavailable" message
   */
  hideWhenDisabled?: boolean;
}

export function FeatureGate({ 
  featureKey, 
  children, 
  fallback,
  showUpgradePrompt = true,
  silentFail = false,
  hideWhenDisabled = true,
}: FeatureGateProps) {
  const { hasAccess, loading, reason, requiredPlan, isGloballyDisabled, isNotInPlan } = useFeatureAccess(featureKey);
  const navigate = useNavigate();

  // While loading, show nothing or a skeleton
  if (loading) {
    if (silentFail) return null;
    return (
      <div className="animate-pulse bg-muted/50 rounded-xl h-32" />
    );
  }

  // GLOBALLY DISABLED: Hide completely (default behavior)
  if (isGloballyDisabled) {
    if (hideWhenDisabled || silentFail) {
      return null;
    }
    // If hideWhenDisabled is false, could show a maintenance message
    // But for now, we hide by default
    return null;
  }

  // User has access - render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access
  if (silentFail) {
    return null;
  }

  // Custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // NOT IN PLAN: Show upgrade prompt with overlay style
  if (isNotInPlan && showUpgradePrompt) {
    return (
      <Card className="border-dashed border-2 bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Disponible pour {requiredPlan}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs">
            Cette fonctionnalité nécessite un abonnement{" "}
            <span className="font-medium text-foreground capitalize">
              {requiredPlan}
            </span>{" "}
            ou supérieur.
          </p>
          <Button 
            onClick={() => navigate("/settings")}
            className="gap-2"
          >
            <Zap className="w-4 h-4" />
            Passer au plan {requiredPlan}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Other reasons (no subscription, dependency, etc.)
  if (showUpgradePrompt) {
    return (
      <Card className="border-dashed border-2 bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">
            Accès restreint
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {reason === "no_subscription" 
              ? "Un abonnement actif est requis pour cette fonctionnalité."
              : reason === "dependency_disabled"
              ? "Une dépendance requise pour cette fonctionnalité n'est pas activée."
              : "Vous n'avez pas accès à cette fonctionnalité."
            }
          </p>
          {reason === "no_subscription" && (
            <Button 
              onClick={() => navigate("/subscriptions")}
              className="gap-2 mt-4"
            >
              <Zap className="w-4 h-4" />
              Voir les abonnements
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}

// Higher-order component version for wrapping entire pages
export function withFeatureGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureKey: string,
  options?: Omit<FeatureGateProps, "featureKey" | "children">
) {
  return function FeatureGatedComponent(props: P) {
    return (
      <FeatureGate featureKey={featureKey} {...options}>
        <WrappedComponent {...props} />
      </FeatureGate>
    );
  };
}
