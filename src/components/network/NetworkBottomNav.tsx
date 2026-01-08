import { cn } from "@/lib/utils";
import { 
  Package, 
  Tag, 
  Users, 
  Briefcase,
  Plus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
      icon: Package,
      count: requestsCount
    },
    { 
      id: "offers" as TabType, 
      label: "Offres", 
      icon: Tag,
      count: offersCount
    },
    { 
      id: "merchants" as TabType, 
      label: "Marchands", 
      icon: Users,
      count: 0
    },
    { 
      id: "activity" as TabType, 
      label: "Activité", 
      icon: Briefcase,
      count: 0,
      hidden: !hasProfile
    },
  ].filter(t => !t.hidden);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="relative flex items-center justify-around h-16 max-w-md mx-auto">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          // Insert FAB in the middle
          if (index === Math.floor(tabs.length / 2)) {
            return (
              <div key="fab-wrapper" className="flex items-center gap-2">
                {/* Previous tab */}
                <button
                  key={tabs[index - 1]?.id}
                  onClick={() => onTabChange(tabs[index]?.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 px-4 py-2 min-w-[64px] transition-colors",
                    activeTab === tabs[index]?.id
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="relative">
                    {(() => {
                      const TabIcon = tabs[index]?.icon || Package;
                      return <TabIcon className="w-5 h-5" />;
                    })()}
                  </div>
                  <span className="text-[10px] font-medium">{tabs[index]?.label}</span>
                </button>
                
                {/* FAB */}
                <button
                  onClick={onAddNew}
                  className="w-12 h-12 -mt-6 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            );
          }
          
          // Skip the one we rendered with FAB
          if (index === Math.floor(tabs.length / 2) - 1) return null;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-4 py-2 min-w-[64px] transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.count > 0 && (
                  <span className="absolute -top-1 -right-2 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {tab.count > 99 ? "99+" : tab.count}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
