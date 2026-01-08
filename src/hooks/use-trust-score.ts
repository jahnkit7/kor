import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TrustScoreData {
  total_debts: number;
  paid_debts: number;
  total_sales_amount: number;
  total_sales_count: number;
  account_age_days: number;
}

export interface TrustScore {
  score: number;
  level: "bronze" | "silver" | "gold" | "diamond";
  levelEmoji: string;
  levelLabel: string;
  color: string;
  stats: TrustScoreData;
}

const LEVEL_CONFIG = {
  bronze: { emoji: "🥉", label: "Bronze", color: "hsl(30, 60%, 50%)" },
  silver: { emoji: "🥈", label: "Argent", color: "hsl(0, 0%, 65%)" },
  gold: { emoji: "🥇", label: "Or", color: "hsl(45, 80%, 50%)" },
  diamond: { emoji: "💎", label: "Diamant", color: "hsl(200, 80%, 55%)" },
};

function calculateScore(data: TrustScoreData): TrustScore {
  // Weights
  const DEBT_WEIGHT = 60;
  const VOLUME_WEIGHT = 25;
  const AGE_WEIGHT = 15;

  // Calculate debt ratio (60%)
  let debtScore = 0;
  if (data.total_debts > 0) {
    debtScore = (data.paid_debts / data.total_debts) * DEBT_WEIGHT;
  } else {
    // No debts = neutral, give half points
    debtScore = DEBT_WEIGHT * 0.5;
  }

  // Calculate volume bonus (25%)
  // Tiers: 0-100k = 0, 100k-500k = 25%, 500k-2M = 50%, 2M-10M = 75%, >10M = 100%
  let volumeScore = 0;
  const volume = data.total_sales_amount || 0;
  if (volume >= 10000000) {
    volumeScore = VOLUME_WEIGHT;
  } else if (volume >= 2000000) {
    volumeScore = VOLUME_WEIGHT * 0.75;
  } else if (volume >= 500000) {
    volumeScore = VOLUME_WEIGHT * 0.5;
  } else if (volume >= 100000) {
    volumeScore = VOLUME_WEIGHT * 0.25;
  }

  // Calculate age bonus (15%)
  // Tiers: 0-7 days = 0, 7-30 days = 25%, 30-90 days = 50%, 90-365 days = 75%, >365 = 100%
  let ageScore = 0;
  const days = data.account_age_days || 0;
  if (days >= 365) {
    ageScore = AGE_WEIGHT;
  } else if (days >= 90) {
    ageScore = AGE_WEIGHT * 0.75;
  } else if (days >= 30) {
    ageScore = AGE_WEIGHT * 0.5;
  } else if (days >= 7) {
    ageScore = AGE_WEIGHT * 0.25;
  }

  const totalScore = Math.round(debtScore + volumeScore + ageScore);

  // Determine level
  let level: TrustScore["level"] = "bronze";
  if (totalScore >= 85) {
    level = "diamond";
  } else if (totalScore >= 70) {
    level = "gold";
  } else if (totalScore >= 50) {
    level = "silver";
  }

  const config = LEVEL_CONFIG[level];

  return {
    score: totalScore,
    level,
    levelEmoji: config.emoji,
    levelLabel: config.label,
    color: config.color,
    stats: data,
  };
}

export function useTrustScore(userId: string | undefined) {
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTrustScore = useCallback(async () => {
    if (!userId) {
      setTrustScore(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc("get_trust_score_data", {
        target_user_id: userId,
      });

      if (error) throw error;

      const scoreData = data as unknown as TrustScoreData;
      const score = calculateScore(scoreData);
      setTrustScore(score);
    } catch (error) {
      console.error("Error fetching trust score:", error);
      // Return a default score on error
      setTrustScore({
        score: 50,
        level: "silver",
        levelEmoji: "🥈",
        levelLabel: "Argent",
        color: "hsl(0, 0%, 65%)",
        stats: {
          total_debts: 0,
          paid_debts: 0,
          total_sales_amount: 0,
          total_sales_count: 0,
          account_age_days: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTrustScore();
  }, [fetchTrustScore]);

  return { trustScore, loading, refetch: fetchTrustScore };
}
