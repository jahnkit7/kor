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
      className={`min-h-[100dvh] bg-gradient-to-b from-[#f8f9ff] via-white to-[#f8f9ff] ${className}`}
      style={{
        // Smart safe-area: top for iOS notch, bottom for floating nav
        paddingTop: 'max(env(safe-area-inset-top), 12px)',
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
