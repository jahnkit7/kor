import { useState } from "react";
// AdminLayout is now provided by AdminProtectedLayout
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminFeatureFlags } from "@/hooks/use-admin-stats";
import { 
  useAdminVariants, 
  useCreateVariant, 
  useUpdateVariant,
  useDeleteVariant,
  useABTestResults 
} from "@/hooks/use-ab-testing";
import { toast } from "sonner";
import { 
  FlaskConical, 
  Plus, 
  Trash2, 
  BarChart3, 
  Users,
  Target,
  TrendingUp
} from "lucide-react";

export default function AdminABTesting() {
  const { data: features, isLoading: featuresLoading } = useAdminFeatureFlags();
  const [selectedFeature, setSelectedFeature] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const betaFeatures = (features as any[] || []).filter((f: any) => f.is_beta);
  
  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-primary" />
              A/B Testing
            </h1>
            <p className="text-muted-foreground">
              Comparez différentes versions de vos fonctionnalités Bêta
            </p>
          </div>
        </div>

        {/* Feature Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sélectionner une Feature Bêta</CardTitle>
          </CardHeader>
          <CardContent>
            {featuresLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : betaFeatures.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aucune feature Bêta disponible. Marquez une feature comme Bêta pour commencer.
              </p>
            ) : (
              <Select value={selectedFeature} onValueChange={setSelectedFeature}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une feature..." />
                </SelectTrigger>
                <SelectContent>
                  {betaFeatures.map((feature: any) => (
                    <SelectItem key={feature.id} value={feature.feature_key}>
                      {feature.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Variants & Results */}
        {selectedFeature && (
          <ABTestPanel 
            featureKey={selectedFeature} 
            featureName={betaFeatures.find((f: any) => f.feature_key === selectedFeature)?.name || ""}
            onCreateVariant={() => setShowCreateDialog(true)}
          />
        )}

        {/* Create Variant Dialog */}
        <CreateVariantDialog 
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          featureKey={selectedFeature}
        />
      </div>
  );
}

function ABTestPanel({ 
  featureKey, 
  featureName,
  onCreateVariant 
}: { 
  featureKey: string; 
  featureName: string;
  onCreateVariant: () => void;
}) {
  const { data: variants, isLoading } = useAdminVariants(featureKey);
  const { results } = useABTestResults(featureKey);
  const updateVariant = useUpdateVariant();
  const deleteVariant = useDeleteVariant();

  const handleTrafficChange = (variantId: string, value: number[]) => {
    updateVariant.mutate({ id: variantId, traffic_percentage: value[0] });
  };

  const handleToggleActive = (variantId: string, isActive: boolean) => {
    updateVariant.mutate({ id: variantId, is_active: isActive });
  };

  const handleDelete = (variantId: string) => {
    if (confirm("Supprimer cette variante ?")) {
      deleteVariant.mutate(variantId, {
        onSuccess: () => toast.success("Variante supprimée"),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Variants Cards */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Variantes pour "{featureName}"</h2>
        <Button onClick={onCreateVariant} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle variante
        </Button>
      </div>

      {variants?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Aucune variante créée. Créez au moins 2 variantes pour commencer un test A/B.
            </p>
            <Button onClick={onCreateVariant} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Créer la première variante
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {variants?.map((variant) => {
            const variantResult = results.find(r => r.variant.id === variant.id);
            
            return (
              <Card key={variant.id} className={!variant.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{variant.name}</CardTitle>
                      {variant.is_control && (
                        <Badge variant="outline" className="text-xs">Contrôle</Badge>
                      )}
                    </div>
                    <Switch
                      checked={variant.is_active}
                      onCheckedChange={(checked) => handleToggleActive(variant.id, checked)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{variant.variant_key}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {variant.description && (
                    <p className="text-sm text-muted-foreground">{variant.description}</p>
                  )}
                  
                  {/* Traffic Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Traffic</span>
                      <span className="font-medium">{variant.traffic_percentage}%</span>
                    </div>
                    <Slider
                      value={[variant.traffic_percentage]}
                      onValueChange={(v) => handleTrafficChange(variant.id, v)}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  {/* Stats */}
                  {variantResult && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <Users className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                        <p className="text-lg font-bold">{variantResult.totalUsers}</p>
                        <p className="text-xs text-muted-foreground">Utilisateurs</p>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded-lg">
                        <Target className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                        <p className="text-lg font-bold">{variantResult.totalConversions}</p>
                        <p className="text-xs text-muted-foreground">Conversions</p>
                      </div>
                    </div>
                  )}

                  {/* Delete button */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => handleDelete(variant.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Results Summary */}
      {results.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Résultats comparatifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Variante</th>
                    <th className="text-center py-2 px-3">Utilisateurs</th>
                    <th className="text-center py-2 px-3">Conversions</th>
                    <th className="text-center py-2 px-3">Taux</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => {
                    const rate = result.totalUsers > 0 
                      ? ((result.totalConversions / result.totalUsers) * 100).toFixed(1)
                      : "0.0";
                    
                    return (
                      <tr key={result.variant.id} className="border-b last:border-0">
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            {result.variant.name}
                            {result.variant.is_control && (
                              <Badge variant="outline" className="text-xs">Contrôle</Badge>
                            )}
                          </div>
                        </td>
                        <td className="text-center py-2 px-3">{result.totalUsers}</td>
                        <td className="text-center py-2 px-3">{result.totalConversions}</td>
                        <td className="text-center py-2 px-3">
                          <span className="font-medium">{rate}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CreateVariantDialog({ 
  open, 
  onOpenChange, 
  featureKey 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  featureKey: string;
}) {
  const [variantKey, setVariantKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trafficPercentage, setTrafficPercentage] = useState(50);
  const [isControl, setIsControl] = useState(false);
  
  const createVariant = useCreateVariant();

  const handleCreate = () => {
    if (!variantKey.trim() || !name.trim()) {
      toast.error("Veuillez remplir les champs requis");
      return;
    }

    createVariant.mutate({
      feature_key: featureKey,
      variant_key: variantKey.toLowerCase().replace(/\s+/g, "_"),
      name,
      description: description || undefined,
      traffic_percentage: trafficPercentage,
      is_control: isControl,
    }, {
      onSuccess: () => {
        toast.success("Variante créée");
        onOpenChange(false);
        resetForm();
      },
      onError: (error: any) => {
        toast.error(error.message || "Erreur lors de la création");
      },
    });
  };

  const resetForm = () => {
    setVariantKey("");
    setName("");
    setDescription("");
    setTrafficPercentage(50);
    setIsControl(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer une variante</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="variant-key">Clé de variante *</Label>
            <Input
              id="variant-key"
              value={variantKey}
              onChange={(e) => setVariantKey(e.target.value)}
              placeholder="ex: variant_a, new_design"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Nouveau design, Version 2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez cette variante..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Pourcentage de traffic</Label>
              <span className="text-sm font-medium">{trafficPercentage}%</span>
            </div>
            <Slider
              value={[trafficPercentage]}
              onValueChange={(v) => setTrafficPercentage(v[0])}
              max={100}
              step={5}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Variante de contrôle</Label>
              <p className="text-xs text-muted-foreground">
                La version originale à comparer
              </p>
            </div>
            <Switch
              checked={isControl}
              onCheckedChange={setIsControl}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={createVariant.isPending}>
            {createVariant.isPending ? "Création..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
