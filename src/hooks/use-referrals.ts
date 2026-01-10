import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string | null;
  referral_code: string;
  status: string;
  reward_type: string;
  reward_value: number;
  reward_applied: boolean;
  created_at: string;
  converted_at: string | null;
}

export function useReferrals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["referrals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Referral[];
    },
    enabled: !!user?.id,
  });
}

export function useReferralCode() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["referral-code", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      return data?.referral_code;
    },
    enabled: !!user?.id,
  });
}

export function useReferralStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["referral-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("status, reward_value")
        .eq("referrer_id", user?.id);

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        pending: data?.filter(r => r.status === "pending").length || 0,
        converted: data?.filter(r => r.status === "converted" || r.status === "rewarded").length || 0,
        totalRewards: data
          ?.filter(r => r.status === "converted" || r.status === "rewarded")
          .reduce((sum, r) => sum + (r.reward_value || 0), 0) || 0,
      };

      return stats;
    },
    enabled: !!user?.id,
  });
}

export function useCreateReferralInvite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (referredPhone: string) => {
      // Get user's referral code
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("user_id", user?.id)
        .single();

      if (!profile?.referral_code) throw new Error("Code de parrainage non trouvé");

      // Create referral invite
      const { data, error } = await supabase
        .from("referrals")
        .insert({
          referrer_id: user?.id,
          referral_code: profile.referral_code,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      queryClient.invalidateQueries({ queryKey: ["referral-stats"] });
      toast.success("Invitation de parrainage créée");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useAdminReferrals() {
  return useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as Referral[];
    },
  });
}

export function useAdminReferralStats() {
  return useQuery({
    queryKey: ["admin-referral-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("status, reward_value, created_at, converted_at");

      if (error) throw error;

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats = {
        total: data?.length || 0,
        pending: data?.filter(r => r.status === "pending").length || 0,
        converted: data?.filter(r => r.status === "converted" || r.status === "rewarded").length || 0,
        thisMonth: data?.filter(r => new Date(r.created_at) >= thisMonth).length || 0,
        conversionRate: data?.length 
          ? Math.round((data.filter(r => r.status === "converted" || r.status === "rewarded").length / data.length) * 100)
          : 0,
        totalRewardsGiven: data
          ?.filter(r => r.status === "rewarded")
          .reduce((sum, r) => sum + (r.reward_value || 0), 0) || 0,
      };

      return stats;
    },
  });
}
