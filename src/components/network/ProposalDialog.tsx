import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Handshake, Calculator, Send } from "lucide-react";

interface ProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerName: string;
  productName?: string;
  onSubmit: (data: {
    productName: string;
    quantity?: number;
    unit?: string;
    price?: number;
    total?: number;
    notes?: string;
  }) => void;
  isCounter?: boolean;
  initialData?: {
    quantity?: number;
    unit?: string;
    price?: number;
    total?: number;
  };
}

const UNITS = ["pièces", "kg", "cartons", "sacs", "litres", "douzaines"];

export function ProposalDialog({
  open,
  onOpenChange,
  partnerName,
  productName: initialProductName,
  onSubmit,
  isCounter = false,
  initialData
}: ProposalDialogProps) {
  const [productName, setProductName] = useState(initialProductName || "");
  const [quantity, setQuantity] = useState(initialData?.quantity?.toString() || "");
  const [unit, setUnit] = useState(initialData?.unit || "pièces");
  const [price, setPrice] = useState(initialData?.price?.toString() || "");
  const [notes, setNotes] = useState("");

  const total = quantity && price 
    ? parseInt(quantity) * parseInt(price) 
    : undefined;

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("fr-FR").format(amount);

  const handleSubmit = () => {
    if (!productName.trim()) return;

    onSubmit({
      productName: productName.trim(),
      quantity: quantity ? parseInt(quantity) : undefined,
      unit,
      price: price ? parseInt(price) : undefined,
      total,
      notes: notes.trim() || undefined
    });

    // Reset form
    setProductName("");
    setQuantity("");
    setPrice("");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-4 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Handshake className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">
                {isCounter ? "Contre-proposition" : "Proposer un accord"}
              </p>
              <p className="text-sm font-normal text-muted-foreground">
                à {partnerName}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Product name */}
          <div className="space-y-2">
            <Label htmlFor="productName">Produit *</Label>
            <Input
              id="productName"
              placeholder="Nom du produit"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="rounded-xl h-11"
              disabled={!!initialProductName}
            />
          </div>

          {/* Quantity + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="Ex: 100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unité</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price per unit */}
          <div className="space-y-2">
            <Label htmlFor="price">Prix par unité (CFA)</Label>
            <Input
              id="price"
              type="number"
              placeholder="Ex: 5000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="rounded-xl h-11"
            />
          </div>

          {/* Calculated total */}
          {total && (
            <div className="bg-primary/10 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">Total</span>
              </div>
              <span className="text-xl font-bold text-primary">
                {formatMoney(total)} CFA
              </span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              placeholder="Conditions, délais de livraison..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl resize-none"
              rows={2}
            />
          </div>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={!productName.trim()}
            className="w-full h-12 rounded-xl text-base"
          >
            <Send className="w-5 h-5 mr-2" />
            {isCounter ? "Envoyer contre-proposition" : "Envoyer la proposition"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
