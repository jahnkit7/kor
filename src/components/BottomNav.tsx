import { useNavigate, useLocation } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  Home01Icon, 
  Wallet02Icon,
  UserIcon,
  WifiConnected01Icon,
  Settings01Icon,
  CloudIcon,
  ArrowReloadHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { usePermissions } from "@/hooks/use-role";
import { useMerchantMessages } from "@/hooks/use-merchant-messages";
import { useMemo } from "react";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useOffline } from "@/contexts/OfflineContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic } from "@/lib/haptics";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { canViewReports } = usePermissions();
  const { conversations } = useMerchantMessages();
  const { isOnline, pendingCount, isSyncing } = useOffline();
  
  // Check if features are globally disabled and beta status
  const { isGloballyDisabled: networkDisabled, loading: networkLoading, isBeta: networkBeta } = useFeatureAccess("network");
  const { isGloballyDisabled: debtsDisabled, loading: debtsLoading, isBeta: debtsBeta } = useFeatureAccess("debts");
  const { isGloballyDisabled: clientsDisabled, loading: clientsLoading, isBeta: clientsBeta } = useFeatureAccess("clients");

  // Count unread messages for network badge
  const unreadCount = useMemo(() => {
    return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  }, [conversations]);

  const navItems = [
    { 
      icon: Home01Icon, 
      label: "Accueil", 
      path: "/dashboard", 
      show: true, 
      badge: 0, 
      isBeta: false 
    },
    { 
      icon: Wallet02Icon, 
      label: "Dettes", 
      path: "/debts", 
      show: !debtsDisabled && !debtsLoading, 
      badge: 0, 
      isBeta: debtsBeta 
    },
    { 
      icon: WifiConnected01Icon, 
      label: "Réseau", 
      path: "/network", 
      show: !networkDisabled && !networkLoading, 
      badge: unreadCount, 
      isBeta: networkBeta 
    },
    { 
      icon: UserIcon, 
      label: "Clients", 
      path: "/clients", 
      show: !clientsDisabled && !clientsLoading, 
      badge: 0, 
      isBeta: clientsBeta 
    },
    { 
      icon: Settings01Icon, 
      label: "Réglages", 
      path: "/settings", 
      show: true, 
      badge: 0, 
      isBeta: false 
    },
  ];

  const visibleItems = navItems.filter(item => item.show);

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#f8f9ff] via-[#f8f9ff]/95 to-transparent backdrop-blur-sm" 
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Sync status bar - shown when pending items exist */}
      <AnimatePresence>
        {pendingCount > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
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
                <HugeiconsIcon icon={ArrowReloadHorizontalIcon} className="w-3.5 h-3.5 animate-spin" />
                <span className="text-xs font-medium">Synchronisation...</span>
              </>
            ) : !isOnline ? (
              <>
                <HugeiconsIcon icon={CloudIcon} className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Hors-ligne</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-bold">
                  {pendingCount} en attente
                </span>
              </>
            ) : (
              <>
                <HugeiconsIcon icon={ArrowReloadHorizontalIcon} className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{pendingCount} à synchroniser</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Container avec hauteur responsive */}
      <div className="flex items-center justify-around h-[clamp(3.5rem,10vw,4.5rem)] pb-1">
        {visibleItems.map(({ icon, label, path, badge, isBeta }) => {
          const isActive = location.pathname === path || 
            (path !== "/dashboard" && location.pathname.startsWith(path));
          
          // Show sync badge on settings when there are pending items
          const showSyncBadge = path === "/settings" && pendingCount > 0;
          
          return (
            <motion.button
              key={path}
              onClick={() => {
                triggerHaptic();
                navigate(path);
              }}
              whileTap={{ scale: 0.92 }}
              className="group relative flex flex-col items-center justify-center min-w-[clamp(3rem,12vw,4.5rem)] h-full outline-none"
            >
              {/* Pill sans fond bleu - juste transparent */}
              <motion.div 
                className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl bg-transparent"
                animate={{ scale: isActive ? 1.02 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                {/* Icône avec taille responsive */}
                <HugeiconsIcon 
                  icon={icon}
                  className={cn(
                    "w-[clamp(1.25rem,5vw,1.75rem)] h-[clamp(1.25rem,5vw,1.75rem)] transition-colors duration-150",
                    isActive 
                      ? "text-[#4f7df3]" 
                      : "text-[#6F7A95] group-active:text-[#4f7df3]"
                  )}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                
                {/* Badge for unread messages */}
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
                
                {/* Beta indicator dot */}
                {isBeta && badge === 0 && !showSyncBadge && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 border-2 border-[#f8f9ff]" />
                )}
                
                {/* Sync pending indicator */}
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

                {/* Label and dot - only shown for active item */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -2 }}
                      className="flex flex-col items-center gap-0.5"
                    >
                      <span className="text-[clamp(9px,2.5vw,11px)] font-semibold text-[#4f7df3]">
                        {label}
                      </span>
                      <div className="w-1 h-1 rounded-full bg-[#4f7df3]" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
