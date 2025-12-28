import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MessageCircle,
  Wallet,
  Clock,
  Check
} from "lucide-react";
import { toast } from "sonner";

const DebtDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount);
  };

  // Mock data
  const debt = {
    id: "1",
    name: "Ousmane Diallo",
    phone: "77 123 45 67",
    totalDebt: 125000,
    history: [
      { date: "15 Jan 2024", type: "credit", amount: 50000, note: "Ciment x5" },
      { date: "10 Jan 2024", type: "payment", amount: 25000 },
      { date: "05 Jan 2024", type: "credit", amount: 75000, note: "Fer à béton" },
      { date: "02 Jan 2024", type: "payment", amount: 50000 },
      { date: "28 Déc 2023", type: "credit", amount: 75000, note: "Peinture" },
    ],
  };

  const handlePayment = () => {
    if (!paymentAmount || parseInt(paymentAmount) === 0) {
      toast.error("Entrez un montant valide");
      return;
    }
    toast.success(`Paiement de ${formatMoney(parseInt(paymentAmount))} CFA enregistré`);
    setShowPaymentModal(false);
    setPaymentAmount("");
  };

  const handleReminder = (method: "sms" | "whatsapp") => {
    toast.success(`Rappel envoyé par ${method === "sms" ? "SMS" : "WhatsApp"}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card px-4 pt-4 pb-6 border-b border-border">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/debts")}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Détail Client</h1>
        </div>

        {/* Client Info */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{debt.name}</h2>
            <p className="text-muted-foreground flex items-center gap-1">
              <Phone className="w-4 h-4" />
              {debt.phone}
            </p>
          </div>
        </div>

        {/* Debt Amount */}
        <Card className="bg-debt/5 border-debt/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Dette totale</p>
            <p className="text-money-xl text-debt">
              {formatMoney(debt.totalDebt)} <span className="text-lg">CFA</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <Button
          variant="cash"
          size="lg"
          className="flex-col h-auto py-4 gap-2"
          onClick={() => setShowPaymentModal(true)}
        >
          <Wallet className="w-6 h-6" />
          <span className="text-sm">Recevoir paiement</span>
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="flex-col h-auto py-4 gap-2"
          onClick={() => handleReminder("whatsapp")}
        >
          <MessageCircle className="w-6 h-6" />
          <span className="text-sm">Envoyer rappel</span>
        </Button>
      </div>

      {/* History */}
      <div className="px-4 pb-8">
        <h3 className="text-lg font-bold mb-4">Historique</h3>
        <div className="space-y-3">
          {debt.history.map((item, index) => (
            <Card key={index} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
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
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                  </div>
                  <p className={`font-bold ${item.type === "payment" ? "text-success" : "text-debt"}`}>
                    {item.type === "payment" ? "-" : "+"}{formatMoney(item.amount)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-foreground/50 flex items-end z-50">
          <div className="bg-card w-full rounded-t-3xl p-6 animate-slide-up safe-bottom">
            <div className="w-12 h-1 bg-border rounded-full mx-auto mb-6" />
            <h3 className="text-xl font-bold mb-4 text-center">Recevoir un paiement</h3>
            
            <p className="text-sm text-muted-foreground text-center mb-2">Montant reçu</p>
            <div className="text-center mb-6">
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0"
                className="text-money-lg text-center w-full bg-transparent outline-none"
              />
              <span className="text-lg text-muted-foreground">CFA</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6">
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

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setShowPaymentModal(false)}
              >
                Annuler
              </Button>
              <Button
                variant="cash"
                size="lg"
                onClick={handlePayment}
              >
                <Check className="w-5 h-5 mr-2" />
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtDetail;
