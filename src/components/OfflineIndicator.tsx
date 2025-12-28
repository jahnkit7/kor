import { useNetworkStatus } from "@/hooks/use-network-status";
import { useSync } from "@/hooks/use-sync";
import { Wifi, WifiOff, RefreshCw, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const { isOnline } = useNetworkStatus();
  const { isSyncing, pendingCount, performSync } = useSync();

  // Don't show if online and nothing pending
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium transition-all duration-300",
        isOnline
          ? pendingCount > 0
            ? "bg-accent text-accent-foreground"
            : "bg-success text-primary-foreground"
          : "bg-debt text-primary-foreground"
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Mode hors-ligne</span>
          {pendingCount > 0 && (
            <span className="bg-primary-foreground/20 px-2 py-0.5 rounded-full text-xs">
              {pendingCount} en attente
            </span>
          )}
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Synchronisation...</span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>{pendingCount} en attente</span>
          <button
            onClick={performSync}
            className="bg-primary-foreground/20 px-2 py-0.5 rounded-full text-xs hover:bg-primary-foreground/30 transition-colors"
          >
            Synchroniser
          </button>
        </>
      ) : (
        <>
          <Check className="w-4 h-4" />
          <span>Synchronisé</span>
        </>
      )}
    </div>
  );
}
