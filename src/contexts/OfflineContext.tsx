import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useSync } from "@/hooks/use-sync";
import { useAuth } from "@/hooks/use-auth";
import { getDB } from "@/lib/db";
import { fullSync } from "@/lib/supabase-sync";
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
  const { user, isAuthenticated } = useAuth();
  const { isSyncing, pendingCount, performSync, updatePendingCount } = useSync();
  const [isReady, setIsReady] = useState(false);
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
        toast.error("Erreur d'initialisation de la base locale");
      });
  }, [updatePendingCount]);

  // Show toast on status change
  useEffect(() => {
    if (prevOnline !== isOnline) {
      if (isOnline) {
        toast.success("Connexion rétablie", {
          description: pendingCount > 0 ? "Synchronisation en cours..." : undefined,
        });
        if (wasOffline && pendingCount > 0 && isAuthenticated && user) {
          fullSync(user.id).catch(console.error);
        }
      } else {
        toast.warning("Mode hors-ligne", {
          description: "Vos données seront synchronisées dès que la connexion sera rétablie.",
        });
      }
      setPrevOnline(isOnline);
    }
  }, [isOnline, prevOnline, wasOffline, pendingCount, isAuthenticated, user]);

  // Sync when user logs in
  useEffect(() => {
    if (isAuthenticated && user && isOnline && isReady) {
      fullSync(user.id).catch(console.error);
    }
  }, [isAuthenticated, user, isOnline, isReady]);

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
