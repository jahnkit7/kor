import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Image, Globe, Share2, Eye, RefreshCw, ExternalLink } from "lucide-react";

interface OGMetadata {
  title: string;
  description: string;
  image: string;
  url: string;
}

const AdminBranding = () => {
  const [ogData, setOgData] = useState<OGMetadata>({
    title: "KÒR",
    description: "L'OS du commerce africain - Gérez vos ventes par Voix, même hors ligne",
    image: "/images/og-image.png",
    url: window.location.origin,
  });
  const [previewKey, setPreviewKey] = useState(0);

  const refreshPreview = () => {
    setPreviewKey(prev => prev + 1);
    toast.success("Prévisualisation actualisée");
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(ogData.url);
    toast.success("Lien copié !");
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
        {/* Assets Section */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              Assets de la marque
            </CardTitle>
            <CardDescription>
              Logo, icône et image de partage social
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo KÒR */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Logo KÒR (SVG)</Label>
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="h-16 w-32 flex items-center justify-center bg-background rounded-md border border-border/50 p-2">
                  <img 
                    src="/images/logo-kor.svg" 
                    alt="Logo KÒR" 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">logo-kor.svg</p>
                  <p className="text-xs text-muted-foreground">Logo principal vectoriel</p>
                </div>
              </div>
            </div>

            {/* Icon */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Icône KÒR (PNG)</Label>
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="h-16 w-16 flex items-center justify-center bg-background rounded-md border border-border/50 p-2">
                  <img 
                    src="/icons/kor-icon.png" 
                    alt="Icône KÒR" 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">kor-icon.png</p>
                  <p className="text-xs text-muted-foreground">Icône favicon et PWA</p>
                </div>
              </div>
            </div>

            {/* OG Image */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Image Open Graph</Label>
              <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="w-full aspect-[1200/630] flex items-center justify-center bg-background rounded-md border border-border/50 overflow-hidden">
                  <img 
                    src="/images/og-image.png" 
                    alt="Image OG" 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">og-image.png</p>
                  <p className="text-xs text-muted-foreground">Image affichée lors du partage (1200×630 recommandé)</p>
                </div>
              </div>
            </div>
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
                      src={ogData.image}
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

              {/* Twitter Preview */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">X (Twitter)</p>
                <div key={`tw-${previewKey}`} className="border border-border rounded-2xl overflow-hidden bg-background shadow-sm">
                  <div className="aspect-[1200/630] bg-muted/30 overflow-hidden">
                    <img 
                      src={ogData.image}
                      alt="OG Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 border-t border-border bg-card/50">
                    <h3 className="font-semibold text-sm text-foreground line-clamp-1">
                      {ogData.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {ogData.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {new URL(ogData.url).hostname}
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
                      src={ogData.image}
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

      {/* Meta Tags Reference */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Balises Meta actuelles
          </CardTitle>
          <CardDescription>
            Ces balises sont définies dans index.html
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 rounded-lg p-4 overflow-x-auto">
            <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
{`<!-- Open Graph -->
<meta property="og:title" content="${ogData.title}">
<meta property="og:description" content="${ogData.description}">
<meta property="og:image" content="${ogData.url}/images/og-image.png">
<meta property="og:type" content="website">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${ogData.title}">
<meta name="twitter:description" content="${ogData.description}">
<meta name="twitter:image" content="${ogData.url}/images/og-image.png">`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBranding;
