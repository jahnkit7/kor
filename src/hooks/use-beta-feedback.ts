import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface FeedbackData {
  featureKey: string;
  rating: number;
  comment?: string;
}

export function useBetaFeedback() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeedback = async ({ featureKey, rating, comment }: FeedbackData) => {
    if (!user) {
      toast.error("Vous devez être connecté pour envoyer un feedback");
      return false;
    }

    setIsSubmitting(true);

    try {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        timestamp: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("beta_feedback")
        .insert({
          user_id: user.id,
          feature_key: featureKey,
          rating,
          comment: comment?.trim() || null,
          device_info: deviceInfo,
        });

      if (error) throw error;

      toast.success("Merci pour votre feedback!", {
        description: "Votre avis nous aide à améliorer cette fonctionnalité.",
      });

      return true;
    } catch (error) {
      console.error("Error submitting beta feedback:", error);
      toast.error("Erreur lors de l'envoi du feedback");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitFeedback, isSubmitting };
}

// Hook for admin to fetch all feedback
export function useAdminBetaFeedback() {
  const [data, setData] = useState<{
    feedback: Array<{
      id: string;
      feature_key: string;
      rating: number;
      comment: string | null;
      created_at: string;
      user_id: string;
      shop_name?: string;
    }>;
    stats: Record<string, { avgRating: number; count: number }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFeedback = async () => {
    setIsLoading(true);
    try {
      // Fetch all feedback (admin only via RLS)
      const { data: feedbackData, error } = await supabase
        .from("beta_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get user profiles for shop names
      const userIds = [...new Set(feedbackData?.map(f => f.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, shop_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.shop_name]) || []);

      // Enrich feedback with shop names
      const enrichedFeedback = (feedbackData || []).map(f => ({
        ...f,
        shop_name: profileMap.get(f.user_id) || undefined,
      }));

      // Calculate stats per feature
      const stats: Record<string, { avgRating: number; count: number }> = {};
      for (const f of enrichedFeedback) {
        if (!stats[f.feature_key]) {
          stats[f.feature_key] = { avgRating: 0, count: 0 };
        }
        stats[f.feature_key].count++;
        stats[f.feature_key].avgRating += f.rating;
      }
      
      // Convert sums to averages
      for (const key of Object.keys(stats)) {
        stats[key].avgRating = stats[key].avgRating / stats[key].count;
      }

      setData({ feedback: enrichedFeedback, stats });
    } catch (error) {
      console.error("Error fetching beta feedback:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, refetch: fetchFeedback };
}
