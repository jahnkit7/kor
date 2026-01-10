import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { getDB, getSyncQueue } from "@/lib/db";
import { pushUnsyncedToCloud } from "@/lib/supabase-sync";
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

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [prevOnline, setPrevOnline] = useState(isOnline);
  const [userId, setUserId] = useState<string | null>(null);

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
    } catch (error) {
      console.error("Error getting pending count:", error);
    }
  };

  const performSync = useCallback(async () => {
    if (isSyncing || !isOnline) {
      console.log("Cannot sync: syncing =", isSyncing, ", online =", isOnline);
      return;
    }

    if (!userId) {
      console.log("Cannot sync: no user ID");
      return;
    }

    setIsSyncing(true);
    console.log("Starting real sync for user:", userId);
    
    try {
      // REAL sync - push unsynced items to cloud
      const result = await pushUnsyncedToCloud(userId);
      
      console.log("Sync result:", result);
      
      if (result.pushed > 0) {
        toast.success(`${result.pushed} élément(s) synchronisé(s)`, {
          description: result.failed > 0 ? `${result.failed} échec(s)` : undefined,
        });
      }
      
      if (result.failed > 0 && result.pushed === 0) {
        toast.error("Échec de synchronisation", {
          description: `${result.failed} élément(s) non synchronisé(s)`,
        });
      }
      
      await updatePendingCount();
      window.dispatchEvent(new CustomEvent("app:sync-complete"));
    } catch (error) {
      console.error("Sync failed:", error);
      toast.error("Erreur de synchronisation");
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, userId]);

  // Auto-sync when connection is restored
  useEffect(() => {
    if (isOnline && wasOffline && isReady && userId) {
      console.log("Connection restored, triggering auto-sync");
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

  // Periodic pending count update
  useEffect(() => {
    const interval = setInterval(() => {
      updatePendingCount();
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, []);

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
