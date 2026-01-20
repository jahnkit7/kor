import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BrandingSettings {
  og_title?: string;
  og_description?: string;
  og_image?: string;
  favicon?: string;
  logo?: string;
  icon?: string;
  branding_logo?: string;
  branding_icon?: string;
  branding_og_image?: string;
}

// Default fallback assets
const DEFAULT_ASSETS = {
  logo: "/images/logo-kor.svg",
  icon: "/icons/kor-icon.png",
  og_image: "/images/og-image.png"
};

export function useBranding() {
  const queryClient = useQueryClient();

  const { data: branding, isLoading, error } = useQuery({
    queryKey: ['branding-settings'],
    queryFn: async (): Promise<BrandingSettings> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [
          'og_title', 'og_description', 'og_image', 
          'favicon', 'logo', 'icon',
          'branding_logo', 'branding_icon', 'branding_og_image'
        ]);

      if (error) throw error;

      const settings: BrandingSettings = {};
      data?.forEach((item) => {
        settings[item.key as keyof BrandingSettings] = item.value;
      });

      return settings;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const syncMutation = useMutation({
    mutationFn: async (settings: BrandingSettings) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('sync-meta-tags', {
        body: { settings },
        headers: session?.access_token 
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branding-settings'] });
    }
  });

  // Get logo URL with fallback
  const getLogoUrl = () => {
    return branding?.branding_logo || branding?.logo || DEFAULT_ASSETS.logo;
  };

  // Get icon URL with fallback
  const getIconUrl = () => {
    return branding?.branding_icon || branding?.icon || DEFAULT_ASSETS.icon;
  };

  // Get OG image URL with fallback
  const getOgImageUrl = () => {
    return branding?.branding_og_image || branding?.og_image || DEFAULT_ASSETS.og_image;
  };

  return {
    branding: branding || {},
    isLoading,
    error,
    syncBranding: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
    // Helper methods for getting asset URLs with fallbacks
    getLogoUrl,
    getIconUrl,
    getOgImageUrl,
    DEFAULT_ASSETS
  };
}
