import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChartIncreaseIcon, Package01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

interface BentoStatsGridProps {
  totalDebts: number;
  clientsWithDebts: number;
  stockValue: number;
  stockItemsCount: number;
  formatMoney: (value: number) => string;
  className?: string;
}

const BentoStatsGrid = ({
  totalDebts,
  clientsWithDebts,
  stockValue,
  stockItemsCount,
  formatMoney,
  className,
}: BentoStatsGridProps) => {
  const navigate = useNavigate();

  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      {/* Debts Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onClick={() => navigate("/debts")}
        className="bg-gradient-to-br from-[#fee2e2] to-[#fecaca] rounded-2xl p-4 cursor-pointer hover:shadow-lg transition-all active:scale-[0.98]"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#ef4444]/20 flex items-center justify-center">
            <HugeiconsIcon icon={ChartIncreaseIcon} className="w-5 h-5 text-[#ef4444]" strokeWidth={1.5} />
          </div>
          <HugeiconsIcon icon={ArrowRight01Icon} className="w-5 h-5 text-[#ef4444]/60" strokeWidth={1.5} />
        </div>
        <p className="text-xs font-medium text-[#991b1b] mb-1">
          Dettes à récupérer
        </p>
        <p className="text-xl font-bold text-[#dc2626]">{formatMoney(totalDebts)}</p>
        <p className="text-xs text-[#991b1b]/70 mt-1">
          {clientsWithDebts} client{clientsWithDebts !== 1 ? "s" : ""}
        </p>
      </motion.div>

      {/* Stock Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        onClick={() => navigate("/stock")}
        className="bg-gradient-to-br from-[#dbeafe] to-[#bfdbfe] rounded-2xl p-4 cursor-pointer hover:shadow-lg transition-all active:scale-[0.98]"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/20 flex items-center justify-center">
            <HugeiconsIcon icon={Package01Icon} className="w-5 h-5 text-[#3b82f6]" strokeWidth={1.5} />
          </div>
          <HugeiconsIcon icon={ArrowRight01Icon} className="w-5 h-5 text-[#3b82f6]/60" strokeWidth={1.5} />
        </div>
        <p className="text-xs font-medium text-[#1e40af] mb-1">Valeur du stock</p>
        <p className="text-xl font-bold text-[#2563eb]">{formatMoney(stockValue)}</p>
        <p className="text-xs text-[#1e40af]/70 mt-1">
          {stockItemsCount} produit{stockItemsCount !== 1 ? "s" : ""}
        </p>
      </motion.div>
    </div>
  );
};

export default BentoStatsGrid;
