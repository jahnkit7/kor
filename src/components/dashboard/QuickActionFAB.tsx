import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, UserPlus, Package, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionFABProps {
  className?: string;
}

const QuickActionFAB = ({ className }: QuickActionFABProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    {
      label: "Nouveau client",
      icon: UserPlus,
      onClick: () => {
        setIsOpen(false);
        navigate("/clients/new");
      },
      color: "bg-[#4f7df3]",
    },
    {
      label: "Nouveau produit",
      icon: Package,
      onClick: () => {
        setIsOpen(false);
        navigate("/stock");
      },
      color: "bg-[#22c55e]",
    },
  ];

  return (
    <>
      {/* Backdrop */}
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
                    onClick={action.onClick}
                    className="flex items-center gap-3 bg-white rounded-full pl-4 pr-3 py-2.5 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <span className="text-sm font-semibold text-[#2d3748] whitespace-nowrap">
                      {action.label}
                    </span>
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white",
                        action.color
                      )}
                    >
                      <action.icon className="w-5 h-5" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all z-50",
            isOpen
              ? "bg-[#718096] rotate-45"
              : "bg-gradient-to-br from-[#22c55e] to-[#16a34a]"
          )}
          style={{
            boxShadow: isOpen
              ? "0 4px 20px rgba(113, 128, 150, 0.4)"
              : "0 4px 20px rgba(34, 197, 94, 0.4)",
          }}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Plus className="w-7 h-7 text-white" />
          )}
        </motion.button>
      </div>
    </>
  );
};

export default QuickActionFAB;
