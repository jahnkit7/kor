import * as React from "react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/haptics";

interface PrimaryActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "blue" | "green" | "orange" | "red";
  hapticPattern?: "light" | "medium" | "success";
}

/**
 * Primary action button with gradient style - used for main CTAs
 * Style inspired by Auth page buttons
 * Includes haptic feedback on press
 */
const PrimaryActionButton = React.forwardRef<
  HTMLButtonElement,
  PrimaryActionButtonProps
>(({ className, children, variant = "blue", disabled, hapticPattern = "medium", onClick, ...props }, ref) => {
  const gradients = {
    blue: "from-[#4f7df3] via-[#5b8af5] to-[#3b6ce8] shadow-blue-500/30",
    green: "from-[#22c55e] via-[#16a34a] to-[#15803d] shadow-green-500/30",
    orange: "from-[#f97316] via-[#ea580c] to-[#c2410c] shadow-orange-500/30",
    red: "from-[#ef4444] via-[#dc2626] to-[#b91c1c] shadow-red-500/30",
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      triggerHaptic(hapticPattern);
    }
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "w-full h-14 rounded-full flex items-center justify-center gap-2",
        "bg-gradient-to-r text-white font-bold text-base tracking-wide uppercase",
        "shadow-lg hover:shadow-xl",
        "active:scale-[0.98] transition-all",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        gradients[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
PrimaryActionButton.displayName = "PrimaryActionButton";

export { PrimaryActionButton };
