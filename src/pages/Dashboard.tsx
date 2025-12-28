import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Wallet, 
  CreditCard, 
  TrendingUp, 
  Plus,
  ChevronRight,
  Bell
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { RoleBadge } from "@/components/RoleBadge";
import { HideAmountsToggle, useHiddenAmount } from "@/components/HideAmountsToggle";
import { WhatsAppShare } from "@/components/WhatsAppShare";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useRole, usePermissions } from "@/hooks/use-role";
import { getDashboardStats, getSales } from "@/lib/db";
import type { Sale } from "@/lib/db";

const Dashboard = () => {
  const { loading } = useRequireAuth();
  const navigate = useNavigate();
  const { role } = useRole();
  const { canViewReports } = usePermissions();
  const { formatMoney, hideAmounts } = useHiddenAmount();
  
  const [todayData, setTodayData] = useState({
    totalSales: 0,
    cashSales: 0,
    creditSales: 0,
    totalDebts: 0,
    clientsWithDebts: 0,
  });
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [shopName] = useState("Boutique Mamadou");

  useEffect(() => {
    getDashboardStats().then(setTodayData);
    getSales().then((sales) => {
      // Get last 5 sales
      const sorted = sales.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setRecentSales(sorted.slice(0, 5));
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="gradient-hero px-5 pt-6 pb-8 text-primary-foreground">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm opacity-80 font-medium">Bonjour 👋</p>
              <RoleBadge role={role} />
            </div>
            <h1 className="text-xl font-bold">{shopName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <HideAmountsToggle />
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
              <Bell className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Today's Total */}
        <Card className="bg-primary-foreground/10 border-0 backdrop-blur-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm opacity-80 font-medium">Ventes du jour</p>
              <WhatsAppShare
                type="sales"
                data={{
                  totalSales: todayData.totalSales,
                  cashSales: todayData.cashSales,
                  creditSales: todayData.creditSales,
                  shopName,
                }}
                variant="ghost"
                size="sm"
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 h-7 text-xs"
              />
            </div>
            <p className="text-money-xl text-primary-foreground">
              {formatMoney(todayData.totalSales)} <span className="text-lg">{!hideAmounts && "CFA"}</span>
            </p>
            <div className="flex gap-4 mt-4">
              <div className="flex-1">
                <p className="text-xs opacity-70">Cash</p>
                <p className="text-lg font-bold">{formatMoney(todayData.cashSales)}</p>
              </div>
              <div className="w-px bg-primary-foreground/20" />
              <div className="flex-1">
                <p className="text-xs opacity-70">Crédit</p>
                <p className="text-lg font-bold text-accent">{formatMoney(todayData.creditSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="px-5 -mt-4">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="cash"
            size="lg"
            className="flex-col h-auto py-5 gap-2"
            onClick={() => navigate("/sale/cash")}
          >
            <Wallet className="w-7 h-7" />
            <span>Vente Cash</span>
          </Button>
          <Button
            variant="credit"
            size="lg"
            className="flex-col h-auto py-5 gap-2"
            onClick={() => navigate("/sale/credit")}
          >
            <CreditCard className="w-7 h-7" />
            <span>Vente Crédit</span>
          </Button>
        </div>
      </div>

      {/* Debts Summary */}
      <div className="px-5 mt-6">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate("/debts")}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-debt/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-debt" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Dettes à récupérer</p>
                  <p className="text-money-md text-debt">{formatMoney(todayData.totalDebts)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm font-medium">{todayData.clientsWithDebts} clients</span>
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Activité récente</h2>
          {canViewReports && (
            <button 
              className="text-sm text-primary font-semibold"
              onClick={() => navigate("/reports")}
            >
              Voir tout
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          <ActivityItem
            type="cash"
            amount={15000}
            time="Il y a 5 min"
            note="Ciment x2"
            hideAmounts={hideAmounts}
          />
          <ActivityItem
            type="credit"
            amount={25000}
            client="Ousmane Diallo"
            time="Il y a 30 min"
            hideAmounts={hideAmounts}
          />
          <ActivityItem
            type="payment"
            amount={10000}
            client="Fatou Ndiaye"
            time="Il y a 1h"
            hideAmounts={hideAmounts}
          />
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        className="fixed right-5 bottom-28 w-16 h-16 rounded-full bg-accent text-accent-foreground shadow-glow flex items-center justify-center transition-transform active:scale-95"
        onClick={() => navigate("/sale/cash")}
      >
        <Plus className="w-8 h-8" />
      </button>

      <BottomNav />
    </div>
  );
};

const ActivityItem = ({
  type,
  amount,
  client,
  time,
  note,
  hideAmounts = false,
}: {
  type: "cash" | "credit" | "payment";
  amount: number;
  client?: string;
  time: string;
  note?: string;
  hideAmounts?: boolean;
}) => {
  const formatMoney = (val: number) => {
    if (hideAmounts) return "•••••";
    return new Intl.NumberFormat("fr-FR").format(val);
  };

  const config = {
    cash: { icon: Wallet, color: "text-cash bg-cash/10", label: "Vente cash" },
    credit: { icon: CreditCard, color: "text-credit bg-credit/10", label: "Vente crédit" },
    payment: { icon: TrendingUp, color: "text-success bg-success/10", label: "Paiement reçu" },
  };

  const { icon: Icon, color, label } = config[type];

  return (
    <Card className="animate-fade-in">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {client || note || label}
            </p>
            <p className="text-xs text-muted-foreground">{time}</p>
          </div>
          <p className={`text-lg font-bold ${type === "payment" ? "text-success" : type === "credit" ? "text-credit" : "text-foreground"}`}>
            {type === "payment" ? "+" : ""}{formatMoney(amount)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default Dashboard;