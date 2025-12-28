import { useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return !!(url && key);
};

export function useAuth() {
  const initiallyConfigured = isSupabaseConfigured();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [configured, setConfigured] = useState(initiallyConfigured);
  const [loading, setLoading] = useState(initiallyConfigured);

  useEffect(() => {
    // If env vars are present, proceed; otherwise mark as not configured.
    if (!initiallyConfigured) {
      console.warn("Backend not configured yet - missing env vars");
      setLoading(false);
      setConfigured(false);
      return;
    }

    // Dynamically import supabase client only when configured
    import("@/integrations/supabase/client")
      .then(({ supabase }) => {
        const ensureProfile = async (userId: string) => {
          try {
            const { data: existing, error: existingError } = await supabase
              .from("profiles")
              .select("id")
              .eq("user_id", userId)
              .maybeSingle();

            if (existingError) return;
            if (!existing) {
              await supabase.from("profiles").insert({ user_id: userId });
            }
          } catch {
            // ignore
          }
        };

        // Set up auth state listener FIRST
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);

          // Defer DB call to avoid deadlocks in the callback
          if (session?.user) {
            setTimeout(() => {
              void ensureProfile(session.user.id);
            }, 0);
          }
        });

        // THEN check for existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);

          if (session?.user) {
            setTimeout(() => {
              void ensureProfile(session.user.id);
            }, 0);
          }
        });

        return () => subscription.unsubscribe();
      })
      .catch((error) => {
        console.error("Failed to load backend client:", error);
        setLoading(false);
        setConfigured(false);
      });
  }, [initiallyConfigured]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!configured) return { data: null, error: new Error("Supabase not configured") };

    const { supabase } = await import("@/integrations/supabase/client");
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    // Create default profile row as soon as we have a session (auto-confirm enabled)
    if (!error && data?.session?.user) {
      try {
        const userId = data.session.user.id;

        const { data: existing, error: existingError } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existingError && !existing) {
          await supabase.from("profiles").insert({ user_id: userId });
        }
      } catch {
        // Silent: user can still complete profile via /profile-setup
      }
    }

    return { data, error };
  }, [configured]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!configured) return { data: null, error: new Error("Supabase not configured") };
    
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }, [configured]);

  const signOut = useCallback(async () => {
    if (!configured) return { error: new Error("Supabase not configured") };
    
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.auth.signOut();
    return { error };
  }, [configured]);

  return {
    user,
    session,
    loading,
    configured,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!session,
  };
}
