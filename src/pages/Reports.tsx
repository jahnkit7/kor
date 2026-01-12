import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFeatureTracking } from "@/hooks/use-feature-tracking";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import { HoverCard } from "@/components/ui/animated-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Calendar,
  Wallet,
  CreditCard,
  TrendingUp,
  Download,
  Lock,
  BarChart3
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { WhatsAppShare } from "@/components/WhatsAppShare";
import { FeatureGate } from "@/components/FeatureGate";
import { usePermissions } from "@/hooks/use-role";
import { useHiddenAmount } from "@/components/HideAmountsToggle";
import { useProfile } from "@/hooks/use-profile";
import { useSales } from "@/hooks/use-sales";
import { useDebts } from "@/hooks/use-debts";
import { CashDrawerHistory } from "@/components/reports/CashDrawerHistory";
import { toast } from "sonner";

const Reports = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [activeTab, setActiveTab] = useState("sales");
  const { canViewReports } = usePermissions();
  const { formatMoney, hideAmounts } = useHiddenAmount();
  const { profile } = useProfile();
  const { getPeriodStats, loading: salesLoading } = useSales();
  const { totalDebts, loading: debtsLoading } = useDebts();
  const { trackFeature } = useFeatureTracking();

  // Track page view
  useEffect(() => {
    if (canViewReports) {
      trackFeature("reports", { action: "page_view" });
    }
  }, [trackFeature, canViewReports]);
  
  const shopName = profile?.shop_name || "Ma Boutique";
  const currentData = getPeriodStats(period);

  const isLoading = salesLoading || debtsLoading;

  // Access denied for employees
  if (!canViewReports) {
    return (
      <>
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
      </>
    );
  }

  const handleDownload = () => {
    toast.success("Téléchargement en cours...");
    // In a real app, this would generate and download a PDF
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalSales = currentData.total || 1; // Avoid division by zero

  return (
    <FeatureGate featureKey="reports" showUpgradePrompt>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-b from-[#f8f9ff] to-white px-4 pb-4 border-b border-border" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-6 h-6 text-[#2d3748]" />
            </Button>
            <h1 className="text-xl font-bold text-[#2d3748]">Rapports</h1>
          </div>

          {/* Tabs */}
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sales" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Ventes
            </TabsTrigger>
            <TabsTrigger value="caisse" className="gap-2">
              <Wallet className="w-4 h-4" />
              Caisse
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Sales Tab Content */}
        <TabsContent value="sales" className="mt-0 flex-1">
          {/* Period Selector */}
          <div className="px-4 pt-4">
            <div className="flex gap-2 mb-4">
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

          <div className="p-4 pt-0 space-y-4">
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
              <HoverCard>
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
                    {currentData.total > 0 ? Math.round((currentData.cash / currentData.total) * 100) : 0}% du total
                  </p>
                </CardContent>
              </HoverCard>

              <HoverCard>
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
                    {currentData.total > 0 ? Math.round((currentData.credit / currentData.total) * 100) : 0}% du total
                  </p>
                </CardContent>
              </HoverCard>
            </div>

            {/* Outstanding Debts */}
            <Card className="border-debt/20 bg-debt/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-debt/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-debt" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Dettes à récupérer</p>
                      <p className="text-money-md text-debt">{formatMoney(totalDebts)}</p>
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
            <PrimaryActionButton onClick={handleDownload}>
              <Download className="w-5 h-5" />
              Télécharger
            </PrimaryActionButton>
          </div>
        </TabsContent>

        {/* Cash Drawer Tab Content */}
        <TabsContent value="caisse" className="mt-0 flex-1 p-4">
          <CashDrawerHistory />
        </TabsContent>
      </Tabs>
    </FeatureGate>
  );
};

export default Reports;