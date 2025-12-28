import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Keyboard, Zap, Mic } from "lucide-react";

export type StockEntryMode = "manual" | "approximate" | "voice";

interface StockEntryModesProps {
  onSelectMode: (mode: StockEntryMode) => void;
}

export function StockEntryModes({ onSelectMode }: StockEntryModesProps) {
  const modes = [
    {
      id: "manual" as const,
      icon: Keyboard,
      title: "Saisie manuelle",
      description: "Quantité exacte, produit par produit",
      badge: "Par défaut",
    },
    {
      id: "approximate" as const,
      icon: Zap,
      title: "Mode rapide",
      description: "Estimation rapide des quantités",
      badge: null,
    },
    {
      id: "voice" as const,
      icon: Mic,
      title: "Dictée vocale",
      description: "Dictez plusieurs produits d'un coup",
      badge: "IA",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold">Ajouter du stock</h3>
        <p className="text-sm text-muted-foreground">Choisissez votre mode de saisie</p>
      </div>

      <div className="grid gap-3">
        {modes.map((mode) => (
          <Card
            key={mode.id}
            className="p-4 cursor-pointer hover:border-primary transition-colors"
            onClick={() => onSelectMode(mode.id)}
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <mode.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{mode.title}</h4>
                  {mode.badge && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                      {mode.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{mode.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
