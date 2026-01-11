import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFeatureTracking } from "@/hooks/use-feature-tracking";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Wallet,
  CreditCard,
  User,
  TrendingUp,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  WifiOff,
  SlidersHorizontal,
  Receipt,
} from "lucide-react";

import { useHiddenAmount } from "@/components/HideAmountsToggle";
import { useSalesReadonly, SaleReadonly } from "@/hooks/use-sales-readonly";
import { InvoiceDialog } from "@/components/invoice/InvoiceDialog";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { SalesFilters, SaleTypeFilter, DateRange } from "@/components/sales/SalesFilters";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type Period = "day" | "week" | "month" | "all";

// Safe date parser - never throws
const safeParseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

// Modern Skeleton component
const SalesHistorySkeleton = () => (
  <div className="min-h-screen bg-background">
    {/* Header skeleton */}
    <div className="gradient-hero px-4 pb-8 pt-safe" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-10 w-10 rounded-xl bg-white/20" />
        <Skeleton className="h-7 w-40 bg-white/20" />
      </div>
      <div className="space-y-2 mb-6">
        <Skeleton className="h-4 w-24 bg-white/20" />
        <Skeleton className="h-12 w-48 bg-white/20" />
      </div>
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 flex-1 rounded-2xl bg-white/10" />
        ))}
      </div>
    </div>
    {/* List skeleton */}
    <div className="p-4 -mt-4 space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  </div>
);

// Error recovery UI
const ErrorRecoveryUI = ({ 
  error, 
  onRetry 
}: { 
  error: Error | null; 
  onRetry: () => void;
}) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
    <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
      <AlertTriangle className="w-10 h-10 text-destructive" />
    </div>
    <h2 className="text-xl font-bold mb-2">Oups !</h2>
    <p className="text-muted-foreground mb-6 max-w-xs">
      {error?.message || "Impossible de charger vos ventes"}
    </p>
    <Button onClick={onRetry} size="lg" className="gap-2 rounded-xl">
      <RefreshCw className="w-4 h-4" />
      Réessayer
    </Button>
  </div>
);

// Offline banner
const OfflineBanner = () => (
  <div className="mx-4 mb-4 px-4 py-3 bg-muted/80 backdrop-blur-sm rounded-2xl flex items-center gap-3 border border-border">
    <div className="w-8 h-8 rounded-full bg-muted-foreground/20 flex items-center justify-center">
      <WifiOff className="w-4 h-4 text-muted-foreground" />
    </div>
    <p className="text-sm text-muted-foreground font-medium">
      Mode hors-ligne
    </p>
  </div>
);

// Stat Card component
const StatCard = ({ 
  label, 
  value, 
  variant = "default" 
}: { 
  label: string; 
  value: string; 
  variant?: "cash" | "credit" | "default";
}) => (
  <div className={cn(
    "flex-1 px-4 py-3 rounded-2xl backdrop-blur-sm transition-all",
    variant === "cash" && "bg-white/15",
    variant === "credit" && "bg-white/15",
    variant === "default" && "bg-white/10"
  )}>
    <p className="text-xs text-white/70 mb-1 font-medium">{label}</p>
    <p className={cn(
      "text-base font-bold",
      variant === "cash" && "text-white",
      variant === "credit" && "text-white",
      variant === "default" && "text-white"
    )}>
      {value}
    </p>
  </div>
);

