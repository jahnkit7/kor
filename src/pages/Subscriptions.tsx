import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  Crown, 
  Zap, 
  Star,
  Loader2,
  ArrowRight,
  Sparkles,
  CalendarCheck
} from "lucide-react";
import { useUserSubscription } from "@/hooks/use-feature-access";
import { useSubscriptionPlans } from "@/hooks/use-subscription-plans";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PaymentMethodDialog } from "@/components/payment/PaymentMethodDialog";

// Configuration des icônes et couleurs par plan
const planConfig: Record<string, { icon: any; color: string; popular: boolean }> = {
  gratuit: { icon: Zap, color: "secondary", popular: false },
  starter: { icon: Star, color: "primary", popular: false },
  premium: { icon: Crown, color: "accent", popular: true },
  "annuel premium": { icon: CalendarCheck, color: "accent", popular: false },
};

// Descriptions et features pour affichage
const planDisplayInfo: Record<string, { description: string; displayFeatures: string[] }> = {
  gratuit: {
    description: "Pour démarrer",
    displayFeatures: [
      "Gestion des ventes",
      "Suivi du stock",
      "Gestion des clients",
      "Suivi des dettes",
    ],
  },
  starter: {
    description: "Pour les petites boutiques",
    displayFeatures: [
      "Tout du plan Gratuit",
      "Rapports détaillés",
      "Entrée vocale",
    ],
  },
  premium: {
    description: "Fonctionnalités avancées",
    displayFeatures: [
      "Tout du plan Starter",
      "Réseau de marchands",
      "Analyse IA",
      "Gestion employés",
    ],
  },
  "annuel premium": {
    description: "Premium avec 2 mois offerts",
    displayFeatures: [
      "Toutes les fonctionnalités Premium",
      "1 an d'accès",
      "Économisez 10 000 CFA",
      "Support prioritaire",
    ],
  },
};

interface PlanUI {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  description: string;
  icon: any;
  features: string[];
  color: string;
  popular: boolean;
}

export default function Subscriptions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: currentSubscription, isLoading: subLoading, refetch } = useUserSubscription();
  const { plans: dbPlans, loading: plansLoading } = useSubscriptionPlans();
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanUI | null>(null);
  const [justActivated, setJustActivated] = useState(false);

  // Mapper les plans de la base de données avec la configuration UI
  const plans: PlanUI[] = useMemo(() => {
    return dbPlans.map((dbPlan) => {
      const planKey = dbPlan.name.toLowerCase();
      const config = planConfig[planKey] || { icon: Zap, color: "secondary", popular: false };
      const displayInfo = planDisplayInfo[planKey] || { 
        description: dbPlan.description || "Plan d'abonnement", 
        displayFeatures: dbPlan.features || [] 
      };

      return {
        id: dbPlan.id,
        name: dbPlan.name,
        price: dbPlan.price,
        duration_days: dbPlan.duration_days,
        description: displayInfo.description,
        icon: config.icon,
        features: displayInfo.displayFeatures,
        color: config.color,
        popular: config.popular,
      };
    });
  }, [dbPlans]);

  const handleSelectPlan = (plan: PlanUI) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setSelectedPlan(plan);

    // If free plan, subscribe directly
    if (plan.price === 0) {
      handleFreeSubscribe(plan);
    } else {
      setPaymentOpen(true);
    }
  };

  const handleFreeSubscribe = async (plan: PlanUI) => {
    if (!user) return;
    setSubscribing(plan.name);

    try {
      const startDate = new Date().toISOString();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.duration_days);

      const { error } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: user.id,
          plan: plan.name.toLowerCase(),
          is_active: true,
          trial_started_at: startDate,
          trial_ends_at: endDate.toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (error) throw error;

      toast.success(`Plan ${plan.name} activé pour ${plan.duration_days} jours ! 🎉`);
      setJustActivated(true);
      await refetch();
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Error subscribing:", error);
      toast.error("Erreur lors de l'abonnement");
    } finally {
      setSubscribing(null);
    }
  };

  const handlePaymentSuccess = async () => {
    if (!user || !selectedPlan) return;

    try {
      const startDate = new Date().toISOString();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + selectedPlan.duration_days);

      const { error } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: user.id,
          plan: selectedPlan.name.toLowerCase(),
          is_active: true,
          trial_started_at: startDate,
          trial_ends_at: endDate.toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (error) throw error;

      toast.success(`Plan ${selectedPlan.name} activé pour ${selectedPlan.duration_days} jours !`);
      setPaymentOpen(false);
      setJustActivated(true);
      await refetch();
      setTimeout(() => navigate("/dashboard"), 500);
    } catch (error) {
      console.error("Error activating subscription:", error);
      toast.error("Erreur lors de l'activation");
    } finally {
      setSubscribing(null);
    }
  };

  if (subLoading || plansLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentPlan = currentSubscription?.plan?.toLowerCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-hero text-primary-foreground px-4 pt-12 pb-16 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Choisissez votre plan</h1>
        </div>
        <p className="text-primary-foreground/80 max-w-md mx-auto">
          Sélectionnez le plan qui correspond à vos besoins pour gérer votre boutique efficacement
        </p>
      </div>

      {/* Plans */}
      <div className="px-4 -mt-8 pb-8 space-y-4">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = currentPlan === plan.name.toLowerCase();
          const isPopular = plan.popular;

          return (
            <Card 
              key={plan.id}
              className={`relative overflow-hidden transition-all ${
                isPopular ? "border-accent shadow-lg ring-2 ring-accent/20" : ""
              } ${isCurrentPlan ? "border-primary bg-primary/5" : ""}`}
            >
              {isPopular && (
                <div className="absolute top-0 right-0">
                  <Badge className="rounded-none rounded-bl-lg bg-accent text-accent-foreground">
                    Populaire
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    plan.color === "accent" 
                      ? "bg-accent/10 text-accent" 
                      : plan.color === "primary"
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary text-muted-foreground"
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {plan.name}
                      {isCurrentPlan && (
                        <Badge variant="secondary" className="text-xs">Actuel</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {plan.description} • {plan.duration_days} jours
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {plan.price === 0 ? "Gratuit" : `${plan.price.toLocaleString()} CFA`}
                    </p>
                    {plan.price > 0 && plan.duration_days <= 31 && (
                      <p className="text-xs text-muted-foreground">/mois</p>
                    )}
                    {plan.price > 0 && plan.duration_days > 31 && (
                      <p className="text-xs text-muted-foreground">/an</p>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className={`w-4 h-4 ${
                        plan.color === "accent" ? "text-accent" : "text-primary"
                      }`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    plan.color === "accent" 
                      ? "bg-accent hover:bg-accent/90 text-accent-foreground" 
                      : ""
                  }`}
                  variant={plan.color === "secondary" ? "secondary" : "default"}
                  size="lg"
                  disabled={isCurrentPlan || subscribing === plan.name}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {subscribing === plan.name ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : isCurrentPlan ? (
                    "Plan actuel"
                  ) : (
                    <>
                      {plan.price === 0 ? "Commencer gratuitement" : "Souscrire"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Skip option for existing users or after activation */}
      {(currentSubscription || justActivated) && (
        <div className="px-4 pb-8 text-center">
          <Button
            variant="default"
            size="lg"
            onClick={() => navigate("/dashboard")}
          >
            {justActivated ? "Aller au tableau de bord →" : "Retour au tableau de bord"}
          </Button>
        </div>
      )}

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
    </div>
  );
}
