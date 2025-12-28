import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { NewStockItem } from "@/hooks/use-stock";

interface ManualStockInputProps {
  onComplete: (item: NewStockItem) => Promise<void>;
  onCancel: () => void;
  mode: "manual" | "approximate";
}

export function ManualStockInput({ onComplete, onCancel, mode }: ManualStockInputProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [model, setModel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !quantity) return;

    setIsSubmitting(true);
    try {
      await onComplete({
        name: name.trim(),
        quantity: Number(quantity) || 1,
        unit_price: Number(unitPrice) || 0,
        model: model.trim() || null,
        source: mode,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const approximateQuantities = [5, 10, 20, 50, 100];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center space-y-1 mb-6">
        <h3 className="text-lg font-semibold">
          {mode === "manual" ? "Saisie manuelle" : "Mode rapide"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {mode === "manual"
            ? "Entrez les informations exactes du produit"
            : "Estimation rapide - ajustez si nécessaire"}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Nom du produit *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Savon Lux, Riz 25kg..."
            required
            autoFocus
          />
        </div>

        <div>
          <Label htmlFor="quantity">Quantité *</Label>
          {mode === "approximate" ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {approximateQuantities.map((q) => (
                  <Button
                    key={q}
                    type="button"
                    variant={quantity === String(q) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setQuantity(String(q))}
                  >
                    {q}
                  </Button>
                ))}
              </div>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ou entrez une quantité"
                min="1"
              />
            </div>
          ) : (
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Quantité exacte"
              min="1"
              required
            />
          )}
        </div>

        <div>
          <Label htmlFor="unitPrice">Prix unitaire (CFA)</Label>
          <Input
            id="unitPrice"
            type="number"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            placeholder="0"
            min="0"
          />
        </div>

        <div>
          <Label htmlFor="model">Modèle / Variante (optionnel)</Label>
          <Input
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Ex: Grand format, Rouge..."
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
        <Button type="submit" disabled={!name.trim() || !quantity || isSubmitting} className="flex-1">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}
