import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FeatureUsageStat {
  feature_key: string;
  total_uses: number;
  unique_users: number;
  last_used: string;
  is_beta?: boolean;
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

interface BetaFeatureStat {
  feature_key: string;
  feature_name: string;
  total_uses: number;
  unique_users: number;
  last_used: string;
  daily_average: number;
  user_list: { user_id: string; shop_name: string | null; usage_count: number }[];
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

      // Get feature flags to know which are beta
      const { data: featureFlags } = await supabase
        .from("feature_flags")
        .select("feature_key, name, is_beta");

      const betaFeatureKeys = new Set(
        featureFlags?.filter(f => f.is_beta).map(f => f.feature_key) || []
      );

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
            is_beta: betaFeatureKeys.has(key),
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

      // ===== BETA FEATURES ANALYTICS =====
      const betaUsageData = usageData?.filter(row => betaFeatureKeys.has(row.feature_key)) || [];
      
      // Aggregate beta stats per feature
      const betaStatsMap: Record<string, {
        total_uses: number;
        users: Set<string>;
        last_used: string;
        userUsage: Record<string, number>;
        dates: Set<string>;
      }> = {};

      betaUsageData.forEach((row) => {
        const key = row.feature_key;
        
        if (!betaStatsMap[key]) {
          betaStatsMap[key] = {
            total_uses: 0,
            users: new Set(),
            last_used: row.created_at,
            userUsage: {},
            dates: new Set(),
          };
        }

        betaStatsMap[key].total_uses++;
        betaStatsMap[key].users.add(row.user_id);
        betaStatsMap[key].userUsage[row.user_id] = (betaStatsMap[key].userUsage[row.user_id] || 0) + 1;
        betaStatsMap[key].dates.add(row.created_at.split("T")[0]);
        
        if (row.created_at > betaStatsMap[key].last_used) {
          betaStatsMap[key].last_used = row.created_at;
        }
      });

      // Get profiles for beta users
      const allBetaUserIds = [...new Set(betaUsageData.map(r => r.user_id))];
      let betaUserProfiles: Record<string, string | null> = {};
      
      if (allBetaUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, shop_name")
          .in("user_id", allBetaUserIds);
        
        profiles?.forEach(p => {
          betaUserProfiles[p.user_id] = p.shop_name;
        });
      }

      // Build beta feature stats
      const betaFeatureStats: BetaFeatureStat[] = Object.entries(betaStatsMap).map(([key, stats]) => {
        const feature = featureFlags?.find(f => f.feature_key === key);
        const daysActive = stats.dates.size || 1;
        
        const userList = Object.entries(stats.userUsage)
          .map(([userId, count]) => ({
            user_id: userId,
            shop_name: betaUserProfiles[userId] || null,
            usage_count: count,
          }))
          .sort((a, b) => b.usage_count - a.usage_count)
          .slice(0, 5);

        return {
          feature_key: key,
          feature_name: feature?.name || key,
          total_uses: stats.total_uses,
          unique_users: stats.users.size,
          last_used: stats.last_used,
          daily_average: Math.round((stats.total_uses / daysActive) * 10) / 10,
          user_list: userList,
        };
      }).sort((a, b) => b.total_uses - a.total_uses);

      // Beta daily usage
      const betaDailyMap: Record<string, number> = {};
      betaUsageData
        .filter((row) => new Date(row.created_at) >= thirtyDaysAgo)
        .forEach((row) => {
          const date = row.created_at.split("T")[0];
          betaDailyMap[date] = (betaDailyMap[date] || 0) + 1;
        });

      const betaDailyUsage: DailyUsage[] = Object.entries(betaDailyMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Beta totals
      const totalBetaUsage = betaUsageData.length;
      const totalBetaUniqueUsers = new Set(betaUsageData.map(r => r.user_id)).size;
      const totalBetaFeatures = betaFeatureKeys.size;

      return {
        featureStats,
        dailyUsage,
        topUsers,
        totalUsage,
        totalUniqueUsers,
        // Beta analytics
        betaFeatureStats,
        betaDailyUsage,
        totalBetaUsage,
        totalBetaUniqueUsers,
        totalBetaFeatures,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}
