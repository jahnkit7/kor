import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action_type: string;
  action_data: Record<string, unknown>;
  created_at: string;
}

export function useActivityLogs(limit: number = 20) {
  return useQuery({
    queryKey: ["activity-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ActivityLog[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
