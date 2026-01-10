import { useState, useCallback, useEffect } from "react";
import { useAuth } from "./use-auth";
import { useNetworkStatus } from "./use-network-status";
import { supabase } from "@/integrations/supabase/client";
import * as localDB from "@/lib/db";

export interface TranscriptionCorrection {
  id: string;
  user_id: string;
  original_text: string;
  corrected_text: string;
  correction_type: "client_name" | "product_name" | "general";
  usage_count: number;
  created_at: string;
  updated_at: string;
  synced?: boolean;
}

interface TranscriptionLearningState {
  corrections: TranscriptionCorrection[];
  loading: boolean;
  saveCorrection: (
    original: string,
    corrected: string,
    type: "client_name" | "product_name" | "general"
  ) => Promise<void>;
  applyCorrections: (text: string) => string;
  getClientNameCorrections: () => TranscriptionCorrection[];
  getProductNameCorrections: () => TranscriptionCorrection[];
}

// IndexedDB store key for corrections
const CORRECTIONS_STORE_KEY = "transcription_corrections_local";

// Get corrections from localStorage (simple offline storage)
function getLocalCorrections(): TranscriptionCorrection[] {
  try {
    const stored = localStorage.getItem(CORRECTIONS_STORE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save corrections to localStorage
function saveLocalCorrections(corrections: TranscriptionCorrection[]): void {
  try {
    localStorage.setItem(CORRECTIONS_STORE_KEY, JSON.stringify(corrections));
  } catch (e) {
    console.error("Error saving corrections to localStorage:", e);
  }
}

export function useTranscriptionLearning(): TranscriptionLearningState {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [corrections, setCorrections] = useState<TranscriptionCorrection[]>([]);
  const [loading, setLoading] = useState(true);

  // Load corrections on mount
  useEffect(() => {
    const loadCorrections = async () => {
      try {
        // Load from localStorage first
        const localCorrections = getLocalCorrections();
        setCorrections(localCorrections);

        // If online, sync with cloud
        if (isOnline && user) {
          const { data, error } = await supabase
            .from("transcription_corrections")
            .select("*")
            .eq("user_id", user.id)
            .order("usage_count", { ascending: false });

          if (!error && data) {
            const cloudCorrections: TranscriptionCorrection[] = data.map((c) => ({
              id: c.id,
              user_id: c.user_id,
              original_text: c.original_text,
              corrected_text: c.corrected_text,
              correction_type: c.correction_type as "client_name" | "product_name" | "general",
              usage_count: c.usage_count,
              created_at: c.created_at,
              updated_at: c.updated_at,
              synced: true,
            }));

            // Merge local unsynced with cloud
            const unsyncedLocal = localCorrections.filter(
              (lc) => !lc.synced && !cloudCorrections.some((cc) => cc.id === lc.id)
            );
            
            const merged = [...unsyncedLocal, ...cloudCorrections];
            setCorrections(merged);
            saveLocalCorrections(merged);

            // Sync unsynced local corrections to cloud
            for (const local of unsyncedLocal) {
              await supabase.from("transcription_corrections").upsert({
                id: local.id,
                user_id: user.id,
                original_text: local.original_text,
                corrected_text: local.corrected_text,
                correction_type: local.correction_type,
                usage_count: local.usage_count,
              });
            }
          }
        }
      } catch (error) {
        console.error("Error loading corrections:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCorrections();
  }, [user, isOnline]);

  const saveCorrection = useCallback(
    async (
      original: string,
      corrected: string,
      type: "client_name" | "product_name" | "general"
    ): Promise<void> => {
      if (!user) return;

      const normalizedOriginal = original.toLowerCase().trim();
      const normalizedCorrected = corrected.trim();

      // Skip if same after normalization or too short
      if (
        normalizedOriginal === normalizedCorrected.toLowerCase() ||
        normalizedOriginal.length < 2
      ) {
        return;
      }

      // Check if correction already exists
      const existing = corrections.find(
        (c) =>
          c.original_text.toLowerCase() === normalizedOriginal &&
          c.correction_type === type
      );

      const now = new Date().toISOString();

      if (existing) {
        // Update usage count
        const updated: TranscriptionCorrection = {
          ...existing,
          corrected_text: normalizedCorrected,
          usage_count: existing.usage_count + 1,
          updated_at: now,
          synced: false,
        };

        const newCorrections = corrections.map((c) =>
          c.id === existing.id ? updated : c
        );
        setCorrections(newCorrections);
        saveLocalCorrections(newCorrections);

        // Sync to cloud if online
        if (isOnline) {
          await supabase
            .from("transcription_corrections")
            .update({
              corrected_text: normalizedCorrected,
              usage_count: updated.usage_count,
              updated_at: now,
            })
            .eq("id", existing.id);
        }
      } else {
        // Create new correction
        const newCorrection: TranscriptionCorrection = {
          id: crypto.randomUUID(),
          user_id: user.id,
          original_text: normalizedOriginal,
          corrected_text: normalizedCorrected,
          correction_type: type,
          usage_count: 1,
          created_at: now,
          updated_at: now,
          synced: false,
        };

        const newCorrections = [newCorrection, ...corrections];
        setCorrections(newCorrections);
        saveLocalCorrections(newCorrections);

        // Sync to cloud if online
        if (isOnline) {
          await supabase.from("transcription_corrections").insert({
            id: newCorrection.id,
            user_id: user.id,
            original_text: newCorrection.original_text,
            corrected_text: newCorrection.corrected_text,
            correction_type: newCorrection.correction_type,
            usage_count: newCorrection.usage_count,
          });
        }
      }
    },
    [user, isOnline, corrections]
  );

  const applyCorrections = useCallback(
    (text: string): string => {
      if (!text || corrections.length === 0) return text;

      let result = text;

      // Sort by usage count (most used first) and by length (longer matches first)
      const sortedCorrections = [...corrections].sort((a, b) => {
        const usageDiff = b.usage_count - a.usage_count;
        if (usageDiff !== 0) return usageDiff;
        return b.original_text.length - a.original_text.length;
      });

      for (const correction of sortedCorrections) {
        // Case-insensitive replacement with word boundaries
        const escapedOriginal = correction.original_text.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );
        const regex = new RegExp(`\\b${escapedOriginal}\\b`, "gi");
        result = result.replace(regex, correction.corrected_text);
      }

      return result;
    },
    [corrections]
  );

  const getClientNameCorrections = useCallback((): TranscriptionCorrection[] => {
    return corrections.filter((c) => c.correction_type === "client_name");
  }, [corrections]);

  const getProductNameCorrections = useCallback((): TranscriptionCorrection[] => {
    return corrections.filter((c) => c.correction_type === "product_name");
  }, [corrections]);

  return {
    corrections,
    loading,
    saveCorrection,
    applyCorrections,
    getClientNameCorrections,
    getProductNameCorrections,
  };
}
