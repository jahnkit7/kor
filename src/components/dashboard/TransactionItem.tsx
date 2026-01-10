import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Wallet, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransactionItemProps {
  type: "cash" | "credit" | "payment";
  amount: number;
  client?: string;
  note?: string;
  time: string;
  hideAmounts?: boolean;
  index?: number;
}

const TransactionItem = ({
  type,
  amount,
  client,
  note,
  time,
  hideAmounts = false,
  index = 0,
}: TransactionItemProps) => {
  const formatMoney = (val: number) => {
    if (hideAmounts) return "•••••";
    return new Intl.NumberFormat("fr-FR").format(val);
  };

  const config = {
    cash: {
      icon: ArrowDownLeft,
      bgColor: "bg-[#eef6ff]",
      iconColor: "text-[#4f7df3]",
      label: "Vente cash",
      amountColor: "text-[#051425]",
      amountPrefix: "",
    },
    credit: {
      icon: ArrowUpRight,
      bgColor: "bg-[#fff8f5]",
      iconColor: "text-[#f97316]",
      label: "Vente crédit",
      amountColor: "text-[#f97316]",
      amountPrefix: "",
    },
    payment: {
      icon: ArrowDownLeft,
      bgColor: "bg-[#f0fdf4]",
      iconColor: "text-[#22c55e]",
      label: "Paiement reçu",
      amountColor: "text-[#22c55e]",
      amountPrefix: "+",
    },
  };

  const { icon: Icon, bgColor, iconColor, label, amountColor, amountPrefix } =
    config[type];

  const displayLabel = client || note || label;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-xl p-4 shadow-lg shadow-[#4f7df3]/5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center",
            bgColor
          )}
        >
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#051425] truncate">
            {displayLabel}
          </p>
          <p className="text-xs text-[#718096]">{time}</p>
        </div>

        {/* Amount */}
        <p className={cn("text-base font-bold", amountColor)}>
          {amountPrefix}
          {formatMoney(amount)}
        </p>
      </div>
    </motion.div>
  );
};

export default TransactionItem;
