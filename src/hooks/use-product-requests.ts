import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export interface ProductRequest {
  id: string;
  user_id: string;
  raw_transcript: string | null;
  product_name: string;
  quantity: number | null;
  unit: string | null;
  max_price: number | null;
  notes: string | null;
  status: string;
  fulfilled_by: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export const UNITS = [
  { value: "pièces", label: "Pièces" },
  { value: "kg", label: "Kilogrammes" },
  { value: "cartons", label: "Cartons" },
  { value: "sacs", label: "Sacs" },
  { value: "lots", label: "Lots" },
  { value: "palettes", label: "Palettes" },
] as const;

export function useProductRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [myRequests, setMyRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user) {
      setRequests([]);
      setMyRequests([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch open requests from others
      const { data: openData, error: openError } = await supabase
        .from("product_requests")
        .select("*")
        .eq("status", "open")
        .neq("user_id", user.id)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (openError) throw openError;

      // Fetch my requests
      const { data: myData, error: myError } = await supabase
        .from("product_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (myError) throw myError;

      setRequests(openData || []);
      setMyRequests(myData || []);
    } catch (error) {
      console.error("Error fetching product requests:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("product_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_requests",
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchRequests]);

  const createRequest = useCallback(
    async (data: {
      product_name: string;
      raw_transcript?: string;
      quantity?: number;
      unit?: string;
      max_price?: number;
      notes?: string;
    }) => {
      if (!user) return null;

      try {
        const { data: created, error } = await supabase
          .from("product_requests")
          .insert({
            user_id: user.id,
            product_name: data.product_name,
            raw_transcript: data.raw_transcript || null,
            quantity: data.quantity || null,
            unit: data.unit || null,
            max_price: data.max_price || null,
            notes: data.notes || null,
          })
          .select()
          .single();

        if (error) throw error;
        toast.success("Demande publiée sur le réseau !");
        await fetchRequests();
        return created;
      } catch (error) {
        console.error("Error creating request:", error);
        toast.error("Erreur lors de la publication");
        return null;
      }
    },
    [user, fetchRequests]
  );

  const fulfillRequest = useCallback(
    async (requestId: string) => {
      if (!user) return false;

      try {
        const { error } = await supabase
          .from("product_requests")
          .update({
            status: "fulfilled",
            fulfilled_by: user.id,
          })
          .eq("id", requestId);

        if (error) throw error;
        toast.success("Demande marquée comme satisfaite !");
        await fetchRequests();
        return true;
      } catch (error) {
        console.error("Error fulfilling request:", error);
        toast.error("Erreur");
        return false;
      }
    },
    [user, fetchRequests]
  );

  const cancelRequest = useCallback(
    async (requestId: string) => {
      if (!user) return false;

      try {
        const { error } = await supabase
          .from("product_requests")
          .update({ status: "cancelled" })
          .eq("id", requestId)
          .eq("user_id", user.id);

        if (error) throw error;
        toast.success("Demande annulée");
        await fetchRequests();
        return true;
      } catch (error) {
        console.error("Error cancelling request:", error);
        toast.error("Erreur");
        return false;
      }
    },
    [user, fetchRequests]
  );

  return {
    requests, // Open requests from others
    myRequests, // My own requests
    loading,
    createRequest,
    fulfillRequest,
    cancelRequest,
    refetch: fetchRequests,
  };
}
