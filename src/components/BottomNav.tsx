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
import { useMemo, useState, useEffect } from "react";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { useOffline } from "@/contexts/OfflineContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic } from "@/lib/haptics";
import { useToast } from "@/hooks/use-toast";

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
  const { isOnline, pendingCount, isSyncing, performSync } = useOffline();
  const { toast } = useToast();
  
  // Auto-sync countdown
  const [nextAutoSync, setNextAutoSync] = useState(30);
  
  // Countdown to next auto-sync
  useEffect(() => {
    if (!isOnline || pendingCount === 0 || isSyncing) {
      setNextAutoSync(30);
      return;
    }

    const interval = setInterval(() => {
      setNextAutoSync((prev) => {
        if (prev <= 1) {
          return 30; // Reset after sync triggers
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOnline, pendingCount, isSyncing]);

  // Reset countdown when sync starts
  useEffect(() => {
    if (isSyncing) {
      setNextAutoSync(30);
    }
  }, [isSyncing]);
  
  // Handle sync click
  const handleSyncClick = async () => {
    if (isSyncing || !isOnline) return;
    
    triggerHaptic();
    toast({
      title: "Synchronisation lancée",
      description: `${pendingCount} élément(s) en attente`,
    });
    
    await performSync();
  };
  
  // Check if features are globally disabled and beta status
  const { isGloballyDisabled: networkDisabled, loading: networkLoading, isBeta: networkBeta } = useFeatureAccess("network");
  const { isGloballyDisabled: debtsDisabled, loading: debtsLoading, isBeta: debtsBeta } = useFeatureAccess("debts");
  const { isGloballyDisabled: clientsDisabled, loading: clientsLoading, isBeta: clientsBeta } = useFeatureAccess("clients");

  // Count unread messages for network badge
  const unreadCount = useMemo(() => {
    return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  }, [conversations]);

  // OFFLINE-FIRST: Always show nav items - use permissive defaults during loading
  // The feature access hook now returns permissive values from cache during loading
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
      // CRITICAL: Show during loading to prevent nav from breaking offline
      show: debtsLoading ? true : !debtsDisabled, 
      badge: 0, 
      isBeta: debtsBeta 
    },
    { 
      icon: WifiConnected01Icon, 
      label: "Réseau", 
      path: "/network", 
      // CRITICAL: Show during loading to prevent nav from breaking offline
      show: networkLoading ? true : !networkDisabled, 
      badge: unreadCount, 
      isBeta: networkBeta 
    },
    { 
      icon: UserIcon, 
      label: "Clients", 
      path: "/clients", 
      // CRITICAL: Show during loading to prevent nav from breaking offline
      show: clientsLoading ? true : !clientsDisabled, 
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
    <motion.nav 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", bounce: 0.3, duration: 0.6, delay: 0.1 }}
      className="fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none"
    >
      <div className="pointer-events-auto">
      {/* Unified Sync status bar - clickable for force sync */}
      <AnimatePresence>
      {(pendingCount > 0 || !isOnline) && (
          <motion.button 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSyncClick}
            disabled={isSyncing || !isOnline}
            className={cn(
              "absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all duration-300",
              !isOnline 
                ? "bg-gradient-to-r from-[#4f7df3] via-[#a78bfa] to-[#f97316] text-white shadow-xl" 
                : isSyncing 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700"
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
                <span className="text-xs font-semibold">Hors-ligne</span>
                {pendingCount > 0 && (
                  <span className="bg-white/25 px-2 py-0.5 rounded-full text-[11px] font-bold">
                    {pendingCount} en attente
                  </span>
                )}
              </>
            ) : (
              <>
                <HugeiconsIcon icon={ArrowReloadHorizontalIcon} className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{pendingCount} à sync</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {nextAutoSync}s
                </span>
              </>
            )}
          </motion.button>
        )}
      </AnimatePresence>
      
      {/* Floating navigation bar - Pill shape with animated gradient border */}
      <div className="relative">
        {/* Animated gradient border */}
        <div 
          className="absolute -inset-[1.5px] rounded-full bg-gradient-to-r from-[#4f7df3] via-[#a78bfa] via-[#f472b6] to-[#4f7df3] bg-[length:200%_200%] animate-gradient-border opacity-60"
        />
        
        {/* Subtle top reflection */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-full pointer-events-none z-10" />
        
        <div className="relative flex items-center justify-center gap-0.5 h-12 px-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-full shadow-xl shadow-black/10 overflow-hidden">
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
              {/* Icon with bounce animation on tap */}
              <motion.span whileTap={{ y: -2 }} transition={{ type: "spring", stiffness: 600, damping: 15 }}>
                <HugeiconsIcon 
                  icon={icon}
                  className="w-5 h-5 flex-shrink-0"
                  strokeWidth={isActive ? 2 : 1.5}
                />
              </motion.span>
              
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
              
              {/* Sync pending indicator - NO animate-pulse to avoid infinite animation */}
              {showSyncBadge && (
                <span 
                  className={cn(
                    "absolute -top-1 left-1/2 -translate-x-1/2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center",
                    !isOnline 
                      ? "bg-amber-500 text-white" 
                      : isSyncing 
                        ? "bg-primary text-primary-foreground" 
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
      </div>
      </div>
    </motion.nav>
  );
};

export default BottomNav;
