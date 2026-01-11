import { ReactNode, useState } from "react";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Zap, FlaskConical, MessageSquare, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BetaFeedbackDialog } from "@/components/BetaFeedbackDialog";

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
  /**
   * If true, shows the beta badge when the feature is in beta
   */
  showBetaBadge?: boolean;
}

export function FeatureGate({ 
  featureKey, 
  children, 
  fallback,
  showUpgradePrompt = true,
  silentFail = false,
  hideWhenDisabled = true,
  showBetaBadge = true,
}: FeatureGateProps) {
  const { hasAccess, loading, reason, nextPlan, isGloballyDisabled, isNotInPlan, isBeta } = useFeatureAccess(featureKey);
  const navigate = useNavigate();
  const [showFeedback, setShowFeedback] = useState(false);

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

  // User has access - render children with optional beta badge and feedback
  if (hasAccess) {
    if (isBeta && showBetaBadge) {
      return (
        <div className="relative">
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <Badge 
              variant="beta" 
              className="flex items-center gap-1"
            >
              <FlaskConical className="w-3 h-3" />
              Bêta
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full bg-amber-500/10 hover:bg-amber-500/20"
              onClick={() => setShowFeedback(true)}
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
            </Button>
          </div>
          {children}
          <BetaFeedbackDialog
            open={showFeedback}
            onOpenChange={setShowFeedback}
            featureKey={featureKey}
          />
        </div>
      );
    }
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

  // NOT IN PLAN: Show upgrade prompt with next higher plan
  if (isNotInPlan && showUpgradePrompt) {
    return (
      <Card className="border-dashed border-2 bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Passez au plan {nextPlan}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs">
            Cette fonctionnalité nécessite un abonnement{" "}
            <span className="font-medium text-foreground capitalize">
              {nextPlan}
            </span>{" "}
            ou supérieur.
          </p>
          <Button 
            onClick={() => navigate("/settings")}
            className="gap-2"
          >
            <Zap className="w-4 h-4" />
            Passer au plan {nextPlan}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Offline revalidation required - specific message
  if (reason === "offline_revalidation_required") {
    return (
      <Card className="border-dashed border-2 bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <WifiOff className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">
            Revalidation requise
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Connectez-vous à Internet pour revalider votre abonnement.
            Votre période de grâce hors ligne a expiré.
          </p>
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
