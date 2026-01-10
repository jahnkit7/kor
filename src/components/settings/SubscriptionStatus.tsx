import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Calendar, AlertTriangle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow, format, isPast, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface Subscription {
  id: string;
  plan: string;
  trial_ends_at: string;
  is_active: boolean;
  max_clients: number | null;
}

interface SubscriptionStatusProps {
  variant?: "default" | "card";
}

export function SubscriptionStatus({ variant = "default" }: SubscriptionStatusProps) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchSubscription = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      setSubscription(data);
      setLoading(false);
    };

    fetchSubscription();
  }, [user]);

  if (loading) {
    if (variant === "card") {
      return (
        <div className="animate-pulse space-y-1">
          <div className="h-5 bg-white/20 rounded w-24" />
          <div className="h-4 bg-white/20 rounded w-32" />
        </div>
      );
    }
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
    if (variant === "card") {
      return (
        <div>
          <h3 className="text-white font-bold text-lg">Aucun plan actif</h3>
          <p className="text-white/80 text-sm">Activez un code pour commencer</p>
        </div>
      );
    }
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
                Activez un code prépayé pour commencer
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const endDate = new Date(subscription.trial_ends_at);
  const isExpired = isPast(endDate);
  const daysLeft = differenceInDays(endDate, new Date());
  const isExpiringSoon = daysLeft <= 7 && daysLeft > 0;

  const getPlanColor = (plan: string) => {
    switch (plan.toLowerCase()) {
      case "annuel":
        return "from-purple-500 to-indigo-600";
      case "mensuel":
        return "from-blue-500 to-cyan-600";
      case "hebdomadaire":
        return "from-green-500 to-emerald-600";
      case "journalier":
        return "from-orange-500 to-amber-600";
      default:
        return "from-primary to-primary";
    }
  };

  if (variant === "card") {
    return (
      <div>
        <h3 className="text-white font-bold text-lg capitalize">Plan {subscription.plan}</h3>
        <p className="text-white/80 text-sm">
          {isExpired 
            ? `Expiré le ${format(endDate, "d MMM yyyy", { locale: fr })}` 
            : `${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}`
          }
        </p>
      </div>
    );
  }

  return (
    <Card className={isExpired ? "border-destructive/50" : isExpiringSoon ? "border-amber-500/50" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getPlanColor(subscription.plan)} flex items-center justify-center`}>
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground capitalize">
                Plan {subscription.plan}
              </p>
              {isExpired ? (
                <Badge variant="destructive" className="text-xs">Expiré</Badge>
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

        {subscription.max_clients && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Limite : {subscription.max_clients} clients
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
