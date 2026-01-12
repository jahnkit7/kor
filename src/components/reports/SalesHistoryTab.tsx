import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wallet, CreditCard, User, ChevronRight, Receipt } from "lucide-react";
import { useHiddenAmount } from "@/components/HideAmountsToggle";
import { useSalesReadonly, SaleReadonly } from "@/hooks/use-sales-readonly";
import { InvoiceDialog } from "@/components/invoice/InvoiceDialog";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { cn } from "@/lib/utils";

type Period = "day" | "week" | "month" | "all";

const safeParseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

export function SalesHistoryTab() {
  const navigate = useNavigate();
  const { formatMoney } = useHiddenAmount();
  const { sales, loading } = useSalesReadonly();
  const [period, setPeriod] = useState<Period>("day");
  const [selectedSale, setSelectedSale] = useState<SaleReadonly | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  const filteredSales = useMemo(() => {
    const now = new Date();
    let startDate: Date | null = null;

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
        startDate = null;
        break;
    }

    if (!startDate) return sales;

    return sales.filter((s) => {
      const saleDate = safeParseDate(s.created_at);
      return saleDate && saleDate >= startDate;
    });
  }, [sales, period]);

  const groupedSales = useMemo(() => {
    const groups: Record<string, typeof filteredSales> = {};

    filteredSales.forEach((sale) => {
      const saleDate = safeParseDate(sale.created_at);
      if (!saleDate) return;

      try {
        const dateKey = saleDate.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(sale);
      } catch {
        // Skip
      }
    });

    return groups;
  }, [filteredSales]);

  const formatTime = (dateString: string) => {
    const date = safeParseDate(dateString);
    if (!date) return "--:--";
    try {
      return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "--:--";
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Period Tabs */}
      <div className="px-4 py-4">
        <div className="bg-card rounded-2xl p-1.5 shadow-card border border-border/50">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="grid w-full grid-cols-4 h-10 bg-transparent gap-1">
              {(["day", "week", "month", "all"] as Period[]).map((p) => (
                <TabsTrigger
                  key={p}
                  value={p}
                  className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground 
                             data-[state=active]:shadow-sm text-sm font-medium"
                >
                  {p === "day" ? "Jour" : p === "week" ? "Semaine" : p === "month" ? "Mois" : "Tout"}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Sales List */}
      <ScrollArea className="px-4">
        {filteredSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <Receipt className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucune vente</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Vous n'avez pas encore de vente pour cette période.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSales).map(([dateKey, sales]) => (
              <div key={dateKey}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 first-letter:capitalize">
                  {dateKey}
                </p>
                <div className="space-y-2">
                  {sales.map((sale) => (
                    <button
                      key={sale.id}
                      onClick={() => {
                        setSelectedSale(sale);
                        setShowInvoice(true);
                      }}
                      className="w-full bg-card rounded-2xl p-4 shadow-card border border-border/50 
                                 flex items-center gap-4 transition-all duration-200
                                 hover:shadow-md hover:border-primary/20 hover:scale-[1.01]
                                 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {/* Icon */}
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
                        sale.type === "cash"
                          ? "bg-gradient-to-br from-cash to-cash/80"
                          : "bg-gradient-to-br from-credit to-credit/80"
                      )}>
                        {sale.type === "cash" ? (
                          <Wallet className="w-5 h-5 text-white" />
                        ) : (
                          <CreditCard className="w-5 h-5 text-white" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground">
                            {formatMoney(sale.amount)} CFA
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs font-medium px-2 py-0.5",
                              sale.type === "cash"
                                ? "bg-cash/10 text-cash border-0"
                                : "bg-credit/10 text-credit border-0"
                            )}
                          >
                            {sale.type === "cash" ? "Cash" : "Crédit"}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {sale.client_name ? (
                            <>
                              <User className="w-3.5 h-3.5" />
                              <span className="truncate">{sale.client_name}</span>
                              <span>•</span>
                            </>
                          ) : null}
                          <span>{formatTime(sale.created_at)}</span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Invoice Dialog */}
      {selectedSale && (
        <InvoiceDialog
          open={showInvoice}
          onOpenChange={(open) => {
            setShowInvoice(open);
            if (!open) setSelectedSale(null);
          }}
          sale={{
            id: selectedSale.id,
            amount: selectedSale.amount,
            type: selectedSale.type as "cash" | "credit",
            client_id: selectedSale.client_id || null,
            client_name: selectedSale.client_name,
            note: selectedSale.note,
            created_at: selectedSale.created_at,
            user_id: "",
          }}
        />
      )}
    </div>
  );
}
