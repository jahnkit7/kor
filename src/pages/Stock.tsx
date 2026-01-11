import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFeatureTracking } from "@/hooks/use-feature-tracking";
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
import { ArrowLeft, Plus, Package, Search, Mic, Loader2, History, RefreshCw, WifiOff, Cloud, CloudOff } from "lucide-react";
import { useStock, type NewStockItem, type StockItem } from "@/hooks/use-stock";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useToast } from "@/hooks/use-toast";
import { useOffline } from "@/contexts/OfflineContext";
import AppLayout from "@/components/layout/AppLayout";
import { StockEntryModes, type StockEntryMode } from "@/components/stock/StockEntryModes";
import { ManualStockInput } from "@/components/stock/ManualStockInput";
import { VoiceStockInput } from "@/components/stock/VoiceStockInput";
import { VoiceEntriesHistory } from "@/components/stock/VoiceEntriesHistory";
import { EditStockDialog } from "@/components/stock/EditStockDialog";
import { FeatureGate } from "@/components/FeatureGate";
import { ListSkeleton } from "@/components/ui/loading-skeleton";

export default function Stock() {
  useRequireAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, loading, addItem, addItems, updateItem, deleteItem, getTotalValue, refetch } = useStock();
  const { trackFeature } = useFeatureTracking();
  const { isOnline, isSyncing, pendingCount, performSync } = useOffline();

  // Track page view
  useEffect(() => {
    trackFeature("stock", { action: "page_view" });
  }, [trackFeature]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<StockEntryMode | null>(null);
  const [activeTab, setActiveTab] = useState("stock");
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Count unsynced items in current stock
  const unsyncedCount = items.filter(item => !item.synced).length;

  // Manual sync handler
  const handleManualSync = async () => {
    setIsManualSyncing(true);
    toast({ title: "🔄 Synchronisation...", description: "En cours" });
    
    try {
      await performSync();
      await refetch();
      toast({ title: "✅ Synchronisation terminée", description: "Stock mis à jour" });
    } catch (error) {
      console.error("Manual sync error:", error);
      toast({ 
        title: "❌ Erreur de synchronisation", 
        description: "Vérifiez votre connexion",
        variant: "destructive" 
      });
    } finally {
      setIsManualSyncing(false);
    }
  };
  
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
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [Stock] ===== handleAddItems START =====`);
    console.log(`[${timestamp}] [Stock] Items received:`, newItems.length);
    console.log(`[${timestamp}] [Stock] Items data:`, JSON.stringify(newItems));
    
    if (newItems.length === 0) {
      console.error(`[${timestamp}] [Stock] ❌ No items provided`);
      toast({
        title: "⚠️ Aucun produit",
        description: "Aucun produit à ajouter",
        variant: "destructive",
      });
      throw new Error("Aucun produit à ajouter");
    }
    
    try {
      console.log(`[${timestamp}] [Stock] Calling addItems...`);
      const results = await addItems(newItems);
      
      console.log(`[${timestamp}] [Stock] addItems returned:`, results.length, "items");
      
      if (results.length > 0) {
        toast({
          title: "✅ Stock généré",
          description: `${results.length} produit${results.length > 1 ? "s" : ""} ajouté${results.length > 1 ? "s" : ""}`,
        });
        setIsAddSheetOpen(false);
        setEntryMode(null);
      } else {
        console.error(`[${timestamp}] [Stock] ❌ addItems returned empty - all items failed`);
        toast({
          title: "❌ Échec de l'enregistrement",
          description: "Les produits n'ont pas pu être enregistrés. Vérifiez votre connexion.",
          variant: "destructive",
        });
        throw new Error("Aucun produit n'a pu être enregistré");
      }
    } catch (error) {
      console.error(`[${timestamp}] [Stock] ❌ handleAddItems EXCEPTION:`, error);
      throw error; // Re-throw to propagate to VoiceStockInput
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
    <FeatureGate featureKey="stock" showUpgradePrompt>
    <AppLayout>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gradient-to-b from-[#f8f9ff] to-white border-b">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5 text-[#2d3748]" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#2d3748]">Stock</h1>
              {/* Sync Status Badge */}
              {unsyncedCount > 0 && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <WifiOff className="h-3 w-3" />
                  {unsyncedCount}
                </Badge>
              )}
              {isSyncing && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Sync
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {items.length} produit{items.length > 1 ? "s" : ""} • {formatMoney(getTotalValue())}
            </p>
          </div>
          
          {/* Manual Sync Button */}
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleManualSync}
            disabled={isManualSyncing || isSyncing}
            className="shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isManualSyncing || isSyncing ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button 
            onClick={() => setIsAddSheetOpen(true)} 
            size="icon"
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Sync Warning Banner */}
        {unsyncedCount > 0 && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
              <CloudOff className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-sm text-orange-700 dark:text-orange-300 flex-1">
                {unsyncedCount} produit{unsyncedCount > 1 ? "s" : ""} en attente de synchronisation
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualSync}
                disabled={isManualSyncing || isSyncing}
                className="text-orange-700 dark:text-orange-300 hover:text-orange-900 dark:hover:text-orange-100"
              >
                {isManualSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sync'}
              </Button>
            </div>
          </div>
        )}

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
              <ListSkeleton count={5} variant="stock" />
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
                  className={`p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99] ${!item.synced ? 'border-orange-300 dark:border-orange-700' : ''}`}
                  onClick={() => setEditingItem(item)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate">{item.name}</h3>
                        {getSourceBadge(item.source)}
                        {/* Sync Status Indicator */}
                        {!item.synced && (
                          <Badge variant="outline" className="text-xs gap-1 text-orange-600 border-orange-300 dark:text-orange-400 dark:border-orange-700">
                            <Cloud className="h-3 w-3" />
                            En attente
                          </Badge>
                        )}
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
    </AppLayout>
    </FeatureGate>
  );
}
