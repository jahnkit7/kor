import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

interface TrackFeatureOptions {
  action?: string;
  metadata?: Record<string, any>;
  debounceMs?: number;
}

export function useFeatureTracking() {
  const { user } = useAuth();
  const lastTracked = useRef<Record<string, number>>({});

  const trackFeature = useCallback(async (
    featureKey: string,
    options: TrackFeatureOptions = {}
  ) => {
    if (!user?.id) return;

    const { 
      action = "access", 
      metadata = {},
      debounceMs = 60000 // Default 1 minute debounce
    } = options;

    // Debounce tracking to avoid spamming
    const trackKey = `${featureKey}-${action}`;
    const now = Date.now();
    const lastTime = lastTracked.current[trackKey] || 0;

    if (now - lastTime < debounceMs) {
      return; // Skip if within debounce window
    }

    lastTracked.current[trackKey] = now;

    try {
      await supabase.from("feature_usage").insert({
        user_id: user.id,
        feature_key: featureKey,
        action,
        metadata,
      });
    } catch (error) {
      // Silently fail - tracking shouldn't break the app
      console.error("Feature tracking error:", error);
    }
  }, [user?.id]);

  return { trackFeature };
}
