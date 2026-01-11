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
 */
export function ProtectedLayout() {
  const location = useLocation();

  return (
    <RequireProfile>
      <RequireSubscription>
        <AppLayout>
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
