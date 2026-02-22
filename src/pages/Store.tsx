import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ProductType = "digital" | "physical";

type StoreTemplate = {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  supportsDelivery: boolean;
  highlight: string;
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
    description: "Conversion rapide avec CTA mis en avant.",
    bestFor: "Produits digitaux + upsell",
    supportsDelivery: false,
    highlight: "from-violet-500/20 via-fuchsia-500/10 to-transparent",
  },
  {
    id: "hybrid-market",
    name: "Hybrid Market",
    description: "Vente digitale + produits physiques.",
    bestFor: "Catalogues mixtes",
    supportsDelivery: true,
    highlight: "from-sky-500/20 via-indigo-500/10 to-transparent",
  },
  {
    id: "premium-brand",
    name: "Premium Brand",
    description: "Design éditorial premium lifestyle.",
    bestFor: "Produits physiques avec livraison",
    supportsDelivery: true,
    highlight: "from-amber-500/25 via-orange-500/10 to-transparent",
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
  { id: "assistant", title: "Assistant", icon: Bot },
  { id: "review", title: "Finaliser", icon: CheckCircle2 },
] as const;

const Store = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [storeName, setStoreName] = useState("Nova Atelier");
  const [domain, setDomain] = useState("nova.kor.store");
  const [category, setCategory] = useState("Mode");
  const [selectedTemplate, setSelectedTemplate] = useState<string>(templates[1].id);
  const [templateViewport, setTemplateViewport] = useState<"mobile" | "desktop">("mobile");
  const [products, setProducts] = useState<ProductDraft[]>(initialProducts);
  const [aiPrompt, setAiPrompt] = useState(
    "Boutique mode + mini formations, style premium mobile-first avec livraison locale.",
  );

  const selectedTemplateData = useMemo(
    () => templates.find((template) => template.id === selectedTemplate),
    [selectedTemplate],
  );

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
    toast.success("Configuration proposée par l'assistant ✨");
  };

  const updateProduct = (id: string, patch: Partial<ProductDraft>) => {
    setProducts((currentProducts) =>
      currentProducts.map((product) => (product.id === id ? { ...product, ...patch } : product)),
    );
  };

  const finishStoreSetup = () => {
    toast.success("Boutique créée avec succès");
    navigate("/dashboard");
  };

  const nextStep = () => {
    if (step === steps.length - 1) {
      finishStoreSetup();
      return;
    }

    setStep((currentStep) => Math.min(currentStep + 1, steps.length - 1));
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 pb-24 sm:p-6">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="w-fit">Store Builder</Badge>
            <span className="text-xs text-muted-foreground">Étape {step + 1}/{steps.length}</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Crée ta boutique</h1>
            <p className="text-sm text-muted-foreground">Rapide, visuel, prêt à publier.</p>
          </div>

          <div className="flex items-center gap-2">
            {steps.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(index)}
                aria-label={`Aller à ${item.title}`}
                className={cn(
                  "h-2.5 rounded-full transition-all",
                  index === step ? "w-10 bg-primary" : "w-2.5 bg-primary/30 hover:bg-primary/50",
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {step === 0 && <><StoreIcon className="h-4 w-4" /> Identité</>}
            {step === 1 && <><Palette className="h-4 w-4" /> Template</>}
            {step === 2 && <><Package className="h-4 w-4" /> Produits</>}
            {step === 3 && <><Sparkles className="h-4 w-4" /> Assistant IA</>}
            {step === 4 && <><CheckCircle2 className="h-4 w-4" /> Finaliser</>}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          {step === 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input value={storeName} onChange={(event) => setStoreName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Domaine</Label>
                <Input value={domain} onChange={(event) => setDomain(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Input value={category} onChange={(event) => setCategory(event.target.value)} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-2">
                <p className="px-2 text-sm text-muted-foreground">Aperçu template</p>
                <div className="inline-flex rounded-lg border bg-background p-1">
                  <button
                    type="button"
                    onClick={() => setTemplateViewport("mobile")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm transition-colors",
                      templateViewport === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    Mobile
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateViewport("desktop")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm transition-colors",
                      templateViewport === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    Desktop
                  </button>
                </div>
              </div>

              <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
                {templates.map((template) => (
                  <button
                    type="button"
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={cn(
                      "relative snap-start rounded-2xl border bg-card p-3 text-left transition-all",
                      templateViewport === "mobile" ? "w-[250px] shrink-0" : "w-[420px] shrink-0",
                      selectedTemplate === template.id
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-xl border bg-background p-3",
                        templateViewport === "mobile" ? "min-h-[420px]" : "min-h-[260px]",
                      )}
                    >
                      <div className={cn("rounded-lg bg-gradient-to-br p-4", template.highlight)}>
                        <p className="font-semibold">{template.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
                        <Button size="sm" className="mt-3 h-7 px-3 text-xs">Voir l'offre</Button>
                      </div>
                      <div className={cn("mt-3 grid gap-2", templateViewport === "mobile" ? "" : "grid-cols-2")}>
                        <div className="rounded-md border bg-muted/40 p-2">
                          <p className="text-[11px] text-muted-foreground">Produit phare</p>
                          <p className="text-sm font-medium">Pack Starter</p>
                        </div>
                        <div className="rounded-md border bg-muted/40 p-2">
                          <p className="text-[11px] text-muted-foreground">Upsell</p>
                          <p className="text-sm font-medium">Atelier avancé</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">{template.bestFor}</Badge>
                        {template.supportsDelivery && (
                          <Badge>
                            <Truck className="mr-1 h-3 w-3" /> Livraison
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
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
                        <span className="text-sm text-muted-foreground">Activer livraison</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Textarea
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                className="min-h-28"
              />
              <Button onClick={runAssistant} className="w-full sm:w-auto">
                <Wand2 className="mr-2 h-4 w-4" /> Générer la config
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
            <Button
              variant="outline"
              onClick={() => setStep((currentStep) => Math.max(currentStep - 1, 0))}
              disabled={step === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Retour
            </Button>

            <Button onClick={nextStep}>
              {step === steps.length - 1 ? "Créer ma boutique" : "Suivant"}
              {step !== steps.length - 1 && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Store;
