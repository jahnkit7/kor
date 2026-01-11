import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Save, X } from "lucide-react";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import type { StockItem, NewStockItem } from "@/hooks/use-stock";

interface EditStockDialogProps {
  item: StockItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<NewStockItem>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export function EditStockDialog({
  item,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: EditStockDialogProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [model, setModel] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      setName(item.name);
      setQuantity(item.quantity.toString());
      setUnitPrice(item.unit_price.toString());
      setModel(item.model || "");
    }
  }, [item]);

  const handleSave = async () => {
    if (!item || !name.trim()) return;

    setIsLoading(true);
    const success = await onSave(item.id, {
      name: name.trim(),
      quantity: parseInt(quantity) || 0,
      unit_price: parseInt(unitPrice) || 0,
      model: model.trim() || null,
    });

    setIsLoading(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;

    setIsDeleting(true);
    const success = await onDelete(item.id);
    setIsDeleting(false);

    if (success) {
      onOpenChange(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le produit</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du produit</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Riz 5kg"
              className="h-12 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                className="h-12 rounded-xl text-center"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Prix unitaire (CFA)</Label>
              <Input
                id="price"
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0"
                className="h-12 rounded-xl text-center"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Modèle / Variante (optionnel)</Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Ex: Marque, taille..."
              className="h-12 rounded-xl"
            />
          </div>
        </div>

        {/* Buttons reorganized: Enregistrer on top, Supprimer + Annuler on bottom */}
        <div className="space-y-4 pt-2">
          {/* Save button at top - Primary action */}
          <PrimaryActionButton
            onClick={handleSave}
            disabled={isLoading || isDeleting || !name.trim()}
            variant="blue"
          >
            <Save className="w-5 h-5" />
            {isLoading ? "Enregistrement..." : "Enregistrer"}
          </PrimaryActionButton>
          
          {/* Delete and Cancel buttons side by side at bottom */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={isDeleting || isLoading}
              className="h-12 rounded-full border-2 border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 font-semibold"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "..." : "Supprimer"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading || isDeleting}
              className="h-12 rounded-full font-semibold"
            >
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
