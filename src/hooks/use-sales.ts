import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { useNetworkStatus } from "./use-network-status";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";
import * as localDB from "@/lib/db";
import { toast } from "sonner";
import { withTimeout } from "@/lib/promise-utils";
import { usePlanLimits } from "./use-plan-limits";
import { debugEnforcement } from "@/lib/enforcement-debug";

export interface Sale {
  id: string;
  type: "cash" | "credit";
  amount: number;
  note: string | null;
  client_id: string | null;
  user_id: string;
  created_at: string;
  // Joined data
  client_name?: string;
  // Sync status
  synced?: boolean;
}

export interface SaleItem {
  stock_item_id?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface SalesState {
  sales: Sale[];
  loading: boolean;
  refetch: () => Promise<void>;
  addSale: (sale: { 
    type: "cash" | "credit"; 
    amount: number; 
    paid?: number; 
    note?: string; 
    client_id?: string;
    items?: SaleItem[];
  }) => Promise<Sale | null>;
  deleteSale: (id: string) => Promise<void>;
  getTodayStats: () => { total: number; cash: number; credit: number };
  getPeriodStats: (period: "day" | "week" | "month") => { total: number; cash: number; credit: number };
}

export function useSales(): SalesState {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  
  // STRICT ENFORCEMENT: usePlanLimits directly (always called, no try/catch)
  const planLimits = usePlanLimits();

  const fetchSales = useCallback(async () => {
    try {
      // 1. Always load local data first for instant display (with timeout protection)
      const localSales = await withTimeout(localDB.getSales(), 2000, []);
      const mappedLocalSales: Sale[] = localSales.map(s => ({
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
      setSales(mappedLocalSales);
      setLoading(false);

      // 2. If online and authenticated, sync with cloud
      if (isOnline && user && isSupabaseConfigured()) {
        try {
          const supabase = await getSupabaseClient();
          const { data, error } = await supabase
            .from("sales")
            .select(`
              *,
              clients:client_id (name)
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (!error && data) {
            const cloudSales: Sale[] = data.map(sale => ({
              ...sale,
              type: sale.type as "cash" | "credit",
              client_name: sale.clients?.name || null,
              synced: true,
            }));

            // Merge: keep local unsynced sales, update with cloud data for synced ones
            const unsyncedLocalSales = mappedLocalSales.filter(s => !s.synced);
            const cloudSaleIds = new Set(cloudSales.map(s => s.id));
            const finalSales = [
              ...unsyncedLocalSales.filter(s => !cloudSaleIds.has(s.id)),
              ...cloudSales,
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setSales(finalSales);

            // Update local DB with cloud data
            for (const sale of data) {
              await localDB.upsertFromCloud("sales", [{
                id: sale.id,
                type: sale.type,
                amount: sale.amount,
                note: sale.note,
                clientId: sale.client_id,
                client_name: sale.clients?.name,
                user_id: sale.user_id,
                createdAt: sale.created_at,
              }]);
            }
          }
        } catch (error) {
          if (import.meta.env.DEV) console.warn("Could not sync sales with cloud:", error);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching sales:", error);
      setLoading(false);
    }
  }, [user, isOnline]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const addSale = useCallback(async (saleData: { 
    type: "cash" | "credit"; 
    amount: number; 
    paid?: number;
    note?: string; 
    client_id?: string;
    items?: SaleItem[];
  }): Promise<Sale | null> => {
    if (!user) return null;

    // ========== STRICT ENFORCEMENT (via usePlanLimits - always executed) ==========
    // Check subscription validity first
    const subCheck = planLimits.checkSubscriptionValid();
    if (!subCheck.allowed) {
      debugEnforcement({
        action: "addSale",
        source: "useSales.addSale",
        reason: subCheck.reason ?? "unknown",
      });
      const message = subCheck.reason === "expired"
        ? "Votre période d'essai est terminée. Passez à un plan supérieur."
        : "Connexion requise pour vérifier votre plan";
      toast.error(message);
      return null;
    }
    
    // Check daily sales limit
    const salesCheck = await planLimits.checkCanAddSale(1);
    if (!salesCheck.allowed) {
      debugEnforcement({
        action: "addSale",
        source: "useSales.addSale",
        reason: salesCheck.reason ?? "unknown",
        currentCount: salesCheck.currentCount,
        maxAllowed: salesCheck.maxAllowed,
      });
      const message = salesCheck.reason === "no_data"
        ? "Connexion requise pour vérifier votre plan"
        : `Limite quotidienne atteinte (${salesCheck.currentCount}/${salesCheck.maxAllowed})`;
      toast.error(message);
      // BLOCKED - no local write
      return null;
    }
    // ===============================================================================

    try {
      // 1. Save locally first (works offline)
      const localSale = await localDB.addSale({
        type: saleData.type,
        amount: saleData.amount,
        note: saleData.note,
        clientId: saleData.client_id,
        user_id: user.id,
      });

      // Save sale items locally if provided
      if (saleData.items && saleData.items.length > 0) {
        await localDB.addSaleItems(saleData.items.map(item => ({
          sale_id: localSale.id,
          stock_item_id: item.stock_item_id || null,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })));

        // Deduct stock locally for items with stock_item_id
        for (const item of saleData.items) {
          if (item.stock_item_id) {
            const stockItem = await localDB.getStockItem(item.stock_item_id);
            if (stockItem) {
              const newQuantity = Math.max(0, stockItem.quantity - item.quantity);
              await localDB.updateStockItem(item.stock_item_id, {
                quantity: newQuantity,
              });
            }
          }
        }
      }

      // 2. Update UI immediately
      const newSale: Sale = {
        id: localSale.id,
        type: localSale.type,
        amount: localSale.amount,
        note: localSale.note || null,
        client_id: localSale.clientId || null,
        user_id: user.id,
        created_at: localSale.createdAt,
        synced: false,
      };
      setSales(prev => [newSale, ...prev]);
      toast.success(saleData.type === "cash" ? "Vente cash ajoutée" : "Vente crédit ajoutée");
      
      // Invalidate counts cache after successful creation
      planLimits.invalidateCountsCache();

      // 3. If online, try to sync immediately
      if (isOnline && isSupabaseConfigured()) {
        try {
          const supabase = await getSupabaseClient();
          const { data, error } = await supabase
            .from("sales")
            .insert({
              id: localSale.id, // Use same ID for consistency
              type: saleData.type,
              amount: saleData.amount,
              note: saleData.note || null,
              client_id: saleData.client_id || null,
              user_id: user.id,
            })
            .select()
            .single();

          if (!error && data) {
            // Insert sale items to cloud
            if (saleData.items && saleData.items.length > 0) {
              const saleItemsToInsert = saleData.items.map(item => ({
                sale_id: data.id,
                stock_item_id: item.stock_item_id || null,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                user_id: user.id,
              }));

              await supabase.from("sale_items").insert(saleItemsToInsert);

              // Note: Stock deduction in cloud is handled by the database trigger
              // (deduct_stock_on_sale_item) which fires on sale_items insert
            }

            // Create debt record for credit sales
            if (saleData.type === "credit" && saleData.client_id) {
              const paidAmount = saleData.paid || 0;
              
              const { data: debtData, error: debtError } = await supabase
                .from("debts")
                .insert({
                  client_id: saleData.client_id,
                  amount: saleData.amount,
                  paid: paidAmount,
                  user_id: user.id,
                })
                .select()
                .single();

              if (!debtError && debtData && paidAmount > 0) {
                await supabase.from("payments").insert({
                  debt_id: debtData.id,
                  client_id: saleData.client_id,
                  amount: paidAmount,
                  user_id: user.id,
                });
              }
            }

            // Mark as synced
            await localDB.markAsSynced("sales", localSale.id);
            setSales(prev => prev.map(s => 
              s.id === localSale.id ? { ...s, synced: true } : s
            ));
          }
        } catch (error) {
          if (import.meta.env.DEV) console.log("Sale queued for sync:", error);
          toast.info("Vente enregistrée hors-ligne", {
            description: "Sera synchronisée à la reconnexion"
          });
        }
      } else {
        toast.info("Vente enregistrée hors-ligne", {
          description: "Sera synchronisée à la reconnexion"
        });
      }

      return newSale;
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error adding sale:", error);
      toast.error("Erreur lors de l'ajout de la vente");
      return null;
    }
  }, [user, isOnline, planLimits]);

  const deleteSale = useCallback(async (id: string) => {
    if (!user) return;

    try {
      // Remove from local state immediately
      setSales(prev => prev.filter(s => s.id !== id));

      // Try to delete from cloud if online
      if (isOnline && isSupabaseConfigured()) {
        try {
          const supabase = await getSupabaseClient();
          await supabase
            .from("sales")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);
        } catch (error) {
          if (import.meta.env.DEV) console.warn("Could not delete from cloud:", error);
        }
      }

      toast.success("Vente supprimée");
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error deleting sale:", error);
      toast.error("Erreur lors de la suppression");
    }
  }, [user, isOnline]);

  const getTodayStats = useCallback(() => {
    const today = new Date().toDateString();
    const todaySales = sales.filter(s => new Date(s.created_at).toDateString() === today);
    
    return {
      total: todaySales.reduce((sum, s) => sum + s.amount, 0),
      cash: todaySales.filter(s => s.type === "cash").reduce((sum, s) => sum + s.amount, 0),
      credit: todaySales.filter(s => s.type === "credit").reduce((sum, s) => sum + s.amount, 0),
    };
  }, [sales]);

  const getPeriodStats = useCallback((period: "day" | "week" | "month") => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const periodSales = sales.filter(s => new Date(s.created_at) >= startDate);
    
    return {
      total: periodSales.reduce((sum, s) => sum + s.amount, 0),
      cash: periodSales.filter(s => s.type === "cash").reduce((sum, s) => sum + s.amount, 0),
      credit: periodSales.filter(s => s.type === "credit").reduce((sum, s) => sum + s.amount, 0),
    };
  }, [sales]);

  return {
    sales,
    loading,
    refetch: fetchSales,
    addSale,
    deleteSale,
    getTodayStats,
    getPeriodStats,
  };
}
