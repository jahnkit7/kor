import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCard } from "@/components/ui/animated-card";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MessageCircle,
  Wallet,
  Clock,
  Check,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { useDebts, type Payment } from "@/hooks/use-debts";
import { useClients } from "@/hooks/use-clients";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { triggerHaptic } from "@/lib/haptics";

interface HistoryItem {
  id: string;
  date: string;
  type: "credit" | "payment";
  amount: number;
  note?: string;
}

const DebtDetail = () => {
  const navigate = useNavigate();
  const { id: clientId } = useParams();
  const { debts, loading: debtsLoading, addPayment, getPaymentsByDebt, refetch: refetchDebts } = useDebts();
  const { clients, loading: clientsLoading } = useClients();
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Find the client
  const client = clients.find(c => c.id === clientId);
  
  // Get all debts for this client
  const clientDebts = debts.filter(d => d.client_id === clientId);
  
  // Calculate total remaining debt
  const totalDebt = clientDebts.reduce((sum, d) => sum + d.remaining, 0);
  
  // Get the active debt (most recent with remaining balance)
  const activeDebt = clientDebts.find(d => d.remaining > 0);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d MMM yyyy", { locale: fr });
  };

  // Load history (debts + payments)
  useEffect(() => {
    const loadHistory = async () => {
      if (!clientId || debtsLoading) return;
      
      setLoadingHistory(true);
      try {
        const historyItems: HistoryItem[] = [];
        
        // Add all debts as credit items
        for (const debt of clientDebts) {
          historyItems.push({
            id: `debt-${debt.id}`,
            date: debt.created_at,
            type: "credit",
            amount: debt.amount,
            note: "Achat à crédit",
          });
          
          // Get payments for this debt
          const payments = await getPaymentsByDebt(debt.id);
          for (const payment of payments) {
            historyItems.push({
              id: `payment-${payment.id}`,
              date: payment.created_at,
              type: "payment",
              amount: payment.amount,
            });
          }
        }
        
        // Sort by date descending
        historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setHistory(historyItems);
      } catch (error) {
        console.error("Error loading history:", error);
      } finally {
        setLoadingHistory(false);
      }
    };
    
    loadHistory();
  }, [clientId, clientDebts.length, debtsLoading]);

  const handleOpenPaymentModal = (debtId: string) => {
    setSelectedDebtId(debtId);
    setPaymentAmount("");
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    if (!paymentAmount || parseInt(paymentAmount) === 0) {
      toast.error("Entrez un montant valide");
      return;
    }
    
    const amount = parseInt(paymentAmount);
    const debt = selectedDebtId 
      ? clientDebts.find(d => d.id === selectedDebtId)
      : activeDebt;
    
    if (!debt) {
      toast.error("Aucune dette sélectionnée");
      return;
    }
    
    if (amount > debt.remaining) {
      toast.error(`Le montant dépasse la dette restante (${formatMoney(debt.remaining)} CFA)`);
      return;
    }
    
    setProcessingPayment(true);
    triggerHaptic(25);
    try {
      await addPayment(debt.id, amount);
      
      // Add to history immediately
      setHistory(prev => [{
        id: `payment-new-${Date.now()}`,
        date: new Date().toISOString(),
        type: "payment",
        amount,
      }, ...prev]);
      
      setShowPaymentModal(false);
      setPaymentAmount("");
      setSelectedDebtId(null);
      
      triggerHaptic(25);
      
      // Refetch debts to update totals
      await refetchDebts();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Erreur lors du paiement");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleWhatsAppReminder = () => {
    if (!client) return;
    const message = `Bonjour ${client.name}, ceci est un rappel concernant votre dette de ${formatMoney(totalDebt)} CFA. Merci de passer régulariser votre situation.`;
    const phone = client.phone.replace(/[\s-]/g, "");
    const fullPhone = phone.startsWith("+") ? phone : "+221" + phone;
    const url = `https://wa.me/${fullPhone.replace("+", "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    toast.success("Ouverture de WhatsApp...");
  };

  const loading = debtsLoading || clientsLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <AlertTriangle className="w-12 h-12 text-warning mb-4" />
        <h2 className="text-lg font-bold mb-2">Client introuvable</h2>
        <Button onClick={() => navigate("/debts")}>Retour aux dettes</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] via-white to-[#f8f9ff]">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#f8f9ff] to-white px-4 pb-6 border-b border-border" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/debts")}
          >
            <ArrowLeft className="w-6 h-6 text-[#2d3748]" />
          </Button>
          <h1 className="text-xl font-bold text-[#2d3748]">Détail Client</h1>
        </div>

        {/* Client Info */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{client.name}</h2>
            <p className="text-muted-foreground flex items-center gap-1">
              <Phone className="w-4 h-4" />
              {client.phone}
            </p>
          </div>
        </div>

        {/* Debt Amount */}
        <Card className="bg-debt/5 border-debt/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Dette totale</p>
            <p className="text-money-xl text-debt">
              {formatMoney(totalDebt)} <span className="text-lg">CFA</span>
            </p>
            {totalDebt === 0 && (
              <p className="text-sm text-success mt-2">✓ Aucune dette en cours</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <Button
          variant="cash"
          size="lg"
          className="flex-col h-auto py-4 gap-2"
          onClick={() => activeDebt && handleOpenPaymentModal(activeDebt.id)}
          disabled={totalDebt === 0}
        >
          <Wallet className="w-6 h-6" />
          <span className="text-sm">Recevoir paiement</span>
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="flex-col h-auto py-4 gap-2"
          onClick={handleWhatsAppReminder}
          disabled={totalDebt === 0}
        >
          <MessageCircle className="w-6 h-6" />
          <span className="text-sm">Envoyer rappel</span>
        </Button>
      </div>

      {/* Active Debts List */}
      {clientDebts.filter(d => d.remaining > 0).length > 1 && (
        <div className="px-4 mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Dettes actives</h3>
          <div className="space-y-2">
            {clientDebts.filter(d => d.remaining > 0).map((debt) => (
              <Card 
                key={debt.id} 
                className="cursor-pointer hover:bg-secondary/50 transition-colors"
                onClick={() => handleOpenPaymentModal(debt.id)}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{formatDate(debt.created_at)}</p>
                    <p className="font-semibold">{formatMoney(debt.remaining)} CFA restant</p>
                  </div>
                  <Button size="sm" variant="cash">
                    Payer
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div className="px-4 pb-8">
        <h3 className="text-lg font-bold mb-4">Historique</h3>
        {loadingHistory ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Aucun historique pour ce client
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((item, index) => (
              <AnimatedCard key={item.id} delay={index}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      item.type === "payment" ? "bg-success/10" : "bg-credit/10"
                    }`}>
                      {item.type === "payment" ? (
                        <Wallet className="w-5 h-5 text-success" />
                      ) : (
                        <Clock className="w-5 h-5 text-credit" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {item.type === "payment" ? "Paiement reçu" : item.note || "Achat à crédit"}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                    </div>
                    <p className={`font-bold ${item.type === "payment" ? "text-success" : "text-debt"}`}>
                      {item.type === "payment" ? "-" : "+"}{formatMoney(item.amount)}
                    </p>
                  </div>
                </CardContent>
              </AnimatedCard>
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-foreground/50 flex items-end z-50">
          <div className="bg-card w-full rounded-t-3xl p-6 animate-slide-up safe-bottom">
            <div className="w-12 h-1 bg-border rounded-full mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2 text-center">Recevoir un paiement</h3>
            
            {selectedDebtId && (
              <p className="text-sm text-muted-foreground text-center mb-4">
                Dette: {formatMoney(clientDebts.find(d => d.id === selectedDebtId)?.remaining || 0)} CFA restant
              </p>
            )}
            
            {/* Boutons en HAUT */}
            <div className="space-y-3 mb-6">
              <PrimaryActionButton
                variant="green"
                onClick={handlePayment}
                disabled={processingPayment || !paymentAmount || parseInt(paymentAmount) === 0}
              >
                {processingPayment ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Confirmer {paymentAmount && parseInt(paymentAmount) > 0 ? `${formatMoney(parseInt(paymentAmount))} CFA` : ''}
                  </>
                )}
              </PrimaryActionButton>
              
              <Button
                variant="outline"
                className="w-full h-12 rounded-full"
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedDebtId(null);
                }}
                disabled={processingPayment}
              >
                Annuler
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground text-center mb-2">Montant reçu</p>
            <div className="text-center mb-4">
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0"
                className="text-money-lg text-center w-full bg-transparent outline-none"
              />
              <span className="text-lg text-muted-foreground">CFA</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[10000, 25000, 50000].map((amount) => (
                <Button
                  key={amount}
                  variant="secondary"
                  size="sm"
                  onClick={() => setPaymentAmount(String(amount))}
                >
                  {formatMoney(amount)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtDetail;