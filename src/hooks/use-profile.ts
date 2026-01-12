import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";

export interface NotificationSettings {
  debt_threshold: number;
  low_stock_threshold: number;
  notify_high_debt: boolean;
  notify_low_stock: boolean;
}

export interface Profile {
  id: string;
  user_id: string;
  shop_name: string;
  owner_name: string | null;
  phone: string | null;
  currency: string;
  language: string;
  app_pin: string | null;
  auto_lock_minutes: number;
  hide_amounts: boolean;
  onboarding_completed: boolean;
  notification_settings: NotificationSettings | null;
  auto_deduct_stock: boolean;
  referred_by: string | null;
  linked_owner_id: string | null;
}

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  isProfileComplete: boolean;
  refetch: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

export function useProfile(): ProfileState {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        setProfile(null);
      } else {
        // Transform the data to match our Profile interface
        const profileData: Profile = {
          id: data.id,
          user_id: data.user_id,
          shop_name: data.shop_name,
          owner_name: data.owner_name,
          phone: data.phone,
          currency: data.currency,
          language: data.language,
          app_pin: data.app_pin,
          auto_lock_minutes: data.auto_lock_minutes,
          hide_amounts: data.hide_amounts,
          onboarding_completed: data.onboarding_completed,
          notification_settings: data.notification_settings as unknown as NotificationSettings | null,
          auto_deduct_stock: data.auto_deduct_stock ?? true,
          referred_by: data.referred_by ?? null,
          linked_owner_id: data.linked_owner_id ?? null,
        };
        setProfile(profileData);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      const supabase = await getSupabaseClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbUpdates: Record<string, any> = { ...updates };
      const { error } = await supabase
        .from("profiles")
        .update(dbUpdates)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating profile:", error);
        throw error;
      }

      setProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }, [user]);

  const isProfileComplete = Boolean(
    profile?.shop_name && 
    profile.shop_name !== "Ma Boutique" && 
    profile?.owner_name
  );

  return {
    profile,
    loading,
    isProfileComplete,
    refetch: fetchProfile,
    updateProfile,
  };
}