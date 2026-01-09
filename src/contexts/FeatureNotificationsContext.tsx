import { createContext, useContext, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface FeatureNotificationsContextType {
  // Context can be extended later if needed
}

const FeatureNotificationsContext = createContext<FeatureNotificationsContextType | null>(null);

interface FeatureNotificationsProviderProps {
  children: ReactNode;
}

export function FeatureNotificationsProvider({ children }: FeatureNotificationsProviderProps) {
  const queryClient = useQueryClient();

  const handleFeatureChange = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === "UPDATE") {
      const wasEnabled = oldRecord?.is_globally_enabled;
      const isNowEnabled = newRecord?.is_globally_enabled;
      const featureName = newRecord?.name || newRecord?.feature_key;

      if (wasEnabled && !isNowEnabled) {
        // Feature was disabled
        toast.warning(`Fonctionnalité désactivée`, {
          description: `"${featureName}" a été temporairement désactivée.`,
          icon: <AlertTriangle className="w-5 h-5" />,
          duration: 5000,
        });
      } else if (!wasEnabled && isNowEnabled) {
        // Feature was enabled
        toast.success(`Fonctionnalité activée`, {
          description: `"${featureName}" est maintenant disponible !`,
          icon: <CheckCircle2 className="w-5 h-5" />,
          duration: 4000,
        });
      }

      // Invalidate feature flags cache to update UI
      queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
      queryClient.invalidateQueries({ queryKey: ["admin-feature-flags"] });
    }
  }, [queryClient]);

  useEffect(() => {
    // Subscribe to realtime changes on feature_flags table
    const channel = supabase
      .channel("feature-flags-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "feature_flags",
        },
        handleFeatureChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleFeatureChange]);

  return (
    <FeatureNotificationsContext.Provider value={{}}>
      {children}
    </FeatureNotificationsContext.Provider>
  );
}

export function useFeatureNotifications() {
  const context = useContext(FeatureNotificationsContext);
  if (!context) {
    throw new Error(
      "useFeatureNotifications must be used within a FeatureNotificationsProvider"
    );
  }
  return context;
}
