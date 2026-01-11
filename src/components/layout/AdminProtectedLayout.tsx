import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AdminFloatingSidebar } from "@/components/admin/AdminFloatingSidebar";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { useAdmin } from "@/hooks/use-admin";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Persistent layout for admin routes.
 * 
 * This layout stays mounted during all admin navigation, ensuring:
 * 1. useRole() is called only ONCE at mount
 * 2. The sidebar never re-renders on page change
 * 3. Redirects happen only once, not on every navigation
 */
export function AdminProtectedLayout() {
  const navigate = useNavigate();
  const { isAdmin, loading, user } = useAdmin();
  
  // Track if we've already handled the redirect to prevent loops
  const hasHandledRedirect = useRef(false);
  
  // Track if initial auth check is complete
  const [authChecked, setAuthChecked] = useState(false);

  // Handle redirects - only once when auth is settled
  useEffect(() => {
    // Still loading - wait
    if (loading) return;
    
    // Already redirected - do nothing
    if (hasHandledRedirect.current) return;
    
    // Auth check complete
    setAuthChecked(true);

    // Not logged in -> auth page
    if (!user) {
      hasHandledRedirect.current = true;
      navigate("/auth", { replace: true });
      return;
    }

    // Logged in but not admin -> dashboard
    if (!isAdmin) {
      hasHandledRedirect.current = true;
      navigate("/dashboard", { replace: true });
      return;
    }
  }, [loading, user, isAdmin, navigate]);

  // Reset redirect flag if user changes (logout/login as different user)
  useEffect(() => {
    hasHandledRedirect.current = false;
    setAuthChecked(false);
  }, [user?.id]);

  // Show loading skeleton while checking auth
  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] via-white to-[#f8f9ff]">
        {/* Always show sidebar structure for layout stability */}
        <AdminFloatingSidebar />
        <AdminMobileNav />
        <main className="lg:pl-80 min-h-screen">
          <div className="p-4 lg:p-8 pb-20 lg:pb-8">
            <div className="space-y-6">
              <Skeleton className="h-8 w-48" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Not authorized - will redirect via effect, show nothing
  if (!user || !isAdmin) {
    return null;
  }

  // Authorized admin - render the layout with Outlet for page content
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] via-white to-[#f8f9ff]">
      {/* Floating Sidebar - stays mounted */}
      <AdminFloatingSidebar />
      
      {/* Mobile Navigation - stays mounted */}
      <AdminMobileNav />
      
      {/* Main content - only this changes via Outlet */}
      <main className="lg:pl-80 min-h-screen">
        <div className="p-4 lg:p-8 pb-20 lg:pb-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
