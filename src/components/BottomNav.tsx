import { useNavigate, useLocation } from "react-router-dom";
import { Home, CreditCard, Users, BarChart3, Settings } from "lucide-react";
import { usePermissions } from "@/hooks/use-role";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { canViewReports } = usePermissions();

  const navItems = [
    { icon: Home, label: "Accueil", path: "/dashboard", show: true },
    { icon: CreditCard, label: "Dettes", path: "/debts", show: true },
    { icon: Users, label: "Clients", path: "/clients", show: true },
    { icon: BarChart3, label: "Rapports", path: "/reports", show: canViewReports },
    { icon: Settings, label: "Réglages", path: "/settings", show: true },
  ];

  const visibleItems = navItems.filter(item => item.show);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16">
        {visibleItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path || 
            (path !== "/dashboard" && location.pathname.startsWith(path));
          
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? "scale-110" : ""} transition-transform`} />
              <span className="text-[10px] font-semibold mt-1">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;