import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Crown,
  Calendar,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Check,
  Zap,
  Star,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUserSubscription } from "@/hooks/use-feature-access";
import { PaymentMethodDialog } from "@/components/payment/PaymentMethodDialog";
import { formatDistanceToNow, format, isPast, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

// Plans statiques
const plans = [
  {
    id: "gratuit",
    name: "Gratuit",
    price: 0,
    duration_days: 365,
    description: "Pour démarrer",
    icon: Zap,
    features: ["Gestion des ventes", "Suivi du stock", "Gestion des clients", "Suivi des dettes"],
    color: "secondary",
  },
  {
    id: "starter",
    name: "Starter",
    price: 5000,
    duration_days: 30,
    description: "Pour les petites boutiques",
    icon: Star,
    features: ["Tout du plan Gratuit", "Rapports détaillés", "Gestion des employés", "Entrée vocale"],
    color: "primary",
  },
  {
    id: "premium",
    name: "Premium",
    price: 10000,
    duration_days: 30,
    description: "Fonctionnalités avancées",
    icon: Crown,
    features: ["Tout du plan Starter", "Réseau de marchands", "Analytics avancés", "Support prioritaire"],
    color: "accent",
  },
];

export function SubscriptionManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: subscription, isLoading, refetch } = useUserSubscription();
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null);
  const [processing, setProcessing] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Aucun abonnement</p>
              <p className="text-sm text-muted-foreground">
                Choisissez un plan pour continuer
              </p>
            </div>
            <Button size="sm" onClick={() => navigate("/subscriptions")}>
              Voir les plans
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const endDate = new Date(subscription.trial_ends_at);
  const startDate = new Date(subscription.trial_started_at);
  const isExpired = isPast(endDate);
  const daysLeft = differenceInDays(endDate, new Date());
  const totalDays = differenceInDays(endDate, startDate);
  const daysUsed = totalDays - daysLeft;
  const progressPercent = Math.max(0, Math.min(100, (daysUsed / totalDays) * 100));
  const isExpiringSoon = daysLeft <= 3 && daysLeft > 0;

  const currentPlanData = plans.find((p) => p.id === subscription.plan?.toLowerCase());

  const getPlanColor = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case "premium":
        return "from-purple-500 to-indigo-600";
      case "starter":
        return "from-blue-500 to-cyan-600";
      default:
        return "from-green-500 to-emerald-600";
    }
  };

  const handleSelectPlan = (plan: typeof plans[0]) => {
    if (plan.id === subscription.plan?.toLowerCase()) return;
    
    setSelectedPlan(plan);
    setChangePlanOpen(false);
    
    // If free plan, subscribe directly
    if (plan.price === 0) {
      handleFreeSubscription(plan);
    } else {
      setPaymentOpen(true);
    }
  };

  const handleFreeSubscription = async (plan: typeof plans[0]) => {
    if (!user) return;
    setProcessing(true);

    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.duration_days);

      const { error } = await supabase.from("subscriptions").upsert(
        {
          user_id: user.id,
          plan: plan.id,
          is_active: true,
          trial_started_at: new Date().toISOString(),
          trial_ends_at: endDate.toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;

      toast.success(`Plan ${plan.name} activé !`);
      refetch();
    } catch (error) {
      toast.error("Erreur lors du changement de plan");
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!user || !selectedPlan) return;

    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + selectedPlan.duration_days);

      const { error } = await supabase.from("subscriptions").upsert(
        {
          user_id: user.id,
          plan: selectedPlan.id,
          is_active: true,
          trial_started_at: new Date().toISOString(),
          trial_ends_at: endDate.toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;

      toast.success(`Plan ${selectedPlan.name} activé !`);
      setPaymentOpen(false);
      refetch();
    } catch (error) {
      toast.error("Erreur lors de l'activation");
    }
  };

  return (
    <>
      <Card className={isExpired ? "border-destructive/50" : isExpiringSoon ? "border-amber-500/50" : ""}>
        <CardContent className="p-4 space-y-4">
          {/* Header with plan info */}
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getPlanColor(subscription.plan)} flex items-center justify-center`}
            >
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground capitalize">
                  Plan {subscription.plan}
                </p>
                {isExpired ? (
                  <Badge variant="destructive" className="text-xs">
                    Expiré
                  </Badge>
                ) : isExpiringSoon ? (
                  <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                    Expire bientôt
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Actif
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {isExpired ? (
                  <span>Expiré le {format(endDate, "d MMM yyyy", { locale: fr })}</span>
                ) : (
                  <span>
                    Expire {formatDistanceToNow(endDate, { locale: fr, addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {!isExpired && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{daysLeft} jours restants</span>
                <span>{Math.round(progressPercent)}% utilisé</span>
              </div>
              <Progress
                value={progressPercent}
                className={`h-2 ${isExpiringSoon ? "[&>div]:bg-amber-500" : ""}`}
              />
            </div>
          )}

          {/* Features */}
          {currentPlanData && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Fonctionnalités incluses
              </p>
              <div className="grid grid-cols-2 gap-1">
                {currentPlanData.features.slice(0, 4).map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-xs">
                    <Check className="w-3 h-3 text-primary" />
                    <span className="truncate">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setChangePlanOpen(true)}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Changer de plan
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
            {(isExpired || isExpiringSoon) && (
              <Button onClick={() => setChangePlanOpen(true)}>
                Renouveler
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Change Plan Dialog */}
      <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Changer de plan</DialogTitle>
            <DialogDescription>
              Sélectionnez le plan qui correspond à vos besoins
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isCurrent = plan.id === subscription.plan?.toLowerCase();

              return (
                <Card
                  key={plan.id}
                  className={`p-4 cursor-pointer transition-all hover:border-primary ${
                    isCurrent ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => handleSelectPlan(plan)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        plan.color === "accent"
                          ? "bg-accent/10 text-accent"
                          : plan.color === "primary"
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{plan.name}</p>
                        {isCurrent && (
                          <Badge variant="secondary" className="text-xs">
                            Actuel
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {plan.price === 0 ? "Gratuit" : `${plan.price.toLocaleString()} CFA`}
                      </p>
                      {plan.price > 0 && (
                        <p className="text-xs text-muted-foreground">/mois</p>
                      )}
                    </div>
                    {!isCurrent && <ArrowRight className="w-5 h-5 text-muted-foreground" />}
                  </div>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      {selectedPlan && (
        <PaymentMethodDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          planName={selectedPlan.name}
          price={selectedPlan.price}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
