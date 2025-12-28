// Safe supabase client wrapper that handles missing env vars gracefully
import { supabase as supabaseClient } from "@/integrations/supabase/client";

// Re-export for compatibility
export const supabase = supabaseClient;

// Check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return !!(url && key);
};
