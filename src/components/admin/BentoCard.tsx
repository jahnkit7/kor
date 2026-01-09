import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type BentoSize = "1x1" | "2x1" | "1x2" | "2x2";

interface BentoCardProps {
  children: ReactNode;
  size?: BentoSize;
  className?: string;
  onClick?: () => void;
  gradient?: boolean;
  glow?: boolean;
}

const sizeClasses: Record<BentoSize, string> = {
  "1x1": "col-span-1 row-span-1",
  "2x1": "col-span-2 row-span-1",
  "1x2": "col-span-1 row-span-2",
  "2x2": "col-span-2 row-span-2",
};

export function BentoCard({ 
  children, 
  size = "1x1", 
  className,
  onClick,
  gradient = false,
  glow = false
}: BentoCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-3xl border border-border/50 bg-card p-6 transition-all duration-300",
        "hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5",
        onClick && "cursor-pointer",
        gradient && "bg-gradient-to-br from-card via-card to-secondary/30",
        glow && "hover:shadow-primary/10",
        sizeClasses[size],
        className
      )}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Content */}
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}

// Header component for BentoCard
interface BentoCardHeaderProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function BentoCardHeader({ icon, title, subtitle, action }: BentoCardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        )}
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// Value display for stats
interface BentoCardValueProps {
  value: string | number;
  label?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const valueSizes = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-4xl",
};

export function BentoCardValue({ value, label, trend, trendValue, size = "lg" }: BentoCardValueProps) {
  return (
    <div>
      <p className={cn("font-bold tracking-tight text-foreground", valueSizes[size])}>
        {value}
      </p>
      {label && (
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      )}
      {trend && trendValue && (
        <div className={cn(
          "inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium",
          trend === "up" && "bg-success/10 text-success",
          trend === "down" && "bg-destructive/10 text-destructive",
          trend === "neutral" && "bg-muted text-muted-foreground"
        )}>
          {trend === "up" && "↑"}
          {trend === "down" && "↓"}
          {trendValue}
        </div>
      )}
    </div>
  );
}
