import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";
import { toast } from "sonner";

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
}

interface SalesState {
  sales: Sale[];
  loading: boolean;
  refetch: () => Promise<void>;
  addSale: (sale: { type: "cash" | "credit"; amount: number; paid?: number; note?: string; client_id?: string }) => Promise<Sale | null>;
  deleteSale: (id: string) => Promise<void>;
  getTodayStats: () => { total: number; cash: number; credit: number };
  getPeriodStats: (period: "day" | "week" | "month") => { total: number; cash: number; credit: number };
}

export function useSales(): SalesState {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSales = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

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

      if (error) {
        console.error("Error fetching sales:", error);
        return;
      }

      const salesWithClientNames: Sale[] = data.map(sale => ({
        ...sale,
        type: sale.type as "cash" | "credit",
        client_name: sale.clients?.name || null,
      }));

      setSales(salesWithClientNames);
    } catch (error) {
      console.error("Error fetching sales:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const addSale = useCallback(async (saleData: { 
    type: "cash" | "credit"; 
    amount: number; 
    paid?: number;
    note?: string; 
    client_id?: string 
  }): Promise<Sale | null> => {
    if (!user || !isSupabaseConfigured()) return null;

    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("sales")
        .insert({
          type: saleData.type,
          amount: saleData.amount,
          note: saleData.note || null,
          client_id: saleData.client_id || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding sale:", error);
        toast.error("Erreur lors de l'ajout de la vente");
        return null;
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

        if (debtError) {
          console.error("Error creating debt:", debtError);
          // Sale was created but debt wasn't - log but don't fail
        }

        // If there was a partial payment, record it
        if (!debtError && debtData && paidAmount > 0) {
          await supabase.from("payments").insert({
            debt_id: debtData.id,
            client_id: saleData.client_id,
            amount: paidAmount,
            user_id: user.id,
          });
        }
      }

      const newSale: Sale = {
        ...data,
        type: data.type as "cash" | "credit",
      };
      setSales(prev => [newSale, ...prev]);
      toast.success(saleData.type === "cash" ? "Vente cash ajoutée" : "Vente crédit ajoutée");
      return newSale;
    } catch (error) {
      console.error("Error adding sale:", error);
      toast.error("Erreur lors de l'ajout de la vente");
      return null;
    }
  }, [user]);

  const deleteSale = useCallback(async (id: string) => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase
        .from("sales")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting sale:", error);
        toast.error("Erreur lors de la suppression");
        return;
      }

      setSales(prev => prev.filter(s => s.id !== id));
      toast.success("Vente supprimée");
    } catch (error) {
      console.error("Error deleting sale:", error);
      toast.error("Erreur lors de la suppression");
    }
  }, [user]);

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