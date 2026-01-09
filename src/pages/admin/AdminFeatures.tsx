import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminFeatureFlags } from "@/hooks/use-admin-stats";
import { BentoGrid } from "@/components/admin/BentoGrid";
import { BentoCard } from "@/components/admin/BentoCard";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  ToggleLeft, 
  ShoppingCart, 
  Package, 
  Users, 
  CreditCard, 
  BarChart3, 
  Globe, 
  Mic, 
  Brain, 
  UserCog,
  Link,
  AlertTriangle
} from "lucide-react";

const featureIcons: Record<string, React.ReactNode> = {
  sales: <ShoppingCart className="w-5 h-5" />,
  stock: <Package className="w-5 h-5" />,
  clients: <Users className="w-5 h-5" />,
  debts: <CreditCard className="w-5 h-5" />,
  reports: <BarChart3 className="w-5 h-5" />,
  network: <Globe className="w-5 h-5" />,
  voice_input: <Mic className="w-5 h-5" />,
  ai_analysis: <Brain className="w-5 h-5" />,
  employees: <UserCog className="w-5 h-5" />,
};

const planColors: Record<string, string> = {
  starter: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  premium: "bg-violet-500/10 text-violet-600 border-violet-500/20",
};

interface FeatureFlag {
  id: string;
  feature_key: string;
  name: string;
  description: string | null;
  is_globally_enabled: boolean;
  min_plan_required: string | null;
  depends_on: string[] | null;
  enabled_for_users: string[] | null;
  disabled_countries: string[] | null;
}

export default function AdminFeatures() {
  const { data: features, isLoading } = useAdminFeatureFlags();
  const queryClient = useQueryClient();
  const [togglingFeatures, setTogglingFeatures] = useState<Set<string>>(new Set());

  const getFeatureByKey = (key: string) => {
    return (features as FeatureFlag[] | undefined)?.find(f => f.feature_key === key);
  };

  const getDependentFeatures = (featureKey: string): FeatureFlag[] => {
    return ((features as FeatureFlag[] | undefined) || []).filter(f => 
      f.depends_on?.includes(featureKey)
    );
  };

  const toggleFeatureWithCascade = async (feature: FeatureFlag) => {
    const newStatus = !feature.is_globally_enabled;
    
    // Si on désactive, trouver toutes les features dépendantes à désactiver aussi
    const featuresToUpdate: string[] = [feature.id];
    
    if (!newStatus) {
      // Désactivation: cascade vers les dépendances
      const findAllDependents = (key: string): string[] => {
        const dependents = getDependentFeatures(key);
        let allIds = dependents.map(d => d.id);
        dependents.forEach(d => {
          allIds = [...allIds, ...findAllDependents(d.feature_key)];
        });
        return allIds;
      };
      
      const dependentIds = findAllDependents(feature.feature_key);
      featuresToUpdate.push(...dependentIds);
    } else {
      // Activation: vérifier que les dépendances sont activées
      if (feature.depends_on && feature.depends_on.length > 0) {
        for (const depKey of feature.depends_on) {
          const dep = getFeatureByKey(depKey);
          if (dep && !dep.is_globally_enabled) {
            toast.error(`Impossible d'activer: "${dep.name}" doit être activée d'abord`);
            return;
          }
        }
      }
    }

    // Marquer comme en cours de modification
    setTogglingFeatures(prev => new Set([...prev, ...featuresToUpdate]));

    try {
      const { error } = await supabase
        .from("feature_flags")
        .update({ is_globally_enabled: newStatus })
        .in("id", featuresToUpdate);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["admin-feature-flags"] });
      
      if (featuresToUpdate.length > 1) {
        toast.success(
          newStatus 
            ? "Feature activée" 
            : `${featuresToUpdate.length} features désactivées (cascade)`
        );
      } else {
        toast.success(newStatus ? "Feature activée" : "Feature désactivée");
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setTogglingFeatures(new Set());
    }
  };

  const typedFeatures = features as FeatureFlag[] | undefined;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fonctionnalités</h1>
          <p className="text-muted-foreground">
            Activez/désactivez les features avec gestion des dépendances
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
          <Link className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Système de dépendances actif
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Désactiver une feature parent désactivera automatiquement ses dépendances. 
              Par exemple, désactiver "Clients" désactivera aussi "Créances".
            </p>
          </div>
        </div>

        {/* Features Grid */}
        {isLoading ? (
          <BentoGrid columns={3}>
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </BentoGrid>
        ) : (
          <BentoGrid columns={3}>
            {typedFeatures?.map((feature) => {
              const dependents = getDependentFeatures(feature.feature_key);
              const isToggling = togglingFeatures.has(feature.id);
              const dependenciesNames = feature.depends_on?.map(k => getFeatureByKey(k)?.name).filter(Boolean);
              
              return (
                <BentoCard 
                  key={feature.id}
                  className={`transition-all duration-300 ${
                    !feature.is_globally_enabled ? "opacity-50 grayscale" : ""
                  } ${isToggling ? "animate-pulse" : ""}`}
                >
                  <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        feature.is_globally_enabled 
                          ? "bg-primary/10 text-primary" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {featureIcons[feature.feature_key] || <ToggleLeft className="w-5 h-5" />}
                      </div>
                      <Switch
                        checked={feature.is_globally_enabled}
                        onCheckedChange={() => toggleFeatureWithCascade(feature)}
                        disabled={isToggling}
                      />
                    </div>

                    {/* Title & Description */}
                    <h3 className="font-semibold text-foreground">{feature.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 flex-1">
                      {feature.description}
                    </p>

                    {/* Dependencies */}
                    {dependenciesNames && dependenciesNames.length > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Link className="w-3 h-3" />
                        <span>Dépend de: {dependenciesNames.join(", ")}</span>
                      </div>
                    )}

                    {/* Dependents Warning */}
                    {dependents.length > 0 && feature.is_globally_enabled && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-amber-600">
                        <AlertTriangle className="w-3 h-3" />
                        <span>
                          {dependents.length} feature{dependents.length > 1 ? "s" : ""} dépendante{dependents.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}

                    {/* Badges */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {feature.min_plan_required && (
                        <Badge 
                          variant="outline" 
                          className={planColors[feature.min_plan_required] || ""}
                        >
                          Min: {feature.min_plan_required}
                        </Badge>
                      )}
                      {feature.enabled_for_users && feature.enabled_for_users.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          +{feature.enabled_for_users.length} users
                        </Badge>
                      )}
                      {feature.disabled_countries && feature.disabled_countries.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          -{feature.disabled_countries.length} pays
                        </Badge>
                      )}
                    </div>
                  </div>
                </BentoCard>
              );
            })}
          </BentoGrid>
        )}
      </div>
    </AdminLayout>
  );
}
