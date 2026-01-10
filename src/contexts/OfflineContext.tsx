import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { getDB, getSyncQueue } from "@/lib/db";
import { pushUnsyncedToCloud, retryFailedItems } from "@/lib/supabase-sync";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OfflineContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  isReady: boolean;
  performSync: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

// Sync intervals
const SYNC_INTERVAL = 15000; // 15 seconds (reduced from 30s)
const RETRY_INTERVAL = 60000; // 60 seconds for retry attempts
const PENDING_COUNT_INTERVAL = 5000; // 5 seconds

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [prevOnline, setPrevOnline] = useState(isOnline);
  const [userId, setUserId] = useState<string | null>(null);
  const retryAttemptRef = useRef(0);
  const lastSyncRef = useRef<number>(0);

  // Get user ID
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Initialize database
  useEffect(() => {
    getDB()
      .then(() => {
        setIsReady(true);
        updatePendingCount();
      })
      .catch((error) => {
        console.error("Failed to initialize database:", error);
      });
  }, []);

  const updatePendingCount = async () => {
    try {
      const db = await getDB();
      
      // Count ALL unsynced items across all stores
      const [sales, clients, debts, payments, stockItems] = await Promise.all([
        db.getAll("sales"),
        db.getAll("clients"),
        db.getAll("debts"),
        db.getAll("payments"),
        db.getAll("stock_items"),
      ]);

      const unsyncedCount = 
        sales.filter(s => !s.synced).length +
        clients.filter(c => !c.synced).length +
        debts.filter(d => !d.synced).length +
        payments.filter(p => !p.synced).length +
        stockItems.filter(s => !s.synced).length;

      setPendingCount(unsyncedCount);
      return unsyncedCount;
    } catch (error) {
      console.error("Error getting pending count:", error);
      return 0;
    }
  };

  const performSync = useCallback(async () => {
    if (isSyncing || !isOnline) {
      console.log("[SYNC-BG] Cannot sync: syncing =", isSyncing, ", online =", isOnline);
      return;
    }

    if (!userId) {
      console.log("[SYNC-BG] Cannot sync: no user ID");
      return;
    }

    // Prevent too frequent syncs
    const now = Date.now();
    if (now - lastSyncRef.current < 5000) {
      console.log("[SYNC-BG] Skipping sync: too recent");
      return;
    }
    lastSyncRef.current = now;

    setIsSyncing(true);
    console.log("[SYNC-BG] Starting real sync for user:", userId);
    
    try {
      // REAL sync - push unsynced items to cloud
      const result = await pushUnsyncedToCloud(userId);
      
      console.log("[SYNC-BG] Sync result:", result);
      
      if (result.pushed > 0) {
        toast.success(`${result.pushed} élément(s) synchronisé(s)`, {
          description: result.failed > 0 ? `${result.failed} échec(s)` : undefined,
        });
        retryAttemptRef.current = 0; // Reset retry counter on success
      }
      
      if (result.failed > 0 && result.pushed === 0) {
        retryAttemptRef.current++;
        console.log("[SYNC-BG] Sync failed, retry attempt:", retryAttemptRef.current);
        
        // Only show error after multiple attempts
        if (retryAttemptRef.current >= 3) {
          toast.error("Échec de synchronisation", {
            description: `${result.failed} élément(s) non synchronisé(s). Nouvelle tentative dans ${Math.min(retryAttemptRef.current * 30, 120)}s`,
          });
        }
      }
      
      await updatePendingCount();
      window.dispatchEvent(new CustomEvent("app:sync-complete"));
    } catch (error) {
      console.error("[SYNC-BG] Sync failed:", error);
      retryAttemptRef.current++;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, userId]);

  // Retry failed items with exponential backoff
  const performRetry = useCallback(async () => {
    if (!isOnline || !userId || isSyncing) return;
    
    const pending = await updatePendingCount();
    if (pending === 0) {
      retryAttemptRef.current = 0;
      return;
    }

    // Exponential backoff: wait longer after more failures
    const backoffMultiplier = Math.min(Math.pow(2, retryAttemptRef.current), 8);
    console.log(`[SYNC-BG] Retry with backoff multiplier: ${backoffMultiplier}`);
    
    await performSync();
  }, [isOnline, userId, isSyncing, performSync]);

  // Auto-sync when connection is restored
  useEffect(() => {
    if (isOnline && wasOffline && isReady && userId) {
      console.log("[SYNC-BG] Connection restored, triggering auto-sync");
      retryAttemptRef.current = 0;
      performSync();
    }
  }, [isOnline, wasOffline, isReady, userId, performSync]);

  // Show toast on status change
  useEffect(() => {
    if (prevOnline !== isOnline) {
      if (isOnline) {
        toast.success("Connexion rétablie", {
          description: pendingCount > 0 ? "Synchronisation en cours..." : undefined,
        });
        if (pendingCount > 0 && userId) {
          performSync();
        }
      } else {
        toast.warning("Mode hors-ligne", {
          description: "Vos données seront synchronisées dès que la connexion sera rétablie.",
        });
      }
      setPrevOnline(isOnline);
    }
  }, [isOnline, prevOnline, pendingCount, userId, performSync]);

  // Listen for sync-needed events
  useEffect(() => {
    const handleSyncNeeded = () => {
      if (isOnline && userId) {
        performSync();
      }
    };

    window.addEventListener("app:sync-needed", handleSyncNeeded);
    return () => window.removeEventListener("app:sync-needed", handleSyncNeeded);
  }, [isOnline, userId, performSync]);

  // Periodic pending count update (every 5s)
  useEffect(() => {
    const countInterval = setInterval(() => {
      updatePendingCount();
    }, PENDING_COUNT_INTERVAL);

    return () => clearInterval(countInterval);
  }, []);

  // Auto-sync every 15 seconds if online and has pending items
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (isOnline && pendingCount > 0 && !isSyncing && userId) {
        console.log("[SYNC-BG] Auto-sync triggered: pending =", pendingCount);
        performSync();
      }
    }, SYNC_INTERVAL);

    return () => clearInterval(syncInterval);
  }, [isOnline, pendingCount, isSyncing, userId, performSync]);

  // Retry failed syncs with exponential backoff
  useEffect(() => {
    if (retryAttemptRef.current === 0) return;
    
    const backoffDelay = Math.min(RETRY_INTERVAL * Math.pow(1.5, retryAttemptRef.current - 1), 300000); // Max 5 min
    console.log(`[SYNC-BG] Scheduling retry in ${backoffDelay / 1000}s`);
    
    const retryTimeout = setTimeout(() => {
      if (isOnline && pendingCount > 0 && !isSyncing && userId) {
        performRetry();
      }
    }, backoffDelay);

    return () => clearTimeout(retryTimeout);
  }, [retryAttemptRef.current, isOnline, pendingCount, isSyncing, userId, performRetry]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isSyncing,
        pendingCount,
        isReady,
        performSync,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOffline must be used within OfflineProvider");
  }
  return context;
}
