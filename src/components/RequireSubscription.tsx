import { ReactNode, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useUserSubscription } from "@/hooks/use-feature-access";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";

interface RequireSubscriptionProps {
  children: ReactNode;
}

// Session cache key prefix
const SUB_CACHE_KEY = "subscription_status_";

/**
 * NON-BLOCKING subscription guard.
 * Renders children immediately if cached, checks in background.
 * Only redirects when we're CERTAIN user has no subscription.
 * ADMIN users are always allowed through (no subscription required).
 */
export function RequireSubscription({ children }: RequireSubscriptionProps) {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();
  const { data: subscription, isLoading: subLoading } = useUserSubscription();
  const navigate = useNavigate();
  const isAdmin = role === "admin";
  const checkedRef = useRef(false);
  
  // Check session cache for instant render
  const [hasCachedSub] = useState(() => {
    if (typeof window !== 'undefined') {
      // Try to get from cache even before user is loaded
      const keys = Object.keys(sessionStorage);
      const subKey = keys.find(k => k.startsWith(SUB_CACHE_KEY));
      if (subKey) return sessionStorage.getItem(subKey) === "has_subscription";
    }
    return false;
  });

  // Update cache when subscription data arrives
  useEffect(() => {
    if (!subLoading && user?.id && subscription && !checkedRef.current) {
      checkedRef.current = true;
      sessionStorage.setItem(`${SUB_CACHE_KEY}${user.id}`, "has_subscription");
    }
  }, [subscription, subLoading, user?.id]);

  // Handle redirect in effect (non-blocking)
  useEffect(() => {
    // Wait for auth, role, and subscription to finish loading completely
    if (authLoading || roleLoading || subLoading) return;
    
    // Admins bypass subscription check entirely
    if (isAdmin) return;
    
    // Not logged in - redirect to auth
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    // No subscription and no cache - redirect to subscriptions
    if (!subscription && !hasCachedSub && !checkedRef.current) {
      checkedRef.current = true;
      navigate("/subscriptions", { replace: true });
    }
  }, [authLoading, roleLoading, subLoading, user, subscription, hasCachedSub, navigate, isAdmin]);

  // CRITICAL: Never redirect while role is still loading
  if (roleLoading) {
    return <>{children}</>;
  }

  // Admins bypass all subscription checks
  if (isAdmin) {
    return <>{children}</>;
  }

  // If we have cached subscription, render immediately
  if (hasCachedSub) {
    return <>{children}</>;
  }

  // If still loading but we don't have cache, show minimal non-blocking indicator
  // But still render children to keep BottomNav visible
  if (authLoading || roleLoading || subLoading) {
    return <>{children}</>;
  }

  // Not logged in - will be redirected by effect
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Has subscription or will be redirected
  return <>{children}</>;
}
