import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  ImageIcon, 
  Globe, 
  Share2, 
  RefreshCw, 
  ExternalLink, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Trash2
} from "lucide-react";

interface OGMetadata {
  title: string;
  description: string;
  image: string;
  url: string;
}

interface BrandingAsset {
  key: string;
  label: string;
  description: string;
  recommended: string;
  currentUrl: string | null;
  fallbackUrl: string;
}

interface SEOCheck {
  id: string;
  label: string;
  status: 'pass' | 'warning' | 'error' | 'checking';
  message: string;
}

const AdminBranding = () => {
  const [ogData, setOgData] = useState<OGMetadata>({
    title: "KÒR",
    description: "L'OS du commerce africain - Gérez vos ventes par Voix, même hors ligne",
    image: "",
    url: window.location.origin,
  });
  const [previewKey, setPreviewKey] = useState(0);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [assets, setAssets] = useState<BrandingAsset[]>([
    {
      key: "logo",
      label: "Logo KÒR (SVG/PNG)",
      description: "Logo principal vectoriel",
      recommended: "SVG ou PNG transparent",
      currentUrl: null,
      fallbackUrl: "/images/logo-kor.svg"
    },
    {
      key: "icon",
      label: "Icône KÒR (PNG)",
      description: "Icône favicon et PWA",
      recommended: "512×512 PNG",
      currentUrl: null,
      fallbackUrl: "/icons/kor-icon.png"
    },
    {
      key: "og-image",
      label: "Image Open Graph",
      description: "Image pour partage social",
      recommended: "1200×630 PNG/JPG",
      currentUrl: null,
      fallbackUrl: "/images/og-image.png"
    }
  ]);
  const [seoChecks, setSeoChecks] = useState<SEOCheck[]>([]);
  const [isRunningChecks, setIsRunningChecks] = useState(false);

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Load branding assets URLs from app_settings
  useEffect(() => {
    loadBrandingSettings();
  }, []);

  const loadBrandingSettings = async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['branding_logo', 'branding_icon', 'branding_og_image', 'og_title', 'og_description']);

    if (data) {
      const settingsMap: { [key: string]: string } = {};
      data.forEach(item => {
        settingsMap[item.key] = item.value;
      });

      setAssets(prev => prev.map(asset => ({
        ...asset,
        currentUrl: settingsMap[`branding_${asset.key.replace('-', '_')}`] || null
      })));

      if (settingsMap['og_title'] || settingsMap['og_description']) {
        setOgData(prev => ({
          ...prev,
          title: settingsMap['og_title'] || prev.title,
          description: settingsMap['og_description'] || prev.description,
        }));
      }
    }
  };

  const handleFileUpload = async (assetKey: string, file: File) => {
    setIsUploading(assetKey);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${assetKey}-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('branding')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('branding')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Save URL to app_settings
      const settingKey = `branding_${assetKey.replace('-', '_')}`;
      await supabase
        .from('app_settings')
        .upsert({ 
          key: settingKey, 
          value: publicUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      // Update local state
      setAssets(prev => prev.map(asset => 
        asset.key === assetKey 
          ? { ...asset, currentUrl: publicUrl }
          : asset
      ));

      if (assetKey === 'og-image') {
        setOgData(prev => ({ ...prev, image: publicUrl }));
      }

      toast.success(`${assetKey} uploadé avec succès`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Erreur lors de l'upload: ${error.message}`);
    } finally {
      setIsUploading(null);
    }
  };

  const handleDeleteAsset = async (assetKey: string) => {
    try {
      const asset = assets.find(a => a.key === assetKey);
      if (!asset?.currentUrl) return;

      // Extract filename from URL
      const urlParts = asset.currentUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      // Delete from storage
      await supabase.storage
        .from('branding')
        .remove([fileName]);

      // Remove from app_settings
      const settingKey = `branding_${assetKey.replace('-', '_')}`;
      await supabase
        .from('app_settings')
        .delete()
        .eq('key', settingKey);

      // Update local state
      setAssets(prev => prev.map(a => 
        a.key === assetKey 
          ? { ...a, currentUrl: null }
          : a
      ));

      toast.success("Asset supprimé");
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const saveOgMetadata = async () => {
    try {
      await supabase
        .from('app_settings')
        .upsert([
          { key: 'og_title', value: ogData.title, updated_at: new Date().toISOString() },
          { key: 'og_description', value: ogData.description, updated_at: new Date().toISOString() }
        ], { onConflict: 'key' });
      
      toast.success("Métadonnées sauvegardées");
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const refreshPreview = () => {
    setPreviewKey(prev => prev + 1);
    toast.success("Prévisualisation actualisée");
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(ogData.url);
    toast.success("Lien copié !");
  };

  const getImageUrl = (assetKey: string) => {
    const asset = assets.find(a => a.key === assetKey);
    return asset?.currentUrl || asset?.fallbackUrl || '';
  };

  // SEO Validation
  const runSEOChecks = async () => {
    setIsRunningChecks(true);
    const checks: SEOCheck[] = [];

    // Check 1: Title length
    const titleLength = ogData.title.length;
    checks.push({
      id: 'title-length',
      label: 'Longueur du titre',
      status: titleLength <= 60 && titleLength >= 10 ? 'pass' : titleLength > 60 ? 'error' : 'warning',
      message: titleLength <= 60 && titleLength >= 10 
        ? `${titleLength} caractères (idéal: 10-60)` 
        : titleLength > 60 
          ? `${titleLength} caractères - trop long (max 60)`
          : `${titleLength} caractères - trop court (min 10)`
    });

    // Check 2: Description length
    const descLength = ogData.description.length;
    checks.push({
      id: 'desc-length',
      label: 'Longueur de la description',
      status: descLength <= 160 && descLength >= 50 ? 'pass' : descLength > 160 ? 'error' : 'warning',
      message: descLength <= 160 && descLength >= 50
        ? `${descLength} caractères (idéal: 50-160)`
        : descLength > 160
          ? `${descLength} caractères - trop long (max 160)`
          : `${descLength} caractères - trop court (min 50)`
    });

    // Check 3: OG Image exists
    const ogImageUrl = getImageUrl('og-image');
    const hasCustomOgImage = assets.find(a => a.key === 'og-image')?.currentUrl;
    checks.push({
      id: 'og-image-exists',
      label: 'Image Open Graph',
      status: hasCustomOgImage ? 'pass' : 'warning',
      message: hasCustomOgImage 
        ? 'Image personnalisée configurée' 
        : 'Utilise l\'image par défaut - uploadez une image personnalisée'
    });

    // Check 4: OG Image dimensions
    if (ogImageUrl) {
      try {
        const dimensions = await getImageDimensions(ogImageUrl);
        const isOptimal = dimensions.width >= 1200 && dimensions.height >= 630;
        const aspectRatio = dimensions.width / dimensions.height;
        const isCorrectRatio = Math.abs(aspectRatio - 1.91) < 0.1;
        
        checks.push({
          id: 'og-image-size',
          label: 'Dimensions image OG',
          status: isOptimal && isCorrectRatio ? 'pass' : isOptimal ? 'warning' : 'error',
          message: `${dimensions.width}×${dimensions.height}px ${
            isOptimal && isCorrectRatio 
              ? '(optimal)' 
              : isOptimal 
                ? '- ratio non optimal (1.91:1 recommandé)'
                : '- trop petit (1200×630 recommandé)'
          }`
        });
      } catch {
        checks.push({
          id: 'og-image-size',
          label: 'Dimensions image OG',
          status: 'warning',
          message: 'Impossible de vérifier les dimensions'
        });
      }
    }

    // Check 5: Favicon exists
    const hasCustomIcon = assets.find(a => a.key === 'icon')?.currentUrl;
    checks.push({
      id: 'favicon',
      label: 'Favicon/Icône',
      status: hasCustomIcon ? 'pass' : 'warning',
      message: hasCustomIcon 
        ? 'Icône personnalisée configurée' 
        : 'Utilise l\'icône par défaut'
    });

    // Check 6: Logo exists
    const hasCustomLogo = assets.find(a => a.key === 'logo')?.currentUrl;
    checks.push({
      id: 'logo',
      label: 'Logo',
      status: hasCustomLogo ? 'pass' : 'warning',
      message: hasCustomLogo 
        ? 'Logo personnalisé configuré' 
        : 'Utilise le logo par défaut'
    });

    // Check 7: URL is HTTPS
    checks.push({
      id: 'https',
      label: 'Protocole HTTPS',
      status: ogData.url.startsWith('https://') ? 'pass' : 'warning',
      message: ogData.url.startsWith('https://') 
        ? 'Site sécurisé avec HTTPS' 
        : 'HTTPS recommandé pour le SEO'
    });

    setSeoChecks(checks);
    setIsRunningChecks(false);
  };

  const getImageDimensions = (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = url;
    });
  };

  const getSEOScore = () => {
    if (seoChecks.length === 0) return 0;
    const passCount = seoChecks.filter(c => c.status === 'pass').length;
    return Math.round((passCount / seoChecks.length) * 100);
  };

  const getStatusIcon = (status: SEOCheck['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'checking': return <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />;
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Branding & SEO</h1>
          <p className="text-muted-foreground text-sm">
            Gérez l'identité visuelle et les métadonnées de partage
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Assets Upload Section */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Assets de la marque
            </CardTitle>
            <CardDescription>
              Uploadez vos assets personnalisés
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {assets.map((asset) => (
              <div key={asset.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">{asset.label}</Label>
                  {asset.currentUrl && (
                    <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600">
                      Personnalisé
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                  <div className={`${asset.key === 'og-image' ? 'w-32 aspect-[1200/630]' : 'h-16 w-16'} flex items-center justify-center bg-background rounded-md border border-border/50 overflow-hidden`}>
                    <img 
                      src={asset.currentUrl || asset.fallbackUrl} 
                      alt={asset.label} 
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {asset.currentUrl ? 'Asset personnalisé' : 'Asset par défaut'}
                    </p>
                    <p className="text-xs text-muted-foreground">{asset.recommended}</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={el => fileInputRefs.current[asset.key] = el}
                      type="file"
                      accept={asset.key === 'logo' ? '.svg,.png' : '.png,.jpg,.jpeg,.webp'}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(asset.key, file);
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRefs.current[asset.key]?.click()}
                      disabled={isUploading === asset.key}
                    >
                      {isUploading === asset.key ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                    {asset.currentUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAsset(asset.key)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* OG Preview Section */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Prévisualisation du partage
            </CardTitle>
            <CardDescription>
              Aperçu du rendu sur les réseaux sociaux
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Metadata Editor */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="og-title">Titre</Label>
                <Input
                  id="og-title"
                  value={ogData.title}
                  onChange={(e) => setOgData({ ...ogData, title: e.target.value })}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="og-description">Description</Label>
                <Textarea
                  id="og-description"
                  value={ogData.description}
                  onChange={(e) => setOgData({ ...ogData, description: e.target.value })}
                  rows={2}
                  className="bg-background resize-none"
                />
              </div>
              <Button onClick={saveOgMetadata} size="sm">
                Sauvegarder les métadonnées
              </Button>
            </div>

            {/* Previews */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Aperçu</Label>
                <Button variant="ghost" size="sm" onClick={refreshPreview}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Actualiser
                </Button>
              </div>

              {/* Facebook Preview */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Facebook / LinkedIn</p>
                <div key={`fb-${previewKey}`} className="border border-border rounded-lg overflow-hidden bg-background shadow-sm">
                  <div className="aspect-[1200/630] bg-muted/30 overflow-hidden">
                    <img 
                      src={getImageUrl('og-image')}
                      alt="OG Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 border-t border-border bg-card/50">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                      {new URL(ogData.url).hostname}
                    </p>
                    <h3 className="font-semibold text-sm text-foreground line-clamp-1">
                      {ogData.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {ogData.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* WhatsApp Preview */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">WhatsApp</p>
                <div key={`wa-${previewKey}`} className="border border-border rounded-xl overflow-hidden bg-[#e7ffdb] dark:bg-[#005c4b] shadow-sm max-w-[280px]">
                  <div className="aspect-[1200/630] bg-muted/30 overflow-hidden">
                    <img 
                      src={getImageUrl('og-image')}
                      alt="OG Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-2.5 border-t border-black/5 dark:border-white/10">
                    <h3 className="font-medium text-xs text-foreground line-clamp-1">
                      {ogData.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {ogData.description}
                    </p>
                    <p className="text-[10px] text-primary/80 mt-1">
                      {new URL(ogData.url).hostname}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={copyShareLink}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Copier le lien
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEO Validation */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Validation SEO
              </CardTitle>
              <CardDescription>
                Vérifiez les bonnes pratiques SEO et Open Graph
              </CardDescription>
            </div>
            <Button onClick={runSEOChecks} disabled={isRunningChecks}>
              {isRunningChecks ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Lancer l'analyse
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {seoChecks.length > 0 ? (
            <div className="space-y-4">
              {/* Score */}
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Score SEO</span>
                    <span className={`text-lg font-bold ${
                      getSEOScore() >= 80 ? 'text-emerald-500' : 
                      getSEOScore() >= 50 ? 'text-amber-500' : 'text-red-500'
                    }`}>
                      {getSEOScore()}%
                    </span>
                  </div>
                  <Progress value={getSEOScore()} className="h-2" />
                </div>
              </div>

              {/* Checks List */}
              <div className="space-y-2">
                {seoChecks.map((check) => (
                  <div 
                    key={check.id}
                    className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border/30"
                  >
                    {getStatusIcon(check.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{check.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{check.message}</p>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        check.status === 'pass' ? 'bg-emerald-500/10 text-emerald-600' :
                        check.status === 'warning' ? 'bg-amber-500/10 text-amber-600' :
                        'bg-red-500/10 text-red-600'
                      }`}
                    >
                      {check.status === 'pass' ? 'OK' : check.status === 'warning' ? 'Attention' : 'Erreur'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Cliquez sur "Lancer l'analyse" pour vérifier le SEO</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meta Tags Reference */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Balises Meta actuelles
          </CardTitle>
          <CardDescription>
            Ces balises doivent être mises à jour dans index.html
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 rounded-lg p-4 overflow-x-auto">
            <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
{`<!-- Open Graph -->
<meta property="og:title" content="${ogData.title}">
<meta property="og:description" content="${ogData.description}">
<meta property="og:image" content="${getImageUrl('og-image')}">
<meta property="og:type" content="website">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${ogData.title}">
<meta name="twitter:description" content="${ogData.description}">
<meta name="twitter:image" content="${getImageUrl('og-image')}">`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBranding;
