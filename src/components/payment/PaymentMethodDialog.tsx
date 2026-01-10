import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Check, Smartphone, Wallet, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: "orange_money",
    name: "Orange Money",
    icon: <Smartphone className="w-6 h-6" />,
    color: "bg-orange-500",
  },
  {
    id: "mtn_money",
    name: "MTN Mobile Money",
    icon: <Smartphone className="w-6 h-6" />,
    color: "bg-yellow-500",
  },
  {
    id: "wave",
    name: "Wave",
    icon: <Wallet className="w-6 h-6" />,
    color: "bg-blue-500",
  },
  {
    id: "moov_money",
    name: "Moov Money",
    icon: <Smartphone className="w-6 h-6" />,
    color: "bg-purple-500",
  },
  {
    id: "free_money",
    name: "Free Money",
    icon: <CreditCard className="w-6 h-6" />,
    color: "bg-green-500",
  },
];

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  price: number;
  onPaymentSuccess: () => void;
}

export function PaymentMethodDialog({
  open,
  onOpenChange,
  planName,
  price,
  onPaymentSuccess,
}: PaymentMethodDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePayment = async () => {
    if (!selectedMethod) return;

    setProcessing(true);

    // Simulate payment processing (2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setProcessing(false);
    setSuccess(true);

    // Wait a moment to show success, then trigger callback
    setTimeout(() => {
      onPaymentSuccess();
      // Reset state for next use
      setSelectedMethod(null);
      setSuccess(false);
    }, 1500);
  };

  const handleClose = (isOpen: boolean) => {
    if (!processing && !success) {
      onOpenChange(isOpen);
      if (!isOpen) {
        setSelectedMethod(null);
      }
    }
  };

  // Generate fake transaction ID
  const transactionId = `TXN${Date.now().toString(36).toUpperCase()}`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {success ? "Paiement réussi !" : "Choisir un moyen de paiement"}
          </DialogTitle>
          <DialogDescription>
            {success ? (
              `Transaction ${transactionId}`
            ) : (
              <>
                Plan <strong>{planName}</strong> -{" "}
                <strong>{price.toLocaleString()} CFA</strong>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-center text-muted-foreground">
              Votre abonnement a été activé avec succès !
            </p>
          </div>
        ) : processing ? (
          <div className="py-8 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-center text-muted-foreground">
              Traitement du paiement en cours...
            </p>
            <p className="text-sm text-muted-foreground">
              Veuillez ne pas fermer cette fenêtre
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {paymentMethods.map((method) => (
                <Card
                  key={method.id}
                  className={cn(
                    "p-4 cursor-pointer transition-all hover:border-primary",
                    selectedMethod === method.id
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                      : ""
                  )}
                  onClick={() => setSelectedMethod(method.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-white",
                        method.color
                      )}
                    >
                      {method.icon}
                    </div>
                    <span className="font-medium flex-1">{method.name}</span>
                    {selectedMethod === method.id && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={!selectedMethod}
              onClick={handlePayment}
            >
              Payer {price.toLocaleString()} CFA
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              En continuant, vous acceptez nos conditions d'utilisation
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
