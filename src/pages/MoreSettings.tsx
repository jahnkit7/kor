import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Bell,
  Globe,
  Lock,
  Clock,
  Palette,
  Database,
  FileText,
  Download,
  Loader2,
  ChevronRight,
  Trash2
} from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { useSecurity } from "@/hooks/use-security";
import { usePermissions } from "@/hooks/use-role";
import { ThemeSelector } from "@/components/ThemeSelector";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { CacheManagement } from "@/components/settings/CacheManagement";
import { InvoiceCustomization } from "@/components/settings/InvoiceCustomization";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { toast } from "sonner";
import { downloadBackup } from "@/lib/backup-utils";

const MoreSettings = () => {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const { autoLockMinutes, appPin } = useSecurity();
  const { canChangeSettings } = usePermissions();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      await downloadBackup();
      toast.success("Données exportées avec succès");
    } catch (error) {
      if (import.meta.env.DEV) console.error("Export error:", error);
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
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
      {/* Header */}
      <div className="bg-card px-4 pb-4 border-b border-border" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Plus de réglages</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-5">
        {/* Notifications */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            <Bell className="inline w-4 h-4 mr-1" />
            Notifications
          </p>
          <NotificationSettings />
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
            <Palette className="inline w-4 h-4 mr-1" />
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

        {/* Application Settings */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            <Globe className="inline w-4 h-4 mr-1" />
            Application
          </p>
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              <button className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Devise</p>
                  <p className="text-sm text-muted-foreground">{profile?.currency || "CFA"}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              <button className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Langue</p>
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
            <Lock className="inline w-4 h-4 mr-1" />
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
                  <p className="font-semibold text-foreground">Code PIN</p>
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
                  <p className="font-semibold text-foreground">Verrouillage auto</p>
                  <p className="text-sm text-muted-foreground">{autoLockMinutes} min</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Cache Management & Backup */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            <Database className="inline w-4 h-4 mr-1" />
            Données & Synchronisation
          </p>
          <CacheManagement />
          
          {/* Backup Button */}
          <Card className="mt-3">
            <CardContent className="p-0">
              <button
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors disabled:opacity-50"
                onClick={handleExportData}
                disabled={isExporting}
              >
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  {isExporting ? (
                    <Loader2 className="w-5 h-5 text-green-600 dark:text-green-400 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Télécharger mes données</p>
                  <p className="text-sm text-muted-foreground">Exporter en fichier JSON</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Danger Zone - Only Delete Account */}
        <div>
          <p className="text-sm font-semibold text-destructive mb-3 px-1">
            <Trash2 className="inline w-4 h-4 mr-1" />
            Zone de danger
          </p>
          <Card className="border-destructive/30">
            <CardContent className="p-4">
              <DeleteAccountDialog />
            </CardContent>
          </Card>
        </div>

        {/* Version */}
        <p className="text-center text-sm text-muted-foreground pb-4">
          KÒR v1.0.0
        </p>
      </div>
    </>
  );
};

export default MoreSettings;
