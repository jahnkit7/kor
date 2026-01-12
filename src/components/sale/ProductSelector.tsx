import { useState, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { 
  FullScreenSheet, 
  FullScreenSheetHeader, 
  FullScreenSheetTitle, 
  FullScreenSheetContent 
} from "@/components/ui/fullscreen-sheet";
import { Search, Plus, Package, AlertTriangle, Check, Trash2, Loader2, X, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
  frequentProductNames?: string[];
  frequentProductsMap?: Map<string, number>; // Product name -> total sold
}

// Web Speech API types (local to this file)
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

export function ProductSelector({
  stockItems,
  selectedProducts,
  onProductsChange,
  onCreateStockItem,
  compact = false,
  frequentProductNames = [],
  frequentProductsMap = new Map(),
}: ProductSelectorProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addToStock, setAddToStock] = useState(true);
  const [isCreatingStock, setIsCreatingStock] = useState(false);
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [newProduct, setNewProduct] = useState<SaleProduct>({
    product_name: "",
    quantity: 1,
    unit_price: 0,
  });

  // Frequent products from stock (top 3)
  const frequentProducts = useMemo(() => {
    if (frequentProductNames.length === 0) return [];
    return stockItems
      .filter(item => frequentProductNames.includes(item.name))
      .slice(0, 3);
  }, [stockItems, frequentProductNames]);

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

  // Voice search handler
  const startVoiceSearch = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({ title: "Reconnaissance vocale non supportée", variant: "destructive" });
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast({ title: "Accès au microphone refusé", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsVoiceSearching(true);
    };

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setSearchQuery(transcript.trim());
    };

    recognition.onerror = () => {
      setIsVoiceSearching(false);
    };

    recognition.onend = () => {
      setIsVoiceSearching(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [toast]);

  const stopVoiceSearch = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsVoiceSearching(false);
  }, []);

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

  // Render product item
  const renderProductItem = (item: StockItem, isFrequent: boolean = false) => {
    const totalSold = frequentProductsMap.get(item.name);
    return (
      <button
        key={item.id}
        onClick={() => addProductFromStock(item)}
        className={cn(
          "w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left",
          isFrequent 
            ? "bg-card border-l-4 border-l-primary hover:bg-primary/10" 
            : "bg-card hover:bg-secondary"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            isFrequent ? "bg-primary/15" : "bg-secondary"
          )}>
            <Package className={cn("w-5 h-5", isFrequent ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{item.name}</p>
              {isFrequent && totalSold && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                  {totalSold} vendus
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatMoney(item.unit_price)} CFA • {item.quantity} en stock
            </p>
          </div>
        </div>
        <Plus className="w-5 h-5 text-primary" />
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search bar with mic */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Rechercher un produit..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-14 h-12 text-base rounded-xl"
        />
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full",
            isVoiceSearching && "bg-primary/10 text-primary"
          )}
          onClick={isVoiceSearching ? stopVoiceSearch : startVoiceSearch}
        >
          <Mic className={cn("w-5 h-5", isVoiceSearching && "animate-pulse text-primary")} />
        </Button>
      </div>

      {/* Product sections */}
      {!searchQuery.trim() ? (
        <ScrollArea className="max-h-60">
          <div className="space-y-4">
            {/* Frequent products section */}
            {frequentProducts.length > 0 && (
              <div className="bg-primary/5 rounded-xl p-3">
                <p className="text-xs font-semibold text-primary uppercase mb-2">
                  Produits fréquents
                </p>
                <div className="space-y-2">
                  {frequentProducts.map((item) => renderProductItem(item, true))}
                </div>
              </div>
            )}

            {/* All products section */}
            {stockItems.length > 0 && (
              <div className="bg-muted/30 rounded-xl p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Tous les produits
                </p>
                <div className="space-y-2">
                  {stockItems.slice(0, 10).map((item) => renderProductItem(item, false))}
                </div>
                {stockItems.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Utilisez la recherche pour voir plus de produits
                  </p>
                )}
              </div>
            )}

            {stockItems.length === 0 && (
              <div className="text-center py-6">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Aucun produit en stock</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ajoutez un produit personnalisé ci-dessous
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      ) : (
        /* Search results */
        <ScrollArea className="max-h-60">
          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Résultats
            </p>
            <div className="space-y-2">
              {filteredStock.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun produit trouvé
                </p>
              ) : (
                filteredStock.map((item) => renderProductItem(item, false))
              )}
            </div>
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

      {/* Add custom product FullScreen Sheet */}
      <FullScreenSheet open={showAddDialog} onOpenChange={setShowAddDialog}>
        <FullScreenSheetHeader className="border-b border-border/50">
          <FullScreenSheetTitle className="text-xl">Ajouter un produit</FullScreenSheetTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Créez un nouveau produit pour cette vente
          </p>
        </FullScreenSheetHeader>
        <FullScreenSheetContent className="flex flex-col">
          <div className="flex-1 space-y-6 py-6">
            {/* Nom du produit */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Nom du produit</Label>
              <Input
                placeholder="Ex: Écran iPhone 12"
                value={newProduct.product_name}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, product_name: e.target.value })
                }
                className="h-14 text-base px-4 rounded-xl"
                autoFocus
              />
            </div>
            
            {/* Quantité et Prix */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">Quantité</Label>
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
                  className="h-14 text-base text-center rounded-xl"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-3 block">Prix unitaire (CFA)</Label>
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
                  className="h-14 text-base text-center rounded-xl"
                />
              </div>
            </div>

            {/* Aperçu du total */}
            {newProduct.product_name.trim() && newProduct.unit_price > 0 && (
              <div className="p-4 bg-secondary/50 rounded-2xl">
                <p className="text-sm text-muted-foreground mb-1">Aperçu</p>
                <p className="font-bold text-lg">
                  {newProduct.quantity} × {formatMoney(newProduct.unit_price)} = {formatMoney(newProduct.quantity * newProduct.unit_price)} CFA
                </p>
              </div>
            )}

            {/* Add to stock toggle */}
            {onCreateStockItem && (
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-2xl">
                <div>
                  <Label htmlFor="add-to-stock" className="text-sm font-medium">
                    Ajouter au stock
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
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
          
          {/* Boutons avec espacement */}
          <div className="space-y-4 pb-[env(safe-area-inset-bottom)] pt-4 border-t border-border/50">
            <button
              onClick={addCustomProduct}
              disabled={!newProduct.product_name.trim() || newProduct.quantity <= 0 || isCreatingStock}
              className="w-full h-14 rounded-full flex items-center justify-center gap-2
                bg-gradient-to-r from-[#4f7df3] via-[#5b8af5] to-[#3b6ce8]
                text-white font-bold text-base tracking-wide
                shadow-lg shadow-blue-500/30 hover:shadow-xl
                active:scale-[0.98] transition-all
                disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isCreatingStock ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              {isCreatingStock ? "Création..." : "Ajouter le produit"}
            </button>
            
            <Button 
              variant="outline" 
              className="w-full h-14 rounded-full text-base font-semibold"
              onClick={() => setShowAddDialog(false)}
            >
              <X className="w-5 h-5 mr-2" />
              Annuler
            </Button>
          </div>
        </FullScreenSheetContent>
      </FullScreenSheet>
    </div>
  );
}
