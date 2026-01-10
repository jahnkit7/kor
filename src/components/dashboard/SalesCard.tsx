import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Store01Icon, ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

interface SalesCardProps {
  shopName: string;
  totalSales: number;
  cashSales: number;
  creditSales: number;
  hideAmounts: boolean;
  onToggleHide: () => void;
  formatMoney: (value: number) => string;
  className?: string;
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
}: SalesCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "bg-white rounded-3xl p-5 shadow-lg border border-[#e2e8f0]",
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
            <p className="text-sm font-semibold text-[#2d3748]">{shopName}</p>
            <p className="text-xs text-[#718096]">Ventes du jour</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#4f7df3] to-[#3b6ce8] text-white text-[10px] font-bold tracking-wide">
            DÉKON
          </span>
        </div>
      </div>

      {/* Total Amount */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-3xl font-extrabold text-[#2d3748] tracking-tight">
            {formatMoney(totalSales)}
            {!hideAmounts && (
              <span className="text-base font-semibold text-[#718096] ml-1">
                CFA
              </span>
            )}
          </p>
        </div>
        <button
          onClick={onToggleHide}
          className="w-10 h-10 rounded-full bg-[#f8f9ff] flex items-center justify-center hover:bg-[#eef1fb] transition-colors"
        >
          <HugeiconsIcon 
            icon={hideAmounts ? ViewOffSlashIcon : ViewIcon} 
            className="w-5 h-5 text-[#718096]" 
            strokeWidth={1.5}
          />
        </button>
      </div>

      {/* Cash / Credit Split */}
      <div className="flex gap-4">
        <div className="flex-1 bg-[#f8f9ff] rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#4f7df3]" />
            <span className="text-xs font-medium text-[#718096]">Cash</span>
          </div>
          <p className="text-lg font-bold text-[#2d3748]">
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
