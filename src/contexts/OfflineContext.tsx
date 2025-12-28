import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { getDB, getSyncQueue } from "@/lib/db";
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
      const queue = await getSyncQueue();
      setPendingCount(queue.length);
    } catch (error) {
      console.error("Error getting sync queue:", error);
    }
  };

  const performSync = async () => {
    // Sync will be handled when user is authenticated
    // For now, just update pending count
    await updatePendingCount();
  };

  // Show toast on status change
  useEffect(() => {
    if (prevOnline !== isOnline) {
      if (isOnline) {
        toast.success("Connexion rétablie", {
          description: pendingCount > 0 ? "Synchronisation disponible" : undefined,
        });
      } else {
        toast.warning("Mode hors-ligne", {
          description: "Vos données seront synchronisées dès que la connexion sera rétablie.",
        });
      }
      setPrevOnline(isOnline);
    }
  }, [isOnline, prevOnline, pendingCount]);

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
