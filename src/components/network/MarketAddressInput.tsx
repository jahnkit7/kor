import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Layers, MapPin, Hash } from "lucide-react";

interface MarketAddressInputProps {
  value: string;
  onChange: (value: string) => void;
}

// Common markets in West Africa
const KNOWN_MARKETS = [
  "Dantokpa",
  "Makola", 
  "Dékon",
  "Assigamé",
  "Missebo",
  "Ganhi",
  "Tokpa",
  "Hédzranawoé",
  "Grand Marché",
];

export function MarketAddressInput({ value, onChange }: MarketAddressInputProps) {
  // Parse existing value
  const parts = value?.split(" > ") || [];
  const [market, setMarket] = useState(parts[0] || "");
  const [zone, setZone] = useState(parts[1] || "");
  const [floor, setFloor] = useState(parts[2] || "");
  const [shop, setShop] = useState(parts[3] || "");

  // Update parent when parts change
  useEffect(() => {
    const newParts = [market, zone, floor, shop].filter(Boolean);
    const newValue = newParts.join(" > ");
    if (newValue !== value) {
      onChange(newValue);
    }
  }, [market, zone, floor, shop]);

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Building2 className="w-4 h-4" />
        Adresse dans le marché
      </Label>
      
      <div className="grid grid-cols-2 gap-2">
        {/* Market Name */}
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            placeholder="Marché"
            className="pl-9 h-10 rounded-xl text-sm"
            list="markets-list"
          />
          <datalist id="markets-list">
            {KNOWN_MARKETS.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>

        {/* Zone/Allée */}
        <div className="relative">
          <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            placeholder="Zone/Allée"
            className="pl-9 h-10 rounded-xl text-sm"
          />
        </div>

        {/* Floor */}
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            placeholder="Étage (RDC, 1er...)"
            className="pl-9 h-10 rounded-xl text-sm"
          />
        </div>

        {/* Shop Number */}
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            placeholder="N° Boutique"
            className="pl-9 h-10 rounded-xl text-sm"
          />
        </div>
      </div>

      {/* Preview */}
      {(market || zone || floor || shop) && (
        <div className="p-2.5 bg-secondary/50 rounded-xl">
          <p className="text-xs text-muted-foreground mb-1">Aperçu :</p>
          <p className="text-sm font-medium text-foreground">
            📍 {[market, zone, floor, shop].filter(Boolean).join(" > ") || "..."}
          </p>
        </div>
      )}
    </div>
  );
}
