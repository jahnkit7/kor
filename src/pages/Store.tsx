import { useMemo, useState } from "react";
import {
  Sparkles,
  Store as StoreIcon,
  Palette,
  Package,
  Bot,
  CheckCircle2,
  Truck,
  Globe,
  Wand2,
  Smartphone,
  ShoppingBag,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ProductType = "digital" | "physical";
type TemplateTone = "sunset" | "neon" | "minimal";

type StoreTemplate = {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  supportsDelivery: boolean;
  tone: TemplateTone;
};

type ProductDraft = {
  id: string;
  name: string;
  type: ProductType;
  price: string;
  deliveryEnabled: boolean;
};

const templates: StoreTemplate[] = [
  {
    id: "shop-wave",
    name: "Shop Wave",
    description: "Template moderne avec hero immersif, promos en carrousel et CTA rapides.",
    bestFor: "Mode, beauté, accessoires",
    supportsDelivery: true,
    tone: "sunset",
  },
  {
    id: "neo-market",
    name: "Neo Market",
    description: "Design dark + néon, parfait pour catalogues hybrides digital/physique.",
    bestFor: "Digital + gadgets + édition limitée",
    supportsDelivery: true,
    tone: "neon",
  },
  {
    id: "clean-commerce",
    name: "Clean Commerce",
    description: "Interface minimaliste orientée conversion mobile et panier express.",
    bestFor: "Marques premium et produits physiques",
    supportsDelivery: true,
    tone: "minimal",
  },
];

const initialProducts: ProductDraft[] = [
  { id: "1", name: "Guide PDF", type: "digital", price: "29", deliveryEnabled: false },
  { id: "2", name: "Hoodie Signature", type: "physical", price: "49", deliveryEnabled: true },
];

const steps = [
  { id: "identity", title: "Identité", icon: StoreIcon },
  { id: "template", title: "Template", icon: Palette },
  { id: "products", title: "Produits", icon: Package },
  { id: "assistant", title: "Assistant IA", icon: Bot },
  { id: "review", title: "Validation", icon: CheckCircle2 },
] as const;

const toneClasses: Record<TemplateTone, string> = {
  sunset: "from-orange-500 via-pink-500 to-violet-600",
  neon: "from-slate-900 via-indigo-900 to-cyan-700",
  minimal: "from-zinc-100 via-white to-zinc-200",
};

const Store = () => {
  const [step, setStep] = useState(0);
  const [storeName, setStoreName] = useState("Nova Atelier");
  const [domain, setDomain] = useState("nova.kor.store");
  const [category, setCategory] = useState("Mode");
  const [selectedTemplate, setSelectedTemplate] = useState<string>(templates[0].id);
  const [products, setProducts] = useState<ProductDraft[]>(initialProducts);
  const [aiPrompt, setAiPrompt] = useState(
    "Je veux une boutique mobile-first avec vêtements physiques + mini formation digitale.",
  );

  const selectedTemplateData = useMemo(
    () => templates.find((template) => template.id === selectedTemplate),
    [selectedTemplate],
  );

  const progressValue = ((step + 1) / steps.length) * 100;
  const physicalProductsCount = products.filter((product) => product.type === "physical").length;

  const runAssistant = () => {
    setStoreName("Nova Atelier Studio");
    setDomain("nova-atelier.kor.store");
    setCategory("Lifestyle & Formation");
    setSelectedTemplate("neo-market");
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.type === "physical" ? { ...product, deliveryEnabled: true } : product,
      ),
    );
    toast.success("Configuration IA appliquée.");
  };

  const updateProduct = (id: string, patch: Partial<ProductDraft>) => {
    setProducts((currentProducts) =>
      currentProducts.map((product) => (product.id === id ? { ...product, ...patch } : product)),
    );
  };

  const handleNext = () => {
    setStep((currentStep) => Math.min(currentStep + 1, steps.length - 1));
  };

  const renderLivePreview = () => (
    <div className={cn("rounded-2xl p-3", `bg-gradient-to-br ${toneClasses[selectedTemplateData?.tone ?? "sunset"]}`)}>
      <div className="rounded-xl bg-background/95 p-3 shadow-sm">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold">{storeName}</p>
            <p className="text-xs text-muted-foreground">{domain}</p>
          </div>
          <Badge variant="outline" className="text-[10px]">{category}</Badge>
        </div>

        <div className="space-y-2">
          {products.slice(0, 3).map((product) => (
            <div key={product.id} className="rounded-lg border p-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{product.name || "Produit"}</span>
                <span>{product.price || "0"}€</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                <ShoppingBag className="h-3 w-3" />
                {product.type === "physical" && product.deliveryEnabled ? "Livraison activée" : product.type === "physical" ? "Retrait" : "Téléchargement"}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{physicalProductsCount} produit(s) physique(s)</span>
          <span>{selectedTemplateData?.name}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 pb-24 sm:p-6">
      <div className="space-y-3">
        <Badge variant="secondary" className="w-fit">
          Nouveau module • Store Builder
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Crée ta boutique en quelques étapes</h1>
        <p className="text-muted-foreground">
          Workflow mobile-first avec templates visuels, produits digitaux + physiques, livraison et assistant IA.
        </p>
        <Progress value={progressValue} className="h-2" />
      </div>

      <Card className="xl:hidden">
        <CardHeader>
          <CardTitle className="text-base">Prévisualisation en temps réel</CardTitle>
          <CardDescription>Visible pendant tout le workflow.</CardDescription>
        </CardHeader>
        <CardContent>{renderLivePreview()}</CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Workflow</CardTitle>
            <CardDescription>{step + 1} / {steps.length} étapes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {steps.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setStep(index)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    index === step
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-accent",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              {step === 0 && <><StoreIcon className="h-5 w-5" /> Identité de la boutique</>}
              {step === 1 && <><Palette className="h-5 w-5" /> Choix du template</>}
              {step === 2 && <><Package className="h-5 w-5" /> Produits & livraison</>}
              {step === 3 && <><Sparkles className="h-5 w-5" /> Assistant IA</>}
              {step === 4 && <><CheckCircle2 className="h-5 w-5" /> Prévisualisation finale</>}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom de la boutique</Label>
                  <Input value={storeName} onChange={(event) => setStoreName(event.target.value)} placeholder="Ex: Nova Atelier" />
                </div>
                <div className="space-y-2">
                  <Label>Domaine</Label>
                  <Input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="exemple.kor.store" />
                </div>
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Mode, beauté, food..." />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-3 md:grid-cols-2">
                {templates.map((template) => (
                  <button
                    type="button"
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      selectedTemplate === template.id ? "border-primary bg-primary/10" : "hover:bg-accent",
                    )}
                  >
                    <div className={cn("mb-3 rounded-lg p-3 text-white", `bg-gradient-to-br ${toneClasses[template.tone]}`)}>
                      <div className="mb-3 flex items-center justify-between">
                        <span className={cn("text-xs font-semibold", template.tone === "minimal" && "text-zinc-700")}>{template.name}</span>
                        <Smartphone className={cn("h-4 w-4", template.tone === "minimal" && "text-zinc-700")} />
                      </div>
                      <div className="space-y-2">
                        <div className={cn("h-6 rounded bg-white/25", template.tone === "minimal" && "bg-zinc-300")} />
                        <div className={cn("h-14 rounded bg-white/20", template.tone === "minimal" && "bg-zinc-200")} />
                        <div className="grid grid-cols-2 gap-2">
                          <div className={cn("h-10 rounded bg-white/20", template.tone === "minimal" && "bg-zinc-200")} />
                          <div className={cn("h-10 rounded bg-white/20", template.tone === "minimal" && "bg-zinc-200")} />
                        </div>
                      </div>
                    </div>
                    <p className="font-semibold">{template.name}</p>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline">{template.bestFor}</Badge>
                      {template.supportsDelivery && <Badge><Truck className="mr-1 h-3 w-3" /> Livraison</Badge>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {products.map((product) => (
                  <div key={product.id} className="space-y-3 rounded-xl border p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Nom du produit</Label>
                        <Input
                          value={product.name}
                          onChange={(event) => updateProduct(product.id, { name: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Prix (€)</Label>
                        <Input
                          value={product.price}
                          onChange={(event) => updateProduct(product.id, { price: event.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">{product.type === "digital" ? "Digital" : "Physique"}</Badge>
                      {product.type === "physical" && (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={product.deliveryEnabled}
                            onCheckedChange={(checked) => updateProduct(product.id, { deliveryEnabled: checked })}
                          />
                          <span className="text-sm text-muted-foreground">Activer la livraison</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
                  Décris ta boutique et l'IA configure tout automatiquement (template, naming, livraison).
                </div>
                <Textarea
                  value={aiPrompt}
                  onChange={(event) => setAiPrompt(event.target.value)}
                  className="min-h-32"
                />
                <Button onClick={runAssistant} className="w-full sm:w-auto">
                  <Wand2 className="mr-2 h-4 w-4" /> Générer ma configuration
                </Button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Boutique</p>
                    <p className="font-medium">{storeName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Domaine</p>
                    <p className="font-medium flex items-center gap-1"><Globe className="h-3.5 w-3.5" /> {domain}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Template</p>
                    <p className="font-medium">{selectedTemplateData?.name}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="font-medium">Produits configurés</p>
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.type === "digital" ? "Digital" : "Physique"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{product.price}€</p>
                        {product.type === "physical" && product.deliveryEnabled && (
                          <p className="text-xs text-emerald-600">Livraison activée</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-4">
              <Button variant="outline" onClick={() => setStep((currentStep) => Math.max(currentStep - 1, 0))} disabled={step === 0}>
                Retour
              </Button>
              {step === steps.length - 1 ? (
                <Button onClick={() => toast.success("Boutique publiée (démo).")}>Publier maintenant</Button>
              ) : (
                <Button onClick={handleNext}>Suivant</Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="hidden h-fit xl:block">
          <CardHeader>
            <CardTitle className="text-base">Prévisualisation en temps réel</CardTitle>
            <CardDescription>Chaque modification est reflétée instantanément.</CardDescription>
          </CardHeader>
          <CardContent>{renderLivePreview()}</CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Store;
