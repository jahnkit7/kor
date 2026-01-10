import { Card } from "@/components/ui/card";
import { Keyboard, Zap, Mic, Lock } from "lucide-react";
import { useFeatureAccess } from "@/hooks/use-feature-access";

export type StockEntryMode = "manual" | "approximate" | "voice";

interface StockEntryModesProps {
  onSelectMode: (mode: StockEntryMode) => void;
}

export function StockEntryModes({ onSelectMode }: StockEntryModesProps) {
  // Check voice_input feature status
  const { 
    isGloballyDisabled: voiceDisabled, 
    isNotInPlan: voiceNotInPlan,
    requiredPlan: voiceRequiredPlan,
    loading: voiceLoading,
  } = useFeatureAccess("voice_input");

  // Base modes that are always shown
  const baseModes = [
    {
      id: "manual" as const,
      icon: Keyboard,
      title: "Saisie manuelle",
      description: "Quantité exacte, produit par produit",
      badge: "Par défaut",
      disabled: false,
      hidden: false,
      requiredPlan: null as string | null,
    },
    {
      id: "approximate" as const,
      icon: Zap,
      title: "Mode rapide",
      description: "Estimation rapide des quantités",
      badge: null,
      disabled: false,
      hidden: false,
      requiredPlan: null as string | null,
    },
  ];

  // Only add voice mode if not globally disabled
  const modes = voiceLoading ? baseModes : [
    ...baseModes,
    // Only include voice mode if not globally disabled
    ...(!voiceDisabled ? [{
      id: "voice" as const,
      icon: Mic,
      title: "Dictée vocale",
      description: "Dictez plusieurs produits d'un coup",
      badge: "IA",
      disabled: voiceNotInPlan,
      hidden: false,
      requiredPlan: voiceRequiredPlan,
    }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold">Ajouter du stock</h3>
        <p className="text-sm text-muted-foreground">Choisissez votre mode de saisie</p>
      </div>

      <div className="grid gap-3">
        {modes.map((mode) => (
          <div key={mode.id} className="relative">
            <Card
              className={`p-4 transition-colors ${
                mode.disabled 
                  ? "cursor-not-allowed opacity-60" 
                  : "cursor-pointer hover:border-primary"
              }`}
              onClick={() => !mode.disabled && onSelectMode(mode.id)}
            >
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                  mode.disabled ? "bg-muted" : "bg-primary/10"
                }`}>
                  <mode.icon className={`h-6 w-6 ${mode.disabled ? "text-muted-foreground" : "text-primary"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{mode.title}</h4>
                    {mode.badge && !mode.disabled && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                        {mode.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{mode.description}</p>
                </div>
                {mode.disabled && mode.requiredPlan && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-primary shrink-0">
                    <Lock className="h-3.5 w-3.5" />
                    <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {mode.requiredPlan}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
