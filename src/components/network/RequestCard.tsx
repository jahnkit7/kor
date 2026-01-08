import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Clock, 
  MapPin, 
  MessageCircle,
  Check,
  User,
  Wallet
} from "lucide-react";
import { type ProductRequest } from "@/hooks/use-product-requests";
import { cn } from "@/lib/utils";

interface RequestCardProps {
  request: ProductRequest;
  isOwn?: boolean;
  onFulfill?: () => void;
  onCancel?: () => void;
  onContact?: () => void;
}

export function RequestCard({ 
  request, 
  isOwn = false, 
  onFulfill, 
  onCancel,
  onContact 
}: RequestCardProps) {
  const timeAgo = formatDistanceToNow(new Date(request.created_at), { 
    addSuffix: true, 
    locale: fr 
  });

  const expiresIn = formatDistanceToNow(new Date(request.expires_at), { 
    locale: fr 
  });

  const formatMoney = (amount: number) => 
    new Intl.NumberFormat("fr-FR").format(amount);

  const statusColors = {
    open: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    fulfilled: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    cancelled: "bg-muted text-muted-foreground border-border",
    expired: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  };

  const statusLabels = {
    open: "Ouvert",
    fulfilled: "Satisfait",
    cancelled: "Annulé",
    expired: "Expiré",
  };

  return (
    <div className={cn(
      "bg-card rounded-2xl border border-border p-4 transition-all hover:shadow-md",
      isOwn && "ring-1 ring-primary/20"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-primary shrink-0" />
            <h3 className="font-bold text-foreground truncate">{request.product_name}</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{timeAgo}</span>
            {request.status === "open" && (
              <>
                <span>•</span>
                <span>Expire dans {expiresIn}</span>
              </>
            )}
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={cn("shrink-0 text-xs", statusColors[request.status as keyof typeof statusColors])}
        >
          {statusLabels[request.status as keyof typeof statusLabels]}
        </Badge>
      </div>

      {/* Details */}
      <div className="flex flex-wrap gap-2 mb-3">
        {request.quantity && (
          <div className="px-2.5 py-1 bg-secondary rounded-lg text-xs font-medium text-foreground">
            {request.quantity} {request.unit || "pièces"}
          </div>
        )}
        {request.max_price && (
          <div className="px-2.5 py-1 bg-primary/10 rounded-lg text-xs font-medium text-primary flex items-center gap-1">
            <Wallet className="w-3 h-3" />
            Max {formatMoney(request.max_price)} CFA
          </div>
        )}
      </div>

      {/* Notes */}
      {request.notes && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {request.notes}
        </p>
      )}

      {/* Actions */}
      {request.status === "open" && (
        <div className="flex gap-2 pt-2 border-t border-border">
          {isOwn ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="flex-1 rounded-xl text-xs h-9"
            >
              Annuler
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onContact}
              className="flex-1 rounded-xl text-xs h-9"
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
              Contacter
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
