import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Store01Icon, ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { Wallet, Send, LockOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";

interface SalesCardProps {
  shopName: string;
  totalSales: number;
  cashSales: number;
  creditSales: number;
  hideAmounts: boolean;
  onToggleHide: () => void;
  formatMoney: (value: number) => string;
  className?: string;
  isDrawerOpen?: boolean;
  onOpenCashDrawer?: () => void;
  onCloseCashDrawer?: () => void;
  onShareReport?: () => void;
}

const SalesCard = ({
  shopName,
  totalSales,
  cashSales,
  creditSales,
  hideAmounts,
  onToggleHide,
  formatMoney,
  className,
  isDrawerOpen = false,
  onOpenCashDrawer,
  onCloseCashDrawer,
  onShareReport,
}: SalesCardProps) => {
  const handleCashDrawer = () => {
    triggerHaptic();
    if (isDrawerOpen) {
      onCloseCashDrawer?.();
    } else {
      onOpenCashDrawer?.();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "bg-white rounded-2xl p-5 shadow-lg shadow-[#4f7df3]/10",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4f7df3] to-[#3b6ce8] flex items-center justify-center">
            <HugeiconsIcon icon={Store01Icon} className="w-5 h-5 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#051425]">{shopName}</p>
            <p className="text-xs text-[#718096]">Ventes du jour</p>
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <motion.button
            onClick={handleCashDrawer}
            whileTap={{ scale: 0.9 }}
            className={cn(
              "h-9 px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-colors",
              isDrawerOpen 
                ? "bg-success/10 text-success hover:bg-success/20" 
                : "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            {isDrawerOpen ? (
              <>
                <LockOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Caisse</span>
              </>
            ) : (
              <>
                <Wallet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ouvrir</span>
              </>
            )}
          </motion.button>
          <motion.button
            onClick={() => {
              triggerHaptic();
              onShareReport?.();
            }}
            whileTap={{ scale: 0.9 }}
            className="h-9 w-9 rounded-full bg-[#25D366]/10 flex items-center justify-center hover:bg-[#25D366]/20 transition-colors"
            aria-label="Envoyer rapport WhatsApp"
          >
            <Send className="w-4 h-4 text-[#25D366]" />
          </motion.button>
        </div>
      </div>

      {/* Total Amount */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-3xl font-extrabold text-[#051425] tracking-tight">
            {formatMoney(totalSales)}
            {!hideAmounts && (
              <span className="text-base font-semibold text-[#718096] ml-1">
                CFA
              </span>
            )}
          </p>
        </div>
        <motion.button
          onClick={onToggleHide}
          whileTap={{ scale: 0.9 }}
          className="w-10 h-10 rounded-full bg-[#f8f9ff] flex items-center justify-center hover:bg-[#eef1fb] transition-colors"
        >
          <HugeiconsIcon 
            icon={hideAmounts ? ViewOffSlashIcon : ViewIcon} 
            className="w-5 h-5 text-[#718096]" 
            strokeWidth={1.5}
          />
        </motion.button>
      </div>

      {/* Cash / Credit Split */}
      <div className="flex gap-4">
        <div className="flex-1 bg-[#f8f9ff] rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#4f7df3]" />
            <span className="text-xs font-medium text-[#718096]">Cash</span>
          </div>
          <p className="text-lg font-bold text-[#051425]">
            {formatMoney(cashSales)}
          </p>
        </div>
        <div className="w-px bg-[#e2e8f0]" />
        <div className="flex-1 bg-[#fff8f5] rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#f97316]" />
            <span className="text-xs font-medium text-[#718096]">Crédit</span>
          </div>
          <p className="text-lg font-bold text-[#f97316]">
            {formatMoney(creditSales)}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default SalesCard;
