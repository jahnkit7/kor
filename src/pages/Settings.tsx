import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Shield,
  Eye,
  EyeOff,
  Clock,
  UserCheck,
  Users
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { OwnerBadge, RoleBadge } from "@/components/RoleBadge";
import { useRole, usePermissions } from "@/hooks/use-role";
import { useSecurity } from "@/hooks/use-security";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { role } = useRole();
  const { canChangeSettings, canManageEmployees } = usePermissions();
  const { hideAmounts, autoLockMinutes, appPin, updateSettings } = useSecurity();

  const [settings] = useState({
    shopName: "Boutique Mamadou",
    ownerName: "Mamadou Diop",
    phone: "+221 77 123 45 67",
    currency: "CFA",
    language: "Français",
  });

  const handleLogout = () => {
    toast.success("Déconnexion réussie");
    navigate("/");
  };

  const handleToggleHideAmounts = async () => {
    try {
      await updateSettings({ hideAmounts: !hideAmounts });
      toast.success(hideAmounts ? "Montants visibles" : "Montants cachés");
    } catch {
      toast.error("Erreur");
    }
  };

  const shopSettings = [
    { icon: Store, label: "Nom de la boutique", value: settings.shopName },
    { icon: User, label: "Propriétaire", value: settings.ownerName },
    { icon: Phone, label: "Téléphone", value: settings.phone },
  ];

  const appSettings = [
    { icon: Globe, label: "Devise", value: settings.currency },
    { icon: Globe, label: "Langue", value: settings.language },
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
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card px-4 pt-4 pb-6 border-b border-border">
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Réglages</h1>
        </div>
      </div>

      {/* Settings Groups */}
      <div className="p-4 space-y-6">
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
                  onClick={() => toast.info("Fonctionnalité bientôt disponible")}
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

        {/* Logout Button */}
        <Button
          variant="destructive"
          size="lg"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Déconnexion
        </Button>

        {/* Version */}
        <p className="text-center text-sm text-muted-foreground">
          CAISSE+ v1.0.0
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;