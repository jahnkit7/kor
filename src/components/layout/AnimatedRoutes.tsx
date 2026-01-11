import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "./PageTransition";
import { ProtectedLayout } from "./ProtectedLayout";

// Public pages
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import AcceptInvite from "@/pages/AcceptInvite";
import ProfileSetup from "@/pages/ProfileSetup";
import Subscriptions from "@/pages/Subscriptions";

// Protected pages
import Dashboard from "@/pages/Dashboard";
import Sale from "@/pages/Sale";
import Debts from "@/pages/Debts";
import DebtDetail from "@/pages/DebtDetail";
import Clients from "@/pages/Clients";
import ClientDetail from "@/pages/ClientDetail";
import NewClient from "@/pages/NewClient";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Stock from "@/pages/Stock";
import SalesHistory from "@/pages/SalesHistory";
import InvoiceHistory from "@/pages/InvoiceHistory";
import EmployeeManagement from "@/pages/EmployeeManagement";
import Network from "@/pages/Network";
import Referrals from "@/pages/Referrals";
import NotFound from "@/pages/NotFound";

// Admin pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminSubscriptions from "@/pages/admin/AdminSubscriptions";
import AdminCodes from "@/pages/admin/AdminCodes";
import AdminGeography from "@/pages/admin/AdminGeography";
import AdminFeatures from "@/pages/admin/AdminFeatures";
import AdminSupport from "@/pages/admin/AdminSupport";
import AdminLogs from "@/pages/admin/AdminLogs";
import AdminCommissions from "@/pages/admin/AdminCommissions";
import AdminFeatureAnalytics from "@/pages/admin/AdminFeatureAnalytics";
import AdminBetaAnalytics from "@/pages/admin/AdminBetaAnalytics";
import AdminABTesting from "@/pages/admin/AdminABTesting";
import AdminPromoCodes from "@/pages/admin/AdminPromoCodes";
import AdminReferrals from "@/pages/admin/AdminReferrals";
import AdminFinancials from "@/pages/admin/AdminFinancials";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminRoadmap from "@/pages/admin/AdminRoadmap";
import AdminSetup from "@/pages/admin/AdminSetup";
import AdminSyncDiagnostic from "@/pages/admin/AdminSyncDiagnostic";

// Wrapper for public routes with transition (includes AnimatePresence for each)
const PublicPage = ({ children }: { children: React.ReactNode }) => (
  <PageTransition>{children}</PageTransition>
);

export const AnimatedRoutes = () => {
  const location = useLocation();

  // Determine if we're on a protected route (not public, not admin)
  const isProtectedRoute = location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/sale') ||
    location.pathname.startsWith('/debts') ||
    location.pathname.startsWith('/clients') ||
    location.pathname.startsWith('/reports') ||
    location.pathname.startsWith('/settings') ||
    location.pathname.startsWith('/stock') ||
    location.pathname.startsWith('/sales') ||
    location.pathname.startsWith('/invoices') ||
    location.pathname.startsWith('/employees') ||
    location.pathname.startsWith('/network') ||
    location.pathname.startsWith('/referrals');

  return (
    <>
      {/* Public and Admin routes - with AnimatePresence wrapper */}
      {!isProtectedRoute && (
        <AnimatePresence mode="popLayout" initial={false}>
          <Routes location={location} key={location.pathname}>
            {/* Public routes */}
            <Route path="/" element={<PublicPage><Landing /></PublicPage>} />
            <Route path="/auth" element={<PublicPage><Auth /></PublicPage>} />
            <Route path="/invite" element={<PublicPage><AcceptInvite /></PublicPage>} />
            <Route path="/profile-setup" element={<PublicPage><ProfileSetup /></PublicPage>} />
            <Route path="/subscriptions" element={<PublicPage><Subscriptions /></PublicPage>} />

            {/* Admin routes */}
            <Route path="/admin" element={<PublicPage><AdminDashboard /></PublicPage>} />
            <Route path="/admin/financials" element={<PublicPage><AdminFinancials /></PublicPage>} />
            <Route path="/admin/users" element={<PublicPage><AdminUsers /></PublicPage>} />
            <Route path="/admin/subscriptions" element={<PublicPage><AdminSubscriptions /></PublicPage>} />
            <Route path="/admin/codes" element={<PublicPage><AdminCodes /></PublicPage>} />
            <Route path="/admin/geography" element={<PublicPage><AdminGeography /></PublicPage>} />
            <Route path="/admin/features" element={<PublicPage><AdminFeatures /></PublicPage>} />
            <Route path="/admin/commissions" element={<PublicPage><AdminCommissions /></PublicPage>} />
            <Route path="/admin/referrals" element={<PublicPage><AdminReferrals /></PublicPage>} />
            <Route path="/admin/feature-analytics" element={<PublicPage><AdminFeatureAnalytics /></PublicPage>} />
            <Route path="/admin/beta-analytics" element={<PublicPage><AdminBetaAnalytics /></PublicPage>} />
            <Route path="/admin/ab-testing" element={<PublicPage><AdminABTesting /></PublicPage>} />
            <Route path="/admin/promo-codes" element={<PublicPage><AdminPromoCodes /></PublicPage>} />
            <Route path="/admin/notifications" element={<PublicPage><AdminNotifications /></PublicPage>} />
            <Route path="/admin/roadmap" element={<PublicPage><AdminRoadmap /></PublicPage>} />
            <Route path="/admin/support" element={<PublicPage><AdminSupport /></PublicPage>} />
            <Route path="/admin/logs" element={<PublicPage><AdminLogs /></PublicPage>} />
            <Route path="/admin/setup" element={<PublicPage><AdminSetup /></PublicPage>} />
            <Route path="/admin/sync-diagnostic" element={<PublicPage><AdminSyncDiagnostic /></PublicPage>} />

            <Route path="*" element={<PublicPage><NotFound /></PublicPage>} />
          </Routes>
        </AnimatePresence>
      )}

      {/* Protected routes - ProtectedLayout stays mounted, only content animates */}
      {isProtectedRoute && (
        <Routes location={location}>
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/sale/:type" element={<Sale />} />
            <Route path="/debts" element={<Debts />} />
            <Route path="/debts/:id" element={<DebtDetail />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/new" element={<NewClient />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/sales/history" element={<SalesHistory />} />
            <Route path="/invoices" element={<InvoiceHistory />} />
            <Route path="/employees" element={<EmployeeManagement />} />
            <Route path="/network" element={<Network />} />
            <Route path="/referrals" element={<Referrals />} />
          </Route>
        </Routes>
      )}
    </>
  );
};
