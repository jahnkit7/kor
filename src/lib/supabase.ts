// Check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return !!(url && key);
};

// Lazy getter for supabase client - only import when actually needed and configured
export const getSupabaseClient = async () => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured");
  }
  const { supabase } = await import("@/integrations/supabase/client");
  return supabase;
};
