import { useState } from "react";
// AdminLayout is now provided by AdminProtectedLayout
import { useAdminPlans, useAdminFeatureFlags } from "@/hooks/use-admin-stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Plus, 
  Edit, 
  Check, 
  Clock, 
  Users, 
  Zap, 
  Link,
  ShoppingCart,
  Package,
  CreditCard,
  BarChart3,
  Globe,
  Mic,
  Brain,
  UserCog,
  QrCode
} from "lucide-react";
import { PrepaidCodesTab } from "@/components/admin/PrepaidCodesTab";

const featureIcons: Record<string, React.ReactNode> = {
  sales: <ShoppingCart className="w-4 h-4" />,
  stock: <Package className="w-4 h-4" />,
  clients: <Users className="w-4 h-4" />,
  debts: <CreditCard className="w-4 h-4" />,
  reports: <BarChart3 className="w-4 h-4" />,
  network: <Globe className="w-4 h-4" />,
  voice_input: <Mic className="w-4 h-4" />,
  ai_analysis: <Brain className="w-4 h-4" />,
  employees: <UserCog className="w-4 h-4" />,
};

interface FeatureFlag {
  id: string;
  feature_key: string;
  name: string;
  depends_on: string[] | null;
}

interface PlanFormData {
  name: string;
  description: string;
  price: number;
  duration_days: number;
  max_clients: number | null;
  max_sales_per_day: number | null;
  features: string[];
  commission_reduction: number;
}

const defaultFormData: PlanFormData = {
  name: "",
  description: "",
  price: 0,
  duration_days: 30,
  max_clients: null,
  max_sales_per_day: null,
  features: [],
  commission_reduction: 0,
};

