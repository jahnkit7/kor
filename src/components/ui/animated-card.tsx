import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Card with smooth entrance animation using framer-motion
 * Provides hover scale and shadow effects
 */
const AnimatedCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ className, children, delay = 0, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.3,
          delay: delay * 0.05,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        whileHover={{ 
          scale: 1.02,
          boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.15)",
        }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "rounded-xl border bg-card text-card-foreground shadow-card transition-colors cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
AnimatedCard.displayName = "AnimatedCard";

/**
 * Static card with subtle hover effect (no entrance animation)
 * Use for cards that don't need list animation
 */
const HoverCard = React.forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={{ 
          scale: 1.01,
          boxShadow: "0 8px 25px -8px rgba(0, 0, 0, 0.12)",
        }}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "rounded-xl border bg-card text-card-foreground shadow-card transition-colors",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
HoverCard.displayName = "HoverCard";

export { AnimatedCard, HoverCard };
