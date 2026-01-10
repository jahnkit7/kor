import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  Package01Icon, 
  Tag01Icon,
  UserMultiple02Icon,
  Briefcase01Icon,
  Add01Icon
} from "@hugeicons/core-free-icons";
import { motion, AnimatePresence } from "framer-motion";

type TabType = "requests" | "offers" | "merchants" | "activity";

interface NetworkBottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  requestsCount?: number;
  offersCount?: number;
  hasProfile: boolean;
  onAddNew: () => void;
}

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#f8f9ff] via-[#f8f9ff]/95 to-transparent backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="relative flex items-center justify-around h-16 max-w-md mx-auto">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          
          // Render FAB after the center index
          const renderFabAfterThis = index === centerIndex - 1;
          
          return (
            <div key={tab.id} className="contents">
              <button
                onClick={() => onTabChange(tab.id)}
                className="relative flex flex-col items-center justify-center px-4 py-2 min-w-[64px] transition-all"
              >
                <motion.div 
                  className="relative flex flex-col items-center"
                  animate={{ scale: isActive ? 1.05 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <HugeiconsIcon 
                    icon={tab.icon}
                    className={cn(
                      "w-6 h-6 transition-colors",
                      isActive ? "text-[#4f7df3]" : "text-[#718096] hover:text-[#2d3748]"
                    )}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  
                  {/* Badge count */}
                  {tab.count > 0 && (
                    <span className="absolute -top-1 -right-2 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                      {tab.count > 99 ? "99+" : tab.count}
                    </span>
                  )}

                  {/* Label - only shown for active item */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.span 
                        initial={{ opacity: 0, y: -2 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -2 }}
                        className="text-[10px] font-semibold mt-1 text-[#4f7df3]"
                      >
                        {tab.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Active indicator dot */}
                  {isActive && (
                    <motion.div 
                      layoutId="networkActiveIndicator"
                      className="w-1 h-1 rounded-full bg-[#4f7df3] mt-0.5"
                    />
                  )}
                </motion.div>
              </button>
              
              {/* FAB Button - rendered after center item */}
              {renderFabAfterThis && (
                <motion.button
                  onClick={onAddNew}
                  className="w-14 h-14 -mt-6 rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] text-white shadow-lg shadow-green-500/30 flex items-center justify-center hover:shadow-xl hover:shadow-green-500/40 transition-shadow"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <HugeiconsIcon icon={Add01Icon} className="w-7 h-7" strokeWidth={2} />
                </motion.button>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
