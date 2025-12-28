import { ReactNode } from "react";
import BottomNav from "@/components/BottomNav";

interface AppLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
  className?: string;
}

/**
 * Main app layout wrapper that handles:
 * - Safe area insets for iOS (notch, home indicator)
 * - Bottom navigation positioning
 * - Proper scrolling behavior
 */
const AppLayout = ({ children, showBottomNav = true, className = "" }: AppLayoutProps) => {
  return (
    <div 
      className={`min-h-screen min-h-[100dvh] bg-background overflow-x-hidden ${className}`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: showBottomNav ? 'calc(4rem + env(safe-area-inset-bottom))' : 'env(safe-area-inset-bottom)',
      }}
    >
      {children}
      {showBottomNav && <BottomNav />}
    </div>
  );
};

export default AppLayout;
