import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  QrCode, 
  MoreHorizontal,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, ToggleLeft, Percent, MessageSquare, FileText, Gift } from "lucide-react";

const mainItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { to: "/admin/financials", icon: TrendingUp, label: "Finances" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/codes", icon: QrCode, label: "Codes" },
];

const moreItems = [
  { to: "/admin/subscriptions", icon: CreditCard, label: "Abonnements" },
  { to: "/admin/geography", icon: Globe, label: "Géographie" },
  { to: "/admin/features", icon: ToggleLeft, label: "Features" },
  { to: "/admin/commissions", icon: Gift, label: "Commissions" },
  { to: "/admin/promo-codes", icon: Percent, label: "Codes Promo" },
  { to: "/admin/support", icon: MessageSquare, label: "Support" },
  { to: "/admin/logs", icon: FileText, label: "Logs" },
];

export function AdminMobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16">
        {mainItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
        
        <DropdownMenu>
          <DropdownMenuTrigger className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] text-muted-foreground">
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">Plus</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {moreItems.map((item) => (
              <DropdownMenuItem key={item.to} asChild>
                <NavLink to={item.to} className="flex items-center gap-2 cursor-pointer">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
