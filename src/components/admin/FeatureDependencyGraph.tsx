import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  ShoppingCart, 
  Package, 
  Users, 
  CreditCard, 
  BarChart3, 
  Globe, 
  Mic, 
  Brain, 
  UserCog,
  ToggleLeft,
  Bell,
  Gift,
  Wallet,
  FileText,
  DollarSign,
  Wifi
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FeatureFlag {
  id: string;
  feature_key: string;
  name: string;
  description: string | null;
  is_globally_enabled: boolean;
  min_plan_required: string | null;
  depends_on: string[] | null;
}

interface Props {
  features: FeatureFlag[];
  onToggle: (feature: FeatureFlag) => void;
  togglingFeatures: Set<string>;
}

const featureIcons: Record<string, React.ReactNode> = {
  sales: <ShoppingCart className="w-4 h-4" />,
  stock: <Package className="w-4 h-4" />,
  clients: <Users className="w-4 h-4" />,
  debts: <CreditCard className="w-4 h-4" />,
  reports: <BarChart3 className="w-4 h-4" />,
  network: <Globe className="w-4 h-4" />,
  voice_input: <Mic className="w-4 h-4" />,
  ai_analysis: <Brain className="w-4 h-4" />,
  employees: <UserCog className="w-4 h-4" />,
  alerts: <Bell className="w-4 h-4" />,
  referrals: <Gift className="w-4 h-4" />,
  commission_payment: <Wallet className="w-4 h-4" />,
  invoices: <FileText className="w-4 h-4" />,
  multi_currency: <DollarSign className="w-4 h-4" />,
  offline_mode: <Wifi className="w-4 h-4" />,
};

const planColors: Record<string, string> = {
  starter: "border-amber-500 bg-amber-500/10",
  premium: "border-violet-500 bg-violet-500/10",
};

