import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  CreditCard,
  TrendingUp,
  Package,
  BarChart3,
  Users,
  ArrowUpRight,
  Radio,
  LockOpen,
  Lock,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import QuickActionFAB from "@/components/dashboard/QuickActionFAB";
import AppLayout from "@/components/layout/AppLayout";
import { RoleBadge } from "@/components/RoleBadge";
import { HideAmountsToggle, useHiddenAmount } from "@/components/HideAmountsToggle";
import { useRole, usePermissions } from "@/hooks/use-role";
import { useProfile } from "@/hooks/use-profile";
import { useSales } from "@/hooks/use-sales";
import { useDebts } from "@/hooks/use-debts";
import { useStock } from "@/hooks/use-stock";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { BetaBadge } from "@/components/BetaBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";
import type { CashDrawerEntry } from "@/hooks/use-cash-drawer";

interface ModernDashboardProps {
  profile: ReturnType<typeof useProfile>["profile"];
  todayStats: { total: number; cash: number; credit: number };
  totalDebts: number;
  clientsWithDebts: number;
  stockTotalValue: number;
  stockItemsCount: number;
  recentSales: Array<{
    id: string;
    type: string;
    amount: number;
    client_name?: string | null;
    note?: string | null;
    created_at: string;
  }>;
  isDataLoading?: boolean;
  cashDrawerEntry?: CashDrawerEntry | null;
  isDrawerOpen?: boolean;
  onOpenCashDrawer?: () => void;
  onCloseCashDrawer?: () => void;
}

