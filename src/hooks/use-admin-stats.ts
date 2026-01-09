import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AdminStats {
  totalUsers: number;
  totalSales: number;
  totalRevenue: number;
  activeCountries: number;
  totalCountries: number;
  activePlans: number;
  usedCodes: number;
  totalCodes: number;
  openTickets: number;
  todayUsers: number;
  todayRevenue: number;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async (): Promise<AdminStats> => {
      // Get user counts
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get today's users
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      // Get sales stats
      const { data: salesData } = await supabase
        .from("sales")
        .select("amount");
      
      const totalSales = salesData?.length || 0;
      const totalRevenue = salesData?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;

      // Get today's revenue
      const { data: todaySalesData } = await supabase
        .from("sales")
        .select("amount")
        .gte("created_at", today.toISOString());
      
      const todayRevenue = todaySalesData?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;

      // Get countries
      const { data: countries } = await supabase
        .from("countries")
        .select("is_active");
      
      const totalCountries = countries?.length || 0;
      const activeCountries = countries?.filter(c => c.is_active).length || 0;

      // Get subscription plans
      const { count: activePlans } = await supabase
        .from("subscription_plans")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      // Get recharge codes
      const { data: codes } = await supabase
        .from("recharge_codes")
        .select("is_used");
      
      const totalCodes = codes?.length || 0;
      const usedCodes = codes?.filter(c => c.is_used).length || 0;

      // Get support tickets
      const { count: openTickets } = await supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .in("status", ["open", "in_progress"]);

      return {
        totalUsers: totalUsers || 0,
        totalSales,
        totalRevenue,
        activeCountries,
        totalCountries,
        activePlans: activePlans || 0,
        usedCodes,
        totalCodes,
        openTickets: openTickets || 0,
        todayUsers: todayUsers || 0,
        todayRevenue,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          subscriptions(*)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });
}

export function useAdminCountries() {
  return useQuery({
    queryKey: ["admin-countries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("countries")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
  });
}

export function useAdminRegions(countryId?: string) {
  return useQuery({
    queryKey: ["admin-regions", countryId],
    queryFn: async () => {
      let query = supabase.from("regions").select("*, countries(name)").order("name");
      
      if (countryId) {
        query = query.eq("country_id", countryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: true,
  });
}

export function useAdminPlans() {
  return useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      return data;
    },
  });
}

export function useAdminCodes() {
  return useQuery({
    queryKey: ["admin-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recharge_codes")
        .select("*, subscription_plans(name)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data;
    },
  });
}

export function useAdminFeatureFlags() {
  return useQuery({
    queryKey: ["admin-feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("feature_key");

      if (error) throw error;
      return data;
    },
  });
}

export function useAdminLogs() {
  return useQuery({
    queryKey: ["admin-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });
}

export function useAdminTickets() {
  return useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*, profiles:user_id(shop_name, phone)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });
}
