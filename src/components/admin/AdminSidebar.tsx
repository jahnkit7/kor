import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  QrCode, 
  Globe, 
  ToggleLeft, 
  Percent, 
  MessageSquare, 
  FileText,
  Settings,
  TrendingUp,
  Gift,
  Map,
  Database,
  RefreshCw,
  UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { to: "/admin/financials", icon: TrendingUp, label: "Finances" },
  { to: "/admin/users", icon: Users, label: "Utilisateurs" },
  { to: "/admin/subscriptions", icon: CreditCard, label: "Abonnements" },
  { to: "/admin/codes", icon: QrCode, label: "Codes Prépayés" },
  { to: "/admin/promo-codes", icon: Percent, label: "Codes Promo" },
  { to: "/admin/referrals", icon: UserPlus, label: "Parrainages" },
  { to: "/admin/geography", icon: Globe, label: "Géographie" },
  { to: "/admin/features", icon: ToggleLeft, label: "Fonctionnalités" },
  { to: "/admin/roadmap", icon: Map, label: "Roadmap" },
  { to: "/admin/commissions", icon: Gift, label: "Commissions Plateforme" },
  { to: "/admin/sync-diagnostic", icon: RefreshCw, label: "Diagnostic Sync" },
  { to: "/admin/support", icon: MessageSquare, label: "Support" },
  { to: "/admin/logs", icon: FileText, label: "Logs" },
  { to: "/admin/setup", icon: Database, label: "Config. Initiale" },
];

export function AdminSidebar() {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card border-r border-border">
      {/* Header */}
      <div className="flex items-center gap-3 h-16 px-6 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Settings className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-bold text-foreground">DÉKON Admin</h1>
          <p className="text-xs text-muted-foreground">Control Center</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <NavLink
          to="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Retour à l'app
        </NavLink>
      </div>
    </aside>
  );
}
