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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, Smartphone, Wallet, CreditCard, Tag, X, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useValidatePromoCode, useIncrementPromoCodeUsage, PromoCode } from "@/hooks/use-promo-codes";
import { supabase } from "@/integrations/supabase/client";
import { generateInvoiceNumber } from "@/lib/invoice-generator";

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

interface ReferralDiscountInfo {
  percent: number;
  referrerName: string;
  originalPrice: number;
}

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  planId?: string;
  price: number;
  subscriptionId?: string;
  referralDiscount?: ReferralDiscountInfo;
  onPaymentSuccess: () => void;
}

export function PaymentMethodDialog({
  open,
  onOpenChange,
  planName,
  planId,
  price,
  subscriptionId,
  referralDiscount,
  onPaymentSuccess,
}: PaymentMethodDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  const validatePromoCode = useValidatePromoCode();
  const incrementPromoUsage = useIncrementPromoCodeUsage();

  // Calculate promo code discount (on top of referral discount if any)
  const calculatePromoDiscount = () => {
    if (!appliedPromo) return 0;
    // Apply promo discount on the already reduced price (after referral)
    if (appliedPromo.discount_type === "percentage") {
      return Math.round((price * appliedPromo.discount_value) / 100);
    }
    return Math.min(appliedPromo.discount_value, price);
  };

  const promoDiscount = calculatePromoDiscount();
  const finalPrice = Math.max(0, price - promoDiscount);
  
  // Calculate total savings
  const referralSavings = referralDiscount ? referralDiscount.originalPrice - price : 0;
  const totalSavings = referralSavings + promoDiscount;

  const handleApplyPromoCode = async () => {
    if (!promoCodeInput.trim()) return;
    
    setValidatingPromo(true);
    setPromoError(null);

    try {
      const promo = await validatePromoCode.mutateAsync({
        code: promoCodeInput,
        planId,
      });
      setAppliedPromo(promo);
      setPromoCodeInput("");
    } catch (error) {
      setPromoError(error instanceof Error ? error.message : "Code invalide");
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
  };

  const handlePayment = async () => {
    if (!selectedMethod) return;

    setProcessing(true);

    // Simulate payment processing (2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Record payment in history
      const invoiceNumber = generateInvoiceNumber();
      const transactionRef = `TXN${Date.now().toString(36).toUpperCase()}`;
      const methodName = paymentMethods.find(m => m.id === selectedMethod)?.name || selectedMethod;

      await supabase.from("payment_history").insert({
        user_id: user.id,
        subscription_id: subscriptionId || null,
        plan_name: planName,
        amount_original: referralDiscount?.originalPrice || price,
        discount_applied: totalSavings,
        promo_code_used: appliedPromo?.code || null,
        amount_paid: finalPrice,
        payment_method: methodName,
        transaction_ref: transactionRef,
        status: "success",
        invoice_number: invoiceNumber,
      });

      // Increment promo code usage if used
      if (appliedPromo) {
        await incrementPromoUsage.mutateAsync(appliedPromo.code);
      }

      setProcessing(false);
      setSuccess(true);

      // Wait a moment to show success, then trigger callback
      setTimeout(() => {
        onPaymentSuccess();
        // Reset state for next use
        setSelectedMethod(null);
        setSuccess(false);
        setAppliedPromo(null);
        setPromoCodeInput("");
        setPromoError(null);
      }, 1500);
    } catch (error) {
      console.error("Payment error:", error);
      setProcessing(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!processing && !success) {
      onOpenChange(isOpen);
      if (!isOpen) {
        setSelectedMethod(null);
        setAppliedPromo(null);
        setPromoCodeInput("");
        setPromoError(null);
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
                {totalSavings > 0 ? (
                  <>
                    <span className="line-through text-muted-foreground">
                      {(referralDiscount?.originalPrice || price).toLocaleString()} CFA
                    </span>{" "}
                    <strong className="text-green-600">{finalPrice.toLocaleString()} CFA</strong>
                  </>
                ) : (
                  <strong>{price.toLocaleString()} CFA</strong>
                )}
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
            {/* Referral Discount Display (if applicable) */}
            {referralDiscount && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">
                    Parrainage de {referralDiscount.referrerName}
                  </span>
                </div>
                <span className="font-bold text-green-600">
                  -{referralDiscount.percent}%
                </span>
              </div>
            )}

            {/* Promo Code Section */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Code promo {referralDiscount && "(cumulable)"}
              </Label>
              {appliedPromo ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div>
                    <span className="font-mono font-bold text-blue-600">{appliedPromo.code}</span>
                    <span className="text-sm text-blue-600 ml-2">
                      -{appliedPromo.discount_type === "percentage" 
                        ? `${appliedPromo.discount_value}%` 
                        : `${appliedPromo.discount_value.toLocaleString()} CFA`}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleRemovePromo}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={promoCodeInput}
                    onChange={(e) => {
                      setPromoCodeInput(e.target.value.toUpperCase());
                      setPromoError(null);
                    }}
                    placeholder="Entrer un code promo"
                    className="font-mono uppercase"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleApplyPromoCode}
                    disabled={!promoCodeInput.trim() || validatingPromo}
                  >
                    {validatingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : "Appliquer"}
                  </Button>
                </div>
              )}
              {promoError && (
                <p className="text-sm text-destructive">{promoError}</p>
              )}
            </div>

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
              Payer {finalPrice.toLocaleString()} CFA
              {totalSavings > 0 && (
                <span className="ml-2 text-xs opacity-75">(-{totalSavings.toLocaleString()} CFA)</span>
              )}
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
