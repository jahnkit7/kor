import { useRole } from "./use-role";
import { useAuth } from "./use-auth";

/**
 * Hook to check if the current user is an admin.
 * Delegates to useRole for consistent role checking and caching.
 */
export function useAdmin() {
  const { isAdmin, loading } = useRole();
  const { user } = useAuth();

  return { isAdmin, loading, user };
}
