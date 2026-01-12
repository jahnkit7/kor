import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { useProfile } from "./use-profile";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";
import type { CashDrawerEntry } from "./use-cash-drawer";

interface CashDrawerHistoryState {
  entries: CashDrawerEntry[];
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useCashDrawerHistory(limit = 30): CashDrawerHistoryState {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [entries, setEntries] = useState<CashDrawerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const supabase = await getSupabaseClient();
      
      // For owners, get their entries + employees entries
      // For employees, get only their entries
      const effectiveOwnerId = profile?.linked_owner_id || user.id;
      
      let query = supabase
        .from("cash_drawer")
        .select("*")
        .order("opened_at", { ascending: false })
        .limit(limit);

      // If user is an owner, get all entries for their team
      if (!profile?.linked_owner_id) {
        // Owner: get own entries + employees entries
        query = query.or(`user_id.eq.${user.id},owner_user_id.eq.${user.id}`);
      } else {
        // Employee: get only own entries
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching cash drawer history:", error);
        setEntries([]);
      } else {
        setEntries((data || []) as CashDrawerEntry[]);
      }
    } catch (error) {
      console.error("Error fetching cash drawer history:", error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [user, profile, limit]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    entries,
    loading,
    refetch: fetchHistory,
  };
}
