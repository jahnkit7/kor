import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { useNetworkStatus } from "./use-network-status";
import { supabase } from "@/integrations/supabase/client";
import * as localDB from "@/lib/db";
import { useToast } from "./use-toast";

export interface StockItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  model: string | null;
  source: "manual" | "approximate" | "voice";
  created_at: string;
  updated_at: string;
  synced?: boolean;
}

export interface NewStockItem {
  name: string;
  quantity: number;
  unit_price: number;
  model?: string | null;
  source?: "manual" | "approximate" | "voice";
}

export function useStock() {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const { toast } = useToast();
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      // 1. Load local data first
      const localItems = await localDB.getStockItems();
      const mappedLocalItems: StockItem[] = localItems.map(item => ({
        id: item.id,
        user_id: item.user_id || user?.id || "",
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        model: item.model || null,
        source: item.source || "manual",
        created_at: item.createdAt,
        updated_at: item.updatedAt,
        synced: item.synced,
      }));
      setItems(mappedLocalItems);
      setLoading(false);

      // 2. If online and authenticated, sync with cloud
      if (isOnline && user) {
        try {
          const { data, error } = await supabase
            .from("stock_items")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (!error && data) {
            const cloudItems: StockItem[] = (data as StockItem[]).map(item => ({
              ...item,
              synced: true,
            }));

            // Merge
            const unsyncedLocalItems = mappedLocalItems.filter(i => !i.synced);
            const cloudItemIds = new Set(cloudItems.map(i => i.id));
            const finalItems = [
              ...unsyncedLocalItems.filter(i => !cloudItemIds.has(i.id)),
              ...cloudItems,
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setItems(finalItems);

            // Update local DB
            for (const item of data) {
              await localDB.upsertFromCloud("stock_items", [{
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                model: item.model,
                source: item.source,
                user_id: item.user_id,
                createdAt: item.created_at,
                updatedAt: item.updated_at,
              }]);
            }
          }
        } catch (error) {
          console.warn("Could not sync stock with cloud:", error);
        }
      }
    } catch (error) {
      console.error("Error fetching stock items:", error);
      setLoading(false);
    }
  }, [user, isOnline]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback(
    async (item: NewStockItem) => {
      if (!user) return null;

      try {
        // 1. Save locally first
        const localItem = await localDB.addStockItem({
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          model: item.model || null,
          source: item.source || "manual",
          user_id: user.id,
        });

        // 2. Update UI
        const newItem: StockItem = {
          id: localItem.id,
          user_id: user.id,
          name: localItem.name,
          quantity: localItem.quantity,
          unit_price: localItem.unit_price,
          model: localItem.model || null,
          source: localItem.source || "manual",
          created_at: localItem.createdAt,
          updated_at: localItem.updatedAt,
          synced: false,
        };
        setItems(prev => [newItem, ...prev]);

        // 3. If online, sync
        if (isOnline) {
          try {
            const { error } = await supabase
              .from("stock_items")
              .insert({
                id: localItem.id,
                user_id: user.id,
                name: item.name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                model: item.model || null,
                source: item.source || "manual",
              });

            if (!error) {
              await localDB.markAsSynced("stock_items", localItem.id);
              setItems(prev => prev.map(i => 
                i.id === localItem.id ? { ...i, synced: true } : i
              ));
            }
          } catch (error) {
            console.log("Stock item queued for sync:", error);
          }
        }

        return newItem;
      } catch (error) {
        console.error("Error adding stock item:", error);
        toast({
          title: "Erreur",
          description: "Impossible d'ajouter le produit",
          variant: "destructive",
        });
        return null;
      }
    },
    [user, isOnline, toast]
  );

  const addItems = useCallback(
    async (newItems: NewStockItem[]) => {
      if (!user || newItems.length === 0) return [];

      try {
        const insertedItems: StockItem[] = [];

        for (const item of newItems) {
          const result = await addItem(item);
          if (result) insertedItems.push(result);
        }

        return insertedItems;
      } catch (error) {
        console.error("Error adding stock items:", error);
        toast({
          title: "Erreur",
          description: "Impossible d'ajouter les produits",
          variant: "destructive",
        });
        return [];
      }
    },
    [user, addItem, toast]
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<NewStockItem>) => {
      if (!user) return false;

      try {
        // 1. Update locally first
        await localDB.updateStockItem(id, {
          name: updates.name,
          quantity: updates.quantity,
          unit_price: updates.unit_price,
          model: updates.model,
          source: updates.source,
        });

        // 2. Update UI
        setItems(prev =>
          prev.map(item => (item.id === id ? { ...item, ...updates, synced: false } : item))
        );

        // 3. If online, sync
        if (isOnline) {
          try {
            const { error } = await supabase
              .from("stock_items")
              .update(updates)
              .eq("id", id)
              .eq("user_id", user.id);

            if (!error) {
              await localDB.markAsSynced("stock_items", id);
              setItems(prev => prev.map(i => 
                i.id === id ? { ...i, synced: true } : i
              ));
            }
          } catch (error) {
            console.warn("Update queued for sync:", error);
          }
        }

        return true;
      } catch (error) {
        console.error("Error updating stock item:", error);
        toast({
          title: "Erreur",
          description: "Impossible de modifier le produit",
          variant: "destructive",
        });
        return false;
      }
    },
    [user, isOnline, toast]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      if (!user) return false;

      try {
        // 1. Delete locally
        await localDB.deleteStockItem(id);

        // 2. Update UI
        setItems(prev => prev.filter(item => item.id !== id));

        // 3. If online, delete from cloud
        if (isOnline) {
          try {
            await supabase
              .from("stock_items")
              .delete()
              .eq("id", id)
              .eq("user_id", user.id);
          } catch (error) {
            console.warn("Delete queued for sync:", error);
          }
        }

        return true;
      } catch (error) {
        console.error("Error deleting stock item:", error);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer le produit",
          variant: "destructive",
        });
        return false;
      }
    },
    [user, isOnline, toast]
  );

  const getTotalValue = useCallback(() => {
    return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  }, [items]);

  return {
    items,
    loading,
    addItem,
    addItems,
    updateItem,
    deleteItem,
    refetch: fetchItems,
    getTotalValue,
  };
}
