import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";

export interface StockAlert {
  id: string;
  user_id: string;
  stock_item_id: string | null;
  sale_id: string | null;
  product_name: string;
  quantity_sold: number;
  stock_after: number;
  alert_type: string;
  is_read: boolean;
  created_at: string;
}

interface StockAlertsState {
  alerts: StockAlert[];
  unreadCount: number;
  loading: boolean;
  refetch: () => Promise<void>;
  markAsRead: (alertId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useStockAlerts(): StockAlertsState {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("stock_alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching stock alerts:", error);
        setAlerts([]);
      } else {
        setAlerts(data || []);
      }
    } catch (error) {
      console.error("Error fetching stock alerts:", error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const markAsRead = useCallback(async (alertId: string) => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase
        .from("stock_alerts")
        .update({ is_read: true })
        .eq("id", alertId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error marking alert as read:", error);
        return;
      }

      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a));
    } catch (error) {
      console.error("Error marking alert as read:", error);
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase
        .from("stock_alerts")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error("Error marking all alerts as read:", error);
        return;
      }

      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    } catch (error) {
      console.error("Error marking all alerts as read:", error);
    }
  }, [user]);

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return {
    alerts,
    unreadCount,
    loading,
    refetch: fetchAlerts,
    markAsRead,
    markAllAsRead,
  };
}
