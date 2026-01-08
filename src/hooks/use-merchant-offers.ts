import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export interface MerchantOffer {
  id: string;
  user_id: string;
  product_name: string;
  description: string | null;
  quantity: number | null;
  unit: string;
  price: number | null;
  is_promo: boolean;
  promo_label: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    shop_name: string;
    owner_name: string | null;
    phone: string | null;
  } | null;
}

export function useMerchantOffers() {
  const { user } = useAuth();
  const [offers, setOffers] = useState<MerchantOffer[]>([]);
  const [myOffers, setMyOffers] = useState<MerchantOffer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOffers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("merchant_offers")
        .select(`
          *,
          profiles:user_id (
            shop_name,
            owner_name,
            phone
          )
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const allOffers = (data as unknown as MerchantOffer[]) || [];
      
      if (user) {
        setMyOffers(allOffers.filter(o => o.user_id === user.id));
        setOffers(allOffers.filter(o => o.user_id !== user.id));
      } else {
        setOffers(allOffers);
        setMyOffers([]);
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("merchant_offers_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "merchant_offers" },
        () => {
          fetchOffers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOffers]);

  const createOffer = useCallback(
    async (data: {
      product_name: string;
      description?: string;
      quantity?: number;
      unit?: string;
      price?: number;
      is_promo?: boolean;
      promo_label?: string;
    }) => {
      if (!user) {
        toast.error("Vous devez être connecté");
        return null;
      }

      try {
        const { data: created, error } = await supabase
          .from("merchant_offers")
          .insert({
            user_id: user.id,
            ...data,
          })
          .select()
          .single();

        if (error) throw error;
        toast.success("Offre publiée !");
        fetchOffers();
        return created;
      } catch (error) {
        console.error("Error creating offer:", error);
        toast.error("Erreur lors de la publication");
        return null;
      }
    },
    [user, fetchOffers]
  );

  const updateOffer = useCallback(
    async (offerId: string, data: Partial<MerchantOffer>) => {
      if (!user) return null;

      try {
        const { data: updated, error } = await supabase
          .from("merchant_offers")
          .update(data)
          .eq("id", offerId)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw error;
        toast.success("Offre mise à jour !");
        fetchOffers();
        return updated;
      } catch (error) {
        console.error("Error updating offer:", error);
        toast.error("Erreur lors de la mise à jour");
        return null;
      }
    },
    [user, fetchOffers]
  );

  const cancelOffer = useCallback(
    async (offerId: string) => {
      return updateOffer(offerId, { status: "cancelled" });
    },
    [updateOffer]
  );

  const markAsSold = useCallback(
    async (offerId: string) => {
      return updateOffer(offerId, { status: "sold" });
    },
    [updateOffer]
  );

  return {
    offers,
    myOffers,
    loading,
    createOffer,
    updateOffer,
    cancelOffer,
    markAsSold,
    refetch: fetchOffers,
  };
}
