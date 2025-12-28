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

  const syncItem = async (item: SyncQueueItem): Promise<boolean> => {
    // Simulate API call - in real implementation, this would call your backend
    // For now, we'll just mark it as synced after a short delay
    try {
      console.log(`Syncing ${item.type} to ${item.table}:`, item.data);
      
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      // In a real app, you would:
      // 1. Make API call based on item.type (create/update/delete)
      // 2. Update the local record to mark synced = true
      // 3. Remove from sync queue
      
      await removeSyncQueueItem(item.id);
      return true;
    } catch (error) {
      console.error(`Failed to sync item ${item.id}:`, error);
      return false;
    }
  };

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

      let successCount = 0;
      for (const item of queue) {
        const success = await syncItem(item);
        if (success) {
          successCount++;
          setSyncState((prev) => ({
            ...prev,
            pendingCount: prev.pendingCount - 1,
          }));
        }
      }

      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date().toISOString(),
        error: successCount < queue.length ? `${queue.length - successCount} items failed to sync` : null,
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
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [updatePendingCount]);

  return {
    ...syncState,
    performSync,
    updatePendingCount,
  };
}