const ModernDashboard = ({
  profile,
  todayStats,
  totalDebts,
  clientsWithDebts,
  stockTotalValue,
  stockItemsCount,
  recentSales,
  isDataLoading = false,
  cashDrawerEntry,
  isDrawerOpen = false,
  onOpenCashDrawer,
  onCloseCashDrawer,
}: ModernDashboardProps) => {
  const navigate = useNavigate();
  const { role } = useRole();
  const { canViewReports } = usePermissions();
  const { formatMoney, hideAmounts } = useHiddenAmount();
  const shopName = profile?.shop_name || "Ma Boutique";

  return (
    <AppLayout>
      {/* Modern Header - Clean & Minimal */}
      <div className="px-5 pt-8 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Bonjour 👋</p>
            <h1 className="text-2xl font-bold text-foreground">{shopName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <RoleBadge role={role} />
            <HideAmountsToggle />
            <NotificationBell />
          </div>
        </div>

        {/* Cash Drawer Status Card */}
        <div 
          className={cn(
            "rounded-2xl p-4 mb-6 cursor-pointer transition-all",
            isDrawerOpen 
              ? "bg-success/10 border border-success/20 hover:bg-success/15" 
              : "bg-muted/50 border border-border hover:bg-muted"
          )}
          onClick={() => {
            triggerHaptic();
            if (isDrawerOpen) {
              onCloseCashDrawer?.();
            } else {
              onOpenCashDrawer?.();
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                isDrawerOpen ? "bg-success/20" : "bg-muted"
              )}>
                {isDrawerOpen ? (
                  <LockOpen className="w-5 h-5 text-success" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isDrawerOpen ? "Caisse ouverte" : "Caisse fermée"}
                </p>
                {isDrawerOpen && cashDrawerEntry && (
                  <p className="text-xs text-muted-foreground">
                    Ouverture: {formatMoney(cashDrawerEntry.opening_amount)} CFA
                  </p>
                )}
              </div>
            </div>
            <Button
              variant={isDrawerOpen ? "outline" : "default"}
              size="sm"
              className="rounded-xl"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic();
                if (isDrawerOpen) {
                  onCloseCashDrawer?.();
                } else {
                  onOpenCashDrawer?.();
                }
              }}
            >
              {isDrawerOpen ? "Clôturer" : "Ouvrir"}
            </Button>
          </div>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-2 gap-3">
          {/* Main Stats Card - Large */}
          <div 
            className="col-span-2 bg-[hsl(var(--primary))] rounded-2xl p-5 text-primary-foreground cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => canViewReports && navigate("/reports")}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-primary-foreground/20 text-xs font-semibold">
                Aujourd'hui
              </span>
            </div>
            <p className="text-sm opacity-80 mb-1">Ventes du jour</p>
            {isDataLoading ? (
              <Skeleton className="h-10 w-32 bg-primary-foreground/20" />
            ) : (
              <p className="text-4xl font-extrabold tracking-tight">
                {formatMoney(todayStats.total)}
                <span className="text-lg ml-1 opacity-80">{!hideAmounts && "CFA"}</span>
              </p>
            )}
          </div>

          {/* Cash Card */}
          <div 
            className="bg-card rounded-2xl p-4 border border-border hover:shadow-lg transition-all cursor-pointer"
            onClick={() => navigate("/sale/cash")}
          >
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mb-3">
              <Wallet className="w-5 h-5 text-success" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">Cash</p>
            {isDataLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <p className="text-xl font-bold text-foreground">{formatMoney(todayStats.cash)}</p>
            )}
          </div>

          {/* Credit Card */}
          <div 
            className="bg-card rounded-2xl p-4 border border-border hover:shadow-lg transition-all cursor-pointer"
            onClick={() => navigate("/sale/credit")}
          >
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
              <CreditCard className="w-5 h-5 text-accent" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">Crédit</p>
            {isDataLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <p className="text-xl font-bold text-foreground">{formatMoney(todayStats.credit)}</p>
            )}
          </div>

          {/* Debts Card - Colored */}
          <div 
            className="relative bg-gradient-to-br from-[hsl(0_75%_55%)] to-[hsl(15_85%_50%)] rounded-2xl p-4 text-white cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => navigate("/debts")}
          >
            <BetaBadge featureKey="debts" position="top-right" size="sm" className="border border-white/30" />
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-5 h-5 opacity-70" />
            </div>
            <p className="text-xs opacity-80 font-medium">Dettes</p>
            {isDataLoading ? (
              <Skeleton className="h-7 w-20 bg-white/20" />
            ) : (
              <>
                <p className="text-xl font-bold">{formatMoney(totalDebts)}</p>
                <p className="text-xs opacity-70 mt-1">{clientsWithDebts} clients</p>
              </>
            )}
          </div>

          {/* Stock Card - Soft Blue */}
          <div 
            className="relative bg-gradient-to-br from-[hsl(230_60%_65%)] to-[hsl(250_60%_55%)] rounded-2xl p-4 text-white cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => navigate("/stock")}
          >
            <BetaBadge featureKey="stock" position="top-right" size="sm" className="border border-white/30" />
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-5 h-5 opacity-70" />
            </div>
            <p className="text-xs opacity-80 font-medium">Stock</p>
            {isDataLoading ? (
              <Skeleton className="h-7 w-20 bg-white/20" />
            ) : (
              <>
                <p className="text-xl font-bold">{formatMoney(stockTotalValue)}</p>
                <p className="text-xs opacity-70 mt-1">{stockItemsCount} produits</p>
              </>
            )}
          </div>
        </div>

        {/* Quick Actions - Grid 45% / 45% / 10% pour garantir le bouton + visible */}
        <div className="grid grid-cols-[45fr_45fr_10fr] gap-2 mt-6 items-center">
          <Button
            onClick={() => {
              triggerHaptic();
              navigate("/sale/cash");
            }}
            className="w-full min-w-0 h-[clamp(3rem,12vw,3.5rem)] rounded-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-primary-foreground shadow-lg shadow-primary/25 text-[clamp(0.75rem,3vw,1rem)] font-semibold px-3"
          >
            <Wallet className="w-[clamp(1rem,4vw,1.25rem)] h-[clamp(1rem,4vw,1.25rem)] mr-1.5 flex-shrink-0" />
            <span className="truncate">Cash</span>
          </Button>
          <Button
            onClick={() => {
              triggerHaptic();
              navigate("/sale/credit");
            }}
            className="w-full min-w-0 h-[clamp(3rem,12vw,3.5rem)] rounded-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/25 text-[clamp(0.75rem,3vw,1rem)] font-semibold px-3"
          >
            <CreditCard className="w-[clamp(1rem,4vw,1.25rem)] h-[clamp(1rem,4vw,1.25rem)] mr-1.5 flex-shrink-0" />
            <span className="truncate">Crédit</span>
          </Button>
          <div className="flex justify-center min-w-[clamp(2.75rem,10vw,3.25rem)]">
            <QuickActionFAB inline />
          </div>
        </div>

        {/* Network & Clients Quick Access */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div 
            className="relative bg-gradient-to-br from-[hsl(280_60%_55%)] to-[hsl(300_60%_45%)] rounded-2xl p-4 text-white cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => navigate("/network")}
          >
            <BetaBadge featureKey="network" position="top-right" size="sm" className="border border-white/30" />
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Radio className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-5 h-5 opacity-70" />
            </div>
            <p className="font-semibold text-sm">Réseau DÉKON</p>
            <p className="text-xs opacity-70">Marchands & demandes</p>
          </div>

          <div 
            className="relative bg-secondary rounded-2xl p-4 cursor-pointer hover:bg-secondary/80 transition-colors"
            onClick={() => navigate("/clients")}
          >
            <BetaBadge featureKey="clients" position="top-right" size="sm" />
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground text-sm">Clients</p>
            <p className="text-xs text-muted-foreground">Gérer les clients</p>
          </div>
        </div>

        {/* Recent Activity - Modern List */}
        {recentSales.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Récent</h2>
              {canViewReports && (
                <button 
                  className="text-sm text-primary font-semibold hover:underline"
                  onClick={() => navigate("/reports")}
                >
                  Voir tout
                </button>
              )}
            </div>
            
            <div className="space-y-2">
              {recentSales.slice(0, 3).map((sale) => (
                <ModernActivityItem
                  key={sale.id}
                  type={sale.type as "cash" | "credit"}
                  amount={sale.amount}
                  client={sale.client_name || undefined}
                  note={sale.note || undefined}
                  time={formatRelativeTime(sale.created_at)}
                  hideAmounts={hideAmounts}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `${diffMins} min`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Hier";
  return `${diffDays}j`;
}

const ModernActivityItem = ({
  type,
  amount,
  client,
  note,
  time,
  hideAmounts = false,
}: {
  type: "cash" | "credit";
  amount: number;
  client?: string;
  note?: string;
  time: string;
  hideAmounts?: boolean;
}) => {
  const formatMoney = (val: number) => {
    if (hideAmounts) return "•••••";
    return new Intl.NumberFormat("fr-FR").format(val);
  };

  return (
    <div className="bg-card rounded-xl p-3 border border-border flex items-center gap-3">
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center",
        type === "cash" ? "bg-success/10" : "bg-accent/10"
      )}>
        {type === "cash" ? (
          <Wallet className="w-4 h-4 text-success" />
        ) : (
          <CreditCard className="w-4 h-4 text-accent" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {client || note || (type === "cash" ? "Vente cash" : "Vente crédit")}
        </p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
      <p className={cn(
        "text-sm font-bold",
        type === "cash" ? "text-foreground" : "text-accent"
      )}>
        {formatMoney(amount)}
      </p>
    </div>
  );
};

export default ModernDashboard;
