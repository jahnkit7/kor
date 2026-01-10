import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

interface Changelog {
  id: string;
  feature_key: string;
  version: string;
  title: string;
  content_md: string;
  change_type: "feature" | "improvement" | "bugfix" | "breaking";
  published_at: string;
  created_by: string | null;
  created_at: string;
}

interface ChangelogView {
  id: string;
  user_id: string;
  changelog_id: string;
  viewed_at: string;
}

export function useChangelogs(featureKey: string) {
  const { user } = useAuth();

  const { data: changelogs, isLoading } = useQuery({
    queryKey: ["changelogs", featureKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_changelogs")
        .select("*")
        .eq("feature_key", featureKey)
        .order("published_at", { ascending: false });

      if (error) throw error;
      return data as Changelog[];
    },
    enabled: !!featureKey,
  });

  const { data: views } = useQuery({
    queryKey: ["changelog-views", featureKey, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("changelog_views")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data as ChangelogView[];
    },
    enabled: !!user?.id,
  });

  const viewedChangelogIds = new Set(views?.map(v => v.changelog_id) || []);
  
  const unreadChangelogs = changelogs?.filter(c => !viewedChangelogIds.has(c.id)) || [];
  const hasUnread = unreadChangelogs.length > 0;

  return {
    changelogs: changelogs || [],
    unreadChangelogs,
    hasUnread,
    isLoading,
  };
}

export function useMarkChangelogAsRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changelogId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("changelog_views")
        .insert({
          user_id: user.id,
          changelog_id: changelogId,
        });

      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changelog-views"] });
    },
  });
}

export function useMarkAllChangelogsAsRead(featureKey: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { changelogs } = useChangelogs(featureKey);

  return useMutation({
    mutationFn: async () => {
      if (!user?.id || !changelogs?.length) return;

      const views = changelogs.map(c => ({
        user_id: user.id,
        changelog_id: c.id,
      }));

      const { error } = await supabase
        .from("changelog_views")
        .upsert(views, { onConflict: "user_id,changelog_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changelog-views"] });
    },
  });
}

// Admin hook for creating changelogs
export function useCreateChangelog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      feature_key: string;
      version: string;
      title: string;
      content_md: string;
      change_type: "feature" | "improvement" | "bugfix" | "breaking";
    }) => {
      const { error, data: changelog } = await supabase
        .from("feature_changelogs")
        .insert({
          ...data,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return changelog;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["changelogs", variables.feature_key] });
      queryClient.invalidateQueries({ queryKey: ["admin-changelogs"] });
    },
  });
}

// Admin hook for fetching all changelogs
export function useAdminChangelogs() {
  return useQuery({
    queryKey: ["admin-changelogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_changelogs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Changelog[];
    },
  });
}