export default function AdminSubscriptions() {
  const { data: plans, isLoading } = useAdminPlans();
  const { data: features } = useAdminFeatureFlags();
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);

  const typedFeatures = features as FeatureFlag[] | undefined;

  const formatCFA = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " F CFA";
  };

  const getDurationLabel = (days: number) => {
    if (days === 1) return "1 jour";
    if (days === 7) return "7 jours";
    if (days === 30) return "30 jours";
    if (days === 365) return "1 an";
    return `${days} jours`;
  };

  const togglePlanStatus = async (planId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("subscription_plans")
        .update({ is_active: !currentStatus })
        .eq("id", planId);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast.success(currentStatus ? "Plan désactivé" : "Plan activé");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const openNewPlanDialog = () => {
    setEditingPlan(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      price: plan.price,
      duration_days: plan.duration_days,
      max_clients: plan.max_clients,
      max_sales_per_day: plan.max_sales_per_day,
      features: (plan.features as string[]) || [],
      commission_reduction: plan.commission_reduction || 0,
    });
    setDialogOpen(true);
  };

  const toggleFeatureInForm = (featureKey: string) => {
    const feature = typedFeatures?.find(f => f.feature_key === featureKey);
    
    if (formData.features.includes(featureKey)) {
      // Removing feature - also remove features that depend on it
      const featuresToRemove = [featureKey];
      const findDependents = (key: string) => {
        typedFeatures?.forEach(f => {
          if (f.depends_on?.includes(key) && !featuresToRemove.includes(f.feature_key)) {
            featuresToRemove.push(f.feature_key);
            findDependents(f.feature_key);
          }
        });
      };
      findDependents(featureKey);
      
      setFormData(prev => ({
        ...prev,
        features: prev.features.filter(f => !featuresToRemove.includes(f)),
      }));
    } else {
      // Adding feature - also add required dependencies
      const featuresToAdd = [featureKey];
      if (feature?.depends_on) {
        feature.depends_on.forEach(dep => {
          if (!formData.features.includes(dep)) {
            featuresToAdd.push(dep);
          }
        });
      }
      
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, ...featuresToAdd],
      }));
    }
  };

  const savePlan = async () => {
    if (!formData.name.trim()) {
      toast.error("Le nom du plan est requis");
      return;
    }

    setSaving(true);
    try {
      const planData = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        duration_days: formData.duration_days,
        max_clients: formData.max_clients,
        max_sales_per_day: formData.max_sales_per_day,
        features: formData.features,
        currency: "XOF",
        commission_reduction: formData.commission_reduction,
      };

      if (editingPlan) {
        const { error } = await supabase
          .from("subscription_plans")
          .update(planData)
          .eq("id", editingPlan.id);
        if (error) throw error;
        toast.success("Plan modifié avec succès");
      } else {
        const { error } = await supabase
          .from("subscription_plans")
          .insert({ ...planData, sort_order: (plans?.length || 0) + 1 });
        if (error) throw error;
        toast.success("Plan créé avec succès");
      }

      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      setDialogOpen(false);
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const getFeatureDependencyInfo = (feature: FeatureFlag) => {
    if (!feature.depends_on || feature.depends_on.length === 0) return null;
    const depNames = feature.depends_on
      .map(k => typedFeatures?.find(f => f.feature_key === k)?.name)
      .filter(Boolean);
    return depNames.length > 0 ? `Requiert: ${depNames.join(", ")}` : null;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="plans" className="flex-1">
            <CreditCard className="w-4 h-4 mr-2" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="codes" className="flex-1">
            <QrCode className="w-4 h-4 mr-2" />
            Codes Prépayés
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-6 mt-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Plans d'abonnement</h1>
              <p className="text-muted-foreground">
                Gérez les plans et leurs fonctionnalités
              </p>
            </div>
            <Button onClick={openNewPlanDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau plan
            </Button>
          </div>

        {/* Dialog Create/Edit */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? "Modifier le plan" : "Créer un plan"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom du plan</Label>
                  <Input 
                    placeholder="Ex: Premium" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prix (CFA)</Label>
                  <Input 
                    type="number" 
                    placeholder="5000"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  placeholder="Description du plan..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Durée (jours)</Label>
                  <Input 
                    type="number" 
                    placeholder="30"
                    value={formData.duration_days}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_days: parseInt(e.target.value) || 30 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Réduction commission (%)</Label>
                  <Input 
                    type="number" 
                    placeholder="0"
                    min={0}
                    max={100}
                    value={formData.commission_reduction}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      commission_reduction: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    0 = commission normale, 100 = pas de commission
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max clients</Label>
                  <Input 
                    type="number" 
                    placeholder="Illimité"
                    value={formData.max_clients || ""}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      max_clients: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max ventes/jour</Label>
                  <Input 
                    type="number" 
                    placeholder="Illimité"
                    value={formData.max_sales_per_day || ""}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      max_sales_per_day: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                  />
                </div>
              </div>

              {/* Features Selector */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  Fonctionnalités incluses
                </Label>
                <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-xl border">
                  {typedFeatures?.map((feature) => {
                    const isChecked = formData.features.includes(feature.feature_key);
                    const depInfo = getFeatureDependencyInfo(feature);
                    
                    return (
                      <div 
                        key={feature.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                          isChecked 
                            ? "bg-primary/10 border-primary/30" 
                            : "bg-background border-border hover:border-primary/20"
                        }`}
                        onClick={() => toggleFeatureInForm(feature.feature_key)}
                      >
                        <Checkbox 
                          checked={isChecked}
                          onCheckedChange={() => toggleFeatureInForm(feature.feature_key)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {featureIcons[feature.feature_key]}
                            </span>
                            <span className="font-medium text-sm">{feature.name}</span>
                          </div>
                          {depInfo && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Link className="w-3 h-3" />
                              <span>{depInfo}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sélectionner une feature ajoutera automatiquement ses dépendances.
                </p>
              </div>

              <Button 
                className="w-full" 
                onClick={savePlan}
                disabled={saving}
              >
                {saving ? "Enregistrement..." : (editingPlan ? "Enregistrer les modifications" : "Créer le plan")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans?.map((plan) => (
              <Card 
                key={plan.id}
                className={`relative overflow-hidden rounded-2xl ${!plan.is_active ? "opacity-60" : ""}`}
              >
                {plan.name.includes("Annuel") && (
                  <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                    Populaire
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <Switch
                      checked={plan.is_active}
                      onCheckedChange={() => togglePlanStatus(plan.id, plan.is_active)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Price */}
                  <div>
                    <span className="text-2xl font-bold">{formatCFA(plan.price)}</span>
                    <span className="text-muted-foreground text-sm ml-1">
                      / {getDurationLabel(plan.duration_days)}
                    </span>
                  </div>

                  {/* Features */}
                  <div className="space-y-1.5">
                    {(plan.features as string[])?.slice(0, 5).map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="w-3.5 h-3.5 text-primary" />
                        <span className="capitalize">{feature.replace("_", " ")}</span>
                      </div>
                    ))}
                    {(plan.features as string[])?.length > 5 && (
                      <div className="text-xs text-muted-foreground pl-5">
                        +{(plan.features as string[]).length - 5} autres
                      </div>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="pt-2 border-t border-border space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      {plan.max_clients ? `Max ${plan.max_clients} clients` : "Clients illimités"}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {plan.max_sales_per_day ? `Max ${plan.max_sales_per_day} ventes/jour` : "Ventes illimitées"}
                    </div>
                    {(plan as any).commission_reduction > 0 && (
                      <div className="flex items-center gap-2 text-xs text-primary font-medium">
                        <Zap className="w-3 h-3" />
                        -{(plan as any).commission_reduction}% commission
                      </div>
                    )}
                  </div>

                  {/* Edit Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => openEditDialog(plan)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </TabsContent>

        <TabsContent value="codes" className="mt-6">
          <PrepaidCodesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
