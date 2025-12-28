import { useState, useEffect, useCallback, useRef } from "react";
import { getSyncQueue, removeSyncQueueItem } from "@/lib/db";
import type { SyncQueueItem } from "@/lib/db";

interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  error: string | null;
}

export function useSync() {
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
    if (syncInProgress.current || !navigator.onLine) return;

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

      // For now, just mark as synced locally
      // Cloud sync happens in the auth flow
      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date().toISOString(),
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
  }, []);

  // Listen for sync-needed events
  useEffect(() => {
    const handleSyncNeeded = () => {
      performSync();
    };

    window.addEventListener("app:sync-needed", handleSyncNeeded);
    
    // Also run on mount if online
    if (navigator.onLine) {
      updatePendingCount();
    }

    return () => {
      window.removeEventListener("app:sync-needed", handleSyncNeeded);
    };
  }, [performSync, updatePendingCount]);

  // Periodic sync check
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) {
        updatePendingCount();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [updatePendingCount]);

  return {
    ...syncState,
    performSync,
    updatePendingCount,
  };
}
