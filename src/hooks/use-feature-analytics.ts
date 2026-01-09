import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FeatureUsageStat {
  feature_key: string;
  total_uses: number;
  unique_users: number;
  last_used: string;
}

interface DailyUsage {
  date: string;
  count: number;
}

interface TopUser {
  user_id: string;
  shop_name: string | null;
  usage_count: number;
}

export function useFeatureAnalytics() {
  return useQuery({
    queryKey: ["admin-feature-analytics"],
    queryFn: async () => {
      // Get usage stats per feature
      const { data: usageData, error: usageError } = await supabase
        .from("feature_usage")
        .select("feature_key, user_id, created_at");

      if (usageError) throw usageError;

      // Aggregate stats
      const statsMap: Record<string, FeatureUsageStat> = {};
      const usersByFeature: Record<string, Set<string>> = {};

      usageData?.forEach((row) => {
        const key = row.feature_key;
        
        if (!statsMap[key]) {
          statsMap[key] = {
            feature_key: key,
            total_uses: 0,
            unique_users: 0,
            last_used: row.created_at,
          };
          usersByFeature[key] = new Set();
        }

        statsMap[key].total_uses++;
        usersByFeature[key].add(row.user_id);
        
        if (row.created_at > statsMap[key].last_used) {
          statsMap[key].last_used = row.created_at;
        }
      });

      // Set unique users count
      Object.keys(statsMap).forEach((key) => {
        statsMap[key].unique_users = usersByFeature[key].size;
      });

      const featureStats = Object.values(statsMap).sort(
        (a, b) => b.total_uses - a.total_uses
      );

      // Get daily usage for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyMap: Record<string, number> = {};
      usageData
        ?.filter((row) => new Date(row.created_at) >= thirtyDaysAgo)
        .forEach((row) => {
          const date = row.created_at.split("T")[0];
          dailyMap[date] = (dailyMap[date] || 0) + 1;
        });

      const dailyUsage: DailyUsage[] = Object.entries(dailyMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Get top users
      const userUsageMap: Record<string, number> = {};
      usageData?.forEach((row) => {
        userUsageMap[row.user_id] = (userUsageMap[row.user_id] || 0) + 1;
      });

      const topUserIds = Object.entries(userUsageMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id);

      // Fetch user profiles for top users
      let topUsers: TopUser[] = [];
      if (topUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, shop_name")
          .in("user_id", topUserIds);

        topUsers = topUserIds.map((userId) => ({
          user_id: userId,
          shop_name: profiles?.find((p) => p.user_id === userId)?.shop_name || null,
          usage_count: userUsageMap[userId],
        }));
      }

      // Get total stats
      const totalUsage = usageData?.length || 0;
      const totalUniqueUsers = new Set(usageData?.map((r) => r.user_id)).size;

      return {
        featureStats,
        dailyUsage,
        topUsers,
        totalUsage,
        totalUniqueUsers,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}
