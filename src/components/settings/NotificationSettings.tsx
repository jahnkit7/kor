import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, Package, Loader2 } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";

interface NotificationSettingsData {
  debt_threshold: number;
  low_stock_threshold: number;
  notify_high_debt: boolean;
  notify_low_stock: boolean;
}

const defaultSettings: NotificationSettingsData = {
  debt_threshold: 50000,
  low_stock_threshold: 5,
  notify_high_debt: true,
  notify_low_stock: true,
};

export function NotificationSettings() {
  const { profile, updateProfile } = useProfile();
  const [settings, setSettings] = useState<NotificationSettingsData>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profile?.notification_settings) {
      const saved = profile.notification_settings as NotificationSettingsData;
      setSettings({
        debt_threshold: saved.debt_threshold ?? defaultSettings.debt_threshold,
        low_stock_threshold: saved.low_stock_threshold ?? defaultSettings.low_stock_threshold,
        notify_high_debt: saved.notify_high_debt ?? defaultSettings.notify_high_debt,
        notify_low_stock: saved.notify_low_stock ?? defaultSettings.notify_low_stock,
      });
    }
  }, [profile]);

  const handleChange = (key: keyof NotificationSettingsData, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ notification_settings: settings });
      toast.success("Paramètres de notifications enregistrés");
      setHasChanges(false);
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Notifications automatiques</p>
            <p className="text-sm text-muted-foreground">Alertes pour dettes et stock</p>
          </div>
        </div>

        {/* Debt alerts */}
        <div className="space-y-3 p-4 rounded-xl bg-secondary/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <div>
                <p className="font-medium">Alerte dettes élevées</p>
                <p className="text-sm text-muted-foreground">
                  Notification quand vos dettes dépassent le seuil
                </p>
              </div>
            </div>
            <Switch
              checked={settings.notify_high_debt}
              onCheckedChange={(checked) => handleChange("notify_high_debt", checked)}
            />
          </div>
          
          {settings.notify_high_debt && (
            <div className="pt-3 border-t border-border">
              <Label htmlFor="debt-threshold" className="text-sm text-muted-foreground">
                Seuil d'alerte (CFA)
              </Label>
              <Input
                id="debt-threshold"
                type="number"
                value={settings.debt_threshold}
                onChange={(e) => handleChange("debt_threshold", parseInt(e.target.value) || 0)}
                className="mt-1"
                min={0}
                step={5000}
              />
            </div>
          )}
        </div>

        {/* Stock alerts */}
        <div className="space-y-3 p-4 rounded-xl bg-secondary/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-warning" />
              <div>
                <p className="font-medium">Alerte stock bas</p>
                <p className="text-sm text-muted-foreground">
                  Notification quand un produit est presque épuisé
                </p>
              </div>
            </div>
            <Switch
              checked={settings.notify_low_stock}
              onCheckedChange={(checked) => handleChange("notify_low_stock", checked)}
            />
          </div>
          
          {settings.notify_low_stock && (
            <div className="pt-3 border-t border-border">
              <Label htmlFor="stock-threshold" className="text-sm text-muted-foreground">
                Seuil d'alerte (quantité)
              </Label>
              <Input
                id="stock-threshold"
                type="number"
                value={settings.low_stock_threshold}
                onChange={(e) => handleChange("low_stock_threshold", parseInt(e.target.value) || 0)}
                className="mt-1"
                min={0}
                step={1}
              />
            </div>
          )}
        </div>

        {/* Save button */}
        {hasChanges && (
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer les modifications"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
