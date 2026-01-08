import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Handshake, 
  Check, 
  X, 
  RefreshCw,
  Clock,
  Package,
  ArrowRight
} from "lucide-react";
import { type Negotiation } from "@/hooks/use-negotiations";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface NegotiationCardProps {
  negotiation: Negotiation;
  partnerName: string;
  onAccept: () => void;
  onReject: () => void;
  onCounter: () => void;
  onComplete: () => void;
}

export function NegotiationCard({
  negotiation,
  partnerName,
  onAccept,
  onReject,
  onCounter,
  onComplete
}: NegotiationCardProps) {
  const { user } = useAuth();
  const isProposer = negotiation.proposer_id === user?.id;
  const isPending = negotiation.status === "pending";
  const isAccepted = negotiation.status === "accepted";
  
  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("fr-FR").format(amount);

  const timeAgo = formatDistanceToNow(new Date(negotiation.created_at), {
    addSuffix: true,
    locale: fr
  });

  const statusConfig = {
    pending: { 
      label: isProposer ? "En attente" : "Nouvelle proposition", 
      color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      icon: Clock
    },
    accepted: { 
      label: "Accepté", 
      color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      icon: Check
    },
    rejected: { 
      label: "Refusé", 
      color: "bg-destructive/10 text-destructive border-destructive/20",
      icon: X
    },
    counter: { 
      label: "Contre-proposition", 
      color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      icon: RefreshCw
    },
    completed: { 
      label: "Terminé", 
      color: "bg-primary/10 text-primary border-primary/20",
      icon: Check
    },
    cancelled: { 
      label: "Annulé", 
      color: "bg-muted text-muted-foreground border-border",
      icon: X
    }
  };

  const status = statusConfig[negotiation.status];
  const StatusIcon = status.icon;

  return (
    <div className={cn(
      "bg-card rounded-2xl border-2 p-4 transition-all",
      isPending && !isProposer && "border-amber-500/50 shadow-md",
      isAccepted && "border-emerald-500/30",
      !isPending && !isAccepted && "border-border"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Handshake className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              {isProposer ? "Vous proposez à" : "Proposition de"}
            </p>
            <p className="font-semibold text-foreground">{partnerName}</p>
          </div>
        </div>
        <Badge variant="outline" className={cn("text-xs", status.color)}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {status.label}
        </Badge>
      </div>

      {/* Product details */}
      <div className="bg-secondary/50 rounded-xl p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{negotiation.product_name}</span>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center">
          {negotiation.proposed_quantity && (
            <div className="bg-background rounded-lg py-2 px-3">
              <p className="text-lg font-bold text-foreground">
                {negotiation.proposed_quantity}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {negotiation.proposed_unit || "pièces"}
              </p>
            </div>
          )}
          {negotiation.proposed_price && (
            <div className="bg-background rounded-lg py-2 px-3">
              <p className="text-lg font-bold text-foreground">
                {formatMoney(negotiation.proposed_price)}
              </p>
              <p className="text-[10px] text-muted-foreground">CFA/unité</p>
            </div>
          )}
          {negotiation.proposed_total && (
            <div className="bg-primary/10 rounded-lg py-2 px-3">
              <p className="text-lg font-bold text-primary">
                {formatMoney(negotiation.proposed_total)}
              </p>
              <p className="text-[10px] text-muted-foreground">CFA total</p>
            </div>
          )}
        </div>
        
        {negotiation.notes && (
          <p className="text-sm text-muted-foreground mt-2 italic">
            "{negotiation.notes}"
          </p>
        )}
      </div>

      {/* Time */}
      <p className="text-xs text-muted-foreground mb-3">{timeAgo}</p>

      {/* Actions */}
      {isPending && !isProposer && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            className="flex-1 rounded-xl text-xs h-10"
          >
            <X className="w-4 h-4 mr-1.5" />
            Refuser
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onCounter}
            className="flex-1 rounded-xl text-xs h-10"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Contre-offre
          </Button>
          <Button
            size="sm"
            onClick={onAccept}
            className="flex-1 rounded-xl text-xs h-10 bg-emerald-600 hover:bg-emerald-700"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Accepter
          </Button>
        </div>
      )}

      {isAccepted && (
        <Button
          size="sm"
          onClick={onComplete}
          className="w-full rounded-xl text-xs h-10"
        >
          <Check className="w-4 h-4 mr-1.5" />
          Marquer comme terminé
        </Button>
      )}
    </div>
  );
}
