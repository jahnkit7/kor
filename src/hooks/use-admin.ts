import { useRole } from "./use-role";

/**
 * Hook to check if the current user is an admin.
 * Uses a single source of truth (useRole) to avoid auth state desync.
 */
export function useAdmin() {
  const { isAdmin, loading, isStable, user } = useRole();
  return { isAdmin, loading, user, isStable };
}
