import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  size?: "default" | "large";
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  className,
  size = "default",
  onClick,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl border border-border p-4 shadow-card",
        size === "large" && "p-6",
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p
            className={cn(
              "mt-1 font-bold text-foreground",
              size === "large" ? "text-3xl" : "text-2xl"
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className="mt-2 flex items-center gap-1">
              {trend === "up" && (
                <TrendingUp className="w-4 h-4 text-success" />
              )}
              {trend === "down" && (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
              {trend === "neutral" && (
                <Minus className="w-4 h-4 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  trend === "up" && "text-success",
                  trend === "down" && "text-destructive",
                  trend === "neutral" && "text-muted-foreground"
                )}
              >
                {trendValue}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
