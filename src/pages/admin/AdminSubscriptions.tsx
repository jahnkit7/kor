import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminPlans } from "@/hooks/use-admin-stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Edit, Check, Clock, Users, Zap } from "lucide-react";

export default function AdminSubscriptions() {
  const { data: plans, isLoading } = useAdminPlans();
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [newPlanOpen, setNewPlanOpen] = useState(false);

  const formatCFA = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " F CFA";
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

  const getDurationLabel = (days: number) => {
    if (days === 1) return "1 jour";
    if (days === 7) return "7 jours";
    if (days === 30) return "30 jours";
    if (days === 365) return "1 an";
    return `${days} jours`;
  };

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case "sales":
      case "stock":
      case "clients":
      case "debts":
        return <Check className="w-3 h-3" />;
      case "reports":
      case "network":
        return <Zap className="w-3 h-3" />;
      case "ai_analysis":
        return <Zap className="w-3 h-3 text-accent" />;
      default:
        return <Check className="w-3 h-3" />;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Abonnements</h1>
            <p className="text-muted-foreground">
              Gérez les plans d'abonnement
            </p>
          </div>
          <Dialog open={newPlanOpen} onOpenChange={setNewPlanOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un plan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nom du plan</Label>
                  <Input placeholder="Ex: Premium" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Durée (jours)</Label>
                    <Input type="number" placeholder="30" />
                  </div>
                  <div className="space-y-2">
                    <Label>Prix (CFA)</Label>
                    <Input type="number" placeholder="5000" />
                  </div>
                </div>
                <Button className="w-full" onClick={() => setNewPlanOpen(false)}>
                  Créer le plan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

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
                className={`relative overflow-hidden ${!plan.is_active ? "opacity-60" : ""}`}
              >
                {plan.name === "Annuel" && (
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
                    <span className="text-3xl font-bold">{formatCFA(plan.price)}</span>
                    <span className="text-muted-foreground text-sm ml-1">
                      / {getDurationLabel(plan.duration_days)}
                    </span>
                  </div>

                  {/* Features */}
                  <div className="space-y-2">
                    {(plan.features as string[])?.map((feature) => (
                      <div key={feature} className="flex items-center gap-2 text-sm">
                        {getFeatureIcon(feature)}
                        <span className="capitalize">{feature.replace("_", " ")}</span>
                      </div>
                    ))}
                  </div>

                  {/* Limits */}
                  <div className="pt-2 border-t border-border space-y-1">
                    {plan.max_clients && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        Max {plan.max_clients} clients
                      </div>
                    )}
                    {plan.max_sales_per_day && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Max {plan.max_sales_per_day} ventes/jour
                      </div>
                    )}
                  </div>

                  {/* Edit Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setEditingPlan(plan)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
