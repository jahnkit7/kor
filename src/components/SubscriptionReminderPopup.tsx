import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserSubscription } from "@/hooks/use-feature-access";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

/**
 * Popup de rappel d'abonnement expiré
 * S'affiche toutes les 60 secondes si l'abonnement est expiré
 */
export function SubscriptionReminderPopup() {
  const { data: subscription, isLoading } = useUserSubscription();
  const [showReminder, setShowReminder] = useState(false);
  const navigate = useNavigate();

  // Vérifier si l'abonnement existe mais n'est plus actif
  const isExpired = subscription && !subscription.is_active;

  useEffect(() => {
    if (isLoading || !isExpired) return;

    // Afficher le rappel après 30 secondes
    const initialTimer = setTimeout(() => {
      setShowReminder(true);
    }, 30000);

    // Puis toutes les 60 secondes
    const intervalTimer = setInterval(() => {
      setShowReminder(true);
    }, 60000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [isExpired, isLoading]);

  if (!showReminder || !isExpired) return null;

  const handleRenew = () => {
    setShowReminder(false);
    navigate("/subscriptions");
  };

  return (
    <AlertDialog open={showReminder} onOpenChange={setShowReminder}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-warning" />
            </div>
            <AlertDialogTitle className="text-xl">
              Abonnement expiré
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base pt-2">
            Votre abonnement est arrivé à expiration. Renouvelez-le pour
            continuer à profiter de toutes les fonctionnalités de l'application.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="w-full sm:w-auto">
            Plus tard
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRenew}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90"
          >
            Renouveler maintenant
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
