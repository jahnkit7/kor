import { useEffect } from "react";
import { useCacheVersionCheck } from "@/hooks/use-cache-version";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Component that checks cache version on app startup
 * and invalidates React Query cache if server version changed
 */
export function CacheVersionChecker() {
  const { cacheCleared } = useCacheVersionCheck();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (cacheCleared) {
      // Invalidate all React Query caches
      queryClient.invalidateQueries();
      console.log("All caches cleared due to server version update");
    }
  }, [cacheCleared, queryClient]);

  return null; // This component doesn't render anything
}
