import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  CreditCard,
  TrendingUp,
  Plus,
  Bell,
  Package,
  BarChart3,
  Users,
  ArrowUpRight,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { RoleBadge } from "@/components/RoleBadge";
import { HideAmountsToggle, useHiddenAmount } from "@/components/HideAmountsToggle";
import { useRole, usePermissions } from "@/hooks/use-role";
import { useProfile } from "@/hooks/use-profile";
import { useSales } from "@/hooks/use-sales";
import { useDebts } from "@/hooks/use-debts";
import { useStock } from "@/hooks/use-stock";
import { cn } from "@/lib/utils";

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
}

const ModernDashboard = ({
  profile,
  todayStats,
  totalDebts,
  clientsWithDebts,
  stockTotalValue,
  stockItemsCount,
  recentSales,
}: ModernDashboardProps) => {
  const navigate = useNavigate();
  const { role } = useRole();
  const { canViewReports } = usePermissions();
  const { formatMoney, hideAmounts } = useHiddenAmount();
  const shopName = profile?.shop_name || "Ma Boutique";

  return (
    <div className="min-h-screen bg-background pb-24 overflow-x-hidden">
      {/* Modern Header - Clean & Minimal */}
      <div className="px-5 pt-8 pb-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">Bonjour 👋</p>
            <h1 className="text-2xl font-bold text-foreground">{shopName}</h1>
          </div>
          <div className="flex items-center gap-3">
            <RoleBadge role={role} />
            <HideAmountsToggle />
            <button className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>
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
            <p className="text-4xl font-extrabold tracking-tight">
              {formatMoney(todayStats.total)}
              <span className="text-lg ml-1 opacity-80">{!hideAmounts && "CFA"}</span>
            </p>
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
            <p className="text-xl font-bold text-foreground">{formatMoney(todayStats.cash)}</p>
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
            <p className="text-xl font-bold text-foreground">{formatMoney(todayStats.credit)}</p>
          </div>

          {/* Debts Card - Colored */}
          <div 
            className="bg-gradient-to-br from-[hsl(0_75%_55%)] to-[hsl(15_85%_50%)] rounded-2xl p-4 text-white cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => navigate("/debts")}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-5 h-5 opacity-70" />
            </div>
            <p className="text-xs opacity-80 font-medium">Dettes</p>
            <p className="text-xl font-bold">{formatMoney(totalDebts)}</p>
            <p className="text-xs opacity-70 mt-1">{clientsWithDebts} clients</p>
          </div>

          {/* Stock Card - Soft Blue */}
          <div 
            className="bg-gradient-to-br from-[hsl(230_60%_65%)] to-[hsl(250_60%_55%)] rounded-2xl p-4 text-white cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => navigate("/stock")}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-5 h-5 opacity-70" />
            </div>
            <p className="text-xs opacity-80 font-medium">Stock</p>
            <p className="text-xl font-bold">{formatMoney(stockTotalValue)}</p>
            <p className="text-xs opacity-70 mt-1">{stockItemsCount} produits</p>
          </div>
        </div>

        {/* Quick Actions - Modern Pill Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <Button
            onClick={() => navigate("/sale/cash")}
            className="h-14 rounded-2xl bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-primary-foreground shadow-none text-sm font-semibold"
          >
            <Wallet className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="truncate">Vente Cash</span>
          </Button>
          <Button
            onClick={() => navigate("/sale/credit")}
            className="h-14 rounded-2xl bg-accent hover:bg-accent/90 text-accent-foreground shadow-none text-sm font-semibold"
          >
            <CreditCard className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="truncate">Vente Crédit</span>
          </Button>
        </div>

        {/* Clients Quick Access */}
        <div 
          className="mt-4 bg-secondary rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/80 transition-colors"
          onClick={() => navigate("/clients")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Gérer les clients</p>
              <p className="text-xs text-muted-foreground">Voir tous les clients</p>
            </div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
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


      <BottomNav />
    </div>
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
