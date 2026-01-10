import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";

export interface InvoiceSettings {
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  show_logo: boolean;
  footer_text: string | null;
}

const DEFAULT_SETTINGS: InvoiceSettings = {
  logo_url: null,
  primary_color: "#8B5CF6",
  secondary_color: "#0EA5E9",
  show_logo: true,
  footer_text: null,
};

export function useInvoiceSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("invoice_settings")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      
      if (data?.invoice_settings) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...(data.invoice_settings as unknown as InvoiceSettings),
        });
      }
    } catch (err) {
      console.error("Error fetching invoice settings:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(
    async (updates: Partial<InvoiceSettings>): Promise<boolean> => {
      if (!user || !isSupabaseConfigured()) return false;

      const newSettings = { ...settings, ...updates };

      try {
        const supabase = await getSupabaseClient();
        const { error } = await supabase
          .from("profiles")
          .update({ invoice_settings: newSettings })
          .eq("user_id", user.id);

        if (error) throw error;

        setSettings(newSettings);
        return true;
      } catch (err) {
        console.error("Error updating invoice settings:", err);
        return false;
      }
    },
    [user, settings]
  );

  const uploadLogo = useCallback(
    async (file: File): Promise<string | null> => {
      if (!user || !isSupabaseConfigured()) return null;

      try {
        const supabase = await getSupabaseClient();
        
        // Check if bucket exists, create if not
        const { data: buckets } = await supabase.storage.listBuckets();
        if (!buckets?.find(b => b.name === 'invoice-logos')) {
          await supabase.storage.createBucket('invoice-logos', { public: true });
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/logo-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("invoice-logos")
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("invoice-logos")
          .getPublicUrl(fileName);

        const logoUrl = urlData.publicUrl;

        // Update settings with new logo URL
        await updateSettings({ logo_url: logoUrl });

        return logoUrl;
      } catch (err) {
        console.error("Error uploading logo:", err);
        return null;
      }
    },
    [user, updateSettings]
  );

  const removeLogo = useCallback(async (): Promise<boolean> => {
    return updateSettings({ logo_url: null });
  }, [updateSettings]);

  return {
    settings,
    loading,
    updateSettings,
    uploadLogo,
    removeLogo,
    refetch: fetchSettings,
  };
}
