import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { useNetworkStatus } from "./use-network-status";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";
import * as localDB from "@/lib/db";
import { toast } from "sonner";
import { usePlanLimits } from "./use-plan-limits";

export interface Client {
  id: string;
  name: string;
  phone: string;
  photo: string | null;
  is_risky: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  // Computed from debts
  total_debt?: number;
  // Sync status
  synced?: boolean;
}

interface ClientsState {
  clients: Client[];
  loading: boolean;
  refetch: () => Promise<void>;
  addClient: (client: { name: string; phone: string }) => Promise<Client | null>;
  quickCreateClient: (name: string) => Promise<Client | null>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  toggleRisky: (id: string) => Promise<void>;
}

export function useClients(): ClientsState {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  // STRICT ENFORCEMENT: usePlanLimits directly (always called, no try/catch)
  const planLimits = usePlanLimits();

  const fetchClients = useCallback(async () => {
    try {
      // 1. Load local data first
      const localClients = await localDB.getClients();
      const mappedLocalClients: Client[] = localClients.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        photo: c.photo || null,
        is_risky: c.is_risky || false,
        user_id: c.user_id || user?.id || "",
        created_at: c.createdAt,
        updated_at: c.updatedAt,
        total_debt: 0,
        synced: c.synced,
      }));
      setClients(mappedLocalClients);
      setLoading(false);

      // 2. If online and authenticated, sync with cloud
      if (isOnline && user && isSupabaseConfigured()) {
        try {
          const supabase = await getSupabaseClient();
          
          const { data: clientsData, error: clientsError } = await supabase
            .from("clients")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (clientsError) throw clientsError;

          // Fetch debts to calculate totals
          const { data: debtsData } = await supabase
            .from("debts")
            .select("client_id, amount, paid")
            .eq("user_id", user.id);

          const debtsByClient: Record<string, number> = {};
          debtsData?.forEach(debt => {
            const remaining = debt.amount - debt.paid;
            if (remaining > 0) {
              debtsByClient[debt.client_id] = (debtsByClient[debt.client_id] || 0) + remaining;
            }
          });

          const cloudClients = clientsData.map(client => ({
            ...client,
            total_debt: debtsByClient[client.id] || 0,
            synced: true,
          }));

          // Merge: keep local unsynced clients, update with cloud data
          const unsyncedLocalClients = mappedLocalClients.filter(c => !c.synced);
          const cloudClientIds = new Set(cloudClients.map(c => c.id));
          const finalClients = [
            ...unsyncedLocalClients.filter(c => !cloudClientIds.has(c.id)),
            ...cloudClients,
          ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          setClients(finalClients);

          // Update local DB with cloud data
          for (const client of clientsData) {
            await localDB.upsertFromCloud("clients", [{
              id: client.id,
              name: client.name,
              phone: client.phone,
              photo: client.photo,
              is_risky: client.is_risky,
              user_id: client.user_id,
              createdAt: client.created_at,
              updatedAt: client.updated_at,
            }]);
          }
        } catch (error) {
          if (import.meta.env.DEV) console.warn("Could not sync clients with cloud:", error);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching clients:", error);
      setLoading(false);
    }
  }, [user, isOnline]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const addClient = useCallback(async (clientData: { name: string; phone: string }): Promise<Client | null> => {
    if (!user) return null;

    // ========== STRICT ENFORCEMENT (via usePlanLimits - always executed) ==========
    const check = await planLimits.checkCanAddClient();
    if (!check.allowed) {
      // Toast feedback (UI component can show dialog separately)
      const message = check.reason === "no_data" 
        ? "Connexion requise pour vérifier votre plan"
        : check.reason === "expired"
        ? "Votre période d'essai est terminée. Passez à un plan supérieur."
        : `Limite de clients atteinte (${check.currentCount}/${check.maxAllowed})`;
      toast.error(message);
      // BLOCKED - no local write
      return null;
    }
    // ===============================================================================

    try {
      // 1. Save locally first
      const localClient = await localDB.addClient({
        name: clientData.name,
        phone: clientData.phone,
        user_id: user.id,
      });

      // 2. Update UI immediately
      const newClient: Client = {
        id: localClient.id,
        name: localClient.name,
        phone: localClient.phone,
        photo: null,
        is_risky: false,
        user_id: user.id,
        created_at: localClient.createdAt,
        updated_at: localClient.updatedAt,
        total_debt: 0,
        synced: false,
      };
      setClients(prev => [newClient, ...prev]);
      toast.success("Client ajouté");
      
      // Invalidate counts cache after successful creation
      planLimits.invalidateCountsCache();

      // 3. If online, sync immediately
      if (isOnline && isSupabaseConfigured()) {
        try {
          const supabase = await getSupabaseClient();
          await supabase
            .from("clients")
            .insert({
              id: localClient.id,
              name: clientData.name,
              phone: clientData.phone,
              user_id: user.id,
            });

          await localDB.markAsSynced("clients", localClient.id);
          setClients(prev => prev.map(c => 
            c.id === localClient.id ? { ...c, synced: true } : c
          ));
        } catch (error) {
          if (import.meta.env.DEV) console.log("Client queued for sync:", error);
        }
      }

      return newClient;
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error adding client:", error);
      toast.error("Erreur lors de l'ajout du client");
      return null;
    }
  }, [user, isOnline, planLimits]);

  const quickCreateClient = useCallback(async (name: string): Promise<Client | null> => {
    return addClient({ name: name.trim(), phone: "" });
  }, [addClient]);

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    if (!user) return;

    try {
      // Update locally first
      await localDB.updateClient(id, {
        name: updates.name,
        phone: updates.phone,
        photo: updates.photo || undefined,
        is_risky: updates.is_risky,
      });

      // Update UI
      setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates, synced: false } : c));

      // If online, sync
      if (isOnline && isSupabaseConfigured()) {
        try {
          const supabase = await getSupabaseClient();
          await supabase
            .from("clients")
            .update(updates)
            .eq("id", id)
            .eq("user_id", user.id);

          await localDB.markAsSynced("clients", id);
          setClients(prev => prev.map(c => c.id === id ? { ...c, synced: true } : c));
        } catch (error) {
          if (import.meta.env.DEV) console.warn("Could not sync update:", error);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error updating client:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  }, [user, isOnline]);

  const deleteClient = useCallback(async (id: string) => {
    if (!user) return;

    try {
      // Remove from UI immediately
      setClients(prev => prev.filter(c => c.id !== id));

      // Try to delete from cloud if online
      if (isOnline && isSupabaseConfigured()) {
        try {
          const supabase = await getSupabaseClient();
          await supabase
            .from("clients")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);
        } catch (error) {
          if (import.meta.env.DEV) console.warn("Could not delete from cloud:", error);
        }
      }

      toast.success("Client supprimé");
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error deleting client:", error);
      toast.error("Erreur lors de la suppression");
    }
  }, [user, isOnline]);

  const toggleRisky = useCallback(async (id: string) => {
    const client = clients.find(c => c.id === id);
    if (!client) return;

    await updateClient(id, { is_risky: !client.is_risky });
    toast.success(
      client.is_risky 
        ? `${client.name} n'est plus marqué` 
        : `${client.name} marqué comme souvent en retard`
    );
  }, [clients, updateClient]);

  return {
    clients,
    loading,
    refetch: fetchClients,
    addClient,
    quickCreateClient,
    updateClient,
    deleteClient,
    toggleRisky,
  };
}
