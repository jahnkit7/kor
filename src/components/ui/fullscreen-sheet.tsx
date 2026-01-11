import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FullScreenSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * A fullscreen sheet with smooth framer-motion animations
 * Use this for fullscreen modals/sheets on mobile
 */
const FullScreenSheet = ({
  open,
  onOpenChange,
  children,
  className,
}: FullScreenSheetProps) => {
  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/80"
            onClick={() => onOpenChange(false)}
          />

          {/* Content */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 300,
              mass: 0.8,
            }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 h-[100dvh] bg-background",
              "pb-[env(safe-area-inset-bottom)]",
              className
            )}
          >
            {/* Close button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-10 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </button>

            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

interface FullScreenSheetHeaderProps {
  children: React.ReactNode;
  className?: string;
}

const FullScreenSheetHeader = ({
  children,
  className,
}: FullScreenSheetHeaderProps) => (
  <div
    className={cn(
      "pt-[calc(env(safe-area-inset-top)+0.5rem)] px-6 pb-2",
      className
    )}
  >
    {children}
  </div>
);

interface FullScreenSheetTitleProps {
  children: React.ReactNode;
  className?: string;
}

const FullScreenSheetTitle = ({
  children,
  className,
}: FullScreenSheetTitleProps) => (
  <h2 className={cn("text-lg font-semibold text-foreground", className)}>
    {children}
  </h2>
);

interface FullScreenSheetContentProps {
  children: React.ReactNode;
  className?: string;
}

const FullScreenSheetContent = ({
  children,
  className,
}: FullScreenSheetContentProps) => (
  <div className={cn("flex-1 overflow-auto px-6", className)}>{children}</div>
);

export {
  FullScreenSheet,
  FullScreenSheetHeader,
  FullScreenSheetTitle,
  FullScreenSheetContent,
};
