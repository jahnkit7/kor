import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Minus, Check } from "lucide-react";
import { useMenuItems, MENU_CATEGORIES, MenuItem } from "@/hooks/use-menu-items";
import { cn } from "@/lib/utils";

interface SelectedMenuItem {
  item: MenuItem;
  quantity: number;
}

interface MenuSelectorProps {
  onSelect: (items: Array<{ 
    stock_item_id: string | null; 
    product_name: string; 
    quantity: number; 
    unit_price: number;
  }>) => void;
  onClose: () => void;
}

export function MenuSelector({ onSelect, onClose }: MenuSelectorProps) {
  const { menuItems, menuItemsByCategory, loading } = useMenuItems();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedMenuItem>>(new Map());
  const [activeCategory, setActiveCategory] = useState("all");

  // Filter items
  const filteredItems = useMemo(() => {
    let items = menuItems;
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.model?.toLowerCase().includes(query)
      );
    }
    
    // Filter by category
    if (activeCategory !== "all") {
      items = items.filter((item) => item.category === activeCategory);
    }
    
    return items;
  }, [menuItems, searchQuery, activeCategory]);

  // Format money
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount);
  };

  // Calculate total
  const total = useMemo(() => {
    let sum = 0;
    selectedItems.forEach(({ item, quantity }) => {
      sum += item.price * quantity;
    });
    return sum;
  }, [selectedItems]);

  // Handle quantity change
  const updateQuantity = (item: MenuItem, delta: number) => {
    setSelectedItems((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(item.id);
      
      if (existing) {
        const newQuantity = existing.quantity + delta;
        if (newQuantity <= 0) {
          newMap.delete(item.id);
        } else {
          newMap.set(item.id, { item, quantity: newQuantity });
        }
      } else if (delta > 0) {
        newMap.set(item.id, { item, quantity: delta });
      }
      
      return newMap;
    });
  };

  // Handle confirm
  const handleConfirm = () => {
    const items = Array.from(selectedItems.values()).map(({ item, quantity }) => ({
      stock_item_id: item.id,
      product_name: item.name,
      quantity,
      unit_price: item.price,
    }));
    onSelect(items);
    onClose();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (menuItems.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center">
          <span className="text-2xl">🍽️</span>
        </div>
        <div>
          <p className="font-medium">Aucun article de menu</p>
          <p className="text-sm text-muted-foreground">
            Ajoutez des articles depuis la page Stock
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un article..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-4 pb-3">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2">
            <Button
              variant={activeCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory("all")}
              className="rounded-full shrink-0"
            >
              Tout
            </Button>
            {MENU_CATEGORIES.map((cat) => {
              const count = menuItemsByCategory.get(cat.value)?.length || 0;
              if (count === 0) return null;
              return (
                <Button
                  key={cat.value}
                  variant={activeCategory === cat.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(cat.value)}
                  className="rounded-full shrink-0 gap-1"
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Items list */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-2 pb-4">
          {filteredItems.map((item) => {
            const selected = selectedItems.get(item.id);
            const quantity = selected?.quantity || 0;
            
            return (
              <Card
                key={item.id}
                className={cn(
                  "p-3 transition-all",
                  quantity > 0 && "ring-2 ring-primary bg-primary/5"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-sm text-primary font-semibold">
                      {formatMoney(item.price)} CFA
                    </p>
                  </div>
                  
                  {/* Quantity controls */}
                  <div className="flex items-center gap-2">
                    {quantity > 0 && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => updateQuantity(item, -1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {quantity > 0 && (
                      <span className="w-8 text-center font-bold">{quantity}</span>
                    )}
                    
                    <Button
                      variant={quantity > 0 ? "default" : "outline"}
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => updateQuantity(item, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
          
          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucun article trouvé
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with total and confirm */}
      {selectedItems.size > 0 && (
        <div className="border-t p-4 bg-background">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">
                {selectedItems.size} article{selectedItems.size > 1 ? "s" : ""}
              </p>
              <p className="text-xl font-bold">
                {formatMoney(total)} <span className="text-base font-normal">CFA</span>
              </p>
            </div>
            <Button
              onClick={handleConfirm}
              className="h-12 px-6 rounded-xl gap-2"
            >
              <Check className="h-5 w-5" />
              Valider
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
