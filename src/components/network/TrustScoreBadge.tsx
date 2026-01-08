import { useTrustScore } from "@/hooks/use-trust-score";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustScoreBadgeProps {
  userId: string;
  size?: "sm" | "md";
}

export function TrustScoreBadge({ userId, size = "md" }: TrustScoreBadgeProps) {
  const { trustScore, loading } = useTrustScore(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-8 h-8">
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trustScore) return null;

  const formatCFA = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${Math.round(amount / 1000)}K`;
    }
    return amount.toString();
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1 rounded-full font-semibold cursor-help transition-transform hover:scale-105",
              size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
              trustScore.level === "diamond" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
              trustScore.level === "gold" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
              trustScore.level === "silver" && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
              trustScore.level === "bronze" && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
            )}
          >
            <span>{trustScore.levelEmoji}</span>
            <span>{trustScore.score}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="w-56 p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">
                {trustScore.levelEmoji} Score de confiance
              </span>
              <span className="text-lg font-bold" style={{ color: trustScore.color }}>
                {trustScore.score}/100
              </span>
            </div>
            
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${trustScore.score}%`,
                  backgroundColor: trustScore.color
                }}
              />
            </div>
            
            <div className="space-y-1 pt-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Dettes remboursées</span>
                <span className="font-medium text-foreground">
                  {trustScore.stats.paid_debts}/{trustScore.stats.total_debts}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Volume de ventes</span>
                <span className="font-medium text-foreground">
                  {formatCFA(trustScore.stats.total_sales_amount)} CFA
                </span>
              </div>
              <div className="flex justify-between">
                <span>Ancienneté</span>
                <span className="font-medium text-foreground">
                  {trustScore.stats.account_age_days} jours
                </span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
