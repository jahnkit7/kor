import { useState, useEffect, useCallback, useRef } from "react";
import { getSyncQueue, removeSyncQueueItem } from "@/lib/db";
import { processSyncQueue } from "@/lib/supabase-sync";
import type { SyncQueueItem } from "@/lib/db";
import { useAuth } from "./use-auth";

interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  error: string | null;
}

export function useSync() {
  const { user, isAuthenticated } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    error: null,
  });
  const syncInProgress = useRef(false);

  const updatePendingCount = useCallback(async () => {
    try {
      const queue = await getSyncQueue();
      setSyncState((prev) => ({ ...prev, pendingCount: queue.length }));
    } catch (error) {
      console.error("Error getting sync queue:", error);
    }
  }, []);

  const performSync = useCallback(async () => {
    if (syncInProgress.current || !navigator.onLine || !isAuthenticated || !user) return;

    syncInProgress.current = true;
    setSyncState((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const queue = await getSyncQueue();
      
      if (queue.length === 0) {
        setSyncState((prev) => ({
          ...prev,
          isSyncing: false,
          pendingCount: 0,
        }));
        syncInProgress.current = false;
        return;
      }

      // Use the cloud sync service
      const result = await processSyncQueue(user.id);

      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        pendingCount: result.failed,
        lastSyncAt: new Date().toISOString(),
        error: result.failed > 0 ? `${result.failed} items failed to sync` : null,
      }));
    } catch (error) {
      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        error: "Sync failed. Will retry when online.",
      }));
    } finally {
      syncInProgress.current = false;
    }
  }, [isAuthenticated, user]);

  // Listen for sync-needed events
  useEffect(() => {
    const handleSyncNeeded = () => {
      performSync();
    };

    window.addEventListener("app:sync-needed", handleSyncNeeded);
    
    // Also run on mount if online and authenticated
    if (navigator.onLine && isAuthenticated) {
      updatePendingCount();
    }

    return () => {
      window.removeEventListener("app:sync-needed", handleSyncNeeded);
    };
  }, [performSync, updatePendingCount, isAuthenticated]);

  // Periodic sync check
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine && isAuthenticated) {
        updatePendingCount();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [updatePendingCount, isAuthenticated]);

  return {
    ...syncState,
    performSync,
    updatePendingCount,
  };
}
