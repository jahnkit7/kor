import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { useNetworkStatus } from "./use-network-status";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";
import * as localDB from "@/lib/db";
import { toast } from "sonner";
import { withTimeout } from "@/lib/promise-utils";

export interface Debt {
  id: string;
  client_id: string;
  amount: number;
  paid: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  // Computed
  remaining: number;
  // Joined data
  client_name?: string;
  client_phone?: string;
  client_is_risky?: boolean;
  // Sync status
  synced?: boolean;
}

export interface Payment {
  id: string;
  debt_id: string;
  client_id: string;
  amount: number;
  user_id: string;
  created_at: string;
}

interface DebtsState {
  debts: Debt[];
  loading: boolean;
  totalDebts: number;
  clientsWithDebts: number;
  refetch: () => Promise<void>;
  addDebt: (debt: { client_id: string; amount: number }) => Promise<Debt | null>;
  addPayment: (debtId: string, amount: number) => Promise<void>;
  getDebtsByClient: (clientId: string) => Debt[];
  getPaymentsByDebt: (debtId: string) => Promise<Payment[]>;
}

export function useDebts(): DebtsState {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDebts = useCallback(async () => {
    try {
      // 1. Load local data first (with timeout protection)
      const localDebts = await withTimeout(localDB.getDebts(), 2000, []);
      const localClients = await withTimeout(localDB.getClients(), 2000, []);
      const clientMap = new Map(localClients.map(c => [c.id, c]));

      const mappedLocalDebts: Debt[] = localDebts.map(d => {
        const client = clientMap.get(d.clientId);
        return {
          id: d.id,
          client_id: d.clientId,
          amount: d.amount,
          paid: d.paid,
          user_id: d.user_id || user?.id || "",
          created_at: d.createdAt,
          updated_at: d.updatedAt,
          remaining: d.amount - d.paid,
          client_name: d.client_name || client?.name || "Client inconnu",
          client_phone: client?.phone || "",
          client_is_risky: client?.is_risky || false,
          synced: d.synced,
        };
      });
      setDebts(mappedLocalDebts);
      setLoading(false);

      // 2. If online and authenticated, sync with cloud
      if (isOnline && user && isSupabaseConfigured()) {
        try {
          const supabase = await getSupabaseClient();
          const { data, error } = await supabase
            .from("debts")
            .select(`
              *,
              clients:client_id (name, phone, is_risky)
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (!error && data) {
            const cloudDebts: Debt[] = data.map(debt => ({
              ...debt,
              remaining: debt.amount - debt.paid,
              client_name: debt.clients?.name || "Client inconnu",
              client_phone: debt.clients?.phone || "",
              client_is_risky: debt.clients?.is_risky || false,
              synced: true,
            }));

            // BUG 2 FIX: Deduplicate by id to prevent double entries
            const unsyncedLocalDebts = mappedLocalDebts.filter(d => !d.synced);
            const seenIds = new Set<string>();
            const cloudDebtIds = new Set(cloudDebts.map(d => d.id));
            
            const finalDebts = [
              ...unsyncedLocalDebts.filter(d => !cloudDebtIds.has(d.id)),
              ...cloudDebts,
            ]
              .filter(d => {
                if (seenIds.has(d.id)) return false;
                seenIds.add(d.id);
                return true;
              })
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setDebts(finalDebts);

            // Update local DB
            for (const debt of data) {
              await localDB.upsertFromCloud("debts", [{
                id: debt.id,
                clientId: debt.client_id,
                client_name: debt.clients?.name,
                amount: debt.amount,
                paid: debt.paid,
                user_id: debt.user_id,
                createdAt: debt.created_at,
                updatedAt: debt.updated_at,
              }]);
            }
          }
        } catch (error) {
          if (import.meta.env.DEV) console.warn("Could not sync debts with cloud:", error);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching debts:", error);
      setLoading(false);
    }
  }, [user, isOnline]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  const addDebt = useCallback(async (debtData: { client_id: string; amount: number }): Promise<Debt | null> => {
    if (!user) return null;

    try {
      // 1. Save locally first
      const localDebt = await localDB.addOrUpdateDebt(debtData.client_id, debtData.amount);
      
      // Get client info
      const clients = await localDB.getClients();
      const client = clients.find(c => c.id === debtData.client_id);

      // 2. Update UI
      const newDebt: Debt = {
        id: localDebt.id,
        client_id: debtData.client_id,
        amount: localDebt.amount,
        paid: localDebt.paid,
        user_id: user.id,
        created_at: localDebt.createdAt,
        updated_at: localDebt.updatedAt,
        remaining: localDebt.amount - localDebt.paid,
        client_name: client?.name || "Client inconnu",
        client_phone: client?.phone || "",
        client_is_risky: client?.is_risky || false,
        synced: false,
      };

      setDebts(prev => {
        const existing = prev.find(d => d.id === localDebt.id);
        if (existing) {
          return prev.map(d => d.id === localDebt.id ? newDebt : d);
        }
        return [newDebt, ...prev];
      });
      toast.success("Dette ajoutée");

      // 3. If online, sync
      if (isOnline && isSupabaseConfigured()) {
        try {
          const supabase = await getSupabaseClient();
          await supabase
            .from("debts")
            .upsert({
              id: localDebt.id,
              client_id: debtData.client_id,
              amount: localDebt.amount,
              paid: localDebt.paid,
              user_id: user.id,
            });

          await localDB.markAsSynced("debts", localDebt.id);
          setDebts(prev => prev.map(d => 
            d.id === localDebt.id ? { ...d, synced: true } : d
          ));
        } catch (error) {
          if (import.meta.env.DEV) console.log("Debt queued for sync:", error);
        }
      }

      return newDebt;
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error adding debt:", error);
      toast.error("Erreur lors de l'ajout de la dette");
      return null;
    }
  }, [user, isOnline]);

  const addPayment = useCallback(async (debtId: string, amount: number) => {
    if (!user) return;

    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    try {
      // 1. Save payment locally
      const localPayment = await localDB.addPayment({
        debtId,
        clientId: debt.client_id,
        amount,
        user_id: user.id,
      });

      // 2. Update UI
      const newPaid = debt.paid + amount;
      setDebts(prev => prev.map(d => 
        d.id === debtId 
          ? { ...d, paid: newPaid, remaining: d.amount - newPaid, synced: false }
          : d
      ));
      toast.success("Paiement enregistré");

      // 3. If online, sync
      if (isOnline && isSupabaseConfigured()) {
        try {
          const supabase = await getSupabaseClient();
          
          // Add payment record
          await supabase
            .from("payments")
            .insert({
              id: localPayment.id,
              debt_id: debtId,
              client_id: debt.client_id,
              amount,
              user_id: user.id,
            });

          // Update debt paid amount
          await supabase
            .from("debts")
            .update({ paid: newPaid })
            .eq("id", debtId);

          await localDB.markAsSynced("payments", localPayment.id);
          await localDB.markAsSynced("debts", debtId);
          setDebts(prev => prev.map(d => 
            d.id === debtId ? { ...d, synced: true } : d
          ));
        } catch (error) {
          if (import.meta.env.DEV) console.warn("Payment queued for sync:", error);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error adding payment:", error);
      toast.error("Erreur lors de l'ajout du paiement");
    }
  }, [user, debts, isOnline]);

  const getDebtsByClient = useCallback((clientId: string) => {
    return debts.filter(d => d.client_id === clientId && d.remaining > 0);
  }, [debts]);

  const getPaymentsByDebt = useCallback(async (debtId: string): Promise<Payment[]> => {
    // Try cloud first if online
    if (isOnline && user && isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
          .from("payments")
          .select("*")
          .eq("debt_id", debtId)
          .order("created_at", { ascending: false });

        if (!error && data) {
          return data;
        }
      } catch (error) {
        if (import.meta.env.DEV) console.warn("Could not fetch payments from cloud:", error);
      }
    }

    // Fallback to local
    const localPayments = await localDB.getPayments();
    return localPayments
      .filter(p => p.debtId === debtId)
      .map(p => ({
        id: p.id,
        debt_id: p.debtId,
        client_id: p.clientId,
        amount: p.amount,
        user_id: p.user_id || user?.id || "",
        created_at: p.createdAt,
      }));
  }, [user, isOnline]);

  const totalDebts = debts.reduce((sum, d) => sum + d.remaining, 0);
  const clientsWithDebts = new Set(debts.filter(d => d.remaining > 0).map(d => d.client_id)).size;

  return {
    debts,
    loading,
    totalDebts,
    clientsWithDebts,
    refetch: fetchDebts,
    addDebt,
    addPayment,
    getDebtsByClient,
    getPaymentsByDebt,
  };
}
