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
  Lock,
  Globe,
  LogOut,
  ChevronRight,
  Eye,
  EyeOff,
  Clock,
  UserCheck,
  Users,
  Palette,
  Gift,
  Bell,
  Package,
  Database,
  FileText,
  Sparkles,
  Ticket
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { OwnerBadge, RoleBadge } from "@/components/RoleBadge";
import { useRole, usePermissions } from "@/hooks/use-role";
import { useSecurity } from "@/hooks/use-security";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { ThemeSelector } from "@/components/ThemeSelector";
import { ActivateCodeDialog } from "@/components/settings/ActivateCodeDialog";
import { SubscriptionStatus } from "@/components/settings/SubscriptionStatus";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { FeatureGate } from "@/components/FeatureGate";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { CommissionPayment } from "@/components/settings/CommissionPayment";
import { CacheManagement } from "@/components/settings/CacheManagement";
import { InvoiceCustomization } from "@/components/settings/InvoiceCustomization";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { role } = useRole();
  const { canChangeSettings, canManageEmployees } = usePermissions();
  const { hideAmounts, autoLockMinutes, appPin, updateSettings } = useSecurity();
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
    <AppLayout>
      {/* Header */}
      <div className="bg-card px-4 pt-4 pb-6 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold text-[#051425]">Réglages</h1>
          </div>
          <NotificationBell />
        </div>
      </div>

      {/* Settings Groups */}
      <div className="p-4 space-y-5">
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
            className="relative overflow-hidden rounded-2xl p-5 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%)"
            }}
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.01 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Parrainage</h3>
                  <p className="text-white/80 text-sm">Invitez vos amis, gagnez des réductions</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/70" />
            </div>
            {/* Decorative circles */}
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/10" />
          </motion.div>
        </FeatureGate>

        {/* Bento Grid - Quick Access */}
        <div className="grid grid-cols-2 gap-3">
          {/* Role Card */}
          <motion.div
            className="bg-card rounded-2xl p-4 border border-border"
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="font-semibold text-[#051425] text-sm">Votre rôle</p>
            <div className="mt-1">
              {role === "owner" ? <OwnerBadge /> : <RoleBadge role={role} />}
            </div>
          </motion.div>

          {/* Activate Code Card */}
          <motion.div
            className="bg-card rounded-2xl p-4 border border-border"
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Ticket className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="font-semibold text-[#051425] text-sm mb-2">Code d'activation</p>
            <ActivateCodeDialog variant="compact" />
          </motion.div>
        </div>

        {/* Commission Payment (only shows if user has balance) */}
        <FeatureGate featureKey="commission_payment" silentFail>
          <CommissionPayment />
        </FeatureGate>

        {/* Display Settings */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            Affichage
          </p>
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
                  <p className="font-semibold text-[#051425]">Cacher les montants</p>
                  <p className="text-sm text-muted-foreground">
                    Pour plus de discrétion
                  </p>
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
                    <p className="font-semibold text-[#051425]">Déduction automatique</p>
                    <p className="text-sm text-muted-foreground">
                      Stock déduit lors des ventes
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
        </div>

        {/* Notifications */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            <Bell className="inline w-4 h-4 mr-1" />
            Notifications
          </p>
          <NotificationSettings />
        </div>

        {/* Boutique */}
        {canChangeSettings && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
              Ma boutique
            </p>
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                <button
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors"
                  onClick={() => navigate("/profile-setup")}
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Store className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#051425]">Nom de la boutique</p>
                    <p className="text-sm text-muted-foreground">{profile?.shop_name || "Ma Boutique"}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
                <button
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors"
                  onClick={() => navigate("/profile-setup")}
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#051425]">Propriétaire</p>
                    <p className="text-sm text-muted-foreground">{profile?.owner_name || "Non défini"}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
                <button
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors"
                  onClick={() => navigate("/profile-setup")}
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#051425]">Téléphone</p>
                    <p className="text-sm text-muted-foreground">{profile?.phone || "Non défini"}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Employees (Owner only) */}
        {canManageEmployees && (
          <Card>
            <CardContent className="p-0">
              <button
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors"
                onClick={() => navigate("/employees")}
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#051425]">Gérer les employés</p>
                  <p className="text-sm text-muted-foreground">Ajouter ou retirer des accès</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        )}

        {/* Invoice Customization */}
        {canChangeSettings && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
              <FileText className="inline w-4 h-4 mr-1" />
              Factures
            </p>
            <InvoiceCustomization />
            <Card className="mt-3">
              <CardContent className="p-0">
                <button
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors"
                  onClick={() => navigate("/invoices")}
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#051425]">Historique des factures</p>
                    <p className="text-sm text-muted-foreground">Voir les factures générées</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cache Management */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            <Database className="inline w-4 h-4 mr-1" />
            Données & Synchronisation
          </p>
          <CacheManagement />
        </div>

        {/* Theme / Appearance */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            Apparence
          </p>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Palette className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-[#051425]">Changer de style</p>
                  <p className="text-sm text-muted-foreground">Personnalisez l'apparence</p>
                </div>
              </div>
              <ThemeSelector />
            </CardContent>
          </Card>
        </div>

        {/* Application Settings */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            Application
          </p>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              <button className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#051425]">Devise</p>
                  <p className="text-sm text-muted-foreground">{profile?.currency || "CFA"}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              <button className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#051425]">Langue</p>
                  <p className="text-sm text-muted-foreground">
                    {profile?.language === "fr" ? "Français" : profile?.language || "Français"}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Security */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            Sécurité
          </p>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              <button
                onClick={() => toast.info("Fonctionnalité bientôt disponible")}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#051425]">Code PIN</p>
                  <p className="text-sm text-muted-foreground">{appPin ? "Actif" : "Non configuré"}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              <button
                onClick={() => toast.info("Fonctionnalité bientôt disponible")}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#051425]">Verrouillage auto</p>
                  <p className="text-sm text-muted-foreground">{autoLockMinutes} min</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Danger Zone */}
        <div>
          <p className="text-sm font-semibold text-destructive mb-3 px-1">
            Zone de danger
          </p>
          <Card className="border-destructive/50">
            <CardContent className="p-4 space-y-3">
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5 mr-2" />
                Déconnexion
              </Button>
              <DeleteAccountDialog />
            </CardContent>
          </Card>
        </div>

        {/* Version */}
        <p className="text-center text-sm text-muted-foreground pb-4">
          CAISSE+ v1.0.0
        </p>
      </div>
    </AppLayout>
  );
};

export default Settings;
