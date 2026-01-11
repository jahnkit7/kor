import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFeatureTracking } from "@/hooks/use-feature-tracking";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Wallet,
  CreditCard,
  User,
  Calendar,
  TrendingUp,
  FileText,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useHiddenAmount } from "@/components/HideAmountsToggle";
import { useSales, Sale } from "@/hooks/use-sales";
import { FeatureGate } from "@/components/FeatureGate";
import { InvoiceDialog } from "@/components/invoice/InvoiceDialog";
import { Skeleton, StatsSkeleton, ListSkeleton } from "@/components/ui/loading-skeleton";

type Period = "day" | "week" | "month" | "all";

const SalesHistory = () => {
  const navigate = useNavigate();
  const { formatMoney, hideAmounts } = useHiddenAmount();
  const { sales, loading, getPeriodStats } = useSales();
  const [period, setPeriod] = useState<Period>("day");
  const { trackFeature } = useFeatureTracking();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  // Track page view
  useEffect(() => {
    trackFeature("sales_history", { action: "page_view" });
  }, [trackFeature]);

  // Filter sales by period
  const filteredSales = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "all":
        return sales;
    }

    return sales.filter((s) => new Date(s.created_at) >= startDate);
  }, [sales, period]);

  // Calculate stats for filtered sales
  const stats = useMemo(() => {
    const total = filteredSales.reduce((sum, s) => sum + s.amount, 0);
    const cash = filteredSales
      .filter((s) => s.type === "cash")
      .reduce((sum, s) => sum + s.amount, 0);
    const credit = filteredSales
      .filter((s) => s.type === "credit")
      .reduce((sum, s) => sum + s.amount, 0);
    const count = filteredSales.length;

    return { total, cash, credit, count };
  }, [filteredSales]);

  // Group sales by date
  const groupedSales = useMemo(() => {
    const groups: Record<string, typeof filteredSales> = {};

    filteredSales.forEach((sale) => {
      const date = new Date(sale.created_at).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(sale);
    });

    return groups;
  }, [filteredSales]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const periodLabels = {
    day: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    all: "Tout",
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="bg-gradient-to-b from-[#f8f9ff] to-white px-4 pb-6 border-b border-border" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="p-4 space-y-4">
          <StatsSkeleton />
          <ListSkeleton count={5} variant="transaction" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <FeatureGate featureKey="sales" showUpgradePrompt>
      {/* Header */}
      <div className="bg-gradient-to-b from-[#f8f9ff] to-white px-4 pb-6 border-b border-border" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="w-6 h-6 text-[#2d3748]" />
          </Button>
          <h1 className="text-xl font-bold text-[#2d3748]">Historique des ventes</h1>
        </div>

        {/* Period Tabs */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="day">Jour</TabsTrigger>
            <TabsTrigger value="week">Semaine</TabsTrigger>
            <TabsTrigger value="month">Mois</TabsTrigger>
            <TabsTrigger value="all">Tout</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Summary */}
      <div className="p-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{periodLabels[period]}</p>
            </div>
            <p className="text-2xl font-bold mb-3">
              {formatMoney(stats.total)} {!hideAmounts && "CFA"}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Cash</p>
                <p className="text-sm font-semibold text-cash">
                  {formatMoney(stats.cash)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Crédit</p>
                <p className="text-sm font-semibold text-credit">
                  {formatMoney(stats.credit)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ventes</p>
                <p className="text-sm font-semibold">{stats.count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales List */}
      <div className="px-4">
        <ScrollArea className="h-[calc(100vh-340px)]">
          <div className="space-y-6 pr-2 pb-4">
            {Object.keys(groupedSales).length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Aucune vente {periodLabels[period].toLowerCase()}
                </p>
              </div>
            ) : (
              Object.entries(groupedSales).map(([date, daySales]) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-3">
                    <p className="text-sm font-semibold text-muted-foreground capitalize">
                      {date}
                    </p>
                    <Separator className="flex-1" />
                    <p className="text-xs text-muted-foreground">
                      {daySales.length} vente{daySales.length > 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {daySales.map((sale) => (
                      <Card 
                        key={sale.id} 
                        className="animate-fade-in cursor-pointer hover:bg-accent/50 transition-colors group"
                        onClick={() => {
                          setSelectedSale(sale);
                          setShowInvoice(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                sale.type === "cash"
                                  ? "bg-cash/10 text-cash"
                                  : "bg-credit/10 text-credit"
                              }`}
                            >
                              {sale.type === "cash" ? (
                                <Wallet className="w-5 h-5" />
                              ) : (
                                <CreditCard className="w-5 h-5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant="outline"
                                  className={
                                    sale.type === "cash"
                                      ? "border-cash text-cash"
                                      : "border-credit text-credit"
                                  }
                                >
                                  {sale.type === "cash" ? "Cash" : "Crédit"}
                                </Badge>
                                {sale.client_name && (
                                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {sale.client_name}
                                  </span>
                                )}
                              </div>
                              {sale.note && (
                                <p className="text-sm text-muted-foreground truncate">
                                  {sale.note}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {formatTime(sale.created_at)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <p
                                className={`text-lg font-bold ${
                                  sale.type === "credit"
                                    ? "text-credit"
                                    : "text-foreground"
                                }`}
                              >
                                {formatMoney(sale.amount)} CFA
                              </p>
                              <FileText className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
      </FeatureGate>

      {/* Invoice Dialog */}
      <InvoiceDialog
        open={showInvoice}
        onOpenChange={setShowInvoice}
        sale={selectedSale}
      />
    </AppLayout>
  );
};

export default SalesHistory;
