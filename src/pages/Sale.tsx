import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Check, User, MessageSquare, Mic } from "lucide-react";
import { toast } from "sonner";
import { useClients } from "@/hooks/use-clients";
import { useSales } from "@/hooks/use-sales";
import { VoiceSaleInput } from "@/components/sale/VoiceSaleInput";

const Sale = () => {
  const navigate = useNavigate();
  const { type } = useParams<{ type: "cash" | "credit" }>();
  const isCash = type === "cash";

  const { clients, loading: clientsLoading, quickCreateClient } = useClients();
  const { addSale } = useSales();

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

  const formatMoney = (value: string) => {
    const num = parseInt(value) || 0;
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
    if (!amount || parseInt(amount) === 0) {
      toast.error("Entrez un montant valide");
      return;
    }
    if (!isCash && !selectedClient) {
      toast.error("Sélectionnez un client");
      return;
    }

    setIsLoading(true);
    try {
      const created = await addSale({
        type: isCash ? "cash" : "credit",
        amount: parseInt(amount),
        note: note || undefined,
        client_id: isCash ? undefined : selectedClient || undefined,
      });

      if (!created) {
        setIsLoading(false);
        return;
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
  }) => {
    await addSale(saleData);
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
          onComplete={handleVoiceSaleComplete}
          onCancel={() => setShowVoiceInput(false)}
          onCreateClient={quickCreateClient}
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
          
          {/* Voice button */}
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setShowVoiceInput(true)}
          >
            <Mic className="w-6 h-6" />
          </Button>
        </div>

        {/* Amount Display */}
        <div className="text-center py-6">
          <p className="text-sm opacity-80 mb-2">Montant</p>
          <p className="text-money-xl">
            {amount ? formatMoney(amount) : "0"} <span className="text-xl">CFA</span>
          </p>
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

      {/* Numpad */}
      <div className="px-4 pb-4 safe-bottom bg-background border-t border-border pt-4">
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

        <Button
          variant={isCash ? "cash" : "credit"}
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={!amount || parseInt(amount) === 0 || (!isCash && !selectedClient) || isLoading}
        >
          <Check className="w-6 h-6 mr-2" />
          Enregistrer la vente
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
