import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearAllAppCaches, getGlobalCacheVersion, setGlobalCacheVersion } from "@/lib/plan-cache";

const CACHE_VERSION_KEY = "kor_server_cache_version";

/**
 * Hook to check and sync cache version with server
 * If server version is newer, invalidates all local caches
 */
export function useCacheVersionCheck() {
  const [isChecking, setIsChecking] = useState(true);
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    async function checkCacheVersion() {
      try {
        // Fetch server cache version
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "cache_version")
          .single();

        if (error || !data) {
          console.log("Could not fetch cache version:", error?.message);
          setIsChecking(false);
          return;
        }

        const serverVersion = data.value;
        const localVersion = localStorage.getItem(CACHE_VERSION_KEY);

        // If server version is different from local, clear all caches
        if (localVersion !== serverVersion) {
          console.log(`Cache version mismatch: local=${localVersion}, server=${serverVersion}. Clearing caches...`);
          clearAllAppCaches();
          localStorage.setItem(CACHE_VERSION_KEY, serverVersion);
          setCacheCleared(true);
        }
      } catch (err) {
        console.error("Error checking cache version:", err);
      } finally {
        setIsChecking(false);
      }
    }

    checkCacheVersion();
  }, []);

  return { isChecking, cacheCleared };
}

/**
 * Function to increment server cache version (admin only)
 */
export async function incrementServerCacheVersion(): Promise<boolean> {
  try {
    const newVersion = Date.now().toString();
    
    const { error } = await supabase
      .from("app_settings")
      .update({ value: newVersion, updated_at: new Date().toISOString() })
      .eq("key", "cache_version");

    if (error) {
      console.error("Failed to update cache version:", error);
      return false;
    }

    // Also update local version
    localStorage.setItem("kor_server_cache_version", newVersion);
    return true;
  } catch (err) {
    console.error("Error incrementing cache version:", err);
    return false;
  }
}
