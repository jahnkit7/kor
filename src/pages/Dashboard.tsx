import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useFeatureTracking } from "@/hooks/use-feature-tracking";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { useProfile } from "@/hooks/use-profile";
import { useSales } from "@/hooks/use-sales";
import { useDebts } from "@/hooks/use-debts";
import { useStock } from "@/hooks/use-stock";
import { useThemeStyle } from "@/hooks/use-theme";
import ModernDashboard from "@/components/dashboard/ModernDashboard";
import SalesCard from "@/components/dashboard/SalesCard";
import QuickActionFAB from "@/components/dashboard/QuickActionFAB";
import TransactionItem from "@/components/dashboard/TransactionItem";
import BentoStatsGrid from "@/components/dashboard/BentoStatsGrid";
import { triggerHaptic } from "@/lib/haptics";

const Dashboard = () => {
  const { loading: authLoading } = useRequireAuth();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { role } = useRole();
  const { profile, loading: profileLoading } = useProfile();
  const { sales, loading: salesLoading, getTodayStats } = useSales();
  const { totalDebts, clientsWithDebts, loading: debtsLoading } = useDebts();
  const { items: stockItems, loading: stockLoading, getTotalValue } = useStock();
  const { isModern } = useThemeStyle();
  const { trackFeature } = useFeatureTracking();

  const [hideAmounts, setHideAmounts] = useState(false);

  // Track dashboard view
  useEffect(() => {
    trackFeature("dashboard", { action: "page_view" });
  }, [trackFeature]);

  const todayStats = getTodayStats();
  const shopName = profile?.shop_name || "Ma Boutique";
  const stockTotalValue = getTotalValue();
  const stockItemsCount = stockItems.length;
  const recentSales = sales.slice(0, 5);

  const formatMoney = (val: number) => {
    if (hideAmounts) return "•••••";
    return new Intl.NumberFormat("fr-FR").format(val);
  };

  // Only block on auth/profile - data loading uses skeletons
  const isAuthLoading = authLoading || profileLoading;
  
  // OFFLINE-FIRST: Check if we have local data to show immediately
  const hasLocalData = sales.length > 0 || stockItems.length > 0;
  
  // Timeout guard: reduced from 3s to 1s for faster rendering
  const [forceReady, setForceReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthLoading) {
        console.warn("[Dashboard] Auth loading timeout - forcing render");
        setForceReady(true);
      }
    }, 1000); // Reduced from 3000ms to 1000ms
    return () => clearTimeout(timer);
  }, [isAuthLoading]);

  // CRITICAL: Show content immediately if we have local data (offline-first)
  const shouldShowContent = !isAuthLoading || forceReady || hasLocalData;

  if (!shouldShowContent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] via-white to-[#f8f9ff] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#4f7df3] border-t-transparent rounded-full" />
      </div>
    );
  }
  
  const isDataLoading = salesLoading || debtsLoading || stockLoading;

  // Render Modern Dashboard if theme is modern
  if (isModern) {
    return (
      <ModernDashboard
        profile={profile}
        todayStats={todayStats}
        totalDebts={totalDebts}
        clientsWithDebts={clientsWithDebts}
        stockTotalValue={stockTotalValue}
        stockItemsCount={stockItemsCount}
        recentSales={recentSales}
        isDataLoading={isDataLoading}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] via-white to-[#f8f9ff]">
      {/* Header - Clean & Minimal */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pb-4"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 24px)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar Placeholder */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4f7df3] to-[#3b6ce8] flex items-center justify-center">
              <span className="text-white font-bold text-lg">
                {shopName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm text-[#718096] font-medium">Bonjour 👋</p>
              <h1 className="text-lg font-bold text-[#051425]">{shopName}</h1>
            </div>
          </div>
          <NotificationBell />
        </div>
      </motion.div>

      {/* Main Sales Card */}
      <div className="px-5">
        <SalesCard
          shopName={shopName}
          totalSales={todayStats.total}
          cashSales={todayStats.cash}
          creditSales={todayStats.credit}
          hideAmounts={hideAmounts}
          onToggleHide={() => setHideAmounts(!hideAmounts)}
          formatMoney={formatMoney}
        />
      </div>

      {/* Action Buttons - Grid 45% / 45% / 10% pour garantir le bouton + visible */}
      <div className="px-5 mt-5">
        <div className="grid grid-cols-[45fr_45fr_10fr] gap-2 items-center">
          {/* Vente Cash Button */}
          <Button
            variant="cash"
            size="lg"
            className="w-full min-w-0 h-[clamp(2.75rem,10vw,3rem)] rounded-xl gap-1.5 px-3"
            onClick={() => {
              triggerHaptic();
              navigate("/sale/cash");
            }}
          >
            <Wallet className="w-[clamp(0.875rem,3vw,1rem)] h-[clamp(0.875rem,3vw,1rem)] flex-shrink-0" />
            <span className="text-[clamp(0.75rem,2.5vw,0.875rem)] font-medium truncate">Cash</span>
          </Button>

          {/* Vente Crédit Button */}
          <Button
            variant="credit"
            size="lg"
            className="w-full min-w-0 h-[clamp(2.75rem,10vw,3rem)] rounded-xl gap-1.5 px-3"
            onClick={() => {
              triggerHaptic();
              navigate("/sale/credit");
            }}
          >
            <CreditCard className="w-[clamp(0.875rem,3vw,1rem)] h-[clamp(0.875rem,3vw,1rem)] flex-shrink-0" />
            <span className="text-[clamp(0.75rem,2.5vw,0.875rem)] font-medium truncate">Crédit</span>
          </Button>

          {/* Quick Action FAB inline - toujours visible */}
          <div className="flex justify-center min-w-[clamp(2.5rem,10vw,3rem)]">
            <QuickActionFAB inline />
          </div>
        </div>
      </div>

      {/* Drag Handle Visual */}
      <div className="flex justify-center my-5">
        <div className="w-10 h-1 bg-[#e2e8f0] rounded-full" />
      </div>

      {/* Bento Grid - Debts & Stock */}
      <div className="px-5">
        <BentoStatsGrid
          totalDebts={totalDebts}
          clientsWithDebts={clientsWithDebts}
          stockValue={stockTotalValue}
          stockItemsCount={stockItemsCount}
          formatMoney={formatMoney}
        />
      </div>

      {/* Recent Activity */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#051425]">Activité récente</h2>
          <button
            className="flex items-center gap-1 text-sm text-[#4f7df3] font-semibold"
            onClick={() => navigate("/sales/history")}
          >
            Voir tout
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Date Label */}
        <p className="text-xs font-semibold text-[#718096] uppercase tracking-wide mb-3">
          Aujourd'hui
        </p>

        <div className="space-y-2">
          {recentSales.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-[#718096] shadow-lg shadow-[#4f7df3]/5">
              Aucune vente aujourd'hui
            </div>
          ) : (
            recentSales.map((sale, index) => (
              <TransactionItem
                key={sale.id}
                type={sale.type as "cash" | "credit"}
                amount={sale.amount}
                client={sale.client_name || undefined}
                note={sale.note || undefined}
                time={formatRelativeTime(sale.created_at)}
                hideAmounts={hideAmounts}
                index={index}
              />
            ))
          )}
        </div>
      </div>

      {/* Bottom spacing for BottomNav - reduced */}
      <div className="h-4" />
    </div>
  );
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    const hours = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${mins}`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Hier";
  return `Il y a ${diffDays} jours`;
}

export default Dashboard;
