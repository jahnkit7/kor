import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Mic, 
  MicOff, 
  Send, 
  Package,
  Loader2,
  Sparkles
} from "lucide-react";
import { useProductRequests, UNITS } from "@/hooks/use-product-requests";
import { cn } from "@/lib/utils";

interface NewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewRequestDialog({ open, onOpenChange }: NewRequestDialogProps) {
  const { createRequest } = useProductRequests();
  const [saving, setSaving] = useState(false);
  
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("pièces");
  const [maxPrice, setMaxPrice] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!productName.trim()) return;
    
    setSaving(true);
    const result = await createRequest({
      product_name: productName.trim(),
      quantity: quantity ? parseInt(quantity) : undefined,
      unit: unit || undefined,
      max_price: maxPrice ? parseInt(maxPrice) : undefined,
      notes: notes.trim() || undefined,
    });
    setSaving(false);

    if (result) {
      // Reset form
      setProductName("");
      setQuantity("");
      setUnit("pièces");
      setMaxPrice("");
      setNotes("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md mx-4 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            Nouvelle demande
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Product Name */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Produit recherché *</Label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ex: Huile végétale 5L"
              className="h-12 rounded-xl"
            />
          </div>

          {/* Quantity & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Quantité</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="10"
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Unité</Label>
              <div className="flex flex-wrap gap-1">
                {UNITS.slice(0, 3).map((u) => (
                  <button
                    key={u.value}
                    onClick={() => setUnit(u.value)}
                    className={cn(
                      "px-2 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      unit === u.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    )}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Max Price */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Budget max (CFA)</Label>
            <Input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Ex: 50000"
              className="h-12 rounded-xl"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Notes (optionnel)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Détails supplémentaires..."
              className="rounded-xl resize-none"
              rows={2}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={saving || !productName.trim()}
            className="w-full h-12 rounded-xl font-semibold"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Send className="w-5 h-5 mr-2" />
            )}
            Publier la demande
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
