import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Wallet, 
  X, 
  ArrowRight, 
  Banknote,
  CheckCircle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CashDrawerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number, notes?: string) => Promise<boolean>;
  mode: "open" | "close";
  currentAmount?: number;
}

export function CashDrawerDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  mode,
  currentAmount = 0 
}: CashDrawerDialogProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    const numAmount = parseInt(amount.replace(/\s/g, ""), 10) || 0;
    
    if (numAmount < 0) return;
    
    setLoading(true);
    const success = await onConfirm(numAmount);
    setLoading(false);
    
    if (success) {
      setAmount("");
      onClose();
    }
  };

  const formatAmount = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, "");
    // Format with spaces
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(formatAmount(e.target.value));
  };

  const quickAmounts = [5000, 10000, 20000, 50000];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 safe-bottom"
          >
            <div className="bg-card rounded-t-3xl shadow-2xl border-t border-border/50">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 rounded-full bg-muted" />
              </div>
              
              {/* Header */}
              <div className="px-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center",
                      mode === "open" 
                        ? "bg-primary/10" 
                        : "bg-success/10"
                    )}>
                      {mode === "open" ? (
                        <Wallet className="w-6 h-6 text-primary" />
                      ) : (
                        <CheckCircle className="w-6 h-6 text-success" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        {mode === "open" ? "Ouverture de caisse" : "Clôture de caisse"}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {mode === "open" 
                          ? "Indiquez le montant de départ" 
                          : "Comptez votre caisse"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* Current amount info for close mode */}
                {mode === "close" && currentAmount > 0 && (
                  <div className="bg-muted/50 rounded-2xl p-4 mb-4">
                    <p className="text-sm text-muted-foreground mb-1">Ouverture</p>
                    <p className="text-lg font-semibold text-foreground">
                      {currentAmount.toLocaleString("fr-FR")} CFA
                    </p>
                  </div>
                )}

                {/* Amount Input */}
                <div className="space-y-4">
                  <div className="relative">
                    <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={amount}
                      onChange={handleAmountChange}
                      className="h-16 pl-12 pr-16 text-2xl font-bold text-center bg-muted/50 border-0 rounded-2xl focus:ring-2 focus:ring-primary/20"
                      autoFocus
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      CFA
                    </span>
                  </div>

                  {/* Quick amount buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {quickAmounts.map((quickAmount) => (
                      <button
                        key={quickAmount}
                        type="button"
                        onClick={() => setAmount(formatAmount(quickAmount.toString()))}
                        className="py-3 px-2 rounded-xl bg-muted/50 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        {(quickAmount / 1000).toLocaleString()}k
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 pt-2">
                <Button
                  size="lg"
                  className={cn(
                    "w-full h-14 rounded-2xl font-semibold text-base",
                    mode === "open" 
                      ? "bg-primary hover:bg-primary/90" 
                      : "bg-success hover:bg-success/90"
                  )}
                  onClick={handleConfirm}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {mode === "open" ? "Ouvrir la caisse" : "Clôturer la caisse"}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
