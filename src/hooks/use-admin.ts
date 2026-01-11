import { useRole } from "./use-role";
import { useAuth } from "./use-auth";

/**
 * Hook to check if the current user is an admin.
 * Delegates to useRole for consistent role checking and caching.
 * 
 * isStable: indicates when auth + role checks are fully settled,
 * preventing premature redirects during initial load.
 */
export function useAdmin() {
  const { isAdmin, loading, isStable } = useRole();
  const { user } = useAuth();

  return { isAdmin, loading, user, isStable };
}
