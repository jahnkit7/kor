import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tag, Loader2, Sparkles, Package } from "lucide-react";
import { useMerchantOffers } from "@/hooks/use-merchant-offers";
import { toast } from "sonner";

interface NewOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewOfferDialog({ open, onOpenChange }: NewOfferDialogProps) {
  const { createOffer } = useMerchantOffers();
  const [saving, setSaving] = useState(false);
  
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("pièces");
  const [price, setPrice] = useState("");
  const [isPromo, setIsPromo] = useState(false);
  const [promoLabel, setPromoLabel] = useState("");

  const resetForm = () => {
    setProductName("");
    setDescription("");
    setQuantity("");
    setUnit("pièces");
    setPrice("");
    setIsPromo(false);
    setPromoLabel("");
  };

  const handleSubmit = async () => {
    if (!productName.trim()) {
      toast.error("Nom du produit requis");
      return;
    }

    setSaving(true);
    
    const result = await createOffer({
      product_name: productName.trim(),
      description: description.trim() || undefined,
      quantity: quantity ? parseInt(quantity) : undefined,
      unit: unit || "pièces",
      price: price ? parseInt(price) : undefined,
      is_promo: isPromo,
      promo_label: isPromo ? promoLabel.trim() : undefined,
    });

    setSaving(false);

    if (result) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] max-h-[90vh] rounded-t-3xl flex flex-col p-0"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Nouvelle offre</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pt-2 pb-8 px-4">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center pb-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-primary mx-auto flex items-center justify-center mb-4">
                <Tag className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Proposer une offre
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Publiez un produit disponible pour le réseau
              </p>
            </div>

            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="product" className="text-sm font-semibold text-foreground">
                Produit
              </Label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="product"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Ex: Sacs de riz 25kg"
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">
                Description <span className="text-muted-foreground font-normal">(optionnel)</span>
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Détails sur le produit, qualité, origine..."
                className="rounded-xl resize-none min-h-[80px]"
              />
            </div>

            {/* Quantity & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">
                  Quantité
                </Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ex: 50"
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">
                  Unité
                </Label>
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="pièces, kg, cartons..."
                  className="h-12 rounded-xl"
                />
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">
                Prix <span className="text-muted-foreground font-normal">(CFA)</span>
              </Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ex: 15000"
                className="h-12 rounded-xl"
              />
            </div>

            {/* Promo Toggle */}
            <div className="flex items-center justify-between p-4 bg-accent/10 rounded-xl border border-accent/20">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-accent" />
                <div>
                  <p className="font-semibold text-foreground text-sm">Offre promotionnelle</p>
                  <p className="text-xs text-muted-foreground">
                    Attirez plus d'attention
                  </p>
                </div>
              </div>
              <Switch checked={isPromo} onCheckedChange={setIsPromo} />
            </div>

            {/* Promo Label */}
            {isPromo && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">
                  Label promo
                </Label>
                <Input
                  value={promoLabel}
                  onChange={(e) => setPromoLabel(e.target.value)}
                  placeholder="Ex: -20%, Déstockage, Fin de série..."
                  className="h-12 rounded-xl"
                />
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={saving || !productName.trim()}
              className="w-full h-14 rounded-2xl text-base font-semibold"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Tag className="w-5 h-5 mr-2" />
              )}
              Publier l'offre
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
