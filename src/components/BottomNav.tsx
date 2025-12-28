import { useNavigate, useLocation } from "react-router-dom";
import { Home, CreditCard, Users, BarChart3, Settings } from "lucide-react";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Accueil", path: "/dashboard" },
    { icon: CreditCard, label: "Dettes", path: "/debts" },
    { icon: Users, label: "Clients", path: "/clients" },
    { icon: BarChart3, label: "Rapports", path: "/reports" },
    { icon: Settings, label: "Réglages", path: "/settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ icon: Icon, label, path }) => {
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
