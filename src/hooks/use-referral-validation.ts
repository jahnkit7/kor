import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

interface ReferrerInfo {
  referrerId: string;
  referrerName: string | null;
  discountPercent: number;
}

// Validate a referral code (different from promo codes)
export function useValidateReferralCode() {
  return useMutation({
    mutationFn: async (code: string): Promise<ReferrerInfo> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, shop_name")
        .eq("referral_code", code.toUpperCase())
        .single();

      if (error || !data) {
        throw new Error("Code de parrainage invalide");
      }

      return {
        referrerId: data.user_id,
        referrerName: data.shop_name,
        discountPercent: 10, // 10% discount for referred users
      };
    },
  });
}

// Check if current user was referred and hasn't subscribed yet
export function useReferralDiscount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["referral-discount", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Check if user has referred_by in their profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("referred_by")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile?.referred_by) return null;

      // Check if user already has an active paid subscription
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan, is_active")
        .eq("user_id", user.id)
        .single();

      // Don't apply discount if already subscribed to a paid plan
      if (subscription?.is_active && subscription.plan !== "gratuit") {
        return null;
      }

      // Get referrer info
      const { data: referrer } = await supabase
        .from("profiles")
        .select("shop_name")
        .eq("user_id", profile.referred_by)
        .single();

      return {
        referrerId: profile.referred_by,
        referrerName: referrer?.shop_name || "Parrain",
        discountPercent: 10,
      };
    },
    enabled: !!user?.id,
  });
}

// Record referral after signup
export async function recordReferral(
  userId: string, 
  referralCode: string
): Promise<boolean> {
  try {
    // Find the referrer by their code
    const { data: referrer, error: referrerError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("referral_code", referralCode.toUpperCase())
      .single();

    if (referrerError || !referrer) {
      console.warn("Invalid referral code:", referralCode);
      return false;
    }

    // Don't allow self-referral
    if (referrer.user_id === userId) {
      console.warn("Self-referral attempted");
      return false;
    }

    // Update the new user's profile with referred_by
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ referred_by: referrer.user_id })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating referred_by:", updateError);
      return false;
    }

    // Create the referral record
    const { error: insertError } = await supabase
      .from("referrals")
      .insert({
        referrer_id: referrer.user_id,
        referred_id: userId,
        referral_code: referralCode.toUpperCase(),
        status: "pending",
        reward_type: "discount",
        reward_value: 10,
      });

    if (insertError) {
      console.error("Error creating referral:", insertError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error recording referral:", error);
    return false;
  }
}

// Convert referral to "converted" status after payment
export async function convertReferral(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("referrals")
      .update({ 
        status: "converted", 
        converted_at: new Date().toISOString() 
      })
      .eq("referred_id", userId)
      .eq("status", "pending");

    if (error) {
      console.error("Error converting referral:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error converting referral:", error);
    return false;
  }
}
