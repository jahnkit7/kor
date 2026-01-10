import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserSubscription } from "@/hooks/use-feature-access";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface RequireSubscriptionProps {
  children: ReactNode;
}

export function RequireSubscription({ children }: RequireSubscriptionProps) {
  const { user, loading: authLoading } = useAuth();
  const { data: subscription, isLoading: subLoading } = useUserSubscription();

  // Still loading
  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // No subscription - redirect to subscriptions page
  if (!subscription || !subscription.is_active) {
    return <Navigate to="/subscriptions" replace />;
  }

  return <>{children}</>;
}
