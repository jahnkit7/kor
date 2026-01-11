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

import type { Transition } from "framer-motion";

// Animation variants pour le style ExpandableTabs
const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: "0.75rem",
    paddingRight: "0.75rem",
  },
  animate: {
    gap: "0.5rem",
    paddingLeft: "1rem",
    paddingRight: "1rem",
  },
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const transition: Transition = { 
  delay: 0.05, 
  type: "spring", 
  bounce: 0, 
  duration: 0.5 
};

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
      
      {/* Navigation items with expandable tabs style */}
      <div className="flex items-center justify-center gap-1 h-16 px-2">
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
              whileTap={{ scale: 0.95 }}
              variants={buttonVariants}
              initial="initial"
              animate={isActive ? "animate" : "initial"}
              transition={transition}
              className={cn(
                "relative flex items-center rounded-full py-2.5 transition-colors duration-200",
                isActive 
                  ? "bg-[#4f7df3]/15 text-[#4f7df3]" 
                  : "text-[#6F7A95] hover:bg-muted/50"
              )}
            >
              {/* Icon */}
              <HugeiconsIcon 
                icon={icon}
                className="w-5 h-5 flex-shrink-0"
                strokeWidth={isActive ? 2 : 1.5}
              />
              
              {/* Badge for unread messages */}
              {badge > 0 && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
              
              {/* Beta indicator dot */}
              {isBeta && badge === 0 && !showSyncBadge && (
                <span className="absolute -top-0.5 right-0 w-2 h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 border border-[#f8f9ff]" />
              )}
              
              {/* Sync pending indicator */}
              {showSyncBadge && (
                <span 
                  className={cn(
                    "absolute -top-1 left-1/2 -translate-x-1/2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center",
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

              {/* Animated label */}
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    variants={spanVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={transition}
                    className="text-xs font-semibold whitespace-nowrap overflow-hidden"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
