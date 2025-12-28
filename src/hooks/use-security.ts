import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";

interface SecuritySettings {
  appPin: string | null;
  autoLockMinutes: number;
  hideAmounts: boolean;
  onboardingCompleted: boolean;
}

interface SecurityState extends SecuritySettings {
  loading: boolean;
  isLocked: boolean;
  setLocked: (locked: boolean) => void;
  updateSettings: (settings: Partial<SecuritySettings>) => Promise<void>;
  verifyPin: (pin: string) => boolean;
}

const DEFAULT_SETTINGS: SecuritySettings = {
  appPin: null,
  autoLockMinutes: 5,
  hideAmounts: false,
  onboardingCompleted: false,
};

export function useSecurity(): SecurityState {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("app_pin, auto_lock_minutes, hide_amounts, onboarding_completed")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching security settings:", error);
        } else if (data) {
          setSettings({
            appPin: data.app_pin,
            autoLockMinutes: data.auto_lock_minutes ?? 5,
            hideAmounts: data.hide_amounts ?? false,
            onboardingCompleted: data.onboarding_completed ?? false,
          });
        }
      } catch (error) {
        console.error("Error fetching security settings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  const updateSettings = useCallback(async (newSettings: Partial<SecuritySettings>) => {
    if (!user || !isSupabaseConfigured()) return;

    try {
      const supabase = await getSupabaseClient();
      const updates: Record<string, unknown> = {};
      
      if (newSettings.appPin !== undefined) updates.app_pin = newSettings.appPin;
      if (newSettings.autoLockMinutes !== undefined) updates.auto_lock_minutes = newSettings.autoLockMinutes;
      if (newSettings.hideAmounts !== undefined) updates.hide_amounts = newSettings.hideAmounts;
      if (newSettings.onboardingCompleted !== undefined) updates.onboarding_completed = newSettings.onboardingCompleted;

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating security settings:", error);
        throw error;
      }

      setSettings(prev => ({ ...prev, ...newSettings }));
    } catch (error) {
      console.error("Error updating security settings:", error);
      throw error;
    }
  }, [user]);

  const verifyPin = useCallback((pin: string) => {
    return settings.appPin === pin;
  }, [settings.appPin]);

  return {
    ...settings,
    loading,
    isLocked,
    setLocked: setIsLocked,
    updateSettings,
    verifyPin,
  };
}
