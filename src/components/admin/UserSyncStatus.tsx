import { AlertTriangle, Cloud, HardDrive, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface UserSyncStatusProps {
  cloudSales: number;
  cloudAmount: number;
  hasPendingSync?: boolean;
  pendingCount?: number;
  className?: string;
}

export function UserSyncStatus({
  cloudSales,
  cloudAmount,
  hasPendingSync = false,
  pendingCount = 0,
  className,
}: UserSyncStatusProps) {
  const formatCFA = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Cloud data indicator */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Cloud className="w-3.5 h-3.5 text-primary" />
              <span>{cloudSales} ventes</span>
              <span className="text-muted-foreground/60">•</span>
              <span>{formatCFA(cloudAmount)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Données synchronisées dans le cloud</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Pending sync warning */}
      {hasPendingSync && pendingCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className="gap-1 text-xs border-warning/50 text-warning bg-warning/10"
              >
                <AlertTriangle className="w-3 h-3" />
                {pendingCount} local
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold mb-1">Données en attente de synchronisation</p>
              <p className="text-xs text-muted-foreground">
                Cet utilisateur a {pendingCount} élément(s) non synchronisé(s) sur son appareil. 
                Les commissions seront mises à jour après synchronisation.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

interface SyncWarningBannerProps {
  usersWithPendingSync: number;
  totalPendingItems: number;
}

export function SyncWarningBanner({ usersWithPendingSync, totalPendingItems }: SyncWarningBannerProps) {
  if (usersWithPendingSync === 0) return null;

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30 text-warning-foreground">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-warning/20">
        <RefreshCw className="w-5 h-5 text-warning" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-foreground">
          Synchronisation en attente
        </p>
        <p className="text-sm text-muted-foreground">
          {usersWithPendingSync} utilisateur(s) ont {totalPendingItems} élément(s) non synchronisé(s). 
          Les commissions affichées peuvent être incomplètes.
        </p>
      </div>
    </div>
  );
}
