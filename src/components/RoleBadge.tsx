import { cn } from "@/lib/utils";
import { UserCheck, Shield, Crown } from "lucide-react";

interface RoleBadgeProps {
  role: "owner" | "employee" | "admin";
  className?: string;
  showIcon?: boolean;
}

export function RoleBadge({ role, className, showIcon = true }: RoleBadgeProps) {
  if (role === "owner") {
    return null; // Don't show badge for owner (default)
  }

  if (role === "admin") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
          "bg-accent/10 text-accent",
          className
        )}
      >
        {showIcon && <Crown className="w-3 h-3" />}
        Admin
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
        "bg-secondary text-muted-foreground",
        className
      )}
    >
      {showIcon && <UserCheck className="w-3 h-3" />}
      Employé
    </span>
  );
}

export function OwnerBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
        "bg-primary/10 text-primary",
        className
      )}
    >
      <Shield className="w-3 h-3" />
      Propriétaire
    </span>
  );
}
