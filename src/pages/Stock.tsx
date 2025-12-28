import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ArrowLeft, Plus, Package, Search, Mic, Loader2, History } from "lucide-react";
import { useStock, type NewStockItem, type StockItem } from "@/hooks/use-stock";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { StockEntryModes, type StockEntryMode } from "@/components/stock/StockEntryModes";
import { ManualStockInput } from "@/components/stock/ManualStockInput";
import { VoiceStockInput } from "@/components/stock/VoiceStockInput";
import { VoiceEntriesHistory } from "@/components/stock/VoiceEntriesHistory";
import { EditStockDialog } from "@/components/stock/EditStockDialog";

export default function Stock() {
  useRequireAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, loading, addItem, addItems, updateItem, deleteItem, getTotalValue } = useStock();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<StockEntryMode | null>(null);
  const [activeTab, setActiveTab] = useState("stock");
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.model?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " CFA";
  };

  const handleAddItem = async (item: NewStockItem) => {
    const result = await addItem(item);
    if (result) {
      toast({
        title: "Produit ajouté",
        description: `${item.name} ajouté au stock`,
      });
      setIsAddSheetOpen(false);
      setEntryMode(null);
    }
  };

  const handleAddItems = async (newItems: NewStockItem[]) => {
    const results = await addItems(newItems);
    if (results.length > 0) {
      toast({
        title: "Stock généré",
        description: `${results.length} produit${results.length > 1 ? "s" : ""} ajouté${results.length > 1 ? "s" : ""}`,
      });
      setIsAddSheetOpen(false);
      setEntryMode(null);
    }
  };

  const handleCloseSheet = () => {
    setIsAddSheetOpen(false);
    setEntryMode(null);
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "voice":
        return <Badge variant="secondary" className="text-xs gap-1"><Mic className="h-3 w-3" /> Voix</Badge>;
      case "approximate":
        return <Badge variant="outline" className="text-xs">≈</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Stock</h1>
            <p className="text-sm text-muted-foreground">
              {items.length} produit{items.length > 1 ? "s" : ""} • {formatMoney(getTotalValue())}
            </p>
          </div>
          <Button onClick={() => setIsAddSheetOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-4 pb-2">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="stock" className="gap-2">
              <Package className="h-4 w-4" />
              Stock
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Dictées
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Stock Tab */}
        <TabsContent value="stock" className="flex-1 m-0">
          <main className="p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Aucun produit en stock</p>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "Aucun résultat pour cette recherche" : "Ajoutez votre premier produit"}
                  </p>
                </div>
                {!searchQuery && (
                  <Button onClick={() => setIsAddSheetOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Ajouter du stock
                  </Button>
                )}
              </div>
            ) : (
              filteredItems.map((item) => (
                <Card 
                  key={item.id} 
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
                  onClick={() => setEditingItem(item)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate">{item.name}</h3>
                        {getSourceBadge(item.source)}
                      </div>
                      {item.model && (
                        <p className="text-sm text-muted-foreground">{item.model}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold money-display">{item.quantity}</p>
                      {item.unit_price > 0 && (
                        <p className="text-sm text-primary font-medium">
                          {formatMoney(item.unit_price)}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </main>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 m-0">
          <main className="p-4">
            <VoiceEntriesHistory onAddItems={handleAddItems} />
          </main>
        </TabsContent>
      </Tabs>

      {/* Voice Stock Input - Fullscreen */}
      {isAddSheetOpen && entryMode === "voice" && (
        <VoiceStockInput
          onComplete={handleAddItems}
          onCancel={handleCloseSheet}
        />
      )}

      {/* Add Stock Sheet - for mode selection and manual input */}
      <Sheet open={isAddSheetOpen && entryMode !== "voice"} onOpenChange={handleCloseSheet}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="sr-only">
            <SheetTitle>Ajouter du stock</SheetTitle>
          </SheetHeader>

          <div className="pt-4">
            {!entryMode ? (
              <StockEntryModes onSelectMode={setEntryMode} />
            ) : entryMode !== "voice" ? (
              <ManualStockInput
                mode={entryMode}
                onComplete={handleAddItem}
                onCancel={() => setEntryMode(null)}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Stock Dialog */}
      <EditStockDialog
        item={editingItem}
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        onSave={async (id, updates) => {
          const success = await updateItem(id, updates);
          if (success) {
            toast({
              title: "Produit modifié",
              description: "Les modifications ont été enregistrées",
            });
          }
          return success;
        }}
        onDelete={async (id) => {
          const success = await deleteItem(id);
          if (success) {
            toast({
              title: "Produit supprimé",
              description: "Le produit a été retiré du stock",
            });
          }
          return success;
        }}
      />

      <BottomNav />
    </div>
  );
}
