import { ReactNode } from "react";
import BottomNav from "@/components/BottomNav";
import { SubscriptionReminderPopup } from "@/components/SubscriptionReminderPopup";

interface AppLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
  className?: string;
}

/**
 * Main app layout wrapper that handles:
 * - Bottom navigation positioning
 * - Proper scrolling behavior
 * - Subscription reminder popup for expired subscriptions
 * 
 * NOTE: Safe area removed for compact design - BottomNav is now floating
 */
const AppLayout = ({ children, showBottomNav = true, className = "" }: AppLayoutProps) => {
  return (
    <div 
      className={`min-h-[100dvh] bg-gradient-to-b from-[#f8f9ff] via-white to-[#f8f9ff] overflow-y-auto scrollbar-hide ${className}`}
      style={{
        // Only bottom padding for floating nav - pages handle their own top safe-area
        paddingBottom: showBottomNav ? '80px' : '0',
      }}
    >
      {children}
      {showBottomNav && <BottomNav />}
      <SubscriptionReminderPopup />
    </div>
  );
};

export default AppLayout;
