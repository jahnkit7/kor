import { useState, useMemo } from "react";
// AdminLayout is now provided by AdminProtectedLayout
import { useAdminFeatureFlags } from "@/hooks/use-admin-stats";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FeatureDependencyGraph } from "@/components/admin/FeatureDependencyGraph";
import { DraggableFeatureCard } from "@/components/admin/DraggableFeatureCard";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { 
  Link,
  Grid3X3,
  GitBranch,
  Star,
  Sparkles
} from "lucide-react";

interface FeatureFlag {
  id: string;
  feature_key: string;
  name: string;
  description: string | null;
  is_globally_enabled: boolean;
  is_beta: boolean;
  min_plan_required: string | null;
  depends_on: string[] | null;
  enabled_for_users: string[] | null;
  disabled_countries: string[] | null;
  category?: string | null;
  sort_order?: number | null;
}

export default function AdminFeatures() {
  const { data: features, isLoading } = useAdminFeatureFlags();
  const queryClient = useQueryClient();
  const [togglingFeatures, setTogglingFeatures] = useState<Set<string>>(new Set());
  const [betaTogglingFeatures, setBetaTogglingFeatures] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const typedFeatures = features as FeatureFlag[] | undefined;

  // Séparer les features par catégorie
  const { primaryFeatures, secondaryFeatures } = useMemo(() => {
    if (!typedFeatures) return { primaryFeatures: [], secondaryFeatures: [] };
    
    const primary = typedFeatures
      .filter(f => f.category === 'primary')
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    
    const secondary = typedFeatures
      .filter(f => f.category !== 'primary')
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    
    return { primaryFeatures: primary, secondaryFeatures: secondary };
  }, [typedFeatures]);

  const getFeatureByKey = (key: string) => {
    return typedFeatures?.find(f => f.feature_key === key);
  };

  const getDependentFeatures = (featureKey: string): FeatureFlag[] => {
    return (typedFeatures || []).filter(f => 
      f.depends_on?.includes(featureKey)
    );
  };

  const toggleFeatureWithCascade = async (feature: FeatureFlag) => {
    const newStatus = !feature.is_globally_enabled;
    const featuresToUpdate: string[] = [feature.id];
    
    if (!newStatus) {
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

  const toggleBeta = async (feature: FeatureFlag) => {
    const newStatus = !feature.is_beta;
    const wasInBeta = feature.is_beta;
    setBetaTogglingFeatures(prev => new Set([...prev, feature.id]));

    try {
      const { error } = await supabase
        .from("feature_flags")
        .update({ is_beta: newStatus })
        .eq("id", feature.id);

      if (error) throw error;
      
      // Si la feature passe de Bêta à Stable, envoyer des notifications aux utilisateurs
      if (wasInBeta && !newStatus) {
        await sendBetaToStableNotifications(feature);
      }
      
      queryClient.invalidateQueries({ queryKey: ["admin-feature-flags"] });
      queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
      
      if (wasInBeta && !newStatus) {
        toast.success(`"${feature.name}" est maintenant stable ! Notifications envoyées.`);
      } else {
        toast.success(newStatus ? "Feature marquée comme Bêta" : "Mode Bêta retiré");
      }
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setBetaTogglingFeatures(new Set());
    }
  };

  const sendBetaToStableNotifications = async (feature: FeatureFlag) => {
    try {
      // Récupérer tous les utilisateurs qui ont utilisé cette feature
      const { data: usageData } = await supabase
        .from("feature_usage")
        .select("user_id")
        .eq("feature_key", feature.feature_key);

      if (!usageData || usageData.length === 0) return;

      // Extraire les user_ids uniques
      const uniqueUserIds = [...new Set(usageData.map(u => u.user_id))];

      // Envoyer une notification à chaque utilisateur
      const notifications = uniqueUserIds.map(userId => ({
        user_id: userId,
        title: "🎉 Fonctionnalité stable !",
        message: `"${feature.name}" n'est plus en Bêta et est maintenant stable.`,
        type: "feature_update",
        action_url: null,
      }));

      // Insérer toutes les notifications
      const { error } = await supabase
        .from("notifications")
        .insert(notifications);

      if (error) {
        console.error("Erreur envoi notifications:", error);
      }
    } catch (error) {
      console.error("Erreur envoi notifications Bêta → Stable:", error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over || active.id === over.id) return;

    const activeFeature = typedFeatures?.find(f => f.id === active.id);
    const overFeature = typedFeatures?.find(f => f.id === over.id);
    
    if (!activeFeature || !overFeature) return;

    // Déterminer la nouvelle catégorie
    const newCategory = overFeature.category || 'secondary';
    const categoryChanged = activeFeature.category !== newCategory;
    
    // Récupérer les features de la catégorie cible
    const targetFeatures = newCategory === 'primary' ? [...primaryFeatures] : [...secondaryFeatures];
    
    // Si la catégorie change, retirer de l'ancienne liste
    if (categoryChanged) {
      const sourceFeatures = activeFeature.category === 'primary' ? primaryFeatures : secondaryFeatures;
      const filteredSource = sourceFeatures.filter(f => f.id !== active.id);
      
      // Mettre à jour les sort_order de la liste source
      const sourceUpdates = filteredSource.map((f, index) => ({
        id: f.id,
        sort_order: index,
        category: f.category,
      }));
      
      // Insérer dans la nouvelle liste à la position de over
      const overIndex = targetFeatures.findIndex(f => f.id === over.id);
      const newList = [...targetFeatures];
      newList.splice(overIndex, 0, { ...activeFeature, category: newCategory });
      
      // Mettre à jour les sort_order de la liste cible
      const targetUpdates = newList.map((f, index) => ({
        id: f.id,
        sort_order: index,
        category: newCategory,
      }));
      
      // Combiner les mises à jour
      const allUpdates = [...sourceUpdates, ...targetUpdates];
      
      // Appliquer les mises à jour
      try {
        for (const update of allUpdates) {
          await supabase
            .from("feature_flags")
            .update({ sort_order: update.sort_order, category: update.category })
            .eq("id", update.id);
        }
        
        queryClient.invalidateQueries({ queryKey: ["admin-feature-flags"] });
        toast.success("Ordre mis à jour");
      } catch (error) {
        console.error("Error updating order:", error);
        toast.error("Erreur lors de la mise à jour");
      }
    } else {
      // Même catégorie, juste réordonner
      const oldIndex = targetFeatures.findIndex(f => f.id === active.id);
      const newIndex = targetFeatures.findIndex(f => f.id === over.id);
      
      if (oldIndex === -1 || newIndex === -1) return;
      
      const reorderedList = arrayMove(targetFeatures, oldIndex, newIndex);
      
      try {
        for (let i = 0; i < reorderedList.length; i++) {
          await supabase
            .from("feature_flags")
            .update({ sort_order: i })
            .eq("id", reorderedList[i].id);
        }
        
        queryClient.invalidateQueries({ queryKey: ["admin-feature-flags"] });
        toast.success("Ordre mis à jour");
      } catch (error) {
        console.error("Error updating order:", error);
        toast.error("Erreur lors de la mise à jour");
      }
    }
  };

  const renderFeatureCard = (feature: FeatureFlag) => {
    const dependents = getDependentFeatures(feature.feature_key);
    const isToggling = togglingFeatures.has(feature.id);
    const isBetaToggling = betaTogglingFeatures.has(feature.id);
    const dependenciesNames = feature.depends_on?.map(k => getFeatureByKey(k)?.name) || [];
    
    return (
      <DraggableFeatureCard
        key={feature.id}
        feature={feature}
        dependentsCount={dependents.length}
        dependenciesNames={dependenciesNames}
        isToggling={isToggling}
        onToggle={() => toggleFeatureWithCascade(feature)}
        onToggleBeta={() => toggleBeta(feature)}
        isBetaToggling={isBetaToggling}
      />
    );
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fonctionnalités</h1>
          <p className="text-muted-foreground">
            Activez/désactivez les features avec gestion des dépendances. Glissez-déposez pour réorganiser.
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
          <Link className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Système de dépendances et catégories
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Désactiver une feature parent désactivera automatiquement ses dépendances. 
              Glissez les features entre catégories (Primaires/Secondaires) pour les réorganiser.
            </p>
          </div>
        </div>

        {/* Tabs for Grid/Graph views */}
        <Tabs defaultValue="grid" className="space-y-4">
          <TabsList>
            <TabsTrigger value="grid" className="gap-2">
              <Grid3X3 className="w-4 h-4" />
              Catégories
            </TabsTrigger>
            <TabsTrigger value="graph" className="gap-2">
              <GitBranch className="w-4 h-4" />
              Graphe
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grid">
            {isLoading ? (
              <div className="space-y-8">
                <div>
                  <Skeleton className="h-6 w-40 mb-4" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-48 rounded-2xl" />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="space-y-8">
                  {/* Features Primaires */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="w-5 h-5 text-amber-500" />
                      <h2 className="text-lg font-semibold text-foreground">
                        Features Primaires
                      </h2>
                      <span className="text-sm text-muted-foreground">
                        (Obligatoires pour l'appli)
                      </span>
                    </div>
                    <SortableContext
                      items={primaryFeatures.map(f => f.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {primaryFeatures.map(renderFeatureCard)}
                      </div>
                    </SortableContext>
                    {primaryFeatures.length === 0 && (
                      <div className="border-2 border-dashed border-muted rounded-2xl p-8 text-center text-muted-foreground">
                        Glissez des features ici pour les marquer comme primaires
                      </div>
                    )}
                  </div>

                  {/* Features Secondaires */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-violet-500" />
                      <h2 className="text-lg font-semibold text-foreground">
                        Features Secondaires
                      </h2>
                      <span className="text-sm text-muted-foreground">
                        (Valeur ajoutée)
                      </span>
                    </div>
                    <SortableContext
                      items={secondaryFeatures.map(f => f.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {secondaryFeatures.map(renderFeatureCard)}
                      </div>
                    </SortableContext>
                    {secondaryFeatures.length === 0 && (
                      <div className="border-2 border-dashed border-muted rounded-2xl p-8 text-center text-muted-foreground">
                        Glissez des features ici pour les marquer comme secondaires
                      </div>
                    )}
                  </div>
                </div>
              </DndContext>
            )}
          </TabsContent>

          <TabsContent value="graph">
            {isLoading ? (
              <Skeleton className="h-[500px] rounded-2xl" />
            ) : (
              <FeatureDependencyGraph 
                features={typedFeatures || []}
                onToggle={toggleFeatureWithCascade}
                togglingFeatures={togglingFeatures}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
  );
}
