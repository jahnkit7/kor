import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminCountries, useAdminRegions } from "@/hooks/use-admin-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Globe, MapPin } from "lucide-react";

export default function AdminGeography() {
  const { data: countries, isLoading } = useAdminCountries();
  const { data: regions } = useAdminRegions();
  const queryClient = useQueryClient();

  const toggleCountry = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("countries")
        .update({ is_active: !currentStatus })
        .eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-countries"] });
      toast.success(currentStatus ? "Pays désactivé" : "Pays activé");
    } catch (error) {
      toast.error("Erreur");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Géographie</h1>
          <p className="text-muted-foreground">Gérez les pays et régions disponibles</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <CardSkeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {countries?.map((country) => (
              <Card key={country.id} className={!country.is_active ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{country.name}</p>
                        <p className="text-xs text-muted-foreground">{country.phone_prefix}</p>
                      </div>
                    </div>
                    <Switch
                      checked={country.is_active}
                      onCheckedChange={() => toggleCountry(country.id, country.is_active)}
                    />
                  </div>
                  <Badge variant={country.is_active ? "default" : "secondary"}>
                    {country.is_active ? "Actif" : "Inactif"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
