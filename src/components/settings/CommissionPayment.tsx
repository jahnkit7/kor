import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useCommissionBalance, 
  useCommissionPayments, 
  useCreateCommissionPayment 
} from "@/hooks/use-commission-balance";
import { toast } from "sonner";
import { 
  Wallet, 
  ArrowUpRight, 
  Clock, 
  CheckCircle, 
  XCircle,
  CreditCard
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const paymentMethods = [
  { value: "flooz", label: "Flooz" },
  { value: "tmoney", label: "T-Money" },
  { value: "momo", label: "MTN Mobile Money" },
  { value: "orange_money", label: "Orange Money" },
  { value: "cash", label: "Espèces" },
  { value: "wave", label: "Wave" },
];

export function CommissionPayment() {
  const { data: balance, isLoading: balanceLoading } = useCommissionBalance();
  const { data: payments, isLoading: paymentsLoading } = useCommissionPayments();
  const createPayment = useCreateCommissionPayment();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [reference, setReference] = useState("");

  const formatCFA = (value: number) => {
    return new Intl.NumberFormat("fr-FR").format(value) + " FCFA";
  };

  const handleSubmitPayment = async () => {
    if (!amount || !paymentMethod) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Montant invalide");
      return;
    }

    if (balance && amountNum > balance.balance) {
      toast.error("Le montant dépasse votre solde de commissions");
      return;
    }

    try {
      await createPayment.mutateAsync({
        amount: amountNum,
        payment_method: paymentMethod,
        notes: reference || undefined,
      });

      toast.success("Paiement soumis ! En attente de vérification.");
      setDialogOpen(false);
      setAmount("");
      setPaymentMethod("");
      setReference("");
    } catch (error) {
      toast.error("Erreur lors de la soumission du paiement");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-warning border-warning">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        );
      case "verified":
        return (
          <Badge className="bg-success/10 text-success">
            <CheckCircle className="w-3 h-3 mr-1" />
            Vérifié
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Rejeté
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (balanceLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Ne pas afficher si pas de record de commission
  if (!balance) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Commissions à payer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {balance.balance === 0 ? (
            // État aucune commission
            <div className="text-center py-6">
              <Wallet className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">Aucune commission à payer</p>
              <p className="text-sm text-muted-foreground mt-1">
                Vos commissions s'accumulent via le parrainage d'utilisateurs
              </p>
              <div className="flex justify-center gap-4 mt-4 text-sm text-muted-foreground">
                <span>Total gagné: {formatCFA(balance.total_earned)}</span>
                <span>Total payé: {formatCFA(balance.total_paid)}</span>
              </div>
            </div>
          ) : (
            <>
              {/* Balance Display */}
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-sm text-muted-foreground">Solde à payer</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCFA(balance.balance)}
                </p>
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  <span>Total gagné: {formatCFA(balance.total_earned)}</span>
                  <span>Total payé: {formatCFA(balance.total_paid)}</span>
                </div>
              </div>

              {/* Pay Button */}
              <Button 
                className="w-full" 
                onClick={() => setDialogOpen(true)}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Payer mes commissions
              </Button>
            </>
          )}

          {/* Payment History */}
          {payments && payments.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Historique des paiements</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {payments.slice(0, 5).map((payment) => (
                  <div 
                    key={payment.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{formatCFA(payment.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.created_at), "dd MMM yyyy", { locale: fr })}
                          {payment.payment_method && ` • ${payment.payment_method}`}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(payment.status)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payer mes commissions</DialogTitle>
            <DialogDescription>
              Solde actuel: {formatCFA(balance.balance)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Montant à payer</Label>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={balance.balance}
              />
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => setAmount(balance.balance.toString())}
              >
                Payer tout ({formatCFA(balance.balance)})
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Référence de transaction (optionnel)</Label>
              <Textarea
                placeholder="Numéro de transaction, notes..."
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>

            <div className="p-3 rounded-lg bg-muted text-sm">
              <p className="font-medium mb-1">Instructions de paiement</p>
              <p className="text-muted-foreground">
                Effectuez le paiement au numéro indiqué, puis soumettez ce formulaire.
                Notre équipe vérifiera le paiement dans les 24h.
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleSubmitPayment}
              disabled={createPayment.isPending}
            >
              {createPayment.isPending ? "Envoi..." : "Soumettre le paiement"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
