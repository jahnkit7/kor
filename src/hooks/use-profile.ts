import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";

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
        setProfile(data);
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
      const { error } = await supabase
        .from("profiles")
        .update(updates)
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