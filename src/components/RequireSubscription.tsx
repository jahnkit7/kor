import { ReactNode, useEffect, useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useUserSubscription } from "@/hooks/use-feature-access";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface RequireSubscriptionProps {
  children: ReactNode;
}

// Session cache key prefix
const SUB_CACHE_KEY = "subscription_status_";

// Timeout pour éviter un spinner infini (2.5s)
const GUARD_TIMEOUT_MS = 2500;

/**
 * Composant qui vérifie si l'utilisateur a un abonnement (actif ou expiré).
 * 
 * Comportement :
 * - Si l'utilisateur n'a JAMAIS eu d'abonnement → redirection vers /subscriptions
 * - Si l'utilisateur a un abonnement (même expiré) → accès au dashboard autorisé
 * - TIMEOUT GUARD: Si la vérification prend trop de temps, on laisse passer (mode dégradé)
 */
export function RequireSubscription({ children }: RequireSubscriptionProps) {
  const { user, loading: authLoading } = useAuth();
  const { data: subscription, isLoading: subLoading } = useUserSubscription();
  const checkedRef = useRef(false);
  
  // Timeout guard: après GUARD_TIMEOUT_MS, on force le passage
  const [forcePass, setForcePass] = useState(false);
  
  // Check session cache for instant render
  const [hasCachedSub, setHasCachedSub] = useState(() => {
    if (typeof window !== 'undefined' && user?.id) {
      const cached = sessionStorage.getItem(`${SUB_CACHE_KEY}${user.id}`);
      return cached === "has_subscription";
    }
    return false;
  });

  // Timeout guard effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setForcePass(true);
      console.warn("[RequireSubscription] Timeout guard triggered - forcing pass");
    }, GUARD_TIMEOUT_MS);
    
    return () => clearTimeout(timer);
  }, []);

  // Update cache when subscription data arrives
  useEffect(() => {
    if (!subLoading && user?.id && subscription && !checkedRef.current) {
      checkedRef.current = true;
      sessionStorage.setItem(`${SUB_CACHE_KEY}${user.id}`, "has_subscription");
      setHasCachedSub(true);
    }
  }, [subscription, subLoading, user?.id]);

  // If we have cached subscription OR timeout triggered, render children immediately
  if (hasCachedSub || forcePass) {
    return <>{children}</>;
  }

  // Still loading (but within timeout)
  const isLoading = authLoading || subLoading;
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground animate-pulse">Vérification abonnement...</p>
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
  return <>{children}</>;
}
