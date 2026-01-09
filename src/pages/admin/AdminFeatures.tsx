import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminFeatureFlags } from "@/hooks/use-admin-stats";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ToggleLeft } from "lucide-react";

export default function AdminFeatures() {
  const { data: features, isLoading } = useAdminFeatureFlags();
  const queryClient = useQueryClient();

  const toggleFeature = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("feature_flags")
        .update({ is_globally_enabled: !currentStatus })
        .eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-feature-flags"] });
      toast.success(currentStatus ? "Feature désactivée" : "Feature activée");
    } catch (error) {
      toast.error("Erreur");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fonctionnalités</h1>
          <p className="text-muted-foreground">Activez/désactivez les features à distance</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {features?.map((feature) => (
              <Card key={feature.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ToggleLeft className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{feature.name}</p>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                      {feature.min_plan_required && (
                        <Badge variant="outline" className="mt-1">
                          Min: {feature.min_plan_required}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={feature.is_globally_enabled}
                    onCheckedChange={() => toggleFeature(feature.id, feature.is_globally_enabled)}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