export function FeatureDependencyGraph({ features, onToggle, togglingFeatures }: Props) {
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

  const getFeatureByKey = (key: string) => features.find(f => f.feature_key === key);

  // Organize features by dependency level
  const { levels, connections } = useMemo(() => {
    const featureMap = new Map(features.map(f => [f.feature_key, f]));
    const visited = new Set<string>();
    const levels: FeatureFlag[][] = [];
    const connections: { from: string; to: string }[] = [];

    // Build connections
    features.forEach(f => {
      if (f.depends_on) {
        f.depends_on.forEach(dep => {
          connections.push({ from: dep, to: f.feature_key });
        });
      }
    });

    // Find root features (no dependencies)
    const roots = features.filter(f => !f.depends_on || f.depends_on.length === 0);
    levels.push(roots);
    roots.forEach(f => visited.add(f.feature_key));

    // Build subsequent levels
    let currentLevel = roots;
    while (currentLevel.length > 0) {
      const nextLevel: FeatureFlag[] = [];
      features.forEach(f => {
        if (!visited.has(f.feature_key) && f.depends_on) {
          const allDepsVisited = f.depends_on.every(dep => visited.has(dep));
          if (allDepsVisited) {
            nextLevel.push(f);
          }
        }
      });
      if (nextLevel.length > 0) {
        levels.push(nextLevel);
        nextLevel.forEach(f => visited.add(f.feature_key));
      }
      currentLevel = nextLevel;
    }

    return { levels, connections };
  }, [features]);

  // Get related features for highlighting
  const getRelatedFeatures = (featureKey: string): Set<string> => {
    const related = new Set<string>();
    const feature = getFeatureByKey(featureKey);
    if (!feature) return related;

    // Add parent dependencies
    feature.depends_on?.forEach(dep => related.add(dep));

    // Add children (features that depend on this one)
    features.forEach(f => {
      if (f.depends_on?.includes(featureKey)) {
        related.add(f.feature_key);
      }
    });

    return related;
  };

  const relatedFeatures = hoveredFeature ? getRelatedFeatures(hoveredFeature) : new Set<string>();

  return (
    <TooltipProvider>
      <div className="relative p-8 bg-muted/30 rounded-2xl min-h-[500px] overflow-x-auto">
        {/* SVG for connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="hsl(var(--primary))"
                opacity="0.5"
              />
            </marker>
          </defs>
          {connections.map((conn, i) => {
            const isHighlighted = 
              hoveredFeature === conn.from || 
              hoveredFeature === conn.to;
            
            return (
              <line
                key={i}
                id={`conn-${conn.from}-${conn.to}`}
                className={`transition-all duration-300 ${
                  isHighlighted 
                    ? "stroke-primary opacity-80" 
                    : "stroke-muted-foreground/30"
                }`}
                strokeWidth={isHighlighted ? 2 : 1}
                strokeDasharray={isHighlighted ? "none" : "4 2"}
                markerEnd={isHighlighted ? "url(#arrowhead)" : ""}
              />
            );
          })}
        </svg>

        {/* Feature nodes by level */}
        <div className="relative flex flex-col gap-12" style={{ zIndex: 1 }}>
          {levels.map((level, levelIndex) => (
            <div key={levelIndex} className="flex justify-center gap-6 flex-wrap">
              {level.map((feature) => {
                const isToggling = togglingFeatures.has(feature.id);
                const isHovered = hoveredFeature === feature.feature_key;
                const isRelated = relatedFeatures.has(feature.feature_key);

                return (
                  <Tooltip key={feature.id}>
                    <TooltipTrigger asChild>
                      <div
                        data-feature={feature.feature_key}
                        className={`
                          relative p-4 rounded-xl border-2 bg-card shadow-sm
                          transition-all duration-300 cursor-pointer
                          min-w-[140px] max-w-[160px]
                          ${feature.is_globally_enabled 
                            ? planColors[feature.min_plan_required || ""] || "border-primary/50 bg-primary/5" 
                            : "border-muted bg-muted/50 opacity-50 grayscale"
                          }
                          ${isHovered ? "scale-110 shadow-lg z-10" : ""}
                          ${isRelated && !isHovered ? "ring-2 ring-primary/40" : ""}
                          ${isToggling ? "animate-pulse" : ""}
                        `}
                        onMouseEnter={() => setHoveredFeature(feature.feature_key)}
                        onMouseLeave={() => setHoveredFeature(null)}
                      >
                        {/* Icon & Name */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-1.5 rounded-lg ${
                            feature.is_globally_enabled 
                              ? "bg-primary/10 text-primary" 
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {featureIcons[feature.feature_key] || <ToggleLeft className="w-4 h-4" />}
                          </div>
                          <span className="font-medium text-sm truncate">{feature.name}</span>
                        </div>

                        {/* Toggle */}
                        <div className="flex items-center justify-between mt-3">
                          <Badge 
                            variant="outline" 
                            className="text-[10px] px-1.5"
                          >
                            {feature.min_plan_required || "Gratuit"}
                          </Badge>
                          <Switch
                            checked={feature.is_globally_enabled}
                            onCheckedChange={() => onToggle(feature)}
                            disabled={isToggling}
                            className="scale-75"
                          />
                        </div>

                        {/* Dependency indicator */}
                        {feature.depends_on && feature.depends_on.length > 0 && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px]">
                      <p className="font-medium">{feature.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {feature.description}
                      </p>
                      {feature.depends_on && feature.depends_on.length > 0 && (
                        <p className="text-xs mt-2 text-amber-600">
                          Dépend de: {feature.depends_on.map(k => getFeatureByKey(k)?.name).join(", ")}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 border-primary/50 bg-primary/5" />
            <span>Gratuit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 border-amber-500 bg-amber-500/10" />
            <span>Starter</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 border-violet-500 bg-violet-500/10" />
            <span>Premium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border-2 border-muted bg-muted/50 opacity-50" />
            <span>Désactivé</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
