import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, 
  Upload, 
  Trash2, 
  Palette, 
  Image as ImageIcon,
  Loader2 
} from "lucide-react";
import { useInvoiceSettings } from "@/hooks/use-invoice-settings";
import { toast } from "sonner";

export function InvoiceCustomization() {
  const { settings, loading, updateSettings, uploadLogo, removeLogo } = useInvoiceSettings();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputKey = useRef(0);
  
  // Local state for footer text with debounce
  const [localFooterText, setLocalFooterText] = useState("");
  const footerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  // Sync local footer text with settings on initial load
  useEffect(() => {
    if (!loading && isInitialMount.current) {
      setLocalFooterText(settings.footer_text || "");
      isInitialMount.current = false;
    }
  }, [loading, settings.footer_text]);

  const handleColorChange = async (key: "primary_color" | "secondary_color", value: string) => {
    setSaving(true);
    const success = await updateSettings({ [key]: value });
    setSaving(false);
    if (success) {
      toast.success("Couleur mise à jour");
    } else {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleToggleLogo = async (checked: boolean) => {
    setSaving(true);
    const success = await updateSettings({ show_logo: checked });
    setSaving(false);
    if (!success) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  // Debounced footer text handler - no toast spam
  const handleFooterChange = (text: string) => {
    setLocalFooterText(text);
    
    // Clear previous timeout
    if (footerDebounceRef.current) {
      clearTimeout(footerDebounceRef.current);
    }
    
    // Set new timeout for debounced save
    footerDebounceRef.current = setTimeout(async () => {
      const success = await updateSettings({ footer_text: text || null });
      if (success) {
        toast.success("Pied de page mis à jour");
      }
    }, 800);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (footerDebounceRef.current) {
        clearTimeout(footerDebounceRef.current);
      }
    };
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2 Mo");
      return;
    }

    setUploading(true);
    const url = await uploadLogo(file);
    setUploading(false);

    // Reset file input to allow re-uploading same file
    fileInputKey.current += 1;

    if (url) {
      toast.success("Logo téléchargé avec succès");
    } else {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const handleRemoveLogo = async () => {
    setSaving(true);
    const success = await removeLogo();
    setSaving(false);
    if (success) {
      toast.success("Logo supprimé");
    } else {
      toast.error("Erreur lors de la suppression");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Personnalisation des factures
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Logo de la boutique
            </Label>
            <Switch
              checked={settings.show_logo}
              onCheckedChange={handleToggleLogo}
              disabled={saving}
            />
          </div>

          {settings.show_logo && (
            <div className="space-y-3">
              {settings.logo_url ? (
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                  <img
                    src={settings.logo_url}
                    alt="Logo"
                    className="w-16 h-16 object-contain rounded-lg border bg-white"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Logo actuel</p>
                    <p className="text-xs text-muted-foreground">
                      Cliquez pour remplacer
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    disabled={saving}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                  ) : (
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    Cliquez pour télécharger votre logo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG (max 2 Mo)
                  </p>
                </div>
              )}
              <input
                key={fileInputKey.current}
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}
        </div>

        {/* Colors Section */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Couleurs de la facture
          </Label>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color" className="text-sm text-muted-foreground">
                Couleur principale
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="primary-color"
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => handleColorChange("primary_color", e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.primary_color}
                  onChange={(e) => handleColorChange("primary_color", e.target.value)}
                  className="flex-1 uppercase"
                  placeholder="#8B5CF6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-color" className="text-sm text-muted-foreground">
                Couleur secondaire
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="secondary-color"
                  type="color"
                  value={settings.secondary_color}
                  onChange={(e) => handleColorChange("secondary_color", e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.secondary_color}
                  onChange={(e) => handleColorChange("secondary_color", e.target.value)}
                  className="flex-1 uppercase"
                  placeholder="#0EA5E9"
                />
              </div>
            </div>
          </div>

          {/* Color Preview */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full shadow-sm"
              style={{ background: settings.primary_color }}
            />
            <div
              className="w-8 h-8 rounded-full shadow-sm"
              style={{ background: settings.secondary_color }}
            />
            <span className="text-sm text-muted-foreground ml-2">
              Aperçu des couleurs
            </span>
          </div>
        </div>

        {/* Footer Text - Now with local state and debounce */}
        <div className="space-y-2">
          <Label htmlFor="footer-text">Texte de pied de page personnalisé</Label>
          <Textarea
            id="footer-text"
            placeholder="Ex: Merci pour votre confiance ! Adresse: ..."
            value={localFooterText}
            onChange={(e) => handleFooterChange(e.target.value)}
            className="resize-none"
            rows={2}
          />
          <p className="text-xs text-muted-foreground">
            Ce texte apparaîtra en bas de vos factures
          </p>
        </div>

        {saving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Enregistrement...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
