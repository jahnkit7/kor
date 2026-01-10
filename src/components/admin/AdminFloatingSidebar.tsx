import { NavLink, useNavigate } from "react-router-dom";
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
  Gift,
  Bell,
  Map,
  Database,
  User,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";

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
  { to: "/admin/roadmap", icon: Map, label: "Roadmap" },
  { to: "/admin/feature-analytics", icon: BarChart2, label: "Analytics" },
  { to: "/admin/commissions", icon: Gift, label: "Commissions" },
  { to: "/admin/promo-codes", icon: Percent, label: "Codes Promo" },
];

const support = [
  { to: "/admin/notifications", icon: Bell, label: "Notifications" },
  { to: "/admin/support", icon: MessageSquare, label: "Support" },
  { to: "/admin/logs", icon: FileText, label: "Logs" },
  { to: "/admin/setup", icon: Database, label: "Config. Initiale" },
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
            ? "bg-gradient-to-r from-[#4f7df3] via-[#5b8af5] to-[#3b6ce8] text-white shadow-lg shadow-[#4f7df3]/25"
            : "text-[#718096] hover:bg-[#f8f9ff] hover:text-[#2d3748]"
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
    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#718096]/60 px-3 mb-2">
      {children}
    </p>
  );
}

export function AdminFloatingSidebar() {
  const navigate = useNavigate();
  const { profile } = useProfile();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Déconnexion réussie");
      navigate("/auth");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Erreur lors de la déconnexion");
    }
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:top-4 lg:left-4 lg:bottom-4 bg-white/80 backdrop-blur-xl border border-[#e2e8f0]/50 rounded-3xl shadow-2xl shadow-[#4f7df3]/5 overflow-hidden">
      {/* Header - Branding + Admin Info */}
      <div className="p-6 border-b border-[#e2e8f0]/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4f7df3] to-[#3b6ce8] flex items-center justify-center shadow-lg shadow-[#4f7df3]/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-[#2d3748] tracking-tight">DÉKON</h1>
            <p className="text-[11px] text-[#718096] font-medium">Control Center</p>
          </div>
        </div>
        
        {/* Admin Info */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#f8f9ff]">
          <div className="w-7 h-7 rounded-full bg-[#4f7df3]/10 flex items-center justify-center">
            <User className="w-4 h-4 text-[#4f7df3]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#2d3748] truncate">
              {profile?.owner_name || "Administrateur"}
            </p>
            <p className="text-[10px] text-[#718096]">Admin</p>
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
          <button className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-gradient-to-r from-[#4f7df3] via-[#5b8af5] to-[#3b6ce8] text-white shadow-lg shadow-[#4f7df3]/25 hover:opacity-90 transition-opacity">
            <Zap className="w-4 h-4" />
            <span className="text-[10px] font-medium">Broadcast</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 border-[#4f7df3] bg-transparent text-[#4f7df3] hover:bg-[#4f7df3] hover:text-white transition-all">
            <QrCode className="w-4 h-4" />
            <span className="text-[10px] font-medium">Générer</span>
          </button>
        </div>
        
        <div className="space-y-1">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'app</span>
          </NavLink>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-destructive hover:text-destructive/80 hover:bg-destructive/10 transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
