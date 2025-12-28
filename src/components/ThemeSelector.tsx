import { Check, Palette } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useThemeStyle, ThemeStyle } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const themes: { id: ThemeStyle; name: string; description: string; colors: string[] }[] = [
  {
    id: "default",
    name: "Classique",
    description: "Vert émeraude professionnel",
    colors: ["bg-emerald-700", "bg-emerald-500", "bg-orange-500"],
  },
  {
    id: "modern",
    name: "Moderne",
    description: "Violet et bleu contemporain",
    colors: ["bg-violet-500", "bg-purple-500", "bg-coral-500"],
  },
];

export function ThemeSelector() {
  const { themeStyle, setThemeStyle } = useThemeStyle();

  return (
    <div className="space-y-3">
      {themes.map((theme) => (
        <Card
          key={theme.id}
          className={cn(
            "cursor-pointer transition-all duration-200 hover:shadow-md",
            themeStyle === theme.id && "ring-2 ring-primary"
          )}
          onClick={() => setThemeStyle(theme.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Color preview */}
              <div className="flex -space-x-2">
                {theme.colors.map((color, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 border-card",
                      color,
                      theme.id === "default" && idx === 0 && "bg-emerald-700",
                      theme.id === "default" && idx === 1 && "bg-emerald-500",
                      theme.id === "default" && idx === 2 && "bg-orange-500",
                      theme.id === "modern" && idx === 0 && "bg-violet-500",
                      theme.id === "modern" && idx === 1 && "bg-purple-400",
                      theme.id === "modern" && idx === 2 && "bg-orange-400"
                    )}
                  />
                ))}
              </div>
              
              {/* Theme info */}
              <div className="flex-1">
                <p className="font-semibold text-foreground">{theme.name}</p>
                <p className="text-sm text-muted-foreground">{theme.description}</p>
              </div>
              
              {/* Check mark */}
              {themeStyle === theme.id && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
