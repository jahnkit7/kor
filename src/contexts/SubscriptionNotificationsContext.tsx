import { createContext, useContext, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useUserSubscription } from "@/hooks/use-feature-access";
import { differenceInDays, isPast } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock } from "lucide-react";

const SubscriptionNotificationsContext = createContext<null>(null);

const NOTIFICATION_KEY = "subscription_notification_shown";

interface SubscriptionNotificationsProviderProps {
  children: ReactNode;
}

export function SubscriptionNotificationsProvider({
  children,
}: SubscriptionNotificationsProviderProps) {
  const { data: subscription, isLoading } = useUserSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !subscription) return;

    const checkAndNotify = () => {
      const endDate = new Date(subscription.trial_ends_at);
      const daysLeft = differenceInDays(endDate, new Date());
      const isExpired = isPast(endDate);

      // Get stored notification date
      const lastNotification = localStorage.getItem(NOTIFICATION_KEY);
      const today = new Date().toDateString();

      // Only show one notification per day
      if (lastNotification === today) return;

      const handleRenew = () => {
        navigate("/subscriptions");
        toast.dismiss();
      };

      if (isExpired) {
        toast.error("Votre abonnement a expiré", {
          description: "Renouvelez pour continuer à utiliser toutes les fonctionnalités",
          duration: 10000,
          icon: <AlertTriangle className="w-5 h-5" />,
          action: (
            <Button size="sm" variant="destructive" onClick={handleRenew}>
              Renouveler
            </Button>
          ),
        });
        localStorage.setItem(NOTIFICATION_KEY, today);
      } else if (daysLeft === 1) {
        toast.warning("Votre abonnement expire demain !", {
          description: "Pensez à renouveler pour ne pas perdre l'accès",
          duration: 10000,
          icon: <AlertTriangle className="w-5 h-5" />,
          action: (
            <Button size="sm" onClick={handleRenew}>
              Renouveler
            </Button>
          ),
        });
        localStorage.setItem(NOTIFICATION_KEY, today);
      } else if (daysLeft <= 3 && daysLeft > 1) {
        toast.info(`Votre abonnement expire dans ${daysLeft} jours`, {
          description: "Renouvelez pour continuer à profiter de toutes les fonctionnalités",
          duration: 8000,
          icon: <Clock className="w-5 h-5" />,
          action: (
            <Button size="sm" variant="outline" onClick={handleRenew}>
              Voir les plans
            </Button>
          ),
        });
        localStorage.setItem(NOTIFICATION_KEY, today);
      }
    };

    // Small delay to let the app fully load before showing notification
    const timer = setTimeout(checkAndNotify, 2000);

    return () => clearTimeout(timer);
  }, [subscription, isLoading, navigate]);

  return (
    <SubscriptionNotificationsContext.Provider value={null}>
      {children}
    </SubscriptionNotificationsContext.Provider>
  );
}

export function useSubscriptionNotifications() {
  return useContext(SubscriptionNotificationsContext);
}
