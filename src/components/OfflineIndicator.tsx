import { useState, useEffect } from "react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useSync } from "@/hooks/use-sync";
import { CloudOff, RefreshCw, Check, Wifi, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const { isOnline } = useNetworkStatus();
  const { isSyncing, pendingCount, performSync, pendingDetails } = useSync();
  const [showSuccess, setShowSuccess] = useState(false);
  const [wassyncing, setWasSyncing] = useState(false);
  const [nextAutoSync, setNextAutoSync] = useState(30);

  // Show success animation after sync completes
  useEffect(() => {
    if (wassyncing && !isSyncing && pendingCount === 0) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
    setWasSyncing(isSyncing);
  }, [isSyncing, pendingCount, wassyncing]);

  // Countdown to next auto-sync
  useEffect(() => {
    if (!isOnline || pendingCount === 0 || isSyncing) {
      setNextAutoSync(30);
      return;
    }

    const interval = setInterval(() => {
      setNextAutoSync((prev) => {
        if (prev <= 1) {
          return 30; // Reset after sync triggers
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOnline, pendingCount, isSyncing]);

  // Reset countdown when sync starts
  useEffect(() => {
    if (isSyncing) {
      setNextAutoSync(30);
    }
  }, [isSyncing]);

  // Show success state briefly
  if (showSuccess) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium bg-success text-success-foreground animate-fade-in">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 animate-scale-in" />
          <span>Synchronisation terminée</span>
        </div>
      </div>
    );
  }

  // Don't show if online and nothing pending
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  // Build pending details string
  const buildPendingDetails = () => {
    const parts: string[] = [];
    if (pendingDetails.sales > 0) parts.push(`${pendingDetails.sales} vente(s)`);
    if (pendingDetails.clients > 0) parts.push(`${pendingDetails.clients} client(s)`);
    if (pendingDetails.debts > 0) parts.push(`${pendingDetails.debts} dette(s)`);
    if (pendingDetails.payments > 0) parts.push(`${pendingDetails.payments} paiement(s)`);
    if (pendingDetails.stock > 0) parts.push(`${pendingDetails.stock} stock(s)`);
    return parts.join(", ");
  };

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-center gap-3 text-sm font-medium transition-all duration-300",
        isOnline
          ? pendingCount > 0
            ? "bg-accent/90 text-accent-foreground"
            : "bg-success text-success-foreground"
          : "bg-secondary text-foreground border-b border-border"
      )}
    >
      {!isOnline ? (
        <>
          <CloudOff className="w-4 h-4 text-muted-foreground" />
          <div className="flex flex-col items-center">
            <span className="font-semibold">Mode hors ligne</span>
            <span className="text-xs opacity-80">Vos ventes sont en sécurité</span>
          </div>
          {pendingCount > 0 && (
            <span className="bg-foreground/10 px-2 py-0.5 rounded-full text-xs font-semibold">
              {pendingCount} en attente
            </span>
          )}
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Synchronisation en cours...</span>
          <span className="text-xs opacity-70">{buildPendingDetails()}</span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <Wifi className="w-4 h-4" />
          <div className="flex flex-col items-center">
            <span>{pendingCount} en attente de synchro</span>
            <span className="text-xs opacity-70">{buildPendingDetails()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs opacity-70">
              <Clock className="w-3 h-3" />
              {nextAutoSync}s
            </span>
            <button
              onClick={performSync}
              className="bg-accent-foreground/20 px-3 py-1 rounded-full text-xs font-semibold hover:bg-accent-foreground/30 transition-colors"
            >
              Sync maintenant
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
