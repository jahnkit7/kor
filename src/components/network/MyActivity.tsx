import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Tag, 
  MessageCircle,
  ChevronRight,
  Store
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type ProductRequest } from "@/hooks/use-product-requests";
import { type MerchantOffer } from "@/hooks/use-merchant-offers";

interface MyActivityProps {
  profile: {
    shop_name: string;
    owner_name: string | null;
  } | null;
  myRequests: ProductRequest[];
  myOffers: MerchantOffer[];
  unreadMessages: number;
  onViewRequests: () => void;
  onViewOffers: () => void;
  onViewMessages: () => void;
  onOpenProfile: () => void;
}

export function MyActivity({
  profile,
  myRequests,
  myOffers,
  unreadMessages,
  onViewRequests,
  onViewOffers,
  onViewMessages,
  onOpenProfile,
}: MyActivityProps) {
  const activeRequests = myRequests.filter(r => r.status === "open").length;
  const activeOffers = myOffers.filter(o => o.status === "active").length;

  return (
    <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-background rounded-2xl border border-primary/20 p-4 mb-6">
      {/* Profile Header */}
      <button 
        onClick={onOpenProfile}
        className="flex items-center gap-3 w-full mb-4"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
          <Store className="w-6 h-6 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <h3 className="font-bold text-foreground truncate">
            {profile?.shop_name || "Ma Boutique"}
          </h3>
          {profile?.owner_name && (
            <p className="text-sm text-muted-foreground truncate">{profile.owner_name}</p>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
      </button>

      {/* Activity Stats */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onViewRequests}
          className={cn(
            "p-3 rounded-xl bg-background/80 border border-border text-center transition-all hover:border-primary/50",
            activeRequests > 0 && "border-primary/30"
          )}
        >
          <Package className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold text-foreground">{activeRequests}</p>
          <p className="text-[10px] text-muted-foreground">Demandes</p>
        </button>

        <button
          onClick={onViewOffers}
          className={cn(
            "p-3 rounded-xl bg-background/80 border border-border text-center transition-all hover:border-accent/50",
            activeOffers > 0 && "border-accent/30"
          )}
        >
          <Tag className="w-5 h-5 mx-auto mb-1 text-accent" />
          <p className="text-lg font-bold text-foreground">{activeOffers}</p>
          <p className="text-[10px] text-muted-foreground">Offres</p>
        </button>

        <button
          onClick={onViewMessages}
          className={cn(
            "p-3 rounded-xl bg-background/80 border border-border text-center transition-all hover:border-destructive/50 relative",
            unreadMessages > 0 && "border-destructive/30"
          )}
        >
          <MessageCircle className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-lg font-bold text-foreground">{unreadMessages}</p>
          <p className="text-[10px] text-muted-foreground">Messages</p>
          {unreadMessages > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
          )}
        </button>
      </div>
    </div>
  );
}
