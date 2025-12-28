import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Calendar,
  Wallet,
  CreditCard,
  TrendingUp,
  Download,
  Lock
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { WhatsAppShare } from "@/components/WhatsAppShare";
import { usePermissions } from "@/hooks/use-role";
import { useHiddenAmount } from "@/components/HideAmountsToggle";
import { toast } from "sonner";

const Reports = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const { canViewReports } = usePermissions();
  const { formatMoney, hideAmounts } = useHiddenAmount();
  const [shopName] = useState("Boutique Mamadou");

  // Mock data based on period
  const data = {
    day: { total: 125000, cash: 85000, credit: 40000, payments: 35000, outstanding: 340000 },
    week: { total: 875000, cash: 595000, credit: 280000, payments: 180000, outstanding: 340000 },
    month: { total: 3750000, cash: 2550000, credit: 1200000, payments: 850000, outstanding: 340000 },
  };

  const currentData = data[period];

  // Access denied for employees
  if (!canViewReports) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="bg-card px-4 pt-4 pb-6 border-b border-border">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold">Rapports</h1>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center p-8 mt-20 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold mb-2">Accès limité</h2>
          <p className="text-muted-foreground max-w-xs">
            Seul le propriétaire peut voir les rapports.
          </p>
        </div>
        
        <BottomNav />
      </div>
    );
  }

  const handleDownload = () => {
    toast.success("Téléchargement en cours...");
    // In a real app, this would generate and download a PDF
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card px-4 pt-4 pb-6 border-b border-border">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Rapports</h1>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {[
            { key: "day", label: "Jour" },
            { key: "week", label: "Semaine" },
            { key: "month", label: "Mois" },
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={period === key ? "default" : "secondary"}
              size="sm"
              className="flex-1"
              onClick={() => setPeriod(key as typeof period)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-4">
        {/* Total Sales */}
        <Card className="gradient-hero text-primary-foreground">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium opacity-80 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Ventes totales ({period === "day" ? "aujourd'hui" : period === "week" ? "cette semaine" : "ce mois"})
              </CardTitle>
              <WhatsAppShare
                type="sales"
                data={{
                  totalSales: currentData.total,
                  cashSales: currentData.cash,
                  creditSales: currentData.credit,
                  shopName,
                }}
                variant="ghost"
                size="sm"
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 h-7 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-money-xl">
              {formatMoney(currentData.total)} <span className="text-lg">{!hideAmounts && "CFA"}</span>
            </p>
          </CardContent>
        </Card>

        {/* Cash vs Credit */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-cash/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-cash" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Cash</span>
              </div>
              <p className="text-money-md text-cash">
                {formatMoney(currentData.cash)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((currentData.cash / currentData.total) * 100)}% du total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-credit/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-credit" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Crédit</span>
              </div>
              <p className="text-money-md text-credit">
                {formatMoney(currentData.credit)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((currentData.credit / currentData.total) * 100)}% du total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payments Received */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Paiements reçus</p>
                  <p className="text-money-md text-success">{formatMoney(currentData.payments)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Debts */}
        <Card className="border-debt/20 bg-debt/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-debt/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-debt" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dettes à récupérer</p>
                  <p className="text-money-md text-debt">{formatMoney(currentData.outstanding)}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/debts")}
              >
                Voir
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Export Button */}
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={handleDownload}
        >
          <Download className="w-5 h-5 mr-2" />
          Télécharger
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Reports;