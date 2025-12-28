import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";
import type { Json } from "@/integrations/supabase/types";

export interface VoiceEntry {
  id: string;
  user_id: string;
  raw_transcript: string;
  status: string;
  parsed_items: Json | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export function useVoiceEntries() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<VoiceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("stock_voice_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setEntries((data as VoiceEntry[]) || []);
    } catch (error) {
      console.error("Error fetching voice entries:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const updateEntry = useCallback(
    async (id: string, updates: { raw_transcript?: string; status?: string; parsed_items?: Json; error?: string }) => {
      if (!user) return false;

      try {
        const { error } = await supabase
          .from("stock_voice_entries")
          .update(updates)
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) throw error;

        setEntries((prev) =>
          prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
        );
        return true;
      } catch (error) {
        console.error("Error updating voice entry:", error);
        toast({
          title: "Erreur",
          description: "Impossible de modifier l'entrée",
          variant: "destructive",
        });
        return false;
      }
    },
    [user, toast]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      if (!user) return false;

      try {
        const { error } = await supabase
          .from("stock_voice_entries")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) throw error;

        setEntries((prev) => prev.filter((entry) => entry.id !== id));
        toast({
          title: "Supprimé",
          description: "Dictée supprimée",
        });
        return true;
      } catch (error) {
        console.error("Error deleting voice entry:", error);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer",
          variant: "destructive",
        });
        return false;
      }
    },
    [user, toast]
  );

  return {
    entries,
    loading,
    refetch: fetchEntries,
    updateEntry,
    deleteEntry,
  };
}
