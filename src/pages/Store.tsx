import { useMemo, useState } from "react";
import { Sparkles, Store as StoreIcon, Palette, Package, Bot, CheckCircle2, Truck, Globe, Wand2 } from "lucide-react";
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

type ProductType = "digital" | "physical";

type StoreTemplate = {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  supportsDelivery: boolean;
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
    id: "creator-fast",
    name: "Creator Fast Lane",
    description: "Mise en page orientée conversion rapide avec CTA mis en avant.",
    bestFor: "Produits digitaux + upsell",
    supportsDelivery: false,
  },
  {
    id: "hybrid-market",
    name: "Hybrid Market",
    description: "Template polyvalent pour vente digitale et produits physiques.",
    bestFor: "Catalogues mixtes",
    supportsDelivery: true,
  },
  {
    id: "premium-brand",
    name: "Premium Brand",
    description: "Design éditorial premium pour marques lifestyle et e-commerce.",
    bestFor: "Produits physiques avec livraison",
    supportsDelivery: true,
  },
];

const initialProducts: ProductDraft[] = [
  { id: "1", name: "Template Notion", type: "digital", price: "29", deliveryEnabled: false },
  { id: "2", name: "T-shirt Signature", type: "physical", price: "45", deliveryEnabled: true },
];

const steps = [
  { id: "identity", title: "Identité", icon: StoreIcon },
  { id: "template", title: "Template", icon: Palette },
  { id: "products", title: "Produits", icon: Package },
  { id: "assistant", title: "Assistant IA", icon: Bot },
  { id: "review", title: "Validation", icon: CheckCircle2 },
] as const;

const Store = () => {
  const [step, setStep] = useState(0);
  const [storeName, setStoreName] = useState("Nova Atelier");
  const [domain, setDomain] = useState("nova.kor.store");
  const [category, setCategory] = useState("Mode");
  const [selectedTemplate, setSelectedTemplate] = useState<string>(templates[1].id);
  const [products, setProducts] = useState<ProductDraft[]>(initialProducts);
  const [aiPrompt, setAiPrompt] = useState(
    "Je vends des accessoires mode et des mini-formations. Je veux un style moderne, mobile-first, et des options de livraison locale.",
  );

  const selectedTemplateData = useMemo(
    () => templates.find((template) => template.id === selectedTemplate),
    [selectedTemplate],
  );

  const progressValue = ((step + 1) / steps.length) * 100;

  const runAssistant = () => {
    setStoreName("Nova Atelier Studio");
    setDomain("nova-atelier.kor.store");
    setCategory("Lifestyle & Formation");
    setSelectedTemplate("hybrid-market");
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.type === "physical" ? { ...product, deliveryEnabled: true } : product,
      ),
    );
  };

  const updateProduct = (id: string, patch: Partial<ProductDraft>) => {
    setProducts((currentProducts) =>
      currentProducts.map((product) => (product.id === id ? { ...product, ...patch } : product)),
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 pb-24 sm:p-6">
      <div className="space-y-3">
        <Badge variant="secondary" className="w-fit">
          Nouveau module • Store Builder
        </Badge>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Crée ta boutique en quelques étapes</h1>
        <p className="text-muted-foreground">
          Inspiré des workflows modernes de création, ce module propose un parcours mobile-first avec templates, produits digitaux et physiques, livraison et configuration assistée par IA.
        </p>
        <Progress value={progressValue} className="h-2" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
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
                  <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Mode, coaching, food..." />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-3">
                {templates.map((template) => (
                  <button
                    type="button"
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      selectedTemplate === template.id ? "border-primary bg-primary/10" : "hover:bg-accent",
                    )}
                  >
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
                  Décris ton univers, ton domaine et tes produits. L'assistant va proposer une configuration complète en un clic.
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

                <Button className="w-full">Publier la boutique</Button>
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-4">
              <Button variant="outline" onClick={() => setStep((currentStep) => Math.max(currentStep - 1, 0))} disabled={step === 0}>
                Retour
              </Button>
              <Button onClick={() => setStep((currentStep) => Math.min(currentStep + 1, steps.length - 1))} disabled={step === steps.length - 1}>
                Suivant
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Store;
