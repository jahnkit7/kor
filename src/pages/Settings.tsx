import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFeatureTracking } from "@/hooks/use-feature-tracking";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft, 
  Store,
  User,
  Phone,
  LogOut,
  ChevronRight,
  Eye,
  EyeOff,
  UserCheck,
  Users,
  Gift,
  Package,
  Sparkles,
  Ticket,
  Settings as SettingsIcon
} from "lucide-react";
import { OwnerBadge, RoleBadge } from "@/components/RoleBadge";
import { useRole, usePermissions } from "@/hooks/use-role";
import { useSecurity } from "@/hooks/use-security";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { ActivateCodeDialog } from "@/components/settings/ActivateCodeDialog";
import { SubscriptionStatus } from "@/components/settings/SubscriptionStatus";
import { FeatureGate } from "@/components/FeatureGate";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { CommissionPayment } from "@/components/settings/CommissionPayment";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { role } = useRole();
  const { canChangeSettings, canManageEmployees } = usePermissions();
  const { hideAmounts, updateSettings } = useSecurity();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { signOut } = useAuth();
  const { trackFeature } = useFeatureTracking();

  // Track page view
  useEffect(() => {
    trackFeature("settings", { action: "page_view" });
  }, [trackFeature]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Déconnexion réussie");
      navigate("/");
    } catch {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const handleToggleHideAmounts = async () => {
    try {
      await updateSettings({ hideAmounts: !hideAmounts });
      toast.success(hideAmounts ? "Montants visibles" : "Montants cachés");
    } catch {
      toast.error("Erreur");
    }
  };

  const handleToggleAutoDeductStock = async () => {
    try {
      await updateProfile({ auto_deduct_stock: !(profile?.auto_deduct_stock ?? true) });
      toast.success(profile?.auto_deduct_stock ? "Déduction automatique désactivée" : "Déduction automatique activée");
    } catch {
      toast.error("Erreur");
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      {/* Header with logout icon */}
      <div className="bg-card px-4 pb-4 border-b border-border" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Réglages</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Groups */}
      <div className="p-4 space-y-4">
        {/* Premium Plan Card */}
        <motion.div
          onClick={() => navigate("/subscriptions")}
          className="relative overflow-hidden rounded-2xl p-5 cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)"
          }}
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <SubscriptionStatus variant="card" />
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70" />
          </div>
          {/* Decorative circles */}
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -right-2 -bottom-8 w-16 h-16 rounded-full bg-white/5" />
        </motion.div>

        {/* Referral Card */}
        <FeatureGate featureKey="referrals" silentFail>
          <motion.div
            onClick={() => navigate("/referrals")}
            className="relative overflow-hidden rounded-2xl p-4 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)"
            }}
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.01 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Parrainage</h3>
                  <p className="text-white/80 text-xs">Invitez vos amis</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/70" />
            </div>
          </motion.div>
        </FeatureGate>

        {/* Store Card - Prominent placement */}
        <motion.div
          onClick={() => navigate("/store")}
          className="relative overflow-hidden rounded-2xl p-4 cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%)"
          }}
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold">Store Builder</h3>
                <p className="text-white/80 text-xs">Créer ta boutique (digital + physique)</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70" />
          </div>
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10" />
          <div className="absolute -right-2 -bottom-8 h-16 w-16 rounded-full bg-white/5" />
        </motion.div>

        {/* BentoGrid 2x2 - Quick Access */}
        <div className="grid grid-cols-2 gap-3">
          {/* Role Card */}
          <motion.div
            className="bg-card rounded-2xl p-4 border border-border"
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-primary" />
              </div>
              <p className="font-semibold text-foreground text-sm">Rôle</p>
            </div>
            <div className="mt-1">
              {role === "owner" ? <OwnerBadge /> : <RoleBadge role={role} />}
            </div>
          </motion.div>

          {/* Activate Code Card */}
          <motion.div
            className="bg-card rounded-2xl p-4 border border-border"
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Ticket className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="font-semibold text-foreground text-sm">Code</p>
            </div>
            <ActivateCodeDialog variant="compact" />
          </motion.div>


          {/* Shop Card - Enhanced with more info */}
          {canChangeSettings && (
            <motion.div
              onClick={() => navigate("/profile-setup?edit=true")}
              className="bg-card rounded-2xl p-4 border border-border cursor-pointer col-span-2"
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Store className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{profile?.shop_name || "Ma Boutique"}</p>
                    <p className="text-xs text-muted-foreground">
                      {profile?.owner_name} • {profile?.specialty || "Activité non définie"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </motion.div>
          )}

          {/* Employees Card */}
          {canManageEmployees && (
            <motion.div
              onClick={() => navigate("/employees")}
              className="bg-card rounded-2xl p-4 border border-border cursor-pointer"
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="font-semibold text-foreground text-sm">Employés</p>
              </div>
              <p className="text-xs text-muted-foreground">Gérer les accès</p>
            </motion.div>
          )}
        </div>





        {/* Commission Payment (only shows if user has balance) */}
        <FeatureGate featureKey="commission_payment" silentFail>
          <CommissionPayment />
        </FeatureGate>

        {/* Display & Stock Settings */}
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {/* Hide amounts toggle */}
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                {hideAmounts ? (
                  <EyeOff className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Eye className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Cacher les montants</p>
                <p className="text-sm text-muted-foreground">Pour plus de discrétion</p>
              </div>
              <Switch
                checked={hideAmounts}
                onCheckedChange={handleToggleHideAmounts}
              />
            </div>

            {/* Stock auto deduct */}
            {canChangeSettings && (
              <div className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Déduction automatique</p>
                  <p className="text-sm text-muted-foreground">
                    {!(profile?.auto_deduct_stock ?? true)
                      ? "Désactivé (mode service)"
                      : "Stock déduit lors des ventes"
                    }
                  </p>
                </div>
                <Switch
                  checked={profile?.auto_deduct_stock ?? true}
                  onCheckedChange={handleToggleAutoDeductStock}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* More Settings - Link to sub-page */}
        <motion.div
          onClick={() => navigate("/more-settings")}
          className="bg-card rounded-2xl p-4 border border-border cursor-pointer"
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Plus de réglages</p>
                <p className="text-sm text-muted-foreground">
                  Notifications, Factures, Apparence, Sécurité...
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </motion.div>

        {/* Version */}
        <p className="text-center text-sm text-muted-foreground pt-2 pb-4">
          KÒR v1.0.0
        </p>
      </div>
    </>
  );
};

export default Settings;
