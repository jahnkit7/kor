import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BrandingSettings {
  og_title?: string;
  og_description?: string;
  og_image?: string;
  favicon?: string;
  logo?: string;
  icon?: string;
}

export function useBranding() {
  const queryClient = useQueryClient();

  const { data: branding, isLoading, error } = useQuery({
    queryKey: ['branding-settings'],
    queryFn: async (): Promise<BrandingSettings> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['og_title', 'og_description', 'og_image', 'favicon', 'logo', 'icon']);

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

  return {
    branding: branding || {},
    isLoading,
    error,
    syncBranding: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending
  };
}
