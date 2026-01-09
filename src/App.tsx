import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { OfflineProvider } from "./contexts/OfflineContext";
import { PWAStatus } from "./components/PWAStatus";
import { RequireProfile } from "./components/RequireProfile";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ProfileSetup from "./pages/ProfileSetup";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <OfflineProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAStatus />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/invite" element={<AcceptInvite />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />

            {/* Protected routes - require complete profile */}
            <Route
              path="/dashboard"
              element={
                <RequireProfile>
                  <Dashboard />
                </RequireProfile>
              }
            />
            <Route
              path="/sale/:type"
              element={
                <RequireProfile>
                  <Sale />
                </RequireProfile>
              }
            />
            <Route
              path="/debts"
              element={
                <RequireProfile>
                  <Debts />
                </RequireProfile>
              }
            />
            <Route
              path="/debts/:id"
              element={
                <RequireProfile>
                  <DebtDetail />
                </RequireProfile>
              }
            />
            <Route
              path="/clients"
              element={
                <RequireProfile>
                  <Clients />
                </RequireProfile>
              }
            />
            <Route
              path="/clients/new"
              element={
                <RequireProfile>
                  <NewClient />
                </RequireProfile>
              }
            />
            <Route
              path="/clients/:id"
              element={
                <RequireProfile>
                  <ClientDetail />
                </RequireProfile>
              }
            />
            <Route
              path="/reports"
              element={
                <RequireProfile>
                  <Reports />
                </RequireProfile>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireProfile>
                  <Settings />
                </RequireProfile>
              }
            />
            <Route
              path="/stock"
              element={
                <RequireProfile>
                  <Stock />
                </RequireProfile>
              }
            />
            <Route
              path="/sales/history"
              element={
                <RequireProfile>
                  <SalesHistory />
                </RequireProfile>
              }
            />
            <Route
              path="/employees"
              element={
                <RequireProfile>
                  <EmployeeManagement />
                </RequireProfile>
              }
            />
            <Route
              path="/network"
              element={
                <RequireProfile>
                  <Network />
                </RequireProfile>
              }
            />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
            <Route path="/admin/codes" element={<AdminCodes />} />
            <Route path="/admin/geography" element={<AdminGeography />} />
            <Route path="/admin/features" element={<AdminFeatures />} />
            <Route path="/admin/support" element={<AdminSupport />} />
            <Route path="/admin/logs" element={<AdminLogs />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </OfflineProvider>
  </QueryClientProvider>
);

export default App;
