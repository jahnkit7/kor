import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { OfflineProvider } from "./contexts/OfflineContext";
import { FeatureNotificationsProvider } from "./contexts/FeatureNotificationsContext";
import { SubscriptionNotificationsProvider } from "./contexts/SubscriptionNotificationsContext";
import { PWAStatus } from "./components/PWAStatus";
import { RequireProfile } from "./components/RequireProfile";
import { RequireSubscription } from "./components/RequireSubscription";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ProfileSetup from "./pages/ProfileSetup";
import Subscriptions from "./pages/Subscriptions";
import Dashboard from "./pages/Dashboard";
import Sale from "./pages/Sale";
import Debts from "./pages/Debts";
import DebtDetail from "./pages/DebtDetail";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import NewClient from "./pages/NewClient";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Stock from "./pages/Stock";
import SalesHistory from "./pages/SalesHistory";
import EmployeeManagement from "./pages/EmployeeManagement";
import AcceptInvite from "./pages/AcceptInvite";
import Network from "./pages/Network";
import NotFound from "./pages/NotFound";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminCodes from "./pages/admin/AdminCodes";
import AdminGeography from "./pages/admin/AdminGeography";
import AdminFeatures from "./pages/admin/AdminFeatures";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminCommissions from "./pages/admin/AdminCommissions";
import AdminFeatureAnalytics from "./pages/admin/AdminFeatureAnalytics";
import AdminPromoCodes from "./pages/admin/AdminPromoCodes";
import AdminFinancials from "./pages/admin/AdminFinancials";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminRoadmap from "./pages/admin/AdminRoadmap";
import AdminSetup from "./pages/admin/AdminSetup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <OfflineProvider>
      <FeatureNotificationsProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PWAStatus />
          <BrowserRouter>
            <SubscriptionNotificationsProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/invite" element={<AcceptInvite />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route path="/subscriptions" element={<Subscriptions />} />

            {/* Protected routes - require complete profile and subscription */}
            <Route
              path="/dashboard"
              element={
                <RequireProfile>
                  <RequireSubscription>
                    <Dashboard />
                  </RequireSubscription>
                </RequireProfile>
              }
            />
            <Route
              path="/sale/:type"
              element={
                <RequireProfile>
                  <RequireSubscription>
                    <Sale />
                  </RequireSubscription>
                </RequireProfile>
              }
            />
            <Route
              path="/debts"
              element={
                <RequireProfile>
                  <RequireSubscription>
                    <Debts />
                  </RequireSubscription>
                </RequireProfile>
              }
            />
            <Route
              path="/debts/:id"
              element={
                <RequireProfile>
                  <RequireSubscription>
                    <DebtDetail />
                  </RequireSubscription>
                </RequireProfile>
              }
            />
            <Route
              path="/clients"
              element={
                <RequireProfile>
                  <RequireSubscription>
                    <Clients />
                  </RequireSubscription>
                </RequireProfile>
              }
            />
            <Route
              path="/clients/new"
              element={
                <RequireProfile>
                  <RequireSubscription>
                    <NewClient />
                  </RequireSubscription>
                </RequireProfile>
              }
            />
            <Route
              path="/clients/:id"
              element={
                <RequireProfile>
                  <RequireSubscription>
                    <ClientDetail />
                  </RequireSubscription>
                </RequireProfile>
              }
            />
            <Route
              path="/reports"
              element={
                <RequireProfile>
                  <RequireSubscription>
                    <Reports />
                  </RequireSubscription>
                </RequireProfile>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireProfile>
                  <RequireSubscription>
                    <Settings />
                  </RequireSubscription>
                </RequireProfile>
              }
            />
            <Route
              path="/stock"
              element={
                <RequireProfile>
                  <RequireSubscription>
                    <Stock />
                  </RequireSubscription>
                </RequireProfile>
              }
            />
            <Route
              path="/sales/history"
              element={
                <RequireProfile>
                  <RequireSubscription>
                    <SalesHistory />
                  </RequireSubscription>
                </RequireProfile>
              }
            />
            <Route
              path="/employees"
              element={
                <RequireProfile>
                  <RequireSubscription>
                    <EmployeeManagement />
                  </RequireSubscription>
                </RequireProfile>
              }
            />
            <Route
              path="/network"
              element={
                <RequireProfile>
                  <RequireSubscription>
                    <Network />
                  </RequireSubscription>
                </RequireProfile>
              }
            />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/financials" element={<AdminFinancials />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
            <Route path="/admin/codes" element={<AdminCodes />} />
            <Route path="/admin/geography" element={<AdminGeography />} />
            <Route path="/admin/features" element={<AdminFeatures />} />
            <Route path="/admin/commissions" element={<AdminCommissions />} />
            <Route path="/admin/feature-analytics" element={<AdminFeatureAnalytics />} />
            <Route path="/admin/promo-codes" element={<AdminPromoCodes />} />
            <Route path="/admin/notifications" element={<AdminNotifications />} />
            <Route path="/admin/roadmap" element={<AdminRoadmap />} />
            <Route path="/admin/support" element={<AdminSupport />} />
            <Route path="/admin/logs" element={<AdminLogs />} />
            <Route path="/admin/setup" element={<AdminSetup />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
            </SubscriptionNotificationsProvider>
          </BrowserRouter>
        </TooltipProvider>
      </FeatureNotificationsProvider>
    </OfflineProvider>
  </QueryClientProvider>
);

export default App;
