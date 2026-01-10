import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

interface ReferrerInfo {
  referrerId: string;
  referrerName: string | null;
  discountPercent: number;
}

// Validate a referral code using RPC function (bypasses RLS)
export function useValidateReferralCode() {
  return useMutation({
    mutationFn: async (code: string): Promise<ReferrerInfo> => {
      const cleanCode = code.trim().toUpperCase();
      console.log("[Referral] Validating code:", cleanCode);

      const { data, error } = await supabase
        .rpc('validate_referral_code', { code: cleanCode });

      console.log("[Referral] RPC result:", { data, error });

      if (error) {
        console.error("[Referral] RPC error:", error);
        throw new Error("Erreur de validation du code");
      }

      if (!data || data.length === 0) {
        throw new Error("Code de parrainage invalide");
      }

      const referrer = data[0];
      return {
        referrerId: referrer.referrer_id,
        referrerName: referrer.referrer_name,
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

// Record referral after signup using RPC (bypasses RLS)
export async function recordReferral(
  userId: string, 
  referralCode: string
): Promise<boolean> {
  try {
    const cleanCode = referralCode.trim().toUpperCase();
    console.log("[Referral] Recording referral for user:", userId, "with code:", cleanCode);

    // Find the referrer using RPC function (bypasses RLS)
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('validate_referral_code', { code: cleanCode });

    console.log("[Referral] RPC result:", { rpcResult, rpcError });

    if (rpcError || !rpcResult || rpcResult.length === 0) {
      console.warn("[Referral] Invalid referral code:", cleanCode, rpcError);
      return false;
    }

    const referrer = rpcResult[0];

    // Don't allow self-referral
    if (referrer.referrer_id === userId) {
      console.warn("[Referral] Self-referral attempted");
      return false;
    }

    // Update the new user's profile with referred_by
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ referred_by: referrer.referrer_id })
      .eq("user_id", userId);

    if (updateError) {
      console.error("[Referral] Error updating referred_by:", updateError);
      return false;
    }

    console.log("[Referral] Profile updated with referred_by:", referrer.referrer_id);

    // Create the referral record
    const { error: insertError } = await supabase
      .from("referrals")
      .insert({
        referrer_id: referrer.referrer_id,
        referred_id: userId,
        referral_code: cleanCode,
        status: "pending",
        reward_type: "discount",
        reward_value: 10,
      });

    if (insertError) {
      console.error("[Referral] Error creating referral:", insertError);
      return false;
    }

    console.log("[Referral] Referral record created successfully");
    return true;
  } catch (error) {
    console.error("[Referral] Error recording referral:", error);
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
