import { useEffect, useState } from "react";
import { Wifi, WifiOff, Cloud, RefreshCw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useSync } from "@/hooks/use-sync";

export function PWAStatus() {
  const { isOnline } = useNetworkStatus();
  const { isSyncing, pendingCount, pendingDetails, performSync } = useSync();
  const [showSuccess, setShowSuccess] = useState(false);
  const [wasSyncing, setWasSyncing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Show success animation after sync completes
  useEffect(() => {
    if (wasSyncing && !isSyncing && pendingCount === 0) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
        setIsVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
    setWasSyncing(isSyncing);
  }, [isSyncing, pendingCount, wasSyncing]);

  // Show indicator when offline or syncing or has pending
  useEffect(() => {
    if (!isOnline || isSyncing || pendingCount > 0 || showSuccess) {
      setIsVisible(true);
    } else {
      // Hide after a delay when online with nothing pending
      const timer = setTimeout(() => setIsVisible(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isSyncing, pendingCount, showSuccess]);

  if (!isVisible) return null;

  // Build pending details string
  const getPendingDetailsText = () => {
    const parts: string[] = [];
    if (pendingDetails?.sales > 0) parts.push(`${pendingDetails.sales} vente${pendingDetails.sales > 1 ? 's' : ''}`);
    if (pendingDetails?.clients > 0) parts.push(`${pendingDetails.clients} client${pendingDetails.clients > 1 ? 's' : ''}`);
    if (pendingDetails?.debts > 0) parts.push(`${pendingDetails.debts} dette${pendingDetails.debts > 1 ? 's' : ''}`);
    if (pendingDetails?.stock > 0) parts.push(`${pendingDetails.stock} stock`);
    return parts.join(', ');
  };

  // Success state
  if (showSuccess) {
    return (
      <StatusPill variant="success">
        <Check className="w-3 h-3" />
        <span>Synchronisé</span>
      </StatusPill>
    );
  }

  // Syncing state
  if (isSyncing) {
    return (
      <StatusPill variant="syncing">
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>Synchronisation...</span>
        {pendingCount > 0 && (
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-semibold">
            {pendingCount}
          </span>
        )}
      </StatusPill>
    );
  }

  // Offline state
  if (!isOnline) {
    return (
      <StatusPill variant="offline" pulse={pendingCount > 0}>
        <WifiOff className="w-3 h-3" />
        <span>Hors ligne</span>
        {pendingCount > 0 && (
          <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-semibold" title={getPendingDetailsText()}>
            {pendingCount}
          </span>
        )}
      </StatusPill>
    );
  }

  // Online with pending sync
  if (pendingCount > 0) {
    return (
      <StatusPill variant="pending" onClick={performSync}>
        <Cloud className="w-3 h-3" />
        <span>{pendingCount} en attente</span>
        <RefreshCw className="w-3 h-3 opacity-60" />
      </StatusPill>
    );
  }

  // Online state (briefly shown)
  return (
    <StatusPill variant="online">
      <Wifi className="w-3 h-3" />
      <span>En ligne</span>
    </StatusPill>
  );
}

interface StatusPillProps {
  variant: "online" | "offline" | "syncing" | "pending" | "success";
  children: React.ReactNode;
  onClick?: () => void;
  pulse?: boolean;
}

function StatusPill({ variant, children, onClick, pulse }: StatusPillProps) {
  const variants = {
    online: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    offline: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
    syncing: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
    pending: "bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30 cursor-pointer hover:bg-violet-500/30 active:scale-95",
    success: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  };

  return (
    <div
      className={cn(
        "fixed top-3 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-1.5 px-3 py-1.5",
        "text-xs font-medium rounded-full border backdrop-blur-sm shadow-lg",
        "animate-in fade-in slide-in-from-top-2 duration-300",
        "safe-area-inset-top transition-all",
        variants[variant],
        pulse && "animate-pulse"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {children}
    </div>
  );
}
