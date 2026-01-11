import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminFloatingSidebar } from "./AdminFloatingSidebar";
import { AdminMobileNav } from "./AdminMobileNav";
import { useAdmin } from "@/hooks/use-admin";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { isAdmin, loading, user } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait until everything is loaded
    if (loading) return;

    // Not logged in -> auth page
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    // Logged in but not admin -> dashboard
    if (!isAdmin) {
      navigate("/dashboard", { replace: true });
      return;
    }
  }, [isAdmin, loading, user, navigate]);

  // Don't render anything if definitely not admin (after check)
  if (!loading && (!user || !isAdmin)) {
    return null;
  }

  // Always render layout structure - show skeleton in content area if loading
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] via-white to-[#f8f9ff]">
      {/* Floating Sidebar - Desktop */}
      <AdminFloatingSidebar />
      
      {/* Mobile Navigation */}
      <AdminMobileNav />
      
      {/* Main content - offset for floating sidebar */}
      <main className="lg:pl-80 min-h-screen">
        <div className="p-4 lg:p-8 pb-20 lg:pb-8">
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-8 w-48" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-64 rounded-xl" />
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
