import { useNavigate } from "react-router-dom";
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
import { Users, ShoppingCart, Clock, WifiOff } from "lucide-react";

export type LimitDialogType = "clients" | "sales" | "sales_multi" | "expired" | "no_data";

export interface LimitDialogData {
  currentCount?: number;
  maxAllowed?: number;
  attemptedCount?: number;
  planName?: string;
}

interface LimitReachedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: LimitDialogType;
  data?: LimitDialogData;
}

const DIALOG_CONFIG: Record<LimitDialogType, {
  icon: React.ElementType;
  title: string;
  getMessage: (data?: LimitDialogData) => string;
  iconColor: string;
}> = {
  clients: {
    icon: Users,
    title: "Limite de clients atteinte",
    getMessage: (data) => {
      const plan = data?.planName || "Gratuit";
      const max = data?.maxAllowed ?? 5;
      const current = data?.currentCount ?? max;
      return `Votre plan ${plan} autorise ${max} clients maximum. Vous avez déjà ${current} clients. Passez à un plan supérieur pour ajouter plus de clients.`;
    },
    iconColor: "text-orange-500",
  },
  sales: {
    icon: ShoppingCart,
    title: "Limite quotidienne atteinte",
    getMessage: (data) => {
      const plan = data?.planName || "Gratuit";
      const max = data?.maxAllowed ?? 5;
      const current = data?.currentCount ?? max;
      return `Votre plan ${plan} autorise ${max} ventes par jour. Vous avez déjà effectué ${current} ventes aujourd'hui. Passez à un plan supérieur pour vendre sans limite.`;
    },
    iconColor: "text-orange-500",
  },
  sales_multi: {
    icon: ShoppingCart,
    title: "Limite quotidienne dépassée",
    getMessage: (data) => {
      const attempted = data?.attemptedCount ?? 1;
      const remaining = (data?.maxAllowed ?? 5) - (data?.currentCount ?? 0);
      return `Vous essayez d'enregistrer ${attempted} vente${attempted > 1 ? "s" : ""}, mais votre plan n'autorise que ${Math.max(0, remaining)} vente${remaining !== 1 ? "s" : ""} supplémentaire${remaining !== 1 ? "s" : ""} aujourd'hui.`;
    },
    iconColor: "text-orange-500",
  },
  expired: {
    icon: Clock,
    title: "Période gratuite terminée",
    getMessage: () => {
      return "Votre période d'essai est terminée. Passez à un plan payant pour continuer à utiliser toutes les fonctionnalités.";
    },
    iconColor: "text-destructive",
  },
  no_data: {
    icon: WifiOff,
    title: "Connexion requise",
    getMessage: () => {
      return "Connectez-vous à Internet pour vérifier votre plan et continuer à utiliser l'application.";
    },
    iconColor: "text-muted-foreground",
  },
};

export function LimitReachedDialog({ open, onOpenChange, type, data }: LimitReachedDialogProps) {
  const navigate = useNavigate();
  const config = DIALOG_CONFIG[type];
  const Icon = config.icon;
  
  const handleViewPlans = () => {
    onOpenChange(false);
    navigate("/subscriptions");
  };
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full bg-secondary ${config.iconColor}`}>
              <Icon className="w-5 h-5" />
            </div>
            <AlertDialogTitle>{config.title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left">
            {config.getMessage(data)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Plus tard</AlertDialogCancel>
          <AlertDialogAction onClick={handleViewPlans}>
            Voir les plans
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
