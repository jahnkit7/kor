import { useState, useEffect, useCallback, useRef } from "react";
import { getSyncQueue, getSales, getClients, getDebts, getPayments, getStockItems } from "@/lib/db";
import type { SyncQueueItem } from "@/lib/db";

interface SyncState {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  error: string | null;
  pendingDetails: {
    sales: number;
    clients: number;
    debts: number;
    payments: number;
    stock: number;
  };
}

export function useSync() {
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    error: null,
    pendingDetails: { sales: 0, clients: 0, debts: 0, payments: 0, stock: 0 },
  });
  const syncInProgress = useRef(false);

  const updatePendingCount = useCallback(async () => {
    try {
      // Compter TOUS les éléments non synchronisés dans tous les stores
      const [sales, clients, debts, payments, stockItems] = await Promise.all([
        getSales(),
        getClients(),
        getDebts(),
        getPayments(),
        getStockItems(),
      ]);

      const unsyncedSales = sales.filter(s => !s.synced).length;
      const unsyncedClients = clients.filter(c => !c.synced).length;
      const unsyncedDebts = debts.filter(d => !d.synced).length;
      const unsyncedPayments = payments.filter(p => !p.synced).length;
      const unsyncedStock = stockItems.filter(s => !s.synced).length;

      const total = unsyncedSales + unsyncedClients + unsyncedDebts + unsyncedPayments + unsyncedStock;

      setSyncState((prev) => ({
        ...prev,
        pendingCount: total,
        pendingDetails: {
          sales: unsyncedSales,
          clients: unsyncedClients,
          debts: unsyncedDebts,
          payments: unsyncedPayments,
          stock: unsyncedStock,
        },
      }));
    } catch (error) {
      console.error("Error counting pending:", error);
    }
  }, []);

  const performSync = useCallback(async () => {
    if (syncInProgress.current || !navigator.onLine) return;

    syncInProgress.current = true;
    setSyncState((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      // Trigger the sync event for OfflineContext to handle
      window.dispatchEvent(new CustomEvent("app:sync-needed"));
      
      // Wait a bit for sync to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update pending count after sync
      await updatePendingCount();

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
  }, [updatePendingCount]);

  // Listen for sync-needed events
  useEffect(() => {
    const handleSyncNeeded = () => {
      updatePendingCount();
    };

    const handleSyncComplete = () => {
      updatePendingCount();
    };

    window.addEventListener("app:sync-needed", handleSyncNeeded);
    window.addEventListener("app:sync-complete", handleSyncComplete);

    // Also run on mount if online
    if (navigator.onLine) {
      updatePendingCount();
    }

    return () => {
      window.removeEventListener("app:sync-needed", handleSyncNeeded);
      window.removeEventListener("app:sync-complete", handleSyncComplete);
    };
  }, [updatePendingCount]);

  // Periodic sync check every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      updatePendingCount();
    }, 5000);

    return () => clearInterval(interval);
  }, [updatePendingCount]);

  return {
    ...syncState,
    performSync,
    updatePendingCount,
  };
}
