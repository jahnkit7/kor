import { useNavigate, useLocation } from "react-router-dom";
import { Home, CreditCard, Users, Radio, Settings, CloudOff } from "lucide-react";
import { usePermissions } from "@/hooks/use-role";
import { useMerchantMessages } from "@/hooks/use-merchant-messages";
import { useMemo } from "react";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useOffline } from "@/contexts/OfflineContext";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { canViewReports } = usePermissions();
  const { conversations } = useMerchantMessages();
  const { isOnline, pendingCount } = useOffline();
  
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
      {/* Offline indicator bar */}
      {!isOnline && (
        <div className="absolute -top-6 left-0 right-0 flex items-center justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/90 text-white text-xs font-medium rounded-t-lg shadow-lg">
            <CloudOff className="w-3 h-3" />
            <span>Mode hors-ligne</span>
            {pendingCount > 0 && (
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-around h-16">
        {visibleItems.map(({ icon: Icon, label, path, badge }) => {
          const isActive = location.pathname === path || 
            (path !== "/dashboard" && location.pathname.startsWith(path));
          
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
                {/* Sync pending indicator on Settings icon */}
                {path === "/settings" && !isOnline && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
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
