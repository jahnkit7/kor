import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, UserAdd01Icon, Package01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";

interface QuickActionFABProps {
  className?: string;
  inline?: boolean;
}

const QuickActionFAB = ({ className, inline = false }: QuickActionFABProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    {
      label: "Nouveau client",
      icon: UserAdd01Icon,
      onClick: () => {
        setIsOpen(false);
        navigate("/clients/new");
      },
      color: "bg-[#4f7df3]",
    },
    {
      label: "Nouveau produit",
      icon: Package01Icon,
      onClick: () => {
        setIsOpen(false);
        navigate("/stock");
      },
      color: "bg-[#22c55e]",
    },
  ];

  return (
    <>
      {/* Backdrop - only for non-inline mode */}
      {!inline && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />
          )}
        </AnimatePresence>
      )}

      {/* FAB Container */}
      <div className={cn("relative", className)}>
        {/* Action Buttons */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute bottom-full right-0 mb-3 z-50"
            >
              <div className="flex flex-col gap-2 items-end">
                {actions.map((action, index) => (
                  <motion.button
                    key={action.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      triggerHaptic();
                      action.onClick();
                    }}
                    className="flex items-center gap-3 bg-white rounded-full pl-4 pr-3 py-2.5 shadow-lg shadow-[#4f7df3]/10 hover:shadow-xl transition-shadow"
                  >
                    <span className="text-sm font-semibold text-[#051425] whitespace-nowrap">
                      {action.label}
                    </span>
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white",
                        action.color
                      )}
                    >
                      <HugeiconsIcon icon={action.icon} className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB Button - Taille responsive avec clamp() */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            triggerHaptic();
            setIsOpen(!isOpen);
          }}
          className={cn(
            "flex items-center justify-center shadow-lg transition-all z-50 rounded-full",
            inline 
              ? "w-[clamp(2.75rem,10vw,3.25rem)] h-[clamp(2.75rem,10vw,3.25rem)]" 
              : "w-14 h-14",
            isOpen
              ? "bg-[#718096]"
              : "bg-gradient-to-br from-[#22c55e] to-[#16a34a]"
          )}
          style={{
            boxShadow: isOpen
              ? "0 4px 20px rgba(113, 128, 150, 0.4)"
              : "0 4px 20px rgba(34, 197, 94, 0.4)",
          }}
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <HugeiconsIcon 
              icon={isOpen ? Cancel01Icon : Add01Icon} 
              className={cn(
                "text-white",
                inline 
                  ? "w-[clamp(1.125rem,4vw,1.375rem)] h-[clamp(1.125rem,4vw,1.375rem)]" 
                  : "w-6 h-6"
              )}
              strokeWidth={2}
            />
          </motion.div>
        </motion.button>
      </div>
    </>
  );
};

export default QuickActionFAB;
