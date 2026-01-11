import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { RequireProfile } from "@/components/RequireProfile";
import { RequireSubscription } from "@/components/RequireSubscription";
import { PageTransition } from "./PageTransition";

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

// Wrapper for protected routes with transition
const ProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <RequireProfile>
    <RequireSubscription>
      <PageTransition>{children}</PageTransition>
    </RequireSubscription>
  </RequireProfile>
);

// Wrapper for public routes with transition
const PublicPage = ({ children }: { children: React.ReactNode }) => (
  <PageTransition>{children}</PageTransition>
);

export const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}
        <Route path="/" element={<PublicPage><Landing /></PublicPage>} />
        <Route path="/auth" element={<PublicPage><Auth /></PublicPage>} />
        <Route path="/invite" element={<PublicPage><AcceptInvite /></PublicPage>} />
        <Route path="/profile-setup" element={<PublicPage><ProfileSetup /></PublicPage>} />
        <Route path="/subscriptions" element={<PublicPage><Subscriptions /></PublicPage>} />

        {/* Protected routes */}
        <Route path="/dashboard" element={<ProtectedPage><Dashboard /></ProtectedPage>} />
        <Route path="/sale/:type" element={<ProtectedPage><Sale /></ProtectedPage>} />
        <Route path="/debts" element={<ProtectedPage><Debts /></ProtectedPage>} />
        <Route path="/debts/:id" element={<ProtectedPage><DebtDetail /></ProtectedPage>} />
        <Route path="/clients" element={<ProtectedPage><Clients /></ProtectedPage>} />
        <Route path="/clients/new" element={<ProtectedPage><NewClient /></ProtectedPage>} />
        <Route path="/clients/:id" element={<ProtectedPage><ClientDetail /></ProtectedPage>} />
        <Route path="/reports" element={<ProtectedPage><Reports /></ProtectedPage>} />
        <Route path="/settings" element={<ProtectedPage><Settings /></ProtectedPage>} />
        <Route path="/stock" element={<ProtectedPage><Stock /></ProtectedPage>} />
        <Route path="/sales/history" element={<ProtectedPage><SalesHistory /></ProtectedPage>} />
        <Route path="/invoices" element={<ProtectedPage><InvoiceHistory /></ProtectedPage>} />
        <Route path="/employees" element={<ProtectedPage><EmployeeManagement /></ProtectedPage>} />
        <Route path="/network" element={<ProtectedPage><Network /></ProtectedPage>} />
        <Route path="/referrals" element={<ProtectedPage><Referrals /></ProtectedPage>} />

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
  );
};
