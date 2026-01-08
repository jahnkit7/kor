import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Store,
  ChevronRight
} from "lucide-react";
import { 
  type MerchantProfile, 
  MERCHANT_TYPES, 
  SPECIALTIES 
} from "@/hooks/use-merchant-profile";
import { cn } from "@/lib/utils";

interface MerchantCardProps {
  merchant: MerchantProfile;
  onClick?: () => void;
}

export function MerchantCard({ merchant, onClick }: MerchantCardProps) {
  const merchantType = MERCHANT_TYPES.find(t => t.value === merchant.merchant_type);
  
  const specialtyLabels = merchant.specialties
    .map(s => SPECIALTIES.find(sp => sp.value === s))
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-card rounded-2xl border border-border p-4 transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary/30"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
          <span className="text-2xl">{merchantType?.emoji || "🏪"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs font-medium">
              {merchantType?.label || merchant.merchant_type}
            </Badge>
          </div>
          {merchant.location_name && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{merchant.location_name}</span>
            </div>
          )}
        </div>
        {onClick && (
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        )}
      </div>

      {/* Specialties */}
      {specialtyLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {specialtyLabels.map((specialty) => (
            <div
              key={specialty!.value}
              className="px-2 py-1 bg-secondary rounded-lg text-xs font-medium text-foreground flex items-center gap-1"
            >
              <span>{specialty!.emoji}</span>
              <span>{specialty!.label}</span>
            </div>
          ))}
          {merchant.specialties.length > 3 && (
            <div className="px-2 py-1 bg-muted rounded-lg text-xs text-muted-foreground">
              +{merchant.specialties.length - 3}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
