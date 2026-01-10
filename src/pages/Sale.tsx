import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFeatureTracking } from "@/hooks/use-feature-tracking";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Check, User, MessageSquare, Mic, ChevronDown, ChevronUp, Wallet, CreditCard, Clock, Lock, Package } from "lucide-react";
import { BetaBadge } from "@/components/BetaBadge";
import { toast } from "sonner";
import { useClients } from "@/hooks/use-clients";
import { useSales, SaleItem } from "@/hooks/use-sales";
import { useStock } from "@/hooks/use-stock";
import { VoiceSaleInput } from "@/components/sale/VoiceSaleInput";
import { ProductSelector } from "@/components/sale/ProductSelector";
import { cn } from "@/lib/utils";

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
  const { addSale, sales, loading: salesLoading } = useSales();
  const { items: stockItems, loading: stockLoading, refetch: refetchStock, addItem } = useStock();

  // Track page view
  useEffect(() => {
    trackFeature("sales", { action: "page_view", metadata: { type } });
  }, [trackFeature, type]);
  
  const [showRecentSales, setShowRecentSales] = useState(false);
  const [showAllSales, setShowAllSales] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<SaleProduct[]>([]);
  
  // Displayed sales (limited or all)
  const displayedSales = useMemo(() => {
    return showAllSales ? sales : sales.slice(0, 10);
  }, [sales, showAllSales]);

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
    // Don't navigate immediately - let VoiceSaleInput handle multiple sales
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
      <div className="min-h-screen bg-background">
        <div className={`${isCash ? "gradient-cash" : "gradient-credit"} px-4 py-4 text-primary-foreground`}>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setShowVoiceInput(false)}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold">
              {isCash ? "Vente Cash" : "Vente Crédit"} - Dictée
            </h1>
          </div>
        </div>
        <VoiceSaleInput
          clients={clients}
          stockItems={stockItems}
          onComplete={handleVoiceSaleComplete}
          onCancel={() => setShowVoiceInput(false)}
          onCreateClient={quickCreateClient}
          onFinish={handleVoiceSalesFinished}
        />
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center animate-scale-in">
          <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ${isCash ? "bg-cash" : "bg-credit"}`}>
            <Check className="w-12 h-12 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Vente enregistrée !</h1>
          <p className="text-money-lg text-foreground">
            {formatMoney(amount)} <span className="text-lg text-muted-foreground">CFA</span>
          </p>
          {!isCash && selectedClientName && (
            <p className="text-muted-foreground mt-2">Crédit: {selectedClientName}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className={`${isCash ? "gradient-cash" : "gradient-credit"} px-4 py-4 text-primary-foreground`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold">
              {isCash ? "Vente Cash" : "Vente Crédit"}
            </h1>
          </div>
          
          {/* Voice button - hidden if globally disabled, shows lock if not in plan */}
          {showVoiceButton && (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "text-primary-foreground",
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
                  <Lock className="w-5 h-5" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </Button>
              {/* Beta badge on voice button */}
              {voiceBeta && !voiceButtonDisabled && (
                <Badge 
                  variant="beta" 
                  className="absolute -top-2 -right-2 text-[9px] px-1.5 py-0 h-4"
                >
                  Bêta
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Amount Display */}
        <div className="text-center py-6">
          <p className="text-sm opacity-80 mb-2">
            {selectedProducts.length > 0 ? "Total produits" : "Montant"}
          </p>
          <p className="text-money-xl">
            {formatMoney(effectiveAmount)} <span className="text-xl">CFA</span>
          </p>
          {selectedProducts.length > 0 && (
            <p className="text-xs opacity-70 mt-1">
              {selectedProducts.length} produit{selectedProducts.length > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 overflow-auto">
        {/* Quick Amounts */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {quickAmounts.map((quickAmount) => (
            <Button
              key={quickAmount}
              variant="secondary"
              size="sm"
              onClick={() => setAmount(String(quickAmount))}
              className="text-sm font-semibold"
            >
              {formatMoney(String(quickAmount))}
            </Button>
          ))}
        </div>

        {/* Product Selection Section */}
        <Collapsible open={showProducts} onOpenChange={setShowProducts} className="mb-4">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-4 py-3 bg-secondary/50 rounded-xl text-sm font-medium">
              <span className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                Produits
              </span>
              <span className="flex items-center gap-2 text-muted-foreground">
                {selectedProducts.length > 0 && (
                  <Badge variant="secondary">{selectedProducts.length}</Badge>
                )}
                {showProducts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Card className="p-3">
              <ProductSelector
                stockItems={stockItems}
                selectedProducts={selectedProducts}
                onProductsChange={setSelectedProducts}
                onCreateStockItem={async (item) => {
                  console.log("[Sale] Creating stock item from ProductSelector:", item);
                  const result = await addItem({
                    name: item.name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    source: "manual",
                  });
                  if (result) {
                    console.log("[Sale] Stock item created successfully:", result.id);
                    return { id: result.id };
                  }
                  return null;
                }}
              />
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Recent Sales History */}
        {sales.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowRecentSales(!showRecentSales)}
              className="w-full flex items-center justify-between px-4 py-3 bg-secondary/50 rounded-xl text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Ventes récentes
              </span>
              <span className="flex items-center gap-2 text-muted-foreground">
                <Badge variant="secondary">{sales.length}</Badge>
                {showRecentSales ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>
            
            {showRecentSales && (
              <>
                <ScrollArea className={cn("mt-2", showAllSales ? "max-h-[60vh]" : "max-h-48")}>
                  <div className="space-y-2">
                    {displayedSales.map((sale) => (
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
                                {sale.note && ` • ${sale.note}`}
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
                
                {/* Show all / Show less button */}
                {sales.length > 10 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 text-muted-foreground"
                    onClick={() => setShowAllSales(!showAllSales)}
                  >
                    {showAllSales ? "Afficher moins" : `Afficher tout (${sales.length})`}
                  </Button>
                )}
              </>
            )}
          </div>
        )}

        {/* Client Selection (Credit only) */}
        {!isCash && (
          <div className="mb-4">
            <p className="text-sm font-semibold text-muted-foreground mb-2">Client</p>
            <div className="space-y-2">
              {clientsLoading ? (
                <Card>
                  <CardContent className="p-4 text-center text-muted-foreground">
                    Chargement des clients...
                  </CardContent>
                </Card>
              ) : (
                clients.map((client) => (
                  <Card
                    key={client.id}
                    className={`cursor-pointer transition-all ${
                      selectedClient === client.id
                        ? "border-2 border-credit bg-credit/5"
                        : ""
                    }`}
                    onClick={() => setSelectedClient(client.id)}
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
              <Button variant="outline" className="w-full" onClick={() => navigate("/clients/new")}>
                <User className="w-5 h-5 mr-2" />
                Nouveau client
              </Button>
            </div>
          </div>
        )}

        {/* Note */}
        <div className="mb-4">
          <div className="flex items-center gap-2 px-4 py-3 bg-secondary rounded-xl">
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Ajouter une note (optionnel)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Numpad - disabled if products selected */}
      <div className="px-4 pb-4 safe-bottom bg-background border-t border-border pt-4">
        {selectedProducts.length === 0 ? (
          <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto mb-3">
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
          <div className="text-center text-sm text-muted-foreground mb-3 py-2">
            Le montant est calculé automatiquement à partir des produits
          </div>
        )}

        <Button
          variant={isCash ? "cash" : "credit"}
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={effectiveAmount === 0 || (!isCash && !selectedClient) || isLoading}
        >
          <Check className="w-6 h-6 mr-2" />
          Enregistrer {formatMoney(effectiveAmount)} CFA
        </Button>
      </div>
    </div>
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
    className={`h-14 rounded-xl text-xl font-bold transition-all duration-150 active:scale-95 ${
      variant === "secondary"
        ? "bg-secondary text-secondary-foreground"
        : "bg-card text-foreground border border-border hover:bg-secondary"
    }`}
  >
    {children}
  </button>
);

export default Sale;
