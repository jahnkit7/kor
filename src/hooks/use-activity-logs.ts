import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action_type: string;
  action_data: Record<string, unknown>;
  created_at: string;
  user_name?: string | null;
}

export function useActivityLogs(limit: number = 20) {
  return useQuery({
    queryKey: ["activity-logs", limit],
    queryFn: async () => {
      // Fetch activity logs
      const { data: logs, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      if (!logs || logs.length === 0) return [] as ActivityLog[];

      // Get unique user IDs
      const userIds = [...new Set(logs.map(log => log.user_id).filter(Boolean))] as string[];
      
      // Fetch user profiles for these IDs
      let userProfiles: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, owner_name, shop_name")
          .in("user_id", userIds);
        
        if (profiles) {
          userProfiles = profiles.reduce((acc, profile) => {
            acc[profile.user_id] = profile.owner_name || profile.shop_name || "Utilisateur";
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Merge user names into logs
      return logs.map(log => ({
        ...log,
        user_name: log.user_id ? userProfiles[log.user_id] || null : null,
      })) as ActivityLog[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
