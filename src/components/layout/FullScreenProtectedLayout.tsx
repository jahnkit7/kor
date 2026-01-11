import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { RequireProfile } from "@/components/RequireProfile";
import { RequireSubscription } from "@/components/RequireSubscription";
import { PageTransition } from "./PageTransition";

/**
 * Protected layout for fullscreen pages (like Sale) that should NOT show BottomNav.
 * - No BottomNav, no AppLayout padding
 * - Auth/subscription guards still apply
 * - Content animates in/out
 */
export function FullScreenProtectedLayout() {
  const location = useLocation();

  return (
    <RequireProfile>
      <RequireSubscription>
        <AnimatePresence mode="popLayout" initial={false}>
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </RequireSubscription>
    </RequireProfile>
  );
}
