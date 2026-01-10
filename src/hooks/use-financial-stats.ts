import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format, eachDayOfInterval, subDays, startOfDay } from "date-fns";

interface DailyRevenue {
  date: string;
  revenue: number;
  transactions: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  transactions: number;
}

interface PromoCodeAnalytics {
  code: string;
  usageCount: number;
  totalDiscount: number;
  revenue: number;
}

interface ConversionStats {
  totalSignups: number;
  trialUsers: number;
  paidUsers: number;
  conversionRate: number;
  trialToFreeRate: number;
}

export function useFinancialStats() {
  return useQuery({
    queryKey: ["financial-stats"],
    queryFn: async () => {
      // Get payment history
      const { data: payments, error: paymentsError } = await supabase
        .from("payment_history")
        .select("*")
        .eq("status", "success")
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;

      // Calculate totals
      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;
      const totalTransactions = payments?.length || 0;
      const totalDiscount = payments?.reduce((sum, p) => sum + Number(p.discount_applied || 0), 0) || 0;

      // This month stats
      const thisMonthStart = startOfMonth(new Date());
      const thisMonthPayments = payments?.filter(p => new Date(p.created_at) >= thisMonthStart) || [];
      const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
      const thisMonthTransactions = thisMonthPayments.length;

      // Average transaction value
      const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      return {
        totalRevenue,
        totalTransactions,
        totalDiscount,
        thisMonthRevenue,
        thisMonthTransactions,
        avgTransactionValue,
      };
    },
  });
}

export function useDailyRevenue(days: number = 30) {
  return useQuery({
    queryKey: ["daily-revenue", days],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = subDays(endDate, days);

      const { data: payments, error } = await supabase
        .from("payment_history")
        .select("amount_paid, created_at")
        .eq("status", "success")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (error) throw error;

      // Generate all dates in range
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
      
      const dailyData: DailyRevenue[] = dateRange.map(date => {
        const dateStr = format(date, "yyyy-MM-dd");
        const dayPayments = payments?.filter(p => 
          format(new Date(p.created_at), "yyyy-MM-dd") === dateStr
        ) || [];

        return {
          date: format(date, "dd/MM"),
          revenue: dayPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0),
          transactions: dayPayments.length,
        };
      });

      return dailyData;
    },
  });
}

export function useMonthlyRevenue(months: number = 12) {
  return useQuery({
    queryKey: ["monthly-revenue", months],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = subMonths(startOfMonth(endDate), months - 1);

      const { data: payments, error } = await supabase
        .from("payment_history")
        .select("amount_paid, created_at")
        .eq("status", "success")
        .gte("created_at", startDate.toISOString());

      if (error) throw error;

      // Generate months
      const monthlyData: MonthlyRevenue[] = [];
      for (let i = 0; i < months; i++) {
        const monthStart = subMonths(startOfMonth(endDate), months - 1 - i);
        const monthEnd = subMonths(startOfMonth(endDate), months - 2 - i);
        const monthKey = format(monthStart, "yyyy-MM");

        const monthPayments = payments?.filter(p => {
          const paymentDate = new Date(p.created_at);
          return paymentDate >= monthStart && (i === months - 1 || paymentDate < monthEnd);
        }) || [];

        monthlyData.push({
          month: format(monthStart, "MMM yyyy"),
          revenue: monthPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0),
          transactions: monthPayments.length,
        });
      }

      return monthlyData;
    },
  });
}

export function usePromoCodeAnalytics() {
  return useQuery({
    queryKey: ["promo-code-analytics"],
    queryFn: async () => {
      const { data: payments, error } = await supabase
        .from("payment_history")
        .select("promo_code_used, amount_paid, discount_applied")
        .eq("status", "success")
        .not("promo_code_used", "is", null);

      if (error) throw error;

      // Group by promo code
      const codeMap = new Map<string, PromoCodeAnalytics>();
      
      payments?.forEach(p => {
        const code = p.promo_code_used!;
        const existing = codeMap.get(code) || { code, usageCount: 0, totalDiscount: 0, revenue: 0 };
        
        existing.usageCount++;
        existing.totalDiscount += Number(p.discount_applied || 0);
        existing.revenue += Number(p.amount_paid);
        
        codeMap.set(code, existing);
      });

      return Array.from(codeMap.values()).sort((a, b) => b.usageCount - a.usageCount);
    },
  });
}

export function useConversionStats() {
  return useQuery({
    queryKey: ["conversion-stats"],
    queryFn: async () => {
      // Get all profiles (signups)
      const { count: totalSignups } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get subscription distribution
      const { data: subscriptions, error } = await supabase
        .from("subscriptions")
        .select("plan, is_active");

      if (error) throw error;

      const trialUsers = subscriptions?.filter(s => s.plan === "free_trial" && s.is_active).length || 0;
      const paidUsers = subscriptions?.filter(s => s.plan !== "free_trial" && s.is_active).length || 0;
      const total = totalSignups || 0;

      const conversionRate = total > 0 ? Math.round((paidUsers / total) * 100) : 0;
      const trialToFreeRate = total > 0 ? Math.round((trialUsers / total) * 100) : 0;

      return {
        totalSignups: total,
        trialUsers,
        paidUsers,
        conversionRate,
        trialToFreeRate,
      } as ConversionStats;
    },
  });
}

export function usePlanDistribution() {
  return useQuery({
    queryKey: ["plan-distribution"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("is_active", true);

      if (error) throw error;

      // Count by plan
      const planCounts = new Map<string, number>();
      data?.forEach(s => {
        const count = planCounts.get(s.plan) || 0;
        planCounts.set(s.plan, count + 1);
      });

      const planNames: Record<string, string> = {
        free_trial: "Essai Gratuit",
        starter: "Starter",
        premium: "Premium",
        gratuit: "Gratuit",
      };

      return Array.from(planCounts.entries()).map(([plan, count]) => ({
        name: planNames[plan] || plan,
        value: count,
        plan,
      }));
    },
  });
}