// Sale Item component - modern card design
const SaleItem = ({ 
  sale, 
  formatMoney, 
  formatTime, 
  onClick 
}: { 
  sale: SaleReadonly;
  formatMoney: (amount: number) => string;
  formatTime: (dateString: string) => string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
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
      
      {sale.note && (
        <p className="text-xs text-muted-foreground truncate mt-1">
          {sale.note}
        </p>
      )}
    </div>

    {/* Arrow */}
    <ChevronRight className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
  </button>
);

// Empty state
const EmptyState = ({ period }: { period: string }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
      <Receipt className="w-10 h-10 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold mb-2">Aucune vente</h3>
    <p className="text-muted-foreground text-sm max-w-xs">
      Vous n'avez pas encore de vente {period.toLowerCase()}. 
      Commencez à vendre pour voir apparaître vos transactions ici.
    </p>
  </div>
);

const SalesHistoryContent = () => {
  const navigate = useNavigate();
  const { formatMoney, hideAmounts } = useHiddenAmount();
  const { sales, loading, error, refetch } = useSalesReadonly();
  const { isOnline } = useNetworkStatus();
  const [period, setPeriod] = useState<Period>("day");
  const { trackFeature } = useFeatureTracking();
  const [selectedSale, setSelectedSale] = useState<SaleReadonly | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<SaleTypeFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  useEffect(() => {
    try {
      trackFeature("sales_history", { action: "page_view" });
    } catch {
      // Ignore
    }
  }, [trackFeature]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== "all") count++;
    if (dateRange.from || dateRange.to) count++;
    return count;
  }, [typeFilter, dateRange]);

  const clearFilters = () => {
    setTypeFilter("all");
    setDateRange({ from: undefined, to: undefined });
  };

  const filteredSales = useMemo(() => {
    let filtered = [...sales];

    if (!dateRange.from && !dateRange.to) {
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

      if (startDate) {
        filtered = filtered.filter((s) => {
          const saleDate = safeParseDate(s.created_at);
          return saleDate && saleDate >= startDate;
        });
      }
    } else {
      filtered = filtered.filter((s) => {
        const saleDate = safeParseDate(s.created_at);
        if (!saleDate) return false;
        
        if (dateRange.from && saleDate < dateRange.from) return false;
        if (dateRange.to) {
          const endOfDay = new Date(dateRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          if (saleDate > endOfDay) return false;
        }
        return true;
      });
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((s) => s.type === typeFilter);
    }

    return filtered;
  }, [sales, period, typeFilter, dateRange]);

  const stats = useMemo(() => {
    const total = filteredSales.reduce((sum, s) => sum + (s.amount || 0), 0);
    const cash = filteredSales
      .filter((s) => s.type === "cash")
      .reduce((sum, s) => sum + (s.amount || 0), 0);
    const credit = filteredSales
      .filter((s) => s.type === "credit")
      .reduce((sum, s) => sum + (s.amount || 0), 0);
    const count = filteredSales.length;

    return { total, cash, credit, count };
  }, [filteredSales]);

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
      return date.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "--:--";
    }
  };

  const periodLabels = {
    day: "Aujourd'hui",
    week: "Cette semaine",
    month: "Ce mois",
    all: "Historique complet",
  };

  if (error) {
    return <ErrorRecoveryUI error={error} onRetry={refetch} />;
  }

  if (loading) {
    return <SalesHistorySkeleton />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Hero Header with gradient */}
      <div 
        className="gradient-hero px-4 pb-8 relative overflow-hidden"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="text-white hover:bg-white/10 rounded-xl h-10 w-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <h1 className="text-lg font-bold text-white">Ventes</h1>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "text-white rounded-xl h-10 w-10 relative",
              showFilters || activeFiltersCount > 0 
                ? "bg-white/20" 
                : "hover:bg-white/10"
            )}
          >
            <SlidersHorizontal className="w-5 h-5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        {/* Stats */}
        <div className="relative z-10 mb-6">
          <p className="text-white/70 text-sm font-medium mb-1">
            {dateRange.from || dateRange.to ? "Période personnalisée" : periodLabels[period]}
          </p>
          <p className="text-4xl font-extrabold text-white tracking-tight">
            {formatMoney(stats.total)}
            {!hideAmounts && <span className="text-xl ml-2 font-semibold opacity-80">CFA</span>}
          </p>
        </div>

        {/* Mini stats */}
        <div className="flex gap-3 relative z-10">
          <StatCard 
            label="Cash" 
            value={`${formatMoney(stats.cash)} CFA`} 
            variant="cash" 
          />
          <StatCard 
            label="Crédit" 
            value={`${formatMoney(stats.credit)} CFA`} 
            variant="credit" 
          />
          <StatCard 
            label="Transactions" 
            value={stats.count.toString()} 
            variant="default" 
          />
        </div>
      </div>

      {/* Period Tabs - Floating */}
      <div className="px-4 -mt-4 mb-4 relative z-20">
        <div className="bg-card rounded-2xl p-1.5 shadow-card border border-border/50">
          <Tabs 
            value={dateRange.from || dateRange.to ? "custom" : period} 
            onValueChange={(v) => {
              if (v !== "custom") {
                setPeriod(v as Period);
                setDateRange({ from: undefined, to: undefined });
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-4 h-10 bg-transparent gap-1">
              {(["day", "week", "month", "all"] as Period[]).map((p) => (
                <TabsTrigger 
                  key={p}
                  value={p} 
                  disabled={!!(dateRange.from || dateRange.to)}
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

      {/* Collapsible Filters */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent className="px-4 pb-4">
          <div className="bg-card rounded-2xl p-4 border border-border/50 shadow-card">
            <SalesFilters
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              activeFiltersCount={activeFiltersCount}
              onClearFilters={clearFilters}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Offline Banner */}
      {!isOnline && <OfflineBanner />}

      {/* Sales List */}
      <ScrollArea className="h-[calc(100vh-380px)]">
        <div className="px-4 space-y-6 pb-4">
          {Object.keys(groupedSales).length === 0 ? (
            <EmptyState period={periodLabels[period]} />
          ) : (
            Object.entries(groupedSales).map(([date, daySales]) => (
              <div key={date} className="animate-fade-in">
                {/* Date header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground capitalize">
                    {date}
                  </h3>
                  <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
                    {daySales.length} vente{daySales.length > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Sales cards */}
                <div className="space-y-3">
                  {daySales.map((sale) => (
                    <SaleItem
                      key={sale.id}
                      sale={sale}
                      formatMoney={formatMoney}
                      formatTime={formatTime}
                      onClick={() => {
                        setSelectedSale(sale);
                        setShowInvoice(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Invoice Dialog */}
      <InvoiceDialog
        open={showInvoice}
        onOpenChange={setShowInvoice}
        sale={selectedSale as any}
      />
    </div>
  );
};

const SalesHistoryV2 = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <SalesHistorySkeleton />;
  }

  return (
    <ErrorBoundary fallbackTitle="Erreur dans l'historique des ventes">
      <SalesHistoryContent />
    </ErrorBoundary>
  );
};

export default SalesHistoryV2;
