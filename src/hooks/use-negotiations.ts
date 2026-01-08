import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export interface Negotiation {
  id: string;
  request_id: string | null;
  offer_id: string | null;
  proposer_id: string;
  responder_id: string;
  product_name: string;
  proposed_quantity: number | null;
  proposed_unit: string | null;
  proposed_price: number | null;
  proposed_total: number | null;
  notes: string | null;
  status: "pending" | "accepted" | "rejected" | "counter" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
  // Joined data
  proposer_profile?: {
    shop_name: string;
    owner_name: string | null;
  };
  responder_profile?: {
    shop_name: string;
    owner_name: string | null;
  };
}

export function useNegotiations(partnerId?: string) {
  const { user } = useAuth();
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNegotiations = useCallback(async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("merchant_negotiations")
        .select("*")
        .or(`proposer_id.eq.${user.id},responder_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (partnerId) {
        query = query.or(
          `and(proposer_id.eq.${user.id},responder_id.eq.${partnerId}),and(proposer_id.eq.${partnerId},responder_id.eq.${user.id})`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      setNegotiations((data || []) as Negotiation[]);
    } catch (error) {
      console.error("Error fetching negotiations:", error);
    } finally {
      setLoading(false);
    }
  }, [user, partnerId]);

  const createProposal = async (data: {
    responderId: string;
    productName: string;
    quantity?: number;
    unit?: string;
    price?: number;
    total?: number;
    notes?: string;
    requestId?: string;
    offerId?: string;
  }) => {
    if (!user) return null;

    try {
      const { data: negotiation, error } = await supabase
        .from("merchant_negotiations")
        .insert({
          proposer_id: user.id,
          responder_id: data.responderId,
          product_name: data.productName,
          proposed_quantity: data.quantity,
          proposed_unit: data.unit || "pièces",
          proposed_price: data.price,
          proposed_total: data.total,
          notes: data.notes,
          request_id: data.requestId,
          offer_id: data.offerId,
          status: "pending"
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Proposition envoyée !");
      await fetchNegotiations();
      return negotiation;
    } catch (error) {
      console.error("Error creating proposal:", error);
      toast.error("Erreur lors de l'envoi de la proposition");
      return null;
    }
  };

  const respondToProposal = async (
    negotiationId: string,
    response: "accepted" | "rejected" | "counter",
    counterData?: {
      quantity?: number;
      price?: number;
      total?: number;
      notes?: string;
    }
  ) => {
    if (!user) return false;

    try {
      const updateData: Record<string, unknown> = { status: response };
      
      if (response === "counter" && counterData) {
        updateData.proposed_quantity = counterData.quantity;
        updateData.proposed_price = counterData.price;
        updateData.proposed_total = counterData.total;
        updateData.notes = counterData.notes;
        // Swap proposer/responder for counter-offer
        const negotiation = negotiations.find(n => n.id === negotiationId);
        if (negotiation) {
          updateData.proposer_id = user.id;
          updateData.responder_id = negotiation.proposer_id;
          updateData.status = "pending";
        }
      }

      const { error } = await supabase
        .from("merchant_negotiations")
        .update(updateData)
        .eq("id", negotiationId);

      if (error) throw error;

      const messages = {
        accepted: "Accord accepté !",
        rejected: "Proposition refusée",
        counter: "Contre-proposition envoyée !"
      };
      
      toast.success(messages[response]);
      await fetchNegotiations();
      return true;
    } catch (error) {
      console.error("Error responding to proposal:", error);
      toast.error("Erreur lors de la réponse");
      return false;
    }
  };

  const markAsCompleted = async (negotiationId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("merchant_negotiations")
        .update({ status: "completed" })
        .eq("id", negotiationId);

      if (error) throw error;
      
      toast.success("Transaction marquée comme terminée !");
      await fetchNegotiations();
      return true;
    } catch (error) {
      console.error("Error completing negotiation:", error);
      toast.error("Erreur lors de la mise à jour");
      return false;
    }
  };

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("negotiations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "merchant_negotiations",
        },
        () => {
          fetchNegotiations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNegotiations]);

  useEffect(() => {
    fetchNegotiations();
  }, [fetchNegotiations]);

  return {
    negotiations,
    loading,
    createProposal,
    respondToProposal,
    markAsCompleted,
    refetch: fetchNegotiations
  };
}
