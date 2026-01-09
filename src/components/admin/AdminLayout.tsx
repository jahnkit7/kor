import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminFloatingSidebar } from "./AdminFloatingSidebar";
import { AdminMobileNav } from "./AdminMobileNav";
import { useAdmin } from "@/hooks/use-admin";
import { Loader2 } from "lucide-react";

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
      navigate("/auth");
      return;
    }

    // Logged in but not admin -> dashboard
    if (!isAdmin) {
      navigate("/dashboard");
      return;
    }
  }, [isAdmin, loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Floating Sidebar - Desktop */}
      <AdminFloatingSidebar />
      
      {/* Mobile Navigation */}
      <AdminMobileNav />
      
      {/* Main content - offset for floating sidebar */}
      <main className="lg:pl-80 min-h-screen">
        <div className="p-4 lg:p-8 pb-24 lg:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
