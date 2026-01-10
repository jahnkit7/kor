import { useNavigate, useLocation } from "react-router-dom";
import { Home, CreditCard, Users, Radio, Settings, CloudOff, RefreshCw } from "lucide-react";
import { usePermissions } from "@/hooks/use-role";
import { useMerchantMessages } from "@/hooks/use-merchant-messages";
import { useMemo } from "react";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useOffline } from "@/contexts/OfflineContext";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { canViewReports } = usePermissions();
  const { conversations } = useMerchantMessages();
  const { isOnline, pendingCount, isSyncing } = useOffline();
  
  // Check if network feature is globally disabled
  const { isGloballyDisabled: networkDisabled, loading: networkLoading } = useFeatureAccess("network");

  // Count unread messages for network badge
  const unreadCount = useMemo(() => {
    return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  }, [conversations]);

  const navItems = [
    { icon: Home, label: "Accueil", path: "/dashboard", show: true, badge: 0 },
    { icon: CreditCard, label: "Dettes", path: "/debts", show: true, badge: 0 },
    // Hide "Réseau" if network feature is globally disabled
    { icon: Radio, label: "Réseau", path: "/network", show: !networkDisabled && !networkLoading, badge: unreadCount },
    { icon: Users, label: "Clients", path: "/clients", show: true, badge: 0 },
    { icon: Settings, label: "Réglages", path: "/settings", show: true, badge: 0 },
  ];

  const visibleItems = navItems.filter(item => item.show);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Sync status bar - shown when pending items exist */}
      {pendingCount > 0 && (
        <div 
          className={cn(
            "absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-1.5 rounded-t-xl shadow-lg transition-all duration-300",
            !isOnline 
              ? "bg-amber-500 text-white" 
              : isSyncing 
                ? "bg-primary text-primary-foreground" 
                : "bg-blue-500 text-white"
          )}
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span className="text-xs font-medium">Synchronisation...</span>
            </>
          ) : !isOnline ? (
            <>
              <CloudOff className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Hors-ligne</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-bold">
                {pendingCount} en attente
              </span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{pendingCount} à synchroniser</span>
            </>
          )}
        </div>
      )}
      
      <div className="flex items-center justify-around h-16">
        {visibleItems.map(({ icon: Icon, label, path, badge }) => {
          const isActive = location.pathname === path || 
            (path !== "/dashboard" && location.pathname.startsWith(path));
          
          // Show sync badge on settings when there are pending items
          const showSyncBadge = path === "/settings" && pendingCount > 0;
          
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`relative flex flex-col items-center justify-center w-16 h-full transition-colors ${
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 ${isActive ? "scale-110" : ""} transition-transform`} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
                {/* Sync pending indicator - colored badge with count */}
                {showSyncBadge && (
                  <span 
                    className={cn(
                      "absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center",
                      !isOnline 
                        ? "bg-amber-500 text-white" 
                        : isSyncing 
                          ? "bg-primary text-primary-foreground animate-pulse" 
                          : "bg-blue-500 text-white"
                    )}
                  >
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold mt-1">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
