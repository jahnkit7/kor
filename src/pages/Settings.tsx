import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFeatureTracking } from "@/hooks/use-feature-tracking";
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
  FileText
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { OwnerBadge, RoleBadge } from "@/components/RoleBadge";
import { useRole, usePermissions } from "@/hooks/use-role";
import { useSecurity } from "@/hooks/use-security";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { ThemeSelector } from "@/components/ThemeSelector";
import { ActivateCodeDialog } from "@/components/settings/ActivateCodeDialog";
import { SubscriptionManagement } from "@/components/settings/SubscriptionManagement";
import { ReferralSection } from "@/components/settings/ReferralSection";
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

  const shopSettings = [
    { icon: Store, label: "Nom de la boutique", value: profile?.shop_name || "Ma Boutique" },
    { icon: User, label: "Propriétaire", value: profile?.owner_name || "Non défini" },
    { icon: Phone, label: "Téléphone", value: profile?.phone || "Non défini" },
  ];

  const appSettings = [
    { icon: Globe, label: "Devise", value: profile?.currency || "CFA" },
    { icon: Globe, label: "Langue", value: profile?.language === "fr" ? "Français" : profile?.language || "Français" },
  ];

  const securitySettings = [
    { 
      icon: Lock, 
      label: "Code PIN", 
      value: appPin ? "Actif" : "Non configuré",
      onClick: () => toast.info("Fonctionnalité bientôt disponible")
    },
    { 
      icon: Clock, 
      label: "Verrouillage auto", 
      value: `${autoLockMinutes} min`,
      onClick: () => toast.info("Fonctionnalité bientôt disponible")
    },
  ];

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
            <h1 className="text-xl font-bold">Réglages</h1>
          </div>
          <NotificationBell />
        </div>
      </div>

      {/* Settings Groups */}
      <div className="p-4 space-y-6">
        {/* Subscription Management */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            Abonnement
          </p>
          <div className="space-y-3">
            <SubscriptionManagement />
            <Card>
              <CardContent className="p-0">
                <ActivateCodeDialog />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Commission Payment (only shows if user has balance) */}
        <FeatureGate featureKey="commission_payment" silentFail>
          <CommissionPayment />
        </FeatureGate>

        {/* Referral Section */}
        <FeatureGate featureKey="referrals" showUpgradePrompt>
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
              <Gift className="inline w-4 h-4 mr-1" />
              Parrainage
            </p>
            <ReferralSection />
          </div>
        </FeatureGate>

        {/* Role Display */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Votre rôle</p>
                  <p className="text-sm text-muted-foreground">
                    {role === "owner" ? "Accès complet" : "Accès limité"}
                  </p>
                </div>
              </div>
              {role === "owner" ? <OwnerBadge /> : <RoleBadge role={role} />}
            </div>
          </CardContent>
        </Card>

        {/* Boutique */}
        {canChangeSettings && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
              Boutique
            </p>
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {shopSettings.map(({ icon: Icon, label, value }) => (
                  <button
                    key={label}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors"
                    onClick={() => navigate("/profile-setup")}
                  >
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{label}</p>
                      {value && (
                        <p className="text-sm text-muted-foreground">{value}</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Employees (Owner only) */}
        {canManageEmployees && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
              Équipe
            </p>
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
                    <p className="font-semibold text-foreground">Gérer les employés</p>
                    <p className="text-sm text-muted-foreground">Ajouter ou retirer des accès</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stock Settings */}
        {canChangeSettings && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
              <Package className="inline w-4 h-4 mr-1" />
              Gestion du Stock
            </p>
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Package className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">Déduction automatique</p>
                    <p className="text-sm text-muted-foreground">
                      Les ventes déduisent le stock automatiquement
                    </p>
                  </div>
                  <Switch
                    checked={profile?.auto_deduct_stock ?? true}
                    onCheckedChange={handleToggleAutoDeductStock}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Application */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            Application
          </p>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {appSettings.map(({ icon: Icon, label, value }) => (
                <button
                  key={label}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{label}</p>
                    {value && (
                      <p className="text-sm text-muted-foreground">{value}</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              ))}
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

        {/* Cache Management */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            <Database className="inline w-4 h-4 mr-1" />
            Données & Synchronisation
          </p>
          <CacheManagement />
        </div>

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
                    <p className="font-semibold text-foreground">Historique des factures</p>
                    <p className="text-sm text-muted-foreground">Voir les factures générées</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          </div>
        )}

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
                  <p className="font-semibold text-foreground">Changer de style</p>
                  <p className="text-sm text-muted-foreground">Personnalisez l'apparence</p>
                </div>
              </div>
              <ThemeSelector />
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
              {securitySettings.map(({ icon: Icon, label, value, onClick }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{label}</p>
                    {value && (
                      <p className="text-sm text-muted-foreground">{value}</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              ))}
              
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
                  <p className="text-sm text-muted-foreground">
                    Pour plus de discrétion
                  </p>
                </div>
                <Switch
                  checked={hideAmounts}
                  onCheckedChange={handleToggleHideAmounts}
                />
              </div>
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
        <p className="text-center text-sm text-muted-foreground">
          CAISSE+ v1.0.0
        </p>
      </div>
    </AppLayout>
  );
};

export default Settings;