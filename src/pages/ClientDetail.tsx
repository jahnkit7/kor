import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  User,
  Phone,
  Wallet,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { ClientWarningBadge } from "@/components/ClientWarningBadge";
import { useHiddenAmount } from "@/components/HideAmountsToggle";
import { useClients } from "@/hooks/use-clients";
import { useSales } from "@/hooks/use-sales";
import { useDebts } from "@/hooks/use-debts";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";

interface Payment {
  id: string;
  amount: number;
  created_at: string;
  debt_id: string;
}

interface Transaction {
  id: string;
  type: "cash" | "credit" | "payment";
  amount: number;
  note: string | null;
  created_at: string;
}

const ClientDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { formatMoney } = useHiddenAmount();
  const { clients, loading: clientsLoading, toggleRisky } = useClients();
  const { sales, loading: salesLoading } = useSales();
  const { debts, loading: debtsLoading } = useDebts();
  const { profile } = useProfile();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  const client = clients.find((c) => c.id === id);

  // Fetch payments for this client
  useEffect(() => {
    const fetchPayments = async () => {
      if (!id) return;
      
      try {
        const { data, error } = await supabase
          .from("payments")
          .select("*")
          .eq("client_id", id)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setPayments(data);
        }
      } catch (err) {
        console.error("Error fetching payments:", err);
      } finally {
        setPaymentsLoading(false);
      }
    };

    fetchPayments();
  }, [id]);

  // Filter sales for this client
  const clientSales = useMemo(() => {
    return sales.filter((sale) => sale.client_id === id);
  }, [sales, id]);

  // Get debts for this client
  const clientDebts = useMemo(() => {
    return debts.filter((debt) => debt.client_id === id);
  }, [debts, id]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalCash = clientSales
      .filter((s) => s.type === "cash")
      .reduce((sum, s) => sum + s.amount, 0);
    const totalCredit = clientSales
      .filter((s) => s.type === "credit")
      .reduce((sum, s) => sum + s.amount, 0);
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalDebt = clientDebts.reduce(
      (sum, d) => sum + (d.amount - d.paid),
      0
    );

    return {
      cash: totalCash,
      credit: totalCredit,
      payments: totalPayments,
      currentDebt: totalDebt,
      totalPurchases: totalCash + totalCredit,
    };
  }, [clientSales, payments, clientDebts]);

  // Combine all transactions for timeline
  const allTransactions: Transaction[] = useMemo(() => {
    const transactions: Transaction[] = [];

    clientSales.forEach((sale) => {
      transactions.push({
        id: sale.id,
        type: sale.type,
        amount: sale.amount,
        note: sale.note,
        created_at: sale.created_at,
      });
    });

    payments.forEach((payment) => {
      transactions.push({
        id: payment.id,
        type: "payment",
        amount: payment.amount,
        note: null,
        created_at: payment.created_at,
      });
    });

    return transactions.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [clientSales, payments]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleWhatsAppReminder = () => {
    if (!client || !client.phone) return;
    
    const shopName = profile?.shop_name || "Ma Boutique";
    const message = totals.currentDebt > 0
      ? `Bonjour ${client.name}, ceci est un rappel de ${shopName}. Vous avez un solde de ${totals.currentDebt} CFA en attente. Merci de passer régler dès que possible.`
      : `Bonjour ${client.name}, merci pour vos achats chez ${shopName}!`;
    
    const phoneNumber = client.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const isLoading = clientsLoading || salesLoading || debtsLoading || paymentsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <AppLayout>
        <div className="p-4">
          <Button variant="ghost" onClick={() => navigate("/clients")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Client non trouvé</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="bg-card px-4 pt-4 pb-6 border-b border-border">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/clients")}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Détail client</h1>
        </div>

        {/* Client Info */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="absolute -top-1 -right-1">
              <ClientWarningBadge isRisky={client.is_risky} />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{client.name}</h2>
            <p className="text-muted-foreground flex items-center gap-1">
              <Phone className="w-4 h-4" />
              {client.phone || "Pas de téléphone"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => toggleRisky(client.id)}
              className={client.is_risky ? "text-credit border-credit" : ""}
            >
              <AlertTriangle className="w-4 h-4" />
            </Button>
            {client.phone && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleWhatsAppReminder}
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-4 grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total achats</p>
            <p className="text-lg font-bold">{formatMoney(totals.totalPurchases)} CFA</p>
          </CardContent>
        </Card>
        <Card className={totals.currentDebt > 0 ? "border-debt" : "border-success"}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Dette actuelle</p>
            <p className={`text-lg font-bold ${totals.currentDebt > 0 ? "text-debt" : "text-success"}`}>
              {formatMoney(totals.currentDebt)} CFA
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Tout</TabsTrigger>
            <TabsTrigger value="purchases">Achats</TabsTrigger>
            <TabsTrigger value="payments">Paiements</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <ScrollArea className="h-[calc(100vh-480px)]">
              <div className="space-y-3 pr-2">
                {allTransactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucune transaction
                  </p>
                ) : (
                  allTransactions.map((tx) => (
                    <TransactionCard
                      key={tx.id}
                      transaction={tx}
                      formatMoney={formatMoney}
                      formatDate={formatDate}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="purchases" className="mt-4">
            <ScrollArea className="h-[calc(100vh-480px)]">
              <div className="space-y-3 pr-2">
                {clientSales.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun achat
                  </p>
                ) : (
                  clientSales.map((sale) => (
                    <TransactionCard
                      key={sale.id}
                      transaction={{
                        id: sale.id,
                        type: sale.type,
                        amount: sale.amount,
                        note: sale.note,
                        created_at: sale.created_at,
                      }}
                      formatMoney={formatMoney}
                      formatDate={formatDate}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <ScrollArea className="h-[calc(100vh-480px)]">
              <div className="space-y-3 pr-2">
                {payments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun paiement
                  </p>
                ) : (
                  payments.map((payment) => (
                    <TransactionCard
                      key={payment.id}
                      transaction={{
                        id: payment.id,
                        type: "payment",
                        amount: payment.amount,
                        note: null,
                        created_at: payment.created_at,
                      }}
                      formatMoney={formatMoney}
                      formatDate={formatDate}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

const TransactionCard = ({
  transaction,
  formatMoney,
  formatDate,
}: {
  transaction: Transaction;
  formatMoney: (amount: number) => string;
  formatDate: (date: string) => string;
}) => {
  const config = {
    cash: {
      icon: Wallet,
      color: "text-cash bg-cash/10",
      label: "Achat cash",
      badgeVariant: "outline" as const,
      badgeClass: "border-cash text-cash",
    },
    credit: {
      icon: CreditCard,
      color: "text-credit bg-credit/10",
      label: "Achat crédit",
      badgeVariant: "outline" as const,
      badgeClass: "border-credit text-credit",
    },
    payment: {
      icon: TrendingUp,
      color: "text-success bg-success/10",
      label: "Paiement",
      badgeVariant: "outline" as const,
      badgeClass: "border-success text-success",
    },
  };

  const { icon: Icon, color, label, badgeClass } = config[transaction.type];

  return (
    <Card className="animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={badgeClass}>
                {label}
              </Badge>
            </div>
            {transaction.note && (
              <p className="text-sm text-muted-foreground truncate">
                {transaction.note}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {formatDate(transaction.created_at)}
            </p>
          </div>
          <p className={`text-lg font-bold ${
            transaction.type === "payment" ? "text-success" : 
            transaction.type === "credit" ? "text-credit" : "text-foreground"
          }`}>
            {transaction.type === "payment" ? "+" : ""}{formatMoney(transaction.amount)} CFA
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientDetail;
