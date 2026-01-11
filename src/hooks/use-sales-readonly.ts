import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { useNetworkStatus } from "./use-network-status";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";
import * as localDB from "@/lib/db";
import { withTimeout } from "@/lib/promise-utils";

// Lightweight Sale type for read-only display
export interface SaleReadonly {
  id: string;
  type: "cash" | "credit";
  amount: number;
  note: string | null;
  client_id: string | null;
  user_id: string;
  created_at: string;
  client_name?: string;
  synced?: boolean;
}

interface SalesReadonlyState {
  sales: SaleReadonly[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * READ-ONLY sales hook - NO plan limits check, NO blocking
 * Designed for display pages like SalesHistory
 * Always returns a valid state, never throws
 */
export function useSalesReadonly(): SalesReadonlyState {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [sales, setSales] = useState<SaleReadonly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSales = useCallback(async () => {
    // Start loading
    setLoading(true);
    setError(null);

    try {
      // 1. Always load local data first (with timeout protection)
      let localSales: SaleReadonly[] = [];
      try {
        const rawLocalSales = await withTimeout(localDB.getSales(), 2000, []);
        localSales = rawLocalSales.map(s => ({
          id: s.id,
          type: s.type,
          amount: s.amount,
          note: s.note || null,
          client_id: s.clientId || null,
          user_id: s.user_id || user?.id || "",
          created_at: s.createdAt,
          client_name: s.client_name,
          synced: s.synced,
        }));
      } catch (localError) {
        if (import.meta.env.DEV) {
          console.warn("[useSalesReadonly] Local DB error:", localError);
        }
        // Continue with empty array
      }

      setSales(localSales);
      setLoading(false);

      // 2. If online and authenticated, sync with cloud
      if (isOnline && user && isSupabaseConfigured()) {
        try {
          const supabase = await getSupabaseClient();
          const { data, error: cloudError } = await supabase
            .from("sales")
            .select(`
              *,
              clients:client_id (name)
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (cloudError) {
            if (import.meta.env.DEV) {
              console.warn("[useSalesReadonly] Cloud error:", cloudError);
            }
            // Keep local data, don't crash
            return;
          }

          if (data) {
            const cloudSales: SaleReadonly[] = data.map(sale => ({
              id: sale.id,
              type: sale.type as "cash" | "credit",
              amount: sale.amount,
              note: sale.note,
              client_id: sale.client_id,
              user_id: sale.user_id,
              created_at: sale.created_at,
              client_name: sale.clients?.name || undefined,
              synced: true,
            }));

            // Merge: keep local unsynced, update with cloud
            const unsyncedLocal = localSales.filter(s => !s.synced);
            const cloudIds = new Set(cloudSales.map(s => s.id));
            const mergedSales = [
              ...unsyncedLocal.filter(s => !cloudIds.has(s.id)),
              ...cloudSales,
            ].sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            setSales(mergedSales);

            // Update local DB in background (don't await)
            data.forEach(sale => {
              localDB.upsertFromCloud("sales", [{
                id: sale.id,
                type: sale.type,
                amount: sale.amount,
                note: sale.note,
                clientId: sale.client_id,
                client_name: sale.clients?.name,
                user_id: sale.user_id,
                createdAt: sale.created_at,
              }]).catch(() => {});
            });
          }
        } catch (cloudError) {
          if (import.meta.env.DEV) {
            console.warn("[useSalesReadonly] Cloud sync error:", cloudError);
          }
          // Keep local data displayed
        }
      }
    } catch (globalError) {
      if (import.meta.env.DEV) {
        console.error("[useSalesReadonly] Global error:", globalError);
      }
      setError(globalError instanceof Error ? globalError : new Error("Erreur de chargement"));
      setLoading(false);
    }
  }, [user, isOnline]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  return {
    sales,
    loading,
    error,
    refetch: fetchSales,
  };
}
