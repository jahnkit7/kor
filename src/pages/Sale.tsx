import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFeatureTracking } from "@/hooks/use-feature-tracking";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ArrowLeft, Check, User, MessageSquare, Mic, Wallet, CreditCard, Clock, Lock, Package, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useClients } from "@/hooks/use-clients";
import { useSales, SaleItem } from "@/hooks/use-sales";
import { useStock } from "@/hooks/use-stock";
import { VoiceSaleInput } from "@/components/sale/VoiceSaleInput";
import { ProductSelector } from "@/components/sale/ProductSelector";
import { cn } from "@/lib/utils";
import FullScreenLayout from "@/components/layout/FullScreenLayout";

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

  // Track page view
  useEffect(() => {
    trackFeature("sales", { action: "page_view", metadata: { type } });
  }, [trackFeature, type]);
  
  const [selectedProducts, setSelectedProducts] = useState<SaleProduct[]>([]);
  const [showProductsSheet, setShowProductsSheet] = useState(false);
  const [showHistorySheet, setShowHistorySheet] = useState(false);
  const [showNoteSheet, setShowNoteSheet] = useState(false);
  const [showClientSheet, setShowClientSheet] = useState(false);

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
        client_id: isCash ? undefined : selectedClient || undefined,
        items: saleItems.length > 0 ? saleItems : undefined,
      });

      if (!created) {
        setIsLoading(false);
        return;
      }

      // Refresh stock if products were sold
      if (saleItems.length > 0) {
        refetchStock();
      }

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
          <VoiceSaleInput
            clients={clients}
            stockItems={stockItems}
            onComplete={handleVoiceSaleComplete}
            onCancel={() => setShowVoiceInput(false)}
            onCreateClient={quickCreateClient}
            onFinish={handleVoiceSalesFinished}
          />
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
            <h1 className="text-lg font-bold">
              {isCash ? "Vente Cash" : "Vente Crédit"}
            </h1>
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

        {/* Amount Display - Compact */}
        <div className="text-center py-4">
          <p className="text-xs opacity-80 mb-1">
            {selectedProducts.length > 0 ? "Total produits" : "Montant"}
          </p>
          <p className="text-3xl font-bold">
            {formatMoney(effectiveAmount)} <span className="text-lg">CFA</span>
          </p>
        </div>

        {/* Note button - Bottom right of header */}
        <div className="flex justify-end pb-2">
          <Sheet open={showNoteSheet} onOpenChange={setShowNoteSheet}>
            <SheetTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-foreground/10 rounded-full text-primary-foreground/90 hover:bg-primary-foreground/20 transition-colors">
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Note</span>
                {note && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[40vh]">
              <SheetHeader>
                <SheetTitle>Note de vente</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ajouter une note (optionnel)..."
                  className="w-full h-32 p-3 border rounded-lg resize-none bg-secondary/30 text-sm"
                />
                <Button 
                  className="w-full mt-3" 
                  onClick={() => setShowNoteSheet(false)}
                >
                  Enregistrer
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Content - Flex grow with controlled overflow */}
      <div className="flex-1 flex flex-col min-h-0 px-3 py-2">
        {/* Quick Amounts - 2 rows, 3 columns */}
        <div className="grid grid-cols-3 gap-2 mb-3 shrink-0">
          {quickAmounts.map((quickAmount) => (
            <Button
              key={quickAmount}
              variant="secondary"
              size="sm"
              onClick={() => setAmount(String(quickAmount))}
              className="text-sm font-bold h-10 px-2"
            >
              {quickAmount >= 1000 ? `${quickAmount / 1000}k` : quickAmount}
            </Button>
          ))}
        </div>

        {/* Produits / Récentes - 50/50 */}
        <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
          {/* Produits */}
          <Sheet open={showProductsSheet} onOpenChange={setShowProductsSheet}>
            <SheetTrigger asChild>
              <button className="flex items-center justify-between px-3 py-3 bg-secondary/50 rounded-xl">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  Produits
                </span>
                {selectedProducts.length > 0 && (
                  <Badge variant="secondary" className="text-xs h-5 px-2">{selectedProducts.length}</Badge>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[100dvh] rounded-t-none pb-[env(safe-area-inset-bottom)]">
              <SheetHeader className="pt-2">
                <SheetTitle>Sélectionner des produits</SheetTitle>
              </SheetHeader>
              <div className="mt-4 h-[calc(100%-4rem)] overflow-auto">
                <ProductSelector
                  stockItems={stockItems}
                  selectedProducts={selectedProducts}
                  onProductsChange={setSelectedProducts}
                  onCreateStockItem={async (item) => {
                    const result = await addItem({
                      name: item.name,
                      quantity: item.quantity,
                      unit_price: item.unit_price,
                      source: "manual",
                    });
                    if (result) {
                      return { id: result.id };
                    }
                    return null;
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Ventes récentes */}
          <Sheet open={showHistorySheet} onOpenChange={setShowHistorySheet}>
            <SheetTrigger asChild>
              <button className="flex items-center justify-between px-3 py-3 bg-secondary/50 rounded-xl">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Récentes
                </span>
                {sales.length > 0 && (
                  <Badge variant="secondary" className="text-xs h-5 px-2">{sales.length}</Badge>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[100dvh] rounded-t-none pb-[env(safe-area-inset-bottom)]">
              <SheetHeader className="pt-2">
                <SheetTitle>Ventes récentes</SheetTitle>
              </SheetHeader>
              <ScrollArea className="mt-4 h-[calc(100%-4rem)]">
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
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>

        {/* Client Selection (Credit only) - Compact button */}
        {!isCash && (
          <Sheet open={showClientSheet} onOpenChange={setShowClientSheet}>
            <SheetTrigger asChild>
              <button className="w-full flex items-center justify-between px-3 py-2.5 bg-secondary/50 rounded-lg mb-2 shrink-0">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {selectedClientName || "Sélectionner un client"}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh]">
              <SheetHeader>
                <SheetTitle>Sélectionner un client</SheetTitle>
              </SheetHeader>
              <ScrollArea className="mt-4 h-[calc(100%-5rem)]">
                <div className="space-y-2 pr-2">
                  {clientsLoading ? (
                    <p className="text-center text-muted-foreground py-4">Chargement...</p>
                  ) : (
                    clients.map((client) => (
                      <Card
                        key={client.id}
                        className={cn(
                          "cursor-pointer transition-all",
                          selectedClient === client.id && "border-2 border-credit bg-credit/5"
                        )}
                        onClick={() => {
                          setSelectedClient(client.id);
                          setShowClientSheet(false);
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
                            <Check className="w-5 h-5 text-credit" />
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
              <div className="pt-3">
                <Button variant="outline" className="w-full" onClick={() => navigate("/clients/new")}>
                  <User className="w-4 h-4 mr-2" />
                  Nouveau client
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Spacer to push numpad down */}
        <div className="flex-1 min-h-0" />

        {/* Numpad - Compact */}
        <div className="shrink-0">
          {selectedProducts.length === 0 ? (
            <div className="grid grid-cols-3 gap-1.5 max-w-xs mx-auto mb-2">
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
            <div className="text-center text-xs text-muted-foreground mb-2 py-1">
              Montant calculé depuis les produits
            </div>
          )}

          <Button
            variant={isCash ? "cash" : "credit"}
            size="lg"
            className="w-full h-12"
            onClick={handleSubmit}
            disabled={effectiveAmount === 0 || (!isCash && !selectedClient) || isLoading}
          >
            <Check className="w-5 h-5 mr-2" />
            Enregistrer {formatMoney(effectiveAmount)} CFA
          </Button>
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
    className={`h-[clamp(3.25rem,14vw,4rem)] rounded-xl text-xl font-bold transition-all duration-150 active:scale-95 ${
      variant === "secondary"
        ? "bg-secondary text-secondary-foreground"
        : "bg-card text-foreground border border-border hover:bg-secondary"
    }`}
  >
    {children}
  </button>
);

export default Sale;
