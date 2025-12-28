import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { supabase } from "@/integrations/supabase/client";
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
  const { toast } = useToast();
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("stock_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems((data as StockItem[]) || []);
    } catch (error) {
      console.error("Error fetching stock items:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le stock",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback(
    async (item: NewStockItem) => {
      if (!user) return null;

      try {
        const { data, error } = await supabase
          .from("stock_items")
          .insert({
            user_id: user.id,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            model: item.model || null,
            source: item.source || "manual",
          })
          .select()
          .single();

        if (error) throw error;
        
        setItems((prev) => [data as StockItem, ...prev]);
        return data as StockItem;
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
    [user, toast]
  );

  const addItems = useCallback(
    async (newItems: NewStockItem[]) => {
      if (!user || newItems.length === 0) return [];

      try {
        const itemsToInsert = newItems.map((item) => ({
          user_id: user.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          model: item.model || null,
          source: item.source || "manual",
        }));

        const { data, error } = await supabase
          .from("stock_items")
          .insert(itemsToInsert)
          .select();

        if (error) throw error;

        const insertedItems = (data as StockItem[]) || [];
        setItems((prev) => [...insertedItems, ...prev]);
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
    [user, toast]
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<NewStockItem>) => {
      if (!user) return false;

      try {
        const { error } = await supabase
          .from("stock_items")
          .update(updates)
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) throw error;

        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
        );
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
    [user, toast]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      if (!user) return false;

      try {
        const { error } = await supabase
          .from("stock_items")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) throw error;

        setItems((prev) => prev.filter((item) => item.id !== id));
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
    [user, toast]
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
