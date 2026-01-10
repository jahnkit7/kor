import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type RoadmapStatus = "backlog" | "in_progress" | "testing" | "completed" | "cancelled";
export type RoadmapPriority = "low" | "medium" | "high" | "urgent";
export type RoadmapCategory = "feature" | "bug" | "improvement" | "security" | "performance";

export interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  status: RoadmapStatus;
  priority: RoadmapPriority;
  category: RoadmapCategory;
  target_version: string | null;
  estimated_effort: string | null;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export function useRoadmapItems() {
  return useQuery({
    queryKey: ["roadmap-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_items")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as RoadmapItem[];
    },
  });
}

export function useCreateRoadmapItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<RoadmapItem, "id" | "created_at" | "updated_at" | "completed_at">) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("roadmap_items")
        .insert({
          ...item,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-items"] });
      toast.success("Item ajouté à la roadmap");
    },
    onError: (error) => {
      console.error("Error creating roadmap item:", error);
      toast.error("Erreur lors de l'ajout");
    },
  });
}

export function useUpdateRoadmapItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RoadmapItem> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...updates };
      
      // Set completed_at when status changes to completed
      if (updates.status === "completed") {
        updateData.completed_at = new Date().toISOString();
      } else if (updates.status) {
        updateData.completed_at = null;
      }

      const { data, error } = await supabase
        .from("roadmap_items")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-items"] });
    },
    onError: (error) => {
      console.error("Error updating roadmap item:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });
}

export function useDeleteRoadmapItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("roadmap_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-items"] });
      toast.success("Item supprimé");
    },
    onError: (error) => {
      console.error("Error deleting roadmap item:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
}
