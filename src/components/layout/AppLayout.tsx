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
 * - Safe area insets for iOS (notch, home indicator)
 * - Bottom navigation positioning
 * - Proper scrolling behavior
 * - Subscription reminder popup for expired subscriptions
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
      <SubscriptionReminderPopup />
    </div>
  );
};

export default AppLayout;
