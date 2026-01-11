import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  Package01Icon, 
  Tag01Icon,
  UserMultiple02Icon,
  Briefcase01Icon,
  Add01Icon
} from "@hugeicons/core-free-icons";
import { motion, AnimatePresence, type Transition } from "framer-motion";

type TabType = "requests" | "offers" | "merchants" | "activity";

interface NetworkBottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  requestsCount?: number;
  offersCount?: number;
  hasProfile: boolean;
  onAddNew: () => void;
}

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

export function NetworkBottomNav({
  activeTab,
  onTabChange,
  requestsCount = 0,
  offersCount = 0,
  hasProfile,
  onAddNew
}: NetworkBottomNavProps) {
  const tabs = [
    { 
      id: "requests" as TabType, 
      label: "Demandes", 
      icon: Package01Icon,
      count: requestsCount
    },
    { 
      id: "offers" as TabType, 
      label: "Offres", 
      icon: Tag01Icon,
      count: offersCount
    },
    { 
      id: "merchants" as TabType, 
      label: "Marchands", 
      icon: UserMultiple02Icon,
      count: 0
    },
    { 
      id: "activity" as TabType, 
      label: "Activité", 
      icon: Briefcase01Icon,
      count: 0,
      hidden: !hasProfile
    },
  ].filter(t => !t.hidden);

  // Calculate center index for FAB placement
  const centerIndex = Math.floor(tabs.length / 2);

  return (
    <motion.nav 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", bounce: 0.3, duration: 0.6, delay: 0.1 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="relative">
        {/* Subtle top reflection */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-full pointer-events-none z-10" />
        
        <div className="relative flex items-center justify-center gap-0.5 h-12 px-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-full shadow-xl shadow-black/15 border border-white/50 dark:border-white/10 overflow-hidden">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          
          // Render FAB after the center index
          const renderFabAfterThis = index === centerIndex - 1;
          
          return (
            <div key={tab.id} className="contents">
              <motion.button
                onClick={() => onTabChange(tab.id)}
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
                  icon={tab.icon}
                  className="w-5 h-5 flex-shrink-0"
                  strokeWidth={isActive ? 2 : 1.5}
                />
                
                {/* Badge count */}
                {tab.count > 0 && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                    {tab.count > 99 ? "99+" : tab.count}
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
                      {tab.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
              
              {/* FAB Button - rendered after center item */}
              {renderFabAfterThis && (
                <motion.button
                  onClick={onAddNew}
                  className="w-12 h-12 -mt-4 mx-1 rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-white shadow-lg shadow-green-500/30 flex items-center justify-center hover:shadow-xl hover:shadow-green-500/40 transition-shadow flex-shrink-0"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <HugeiconsIcon icon={Add01Icon} className="w-6 h-6" strokeWidth={2} />
                </motion.button>
              )}
            </div>
          );
        })}
        </div>
      </div>
    </motion.nav>
  );
}
