import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export interface MerchantProfile {
  id: string;
  user_id: string;
  merchant_type: string;
  specialties: string[];
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  market_address: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    shop_name: string;
    owner_name: string | null;
    phone: string | null;
  } | null;
}

export const MERCHANT_TYPES = [
  { value: "détaillant", label: "Détaillant", emoji: "🏪", description: "Je vends au détail" },
  { value: "grossiste", label: "Grossiste", emoji: "📦", description: "Je vends en gros" },
  { value: "producteur", label: "Producteur", emoji: "🌾", description: "Je produis/fabrique" },
  { value: "importateur", label: "Importateur", emoji: "🚢", description: "J'importe des produits" },
] as const;

export const SPECIALTIES = [
  { value: "alimentaire", label: "Alimentaire", emoji: "🍎" },
  { value: "electronique", label: "Électronique", emoji: "📱" },
  { value: "vetements", label: "Vêtements", emoji: "👕" },
  { value: "cosmetiques", label: "Cosmétiques", emoji: "💄" },
  { value: "quincaillerie", label: "Quincaillerie", emoji: "🔧" },
  { value: "boissons", label: "Boissons", emoji: "🍺" },
  { value: "meubles", label: "Meubles", emoji: "🪑" },
  { value: "tissus", label: "Tissus", emoji: "🧵" },
  { value: "pieces_auto", label: "Pièces auto", emoji: "🚗" },
  { value: "autre", label: "Autre", emoji: "📋" },
] as const;

export function useMerchantProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<MerchantProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("merchant_profiles")
        .select(`
          *,
          profiles:user_id (
            shop_name,
            owner_name,
            phone
          )
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data as unknown as MerchantProfile);
    } catch (error) {
      console.error("Error fetching merchant profile:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const createOrUpdateProfile = useCallback(
    async (data: Partial<Omit<MerchantProfile, "id" | "user_id" | "created_at" | "updated_at">>) => {
      if (!user) return null;

      try {
        if (profile) {
          // Update existing
          const { data: updated, error } = await supabase
            .from("merchant_profiles")
            .update(data)
            .eq("user_id", user.id)
            .select()
            .single();

          if (error) throw error;
          setProfile(updated);
          toast.success("Profil marchand mis à jour !");
          return updated;
        } else {
          // Create new
          const { data: created, error } = await supabase
            .from("merchant_profiles")
            .insert({ user_id: user.id, ...data })
            .select()
            .single();

          if (error) throw error;
          setProfile(created);
          toast.success("Profil marchand créé !");
          return created;
        }
      } catch (error) {
        console.error("Error saving merchant profile:", error);
        toast.error("Erreur lors de la sauvegarde");
        return null;
      }
    },
    [user, profile]
  );

  const toggleVisibility = useCallback(async () => {
    if (!profile) return;
    return createOrUpdateProfile({ is_visible: !profile.is_visible });
  }, [profile, createOrUpdateProfile]);

  return {
    profile,
    loading,
    createOrUpdateProfile,
    toggleVisibility,
    refetch: fetchProfile,
    hasProfile: !!profile,
  };
}

export function useMerchants() {
  const [merchants, setMerchants] = useState<MerchantProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMerchants = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("merchant_profiles")
        .select(`
          *,
          profiles:user_id (
            shop_name,
            owner_name,
            phone
          )
        `)
        .eq("is_visible", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMerchants((data as unknown as MerchantProfile[]) || []);
    } catch (error) {
      console.error("Error fetching merchants:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  return { merchants, loading, refetch: fetchMerchants };
}
