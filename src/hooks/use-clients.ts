import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";
import { toast } from "sonner";

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
}

interface ClientsState {
  clients: Client[];
  loading: boolean;
  refetch: () => Promise<void>;
  addClient: (client: { name: string; phone: string }) => Promise<Client | null>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  toggleRisky: (id: string) => Promise<void>;
}

export function useClients(): ClientsState {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const supabase = await getSupabaseClient();
      
      // Fetch clients with their debts
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (clientsError) {
        console.error("Error fetching clients:", clientsError);
        return;
      }

      // Fetch debts to calculate totals
      const { data: debtsData, error: debtsError } = await supabase
        .from("debts")
        .select("client_id, amount, paid")
        .eq("user_id", user.id);

      if (debtsError) {
        console.error("Error fetching debts:", debtsError);
      }

      // Calculate total debt per client
      const debtsByClient: Record<string, number> = {};
      debtsData?.forEach(debt => {
        const remaining = debt.amount - debt.paid;
        if (remaining > 0) {
          debtsByClient[debt.client_id] = (debtsByClient[debt.client_id] || 0) + remaining;
        }
      });

      const clientsWithDebts = clientsData.map(client => ({
        ...client,
        total_debt: debtsByClient[client.id] || 0,
      }));

      setClients(clientsWithDebts);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const addClient = useCallback(async (clientData: { name: string; phone: string }): Promise<Client | null> => {
    if (!user || !isSupabaseConfigured()) return null;

    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("clients")
        .insert({
          name: clientData.name,
          phone: clientData.phone,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding client:", error);
        toast.error("Erreur lors de l'ajout du client");
        return null;
      }

      setClients(prev => [{ ...data, total_debt: 0 }, ...prev]);
      toast.success("Client ajouté");
      return data;
    } catch (error) {
      console.error("Error adding client:", error);
      toast.error("Erreur lors de l'ajout du client");
      return null;
    }
  }, [user]);

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating client:", error);
        toast.error("Erreur lors de la mise à jour");
        return;
      }

      setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    } catch (error) {
      console.error("Error updating client:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  }, [user]);

  const deleteClient = useCallback(async (id: string) => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting client:", error);
        toast.error("Erreur lors de la suppression");
        return;
      }

      setClients(prev => prev.filter(c => c.id !== id));
      toast.success("Client supprimé");
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Erreur lors de la suppression");
    }
  }, [user]);

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
    updateClient,
    deleteClient,
    toggleRisky,
  };
}