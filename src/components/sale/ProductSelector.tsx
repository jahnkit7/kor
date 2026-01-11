import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Search, Plus, Package, AlertTriangle, Check, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  model?: string | null;
}

interface SaleProduct {
  stock_item_id?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface ProductSelectorProps {
  stockItems: StockItem[];
  selectedProducts: SaleProduct[];
  onProductsChange: (products: SaleProduct[]) => void;
  onCreateStockItem?: (item: { name: string; quantity: number; unit_price: number }) => Promise<{ id: string } | null>;
  compact?: boolean;
}

export function ProductSelector({
  stockItems,
  selectedProducts,
  onProductsChange,
  onCreateStockItem,
  compact = false,
}: ProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addToStock, setAddToStock] = useState(true);
  const [isCreatingStock, setIsCreatingStock] = useState(false);
  const [newProduct, setNewProduct] = useState<SaleProduct>({
    product_name: "",
    quantity: 1,
    unit_price: 0,
  });

  // Filter stock items by search
  const filteredStock = useMemo(() => {
    if (!searchQuery.trim()) return stockItems.slice(0, 10);
    const query = searchQuery.toLowerCase();
    return stockItems.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.model?.toLowerCase().includes(query)
    );
  }, [stockItems, searchQuery]);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount);
  };

  const addProductFromStock = (stockItem: StockItem) => {
    // Check if already added
    const existing = selectedProducts.find(
      (p) => p.stock_item_id === stockItem.id
    );
    if (existing) {
      // Increment quantity
      onProductsChange(
        selectedProducts.map((p) =>
          p.stock_item_id === stockItem.id
            ? { ...p, quantity: p.quantity + 1 }
            : p
        )
      );
    } else {
      // Add new
      onProductsChange([
        ...selectedProducts,
        {
          stock_item_id: stockItem.id,
          product_name: stockItem.name,
          quantity: 1,
          unit_price: stockItem.unit_price,
        },
      ]);
    }
    setSearchQuery("");
  };

  const addCustomProduct = async () => {
    if (!newProduct.product_name.trim() || newProduct.quantity <= 0) return;
    
    setIsCreatingStock(true);
    let stockItemId: string | null = null;

    try {
      // Create stock item if option enabled and callback exists
      if (addToStock && onCreateStockItem) {
        console.log("[ProductSelector] Creating stock item:", newProduct.product_name);
        const created = await onCreateStockItem({
          name: newProduct.product_name.trim(),
          quantity: newProduct.quantity,
          unit_price: newProduct.unit_price,
        });
        if (created) {
          stockItemId = created.id;
          console.log("[ProductSelector] Stock item created with ID:", stockItemId);
        }
      }

      onProductsChange([
        ...selectedProducts,
        {
          stock_item_id: stockItemId,
          product_name: newProduct.product_name.trim(),
          quantity: newProduct.quantity,
          unit_price: newProduct.unit_price,
        },
      ]);

      setNewProduct({ product_name: "", quantity: 1, unit_price: 0 });
      setShowAddDialog(false);
    } catch (error) {
      console.error("[ProductSelector] Error creating stock item:", error);
    } finally {
      setIsCreatingStock(false);
    }
  };

  const updateProductQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeProduct(index);
      return;
    }
    onProductsChange(
      selectedProducts.map((p, i) => (i === index ? { ...p, quantity } : p))
    );
  };

  const updateProductPrice = (index: number, unit_price: number) => {
    onProductsChange(
      selectedProducts.map((p, i) => (i === index ? { ...p, unit_price } : p))
    );
  };

  const removeProduct = (index: number) => {
    onProductsChange(selectedProducts.filter((_, i) => i !== index));
  };

  // Calculate total
  const total = useMemo(() => {
    return selectedProducts.reduce(
      (sum, p) => sum + p.quantity * p.unit_price,
      0
    );
  }, [selectedProducts]);

  // Get stock warnings
  const getStockWarning = (product: SaleProduct): string | null => {
    if (!product.stock_item_id) return null;
    const stockItem = stockItems.find((s) => s.id === product.stock_item_id);
    if (!stockItem) return null;
    if (stockItem.quantity < product.quantity) {
      return `Stock insuffisant (${stockItem.quantity} disponibles)`;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Rechercher un produit..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 text-base"
        />
      </div>

      {/* Stock results (when searching) */}
      {searchQuery.trim() && (
        <ScrollArea className="max-h-40">
          <div className="space-y-1">
            {filteredStock.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                Aucun produit trouvé
              </p>
            ) : (
              filteredStock.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addProductFromStock(item)}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-secondary transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatMoney(item.unit_price)} CFA • {item.quantity} en stock
                      </p>
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-primary" />
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      )}

      {/* Selected products */}
      {selectedProducts.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Produits sélectionnés</Label>
          {selectedProducts.map((product, index) => {
            const warning = getStockWarning(product);
            return (
              <Card
                key={index}
                className={cn(
                  "p-3",
                  warning && "border-amber-500/50 bg-amber-500/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">
                        {product.product_name}
                      </p>
                      {product.stock_item_id && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Stock
                        </Badge>
                      )}
                    </div>
                    {warning && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <p className="text-xs text-amber-600">{warning}</p>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeProduct(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Qté</Label>
                    <Input
                      type="number"
                      min={1}
                      value={product.quantity}
                      onChange={(e) =>
                        updateProductQuantity(index, parseInt(e.target.value) || 1)
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">
                      Prix unitaire
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={product.unit_price}
                      onChange={(e) =>
                        updateProductPrice(index, parseInt(e.target.value) || 0)
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="text-right">
                    <Label className="text-xs text-muted-foreground">Total</Label>
                    <p className="text-sm font-semibold">
                      {formatMoney(product.quantity * product.unit_price)}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Total */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-medium">Total produits</span>
            <span className="font-bold text-lg">
              {formatMoney(total)} <span className="text-sm">CFA</span>
            </span>
          </div>
        </div>
      )}

      {/* Add custom product button */}
      <button 
        onClick={() => setShowAddDialog(true)}
        className="w-full h-14 rounded-full flex items-center justify-center gap-2
          bg-gradient-to-r from-[#4f7df3] via-[#5b8af5] to-[#3b6ce8]
          text-white font-bold text-base tracking-wide uppercase
          shadow-lg shadow-blue-500/30 hover:shadow-xl
          active:scale-[0.98] transition-all"
      >
        <Plus className="w-5 h-5" />
        Ajouter un produit
      </button>

      {/* Add custom product dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajouter un produit</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Nom du produit</Label>
              <Input
                placeholder="Ex: Écran iPhone 12"
                value={newProduct.product_name}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, product_name: e.target.value })
                }
              />
            </div>
          <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantité</Label>
                <Input
                  type="number"
                  min={1}
                  value={newProduct.quantity}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      quantity: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div>
                <Label>Prix unitaire (CFA)</Label>
                <Input
                  type="number"
                  min={0}
                  value={newProduct.unit_price}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      unit_price: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            {/* Add to stock toggle */}
            {onCreateStockItem && (
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <Label htmlFor="add-to-stock" className="text-sm font-medium">
                    Ajouter au stock
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Le produit sera aussi créé dans votre inventaire
                  </p>
                </div>
                <Switch
                  id="add-to-stock"
                  checked={addToStock}
                  onCheckedChange={setAddToStock}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={addCustomProduct}
              disabled={!newProduct.product_name.trim() || newProduct.quantity <= 0 || isCreatingStock}
            >
              {isCreatingStock ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {isCreatingStock ? "Création..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
