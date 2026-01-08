import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Tag, 
  Clock, 
  MessageCircle,
  Store,
  Sparkles,
  X
} from "lucide-react";
import { type MerchantOffer } from "@/hooks/use-merchant-offers";
import { cn } from "@/lib/utils";

interface OfferCardProps {
  offer: MerchantOffer;
  isOwn?: boolean;
  onContact?: () => void;
  onCancel?: () => void;
  onMarkSold?: () => void;
}

export function OfferCard({ 
  offer, 
  isOwn = false, 
  onContact,
  onCancel,
  onMarkSold
}: OfferCardProps) {
  const timeAgo = formatDistanceToNow(new Date(offer.created_at), { 
    addSuffix: true, 
    locale: fr 
  });

  const formatMoney = (amount: number) => 
    new Intl.NumberFormat("fr-FR").format(amount);

  const shopName = offer.profiles?.shop_name || "Marchand";

  return (
    <div className={cn(
      "bg-card rounded-2xl border border-border p-4 transition-all hover:shadow-md",
      isOwn && "ring-1 ring-accent/30",
      offer.is_promo && "border-accent/50 bg-gradient-to-br from-card to-accent/5"
    )}>
      {/* Promo badge */}
      {offer.is_promo && (
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-accent text-accent-foreground text-xs px-2 py-0.5">
            <Sparkles className="w-3 h-3 mr-1" />
            {offer.promo_label || "Promo"}
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-4 h-4 text-accent shrink-0" />
            <h3 className="font-bold text-foreground truncate">{offer.product_name}</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Store className="w-3 h-3" />
            <span className="truncate">{shopName}</span>
            <span>•</span>
            <Clock className="w-3 h-3" />
            <span>{timeAgo}</span>
          </div>
        </div>
        {offer.price && (
          <div className="px-3 py-1.5 bg-accent/10 rounded-xl shrink-0">
            <span className="font-bold text-accent text-sm">
              {formatMoney(offer.price)} CFA
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-wrap gap-2 mb-3">
        {offer.quantity && (
          <div className="px-2.5 py-1 bg-secondary rounded-lg text-xs font-medium text-foreground">
            {offer.quantity} {offer.unit || "pièces"} dispo
          </div>
        )}
      </div>

      {/* Description */}
      {offer.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {offer.description}
        </p>
      )}

      {/* Actions */}
      {offer.status === "active" && (
        <div className="flex gap-2 pt-2 border-t border-border">
          {isOwn ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="flex-1 rounded-xl text-xs h-9"
              >
                <X className="w-3.5 h-3.5 mr-1.5" />
                Retirer
              </Button>
              <Button
                size="sm"
                onClick={onMarkSold}
                className="flex-1 rounded-xl text-xs h-9"
              >
                Vendu ✓
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={onContact}
              className="flex-1 rounded-xl text-xs h-9"
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
              Contacter {shopName}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
