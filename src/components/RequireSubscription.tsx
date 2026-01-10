import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserSubscription } from "@/hooks/use-feature-access";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface RequireSubscriptionProps {
  children: ReactNode;
}

/**
 * Composant qui vérifie si l'utilisateur a un abonnement (actif ou expiré).
 * 
 * Comportement :
 * - Si l'utilisateur n'a JAMAIS eu d'abonnement → redirection vers /subscriptions
 * - Si l'utilisateur a un abonnement (même expiré) → accès au dashboard autorisé
 * - La gestion des features désactivées se fait via les feature flags
 * - Un popup de rappel s'affiche si l'abonnement est expiré (voir SubscriptionReminderPopup)
 */
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

  // Si l'utilisateur n'a JAMAIS eu d'abonnement (jamais créé de row dans subscriptions)
  // Rediriger vers la page d'abonnement pour choisir un plan initial
  if (!subscription) {
    return <Navigate to="/subscriptions" replace />;
  }

  // Sinon, laisser passer même si l'abonnement est expiré
  // La gestion des features désactivées se fait via les feature flags
  // Le popup de rappel (SubscriptionReminderPopup) s'affichera si l'abonnement est expiré
  return <>{children}</>;
}
