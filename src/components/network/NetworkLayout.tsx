import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NetworkLayoutProps {
  children: ReactNode;
  className?: string;
}

export function NetworkLayout({ children, className }: NetworkLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen bg-background",
      "pb-[env(safe-area-inset-bottom)]",
      className
    )}>
      {children}
    </div>
  );
}
