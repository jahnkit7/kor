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
  Sparkles,
  ArrowLeft,
  Zap,
  BarChart2,
  TrendingUp,
  Gift
} from "lucide-react";
import { cn } from "@/lib/utils";

const modules = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { to: "/admin/financials", icon: TrendingUp, label: "Finances" },
  { to: "/admin/users", icon: Users, label: "Utilisateurs" },
  { to: "/admin/subscriptions", icon: CreditCard, label: "Abonnements" },
  { to: "/admin/codes", icon: QrCode, label: "Codes Prépayés" },
  { to: "/admin/geography", icon: Globe, label: "Géographie" },
];

const features = [
  { to: "/admin/features", icon: ToggleLeft, label: "Features" },
  { to: "/admin/feature-analytics", icon: BarChart2, label: "Analytics" },
  { to: "/admin/commissions", icon: Gift, label: "Commissions" },
  { to: "/admin/promo-codes", icon: Percent, label: "Codes Promo" },
];

const support = [
  { to: "/admin/support", icon: MessageSquare, label: "Support" },
  { to: "/admin/logs", icon: FileText, label: "Logs" },
];

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  exact?: boolean;
}

function NavItem({ to, icon: Icon, label, exact }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )
      }
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </NavLink>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 mb-2">
      {children}
    </p>
  );
}

export function AdminFloatingSidebar() {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:top-4 lg:left-4 lg:bottom-4 bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl shadow-primary/5 overflow-hidden">
      {/* Header - Branding */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground tracking-tight">DÉKON</h1>
            <p className="text-[11px] text-muted-foreground font-medium">Control Center</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Modules Section */}
        <div>
          <SectionTitle>Modules</SectionTitle>
          <div className="space-y-1">
            {modules.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div>
          <SectionTitle>Fonctionnalités</SectionTitle>
          <div className="space-y-1">
            {features.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        </div>

        {/* Support Section */}
        <div>
          <SectionTitle>Support</SectionTitle>
          <div className="space-y-1">
            {support.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        </div>
      </nav>

      {/* Quick Actions */}
      <div className="p-4 border-t border-border/50">
        <div className="mb-3">
          <SectionTitle>Actions Rapides</SectionTitle>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-[10px] font-medium text-muted-foreground">Broadcast</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors">
            <QrCode className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-medium text-muted-foreground">Générer</span>
          </button>
        </div>
        
        <NavLink
          to="/dashboard"
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l'app</span>
        </NavLink>
      </div>
    </aside>
  );
}
