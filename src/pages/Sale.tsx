import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFeatureTracking } from "@/hooks/use-feature-tracking";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useFrequentProducts } from "@/hooks/use-frequent-products";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { 
  FullScreenSheet, 
  FullScreenSheetHeader, 
  FullScreenSheetTitle, 
  FullScreenSheetContent 
} from "@/components/ui/fullscreen-sheet";
import { ArrowLeft, Check, User, MessageSquare, Mic, Wallet, CreditCard, Clock, Lock, Package, ChevronRight, Search, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import { toast } from "sonner";
import { useClients } from "@/hooks/use-clients";
import { useSales, SaleItem } from "@/hooks/use-sales";
import { useStock } from "@/hooks/use-stock";
import { VoiceSaleInput } from "@/components/sale/VoiceSaleInput";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProductSelector } from "@/components/sale/ProductSelector";
import { MenuSelector } from "@/components/sale/MenuSelector";
import { cn } from "@/lib/utils";
import FullScreenLayout from "@/components/layout/FullScreenLayout";
import { triggerHaptic } from "@/lib/haptics";

interface SaleProduct {
  stock_item_id?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
}

const Sale = () => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: "cash" | "credit" }>();
  const isCash = type === "cash";
  const { trackFeature } = useFeatureTracking();
  
  // Check voice_input feature status
  const { 
    isGloballyDisabled: voiceDisabled, 
    isNotInPlan: voiceNotInPlan,
    requiredPlan: voiceRequiredPlan,
    isBeta: voiceBeta,
  } = useFeatureAccess("voice_input");
  
  // Determine if voice button should be shown and its state
  const showVoiceButton = !voiceDisabled;
  const voiceButtonDisabled = voiceNotInPlan;

  const { clients, loading: clientsLoading, quickCreateClient } = useClients();
  const { addSale, sales } = useSales();
  const { items: stockItems, refetch: refetchStock, addItem } = useStock();
  const { profile } = useProfile();
  // FIX: isServiceMode now based on auto_deduct_stock setting, not specialty
  const shouldDeductStock = profile?.auto_deduct_stock ?? true;
  const isServiceMode = !shouldDeductStock;

  // Track page view
  useEffect(() => {
    trackFeature("sales", { action: "page_view", metadata: { type } });
  }, [trackFeature, type]);
  
  const [selectedProducts, setSelectedProducts] = useState<SaleProduct[]>([]);
  const [showProductsSheet, setShowProductsSheet] = useState(false);
  const [showMenuSheet, setShowMenuSheet] = useState(false);
  const [showHistorySheet, setShowHistorySheet] = useState(false);
  const [showNoteSheet, setShowNoteSheet] = useState(false);
  const [showClientSheet, setShowClientSheet] = useState(false);
  const [clientSearch, setClientSearch] = useState("");

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(false);

  const selectedClientName = useMemo(
    () => clients.find((c) => c.id === selectedClient)?.name,
    [clients, selectedClient]
  );

  // Recent/frequent clients for quick selection
  const recentAndFrequentClients = useMemo(() => {
    if (!clients.length) return [];
    
    // Count client usage from sales
    const clientUsage = new Map<string, number>();
    sales.forEach(sale => {
      if (sale.client_id) {
        clientUsage.set(sale.client_id, (clientUsage.get(sale.client_id) || 0) + 1);
      }
    });
    
    // Sort by usage frequency and take top 3 (limited for UX)
    return [...clients].sort((a, b) => {
      const aUsage = clientUsage.get(a.id) || 0;
      const bUsage = clientUsage.get(b.id) || 0;
      return bUsage - aUsage;
    }).slice(0, 3);
  }, [clients, sales]);

  // Filter clients by search
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const search = clientSearch.toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(search) ||
      c.phone?.toLowerCase().includes(search)
    );
  }, [clients, clientSearch]);

  // Frequent products from real sales data
  const { frequentProductNames, frequentProductsMap } = useFrequentProducts(3);
  // Calculate total from products if any selected
  const productTotal = useMemo(() => {
    return selectedProducts.reduce(
      (sum, p) => sum + p.quantity * p.unit_price,
      0
    );
  }, [selectedProducts]);

  // Use product total or manual amount
  const effectiveAmount = useMemo(() => {
    if (selectedProducts.length > 0) {
      return productTotal;
    }
    return parseInt(amount) || 0;
  }, [selectedProducts, productTotal, amount]);

  const formatMoney = (value: string | number) => {
    const num = typeof value === "string" ? parseInt(value) || 0 : value;
    return new Intl.NumberFormat("fr-FR").format(num);
  };

  const handleNumberClick = (num: string) => {
    if (amount.length < 10) {
      setAmount((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    setAmount((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setAmount("");
  };

  const handleSubmit = async () => {
    if (effectiveAmount === 0) {
      toast.error("Entrez un montant valide ou sélectionnez des produits");
      return;
    }
    if (!isCash && !selectedClient) {
      toast.error("Sélectionnez un client");
      return;
    }

    setIsLoading(true);
    triggerHaptic('medium');
    try {
      // Prepare sale items from selected products
      const saleItems: SaleItem[] = selectedProducts.map((p) => ({
        stock_item_id: p.stock_item_id || null,
        product_name: p.product_name,
        quantity: p.quantity,
        unit_price: p.unit_price,
      }));

      const created = await addSale({
        type: isCash ? "cash" : "credit",
        amount: effectiveAmount,
        note: note || undefined,
        // FIX: Allow client_id for both cash AND credit sales (for tracking/loyalty)
        client_id: selectedClient || undefined,
        items: saleItems.length > 0 ? saleItems : undefined,
        shouldDeductStock, // Pass the setting from profile
      });

      if (!created) {
        setIsLoading(false);
        return;
      }

      // Refresh stock if products were sold
      if (saleItems.length > 0) {
        refetchStock();
      }

      triggerHaptic('success');
      setShowSuccess(true);
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000);
    } catch {
      toast.error("Erreur lors de l'enregistrement");
      setIsLoading(false);
    }
  };

  const handleVoiceSaleComplete = async (saleData: {
    type: "cash" | "credit";
    amount: number;
    note?: string;
    client_id?: string;
    items?: SaleItem[];
  }) => {
    await addSale(saleData);
    // Refresh stock after voice sale
    refetchStock();
  };

  const handleVoiceSalesFinished = () => {
    setShowSuccess(true);
    setTimeout(() => {
      navigate("/dashboard");
    }, 1000);
  };

  const quickAmounts = [1000, 2000, 5000, 10000, 25000, 50000];

  // Voice input mode
  if (showVoiceInput) {
    return (
      <FullScreenLayout transparentStatusBar>
        <div className={`${isCash ? "gradient-cash" : "gradient-credit"} px-4 py-3 pt-[env(safe-area-inset-top)] text-primary-foreground`}>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9"
              onClick={() => setShowVoiceInput(false)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold">
              {isCash ? "Vente Cash" : "Vente Crédit"} - Dictée
            </h1>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <ErrorBoundary 
            fallbackTitle="Erreur de saisie vocale"
            onRetry={() => setShowVoiceInput(false)}
          >
            <VoiceSaleInput
              clients={clients}
              stockItems={stockItems}
              onComplete={handleVoiceSaleComplete}
              onCancel={() => setShowVoiceInput(false)}
              onCreateClient={quickCreateClient}
              onCreateStockItem={async (item) => {
                const itemWithExtras = item as { name: string; quantity: number; unit_price: number; is_menu_item?: boolean; category?: string };
                const result = await addItem({
                  name: itemWithExtras.name,
                  quantity: itemWithExtras.quantity,
                  unit_price: itemWithExtras.unit_price,
                  source: "voice",
                  is_menu_item: itemWithExtras.is_menu_item,
                  category: itemWithExtras.category,
                });
                if (result) {
                  return { id: result.id };
                }
                return null;
              }}
              onFinish={handleVoiceSalesFinished}
            />
          </ErrorBoundary>
        </div>
      </FullScreenLayout>
    );
  }

  if (showSuccess) {
    return (
      <FullScreenLayout className="items-center justify-center p-6">
        <div className="text-center animate-scale-in">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${isCash ? "bg-cash" : "bg-credit"}`}>
            <Check className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold mb-1">Vente enregistrée !</h1>
          <p className="text-2xl font-bold text-foreground">
            {formatMoney(effectiveAmount)} <span className="text-base text-muted-foreground">CFA</span>
          </p>
          {!isCash && selectedClientName && (
            <p className="text-muted-foreground mt-1 text-sm">Crédit: {selectedClientName}</p>
          )}
        </div>
      </FullScreenLayout>
    );
  }


  return (
    <FullScreenLayout transparentStatusBar>
      {/* Header - Compact with safe area */}
      <div className={`${isCash ? "gradient-cash" : "gradient-credit"} px-4 pt-[env(safe-area-inset-top)] text-primary-foreground shrink-0`}>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10 h-9 w-9"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">
                {isCash ? "Vente Cash" : "Vente Crédit"}
              </h1>
              {isServiceMode && (
                <Badge className="bg-amber-500/90 text-white border-0 text-[10px] px-1.5 py-0.5 h-auto">
                  <UtensilsCrossed className="w-3 h-3 mr-0.5" />
                  Service
                </Badge>
              )}
            </div>
          </div>
          
          {/* Voice button */}
          {showVoiceButton && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "text-primary-foreground h-9 w-9",
                  voiceButtonDisabled 
                    ? "opacity-60 cursor-not-allowed" 
                    : "hover:bg-primary-foreground/10"
                )}
                onClick={() => {
                  if (voiceButtonDisabled) {
                    toast.info(`Disponible pour ${voiceRequiredPlan}`, {
                      description: "Passez à un plan supérieur pour accéder à la saisie vocale.",
                    });
                  } else {
                    setShowVoiceInput(true);
                  }
                }}
              >
                {voiceButtonDisabled ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </Button>
              {voiceBeta && !voiceButtonDisabled && (
                <Badge 
                  variant="beta" 
                  className="absolute -top-1 -right-1 text-[8px] px-1 py-0 h-3.5"
                >
                  β
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Amount Display - More Compact */}
        <div className="text-center py-2">
          <p className="text-[10px] opacity-80 mb-0.5">
            {selectedProducts.length > 0 ? "Total produits" : "Montant"}
          </p>
          <p className="text-2xl font-bold">
            {formatMoney(effectiveAmount)} <span className="text-base">CFA</span>
          </p>
        </div>

        {/* Note button - Bottom right of header */}
        <div className="flex justify-end pb-1">
          <button 
            onClick={() => setShowNoteSheet(true)}
            className="flex items-center gap-1 px-2 py-1 bg-primary-foreground/10 rounded-full text-primary-foreground/90 hover:bg-primary-foreground/20 transition-colors"
          >
            <MessageSquare className="w-3 h-3" />
            <span className="text-[10px] font-medium">Note</span>
            {note && <span className="w-1 h-1 rounded-full bg-primary-foreground" />}
          </button>
        </div>
      </div>

      {/* Note FullScreen Sheet */}
      <FullScreenSheet open={showNoteSheet} onOpenChange={setShowNoteSheet}>
        <FullScreenSheetHeader className="border-b border-border/50">
          <FullScreenSheetTitle className="text-xl">Note de vente</FullScreenSheetTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Ajoutez des détails supplémentaires à cette vente
          </p>
        </FullScreenSheetHeader>
        <FullScreenSheetContent className="flex flex-col">
          <div className="flex-1 py-6">
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              Ajouter une note (optionnel)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Réparation écran + batterie, client revient demain..."
              className="w-full h-48 p-4 border border-border rounded-2xl resize-none 
                bg-secondary/30 text-base leading-relaxed
                focus:ring-2 focus:ring-primary/20 focus:border-primary
                placeholder:text-muted-foreground/60
                transition-all"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              {note.length} caractères
            </p>
          </div>
          <div className="pb-[env(safe-area-inset-bottom)] pt-4 border-t border-border/50">
            <button
              onClick={() => setShowNoteSheet(false)}
              className="w-full h-14 rounded-full flex items-center justify-center gap-2
                bg-gradient-to-r from-[#4f7df3] via-[#5b8af5] to-[#3b6ce8]
                text-white font-bold text-base tracking-wide
                shadow-lg shadow-blue-500/30 hover:shadow-xl
                active:scale-[0.98] transition-all"
            >
              <Check className="w-5 h-5" />
              Enregistrer la note
            </button>
          </div>
        </FullScreenSheetContent>
      </FullScreenSheet>

      {/* Content - Flex grow with controlled overflow */}
      <div className="flex-1 flex flex-col min-h-0 px-3 py-2">
        {/* Quick Amounts - 2 rows, 3 columns - Taller buttons */}
        <div className="grid grid-cols-3 gap-2 mb-3 shrink-0">
          {quickAmounts.map((quickAmount) => (
            <Button
              key={quickAmount}
              variant="secondary"
              size="sm"
              onClick={() => setAmount(String(quickAmount))}
              className="text-sm font-bold h-12 px-2"
            >
              {new Intl.NumberFormat("fr-FR").format(quickAmount)}
            </Button>
          ))}
        </div>

        {/* Produits / Menu / Récentes */}
        <div className={`grid gap-2 mb-3 shrink-0 ${isServiceMode ? "grid-cols-3" : "grid-cols-2"}`}>
          {/* Produits */}
          <button 
            onClick={() => setShowProductsSheet(true)}
            className="flex items-center justify-between px-3 py-3 bg-secondary/50 rounded-xl"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Package className="w-4 h-4 text-muted-foreground" />
              Produits
            </span>
            {selectedProducts.length > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-2">{selectedProducts.length}</Badge>
            )}
          </button>

          {/* Menu - Only for service mode */}
          {isServiceMode && (
            <button 
              onClick={() => setShowMenuSheet(true)}
              className="flex items-center justify-between px-3 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                <UtensilsCrossed className="w-4 h-4" />
                Menu
              </span>
            </button>
          )}

          {/* Ventes récentes */}
          <button 
            onClick={() => setShowHistorySheet(true)}
            className="flex items-center justify-between px-3 py-3 bg-secondary/50 rounded-xl"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Récentes
            </span>
            {sales.length > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-2">{sales.length}</Badge>
            )}
          </button>
        </div>

        {/* Client Selection - Available for both cash and credit */}
        <button 
          onClick={() => setShowClientSheet(true)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-secondary/50 rounded-xl mb-2 shrink-0"
        >
          <span className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {selectedClientName || "Sélectionner un client (optionnel)"}
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* FullScreen Sheet - Produits */}
        <FullScreenSheet open={showProductsSheet} onOpenChange={setShowProductsSheet}>
          <FullScreenSheetHeader>
            <FullScreenSheetTitle>Sélectionner des produits</FullScreenSheetTitle>
          </FullScreenSheetHeader>
          <FullScreenSheetContent className="h-[calc(100%-4rem)]">
            <ProductSelector
              stockItems={stockItems}
              selectedProducts={selectedProducts}
              onProductsChange={setSelectedProducts}
              frequentProductNames={frequentProductNames}
              frequentProductsMap={frequentProductsMap}
              onCreateStockItem={async (item) => {
                const itemWithExtras = item as { name: string; quantity: number; unit_price: number; is_menu_item?: boolean; category?: string };
                const result = await addItem({
                  name: itemWithExtras.name,
                  quantity: itemWithExtras.quantity,
                  unit_price: itemWithExtras.unit_price,
                  source: "manual",
                  is_menu_item: itemWithExtras.is_menu_item,
                  category: itemWithExtras.category,
                });
                if (result) {
                  return { id: result.id };
                }
                return null;
              }}
            />
          </FullScreenSheetContent>
        </FullScreenSheet>

        {/* FullScreen Sheet - Menu (Service Mode) */}
        <FullScreenSheet open={showMenuSheet} onOpenChange={setShowMenuSheet}>
          <FullScreenSheetHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
            <FullScreenSheetTitle className="flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-amber-500" />
              Sélectionner du menu
            </FullScreenSheetTitle>
          </FullScreenSheetHeader>
          <FullScreenSheetContent className="h-[calc(100%-4rem)]">
            <MenuSelector
              onSelect={(items) => {
                // Add menu items to selected products
                setSelectedProducts(prev => {
                  const newProducts = [...prev];
                  items.forEach(item => {
                    const existingIndex = newProducts.findIndex(
                      p => p.stock_item_id === item.stock_item_id
                    );
                    if (existingIndex >= 0) {
                      newProducts[existingIndex].quantity += item.quantity;
                    } else {
                      newProducts.push(item);
                    }
                  });
                  return newProducts;
                });
              }}
              onClose={() => setShowMenuSheet(false)}
            />
          </FullScreenSheetContent>
        </FullScreenSheet>

        {/* FullScreen Sheet - Ventes récentes */}
        <FullScreenSheet open={showHistorySheet} onOpenChange={setShowHistorySheet}>
          <FullScreenSheetHeader>
            <FullScreenSheetTitle>Ventes récentes</FullScreenSheetTitle>
          </FullScreenSheetHeader>
          <FullScreenSheetContent className="h-[calc(100%-4rem)]">
            <div className="space-y-2 pr-2">
              {sales.slice(0, 20).map((sale) => (
                <Card key={sale.id} className="bg-card/50">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        sale.type === "cash" ? "bg-cash/20" : "bg-credit/20"
                      )}>
                        {sale.type === "cash" ? (
                          <Wallet className="w-4 h-4 text-cash" />
                        ) : (
                          <CreditCard className="w-4 h-4 text-credit" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {formatMoney(String(sale.amount))} CFA
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sale.client_name || "Vente anonyme"}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sale.created_at).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </FullScreenSheetContent>
        </FullScreenSheet>

        {/* FullScreen Sheet - Clients (available for both) */}
        <FullScreenSheet open={showClientSheet} onOpenChange={(open) => {
          setShowClientSheet(open);
          if (!open) setClientSearch("");
        }}>
          <FullScreenSheetHeader>
            <FullScreenSheetTitle>Sélectionner un client</FullScreenSheetTitle>
            
            {/* Search bar with mic */}
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un client..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="pl-10 pr-12 h-12 rounded-xl"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10"
                onClick={() => {
                  toast.info("Recherche vocale bientôt disponible");
                }}
              >
                <Mic className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>
          </FullScreenSheetHeader>
          <FullScreenSheetContent className="h-[calc(100%-12rem)]">
            <div className="space-y-2 pr-2">
              {clientsLoading ? (
                <p className="text-center text-muted-foreground py-4">Chargement...</p>
              ) : clients.length === 0 && !clientSearch ? (
                // NOUVEAU: Écran vide avec CTA clair
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Aucun client enregistré</p>
                  <PrimaryActionButton onClick={() => navigate("/clients/new")}>
                    <User className="w-5 h-5" />
                    Créer votre premier client
                  </PrimaryActionButton>
                </div>
              ) : filteredClients.length === 0 && clientSearch ? (
                <p className="text-center text-muted-foreground py-4">
                  Aucun client trouvé
                </p>
              ) : (
                <>
                  {/* Section clients fréquents - uniquement si pas de recherche */}
                  {!clientSearch && recentAndFrequentClients.length > 0 && (
                    <div className="mb-4 bg-primary/5 rounded-xl p-3">
                      <p className="text-xs font-semibold text-primary uppercase mb-2">
                        Clients fréquents
                      </p>
                      <div className="space-y-2">
                        {recentAndFrequentClients.map((client) => (
                          <Card
                            key={`frequent-${client.id}`}
                            className={cn(
                              "cursor-pointer transition-all border-l-4 border-l-primary bg-card",
                              selectedClient === client.id && "border-2 border-primary"
                            )}
                            onClick={() => {
                              setSelectedClient(client.id);
                              setShowClientSheet(false);
                              setClientSearch("");
                            }}
                          >
                            <CardContent className="p-3 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                                <User className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold">{client.name}</p>
                                <p className="text-xs text-muted-foreground">{client.phone}</p>
                              </div>
                              {selectedClient === client.id && (
                                <Check className="w-5 h-5 text-primary" />
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Section tous les clients */}
                  <div className="bg-muted/30 rounded-xl p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      {clientSearch ? "Résultats" : "Tous les clients"}
                    </p>
                    <div className="space-y-2">
                      {(!clientSearch ? clients : filteredClients).map((client) => (
                        <Card
                          key={client.id}
                          className={cn(
                            "cursor-pointer transition-all bg-card",
                            selectedClient === client.id && "border-2 border-primary bg-primary/5"
                          )}
                          onClick={() => {
                            setSelectedClient(client.id);
                            setShowClientSheet(false);
                            setClientSearch("");
                          }}
                        >
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                              <User className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">{client.name}</p>
                              <p className="text-xs text-muted-foreground">{client.phone}</p>
                            </div>
                            {selectedClient === client.id && (
                              <Check className="w-5 h-5 text-primary" />
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </FullScreenSheetContent>
          <div className="absolute bottom-0 left-0 right-0 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] bg-background">
            <PrimaryActionButton 
              onClick={() => navigate("/clients/new")}
            >
              <User className="w-5 h-5" />
              Nouveau client
            </PrimaryActionButton>
          </div>
        </FullScreenSheet>

        {/* Spacer to push numpad down - smaller */}
        <div className="flex-1 min-h-2 max-h-8" />

        {/* Numpad - Taller keys */}
        <div className="shrink-0">
          {selectedProducts.length === 0 ? (
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto mb-4">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <NumpadButton key={num} onClick={() => handleNumberClick(num)}>
                  {num}
                </NumpadButton>
              ))}
              <NumpadButton onClick={handleClear} variant="secondary">
                C
              </NumpadButton>
              <NumpadButton onClick={() => handleNumberClick("0")}>0</NumpadButton>
              <NumpadButton onClick={handleDelete} variant="secondary">
                ←
              </NumpadButton>
            </div>
          ) : (
            <div className="text-center text-xs text-muted-foreground mb-4 py-1">
              Montant calculé depuis les produits
            </div>
          )}

          {/* Submit button - PrimaryActionButton style */}
          <PrimaryActionButton
            variant={isCash ? "blue" : "orange"}
            onClick={handleSubmit}
            disabled={effectiveAmount === 0 || (!isCash && !selectedClient) || isLoading}
          >
            <Check className="w-5 h-5" />
            Enregistrer {formatMoney(effectiveAmount)} CFA
          </PrimaryActionButton>
        </div>
      </div>
    </FullScreenLayout>
  );
};

const NumpadButton = ({
  children,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "secondary";
}) => (
  <button
    onClick={onClick}
    className={`h-[clamp(4rem,18vw,5rem)] rounded-xl text-xl font-bold transition-all duration-150 active:scale-95 ${
      variant === "secondary"
        ? "bg-secondary text-secondary-foreground"
        : "bg-card text-foreground border border-border hover:bg-secondary"
    }`}
  >
    {children}
  </button>
);

export default Sale;
