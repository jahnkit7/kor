import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { RequireProfile } from "@/components/RequireProfile";
import { RequireSubscription } from "@/components/RequireSubscription";
import AppLayout from "@/components/layout/AppLayout";
import { PageTransition } from "./PageTransition";
import { useRole } from "@/hooks/use-role";

/**
 * Persistent layout for protected routes.
 * - BottomNav stays mounted (no flicker on navigation)
 * - Only the page content animates in/out
 * - Auth/subscription guards wrap the entire layout
 * - Redirects admin users to /admin
 */
export function ProtectedLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useRole();

  // Redirect admin users to admin dashboard
  useEffect(() => {
    if (!roleLoading && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [isAdmin, roleLoading, navigate]);

  // If admin, don't render protected layout (will redirect)
  if (isAdmin && !roleLoading) {
    return null;
  }

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
