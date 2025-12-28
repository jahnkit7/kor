import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Wallet, 
  CreditCard, 
  TrendingUp, 
  Users, 
  Plus,
  ChevronRight,
  Bell
} from "lucide-react";
import BottomNav from "@/components/BottomNav";

const Dashboard = () => {
  const navigate = useNavigate();
  const [todayData] = useState({
    totalSales: 125000,
    cashSales: 85000,
    creditSales: 40000,
    totalDebts: 340000,
    clientsWithDebts: 12,
  });

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="gradient-hero px-5 pt-6 pb-8 text-primary-foreground">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm opacity-80 font-medium">Bonjour 👋</p>
            <h1 className="text-xl font-bold">Boutique Mamadou</h1>
          </div>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
            <Bell className="w-6 h-6" />
          </Button>
        </div>

        {/* Today's Total */}
        <Card className="bg-primary-foreground/10 border-0 backdrop-blur-sm">
          <CardContent className="p-5">
            <p className="text-sm opacity-80 font-medium mb-1">Ventes du jour</p>
            <p className="text-money-xl text-primary-foreground">
              {formatMoney(todayData.totalSales)} <span className="text-lg">CFA</span>
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
                  <p className="text-sm text-muted-foreground font-medium">Total Dettes</p>
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
          <button className="text-sm text-primary font-semibold">Voir tout</button>
        </div>
        
        <div className="space-y-3">
          <ActivityItem
            type="cash"
            amount={15000}
            time="Il y a 5 min"
            note="Ciment x2"
          />
          <ActivityItem
            type="credit"
            amount={25000}
            client="Ousmane Diallo"
            time="Il y a 30 min"
          />
          <ActivityItem
            type="payment"
            amount={10000}
            client="Fatou Ndiaye"
            time="Il y a 1h"
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
}: {
  type: "cash" | "credit" | "payment";
  amount: number;
  client?: string;
  time: string;
  note?: string;
}) => {
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount);
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
