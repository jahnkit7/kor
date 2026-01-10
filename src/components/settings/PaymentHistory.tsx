import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Download, Receipt, CheckCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentHistory, PaymentHistoryItem } from "@/hooks/use-payment-history";
import { downloadInvoice } from "@/lib/invoice-generator";
import { useProfile } from "@/hooks/use-profile";

function getStatusIcon(status: string) {
  switch (status) {
    case "success":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "pending":
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return null;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "success":
      return "Payé";
    case "pending":
      return "En attente";
    case "failed":
      return "Échoué";
    default:
      return status;
  }
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "success":
      return "default";
    case "pending":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

export function PaymentHistory() {
  const { data: payments, isLoading } = usePaymentHistory();
  const { profile } = useProfile();

  const handleDownloadInvoice = (payment: PaymentHistoryItem) => {
    downloadInvoice({
      invoiceNumber: payment.invoice_number,
      date: new Date(payment.created_at),
      customerName: profile?.shop_name || "Client",
      customerPhone: profile?.phone || undefined,
      planName: payment.plan_name,
      amountOriginal: payment.amount_original,
      discountApplied: payment.discount_applied,
      promoCodeUsed: payment.promo_code_used || undefined,
      amountPaid: payment.amount_paid,
      paymentMethod: payment.payment_method,
      transactionRef: payment.transaction_ref || undefined,
      currency: profile?.currency || "CFA",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Historique des paiements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5" />
          Historique des paiements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!payments || payments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun paiement effectué</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{payment.plan_name}</span>
                    <Badge variant={getStatusVariant(payment.status)}>
                      {getStatusIcon(payment.status)}
                      <span className="ml-1">{getStatusLabel(payment.status)}</span>
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    <p>
                      {format(new Date(payment.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                    </p>
                    <p>Via {payment.payment_method}</p>
                    {payment.promo_code_used && (
                      <p className="text-green-600">
                        Code promo: {payment.promo_code_used} (-{payment.discount_applied.toLocaleString()} CFA)
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {payment.amount_paid.toLocaleString()} CFA
                    </p>
                    {payment.discount_applied > 0 && (
                      <p className="text-sm text-muted-foreground line-through">
                        {payment.amount_original.toLocaleString()} CFA
                      </p>
                    )}
                  </div>
                  {payment.status === "success" && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDownloadInvoice(payment)}
                      title="Télécharger la facture"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
