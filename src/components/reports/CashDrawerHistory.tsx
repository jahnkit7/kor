import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wallet, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCashDrawerHistory } from "@/hooks/use-cash-drawer-history";
import { useHiddenAmount } from "@/components/HideAmountsToggle";

export function CashDrawerHistory() {
  const { entries, loading } = useCashDrawerHistory(15);
  const { formatMoney, hideAmounts } = useHiddenAmount();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="w-5 h-5" />
            Historique caisse
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="w-5 h-5" />
            Historique caisse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun historique de caisse</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="w-5 h-5" />
          Historique caisse
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map((entry, index) => {
          const isClosed = entry.closed_at !== null;
          const difference = isClosed && entry.closing_amount !== null 
            ? entry.closing_amount - entry.opening_amount 
            : null;
          
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "rounded-xl p-4 border",
                isClosed 
                  ? "bg-card border-border" 
                  : "bg-primary/5 border-primary/20"
              )}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    isClosed ? "bg-success/10" : "bg-primary/10"
                  )}>
                    {isClosed ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <Clock className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(entry.opened_at), "EEEE d MMMM", { locale: fr })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(entry.opened_at), "HH:mm")}
                      {isClosed && entry.closed_at && (
                        <> → {format(new Date(entry.closed_at), "HH:mm")}</>
                      )}
                    </p>
                  </div>
                </div>
                {!isClosed && (
                  <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    En cours
                  </span>
                )}
              </div>

              {/* Amounts row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Ouverture</p>
                  <p className="font-semibold text-foreground">
                    {formatMoney(entry.opening_amount)} {!hideAmounts && "CFA"}
                  </p>
                </div>
                
                {isClosed && entry.closing_amount !== null ? (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Clôture</p>
                    <p className="font-semibold text-foreground">
                      {formatMoney(entry.closing_amount)} {!hideAmounts && "CFA"}
                    </p>
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-lg p-3 flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">En attente...</span>
                  </div>
                )}
              </div>

              {/* Difference indicator */}
              {isClosed && difference !== null && (
                <div className={cn(
                  "mt-3 rounded-lg p-2 flex items-center justify-between",
                  difference === 0 
                    ? "bg-success/10" 
                    : difference > 0 
                      ? "bg-primary/10" 
                      : "bg-destructive/10"
                )}>
                  <div className="flex items-center gap-2">
                    {difference === 0 ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : difference > 0 ? (
                      <TrendingUp className="w-4 h-4 text-primary" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    )}
                    <span className={cn(
                      "text-xs font-medium",
                      difference === 0 
                        ? "text-success" 
                        : difference > 0 
                          ? "text-primary" 
                          : "text-destructive"
                    )}>
                      {difference === 0 
                        ? "Équilibrée" 
                        : difference > 0 
                          ? "Excédent" 
                          : "Manquant"}
                    </span>
                  </div>
                  {difference !== 0 && (
                    <span className={cn(
                      "text-xs font-bold",
                      difference > 0 ? "text-primary" : "text-destructive"
                    )}>
                      {difference > 0 ? "+" : ""}{formatMoney(difference)} {!hideAmounts && "CFA"}
                    </span>
                  )}
                </div>
              )}

              {/* Notes */}
              {entry.notes && (
                <p className="mt-2 text-xs text-muted-foreground italic">
                  {entry.notes}
                </p>
              )}
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
