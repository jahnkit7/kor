import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { RequireProfile } from "@/components/RequireProfile";
import { RequireSubscription } from "@/components/RequireSubscription";
import AppLayout from "@/components/layout/AppLayout";
import { PageTransition } from "./PageTransition";

/**
 * Persistent layout for protected routes.
 * - BottomNav stays mounted (no flicker on navigation)
 * - Only the page content animates in/out
 * - Auth/subscription guards wrap the entire layout
 * - Scroll resets on every route change
 * 
 * NOTE: Admin redirection is handled by AdminLayout, not here.
 * This prevents redirection conflicts and flickering.
 */
export function ProtectedLayout() {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset scroll on route change
  useEffect(() => {
    // Reset container scroll
    if (containerRef.current) {
      containerRef.current.scrollTo(0, 0);
    }
    // Also reset window scroll
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <RequireProfile>
      <RequireSubscription>
        <AppLayout ref={containerRef}>
          <AnimatePresence mode="popLayout" initial={false}>
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </AppLayout>
      </RequireSubscription>
    </RequireProfile>
  );
}
