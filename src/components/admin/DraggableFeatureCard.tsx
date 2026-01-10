import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BentoCard } from "@/components/admin/BentoCard";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  ToggleLeft, 
  ShoppingCart, 
  Package, 
  Users, 
  CreditCard, 
  BarChart3, 
  Globe, 
  Mic, 
  Brain, 
  UserCog,
  Link,
  AlertTriangle,
  GripVertical,
  FileText,
  Wallet,
  WifiOff,
  Bell,
  CircleDollarSign,
  FlaskConical
} from "lucide-react";

interface FeatureFlag {
  id: string;
  feature_key: string;
  name: string;
  description: string | null;
  is_globally_enabled: boolean;
  is_beta: boolean;
  min_plan_required: string | null;
  depends_on: string[] | null;
  enabled_for_users: string[] | null;
  disabled_countries: string[] | null;
  category?: string | null;
  sort_order?: number | null;
}

const featureIcons: Record<string, React.ReactNode> = {
  sales: <ShoppingCart className="w-5 h-5" />,
  stock: <Package className="w-5 h-5" />,
  clients: <Users className="w-5 h-5" />,
  debts: <CreditCard className="w-5 h-5" />,
  reports: <BarChart3 className="w-5 h-5" />,
  network: <Globe className="w-5 h-5" />,
  voice_input: <Mic className="w-5 h-5" />,
  ai_analysis: <Brain className="w-5 h-5" />,
  employees: <UserCog className="w-5 h-5" />,
  invoices: <FileText className="w-5 h-5" />,
  multi_currency: <Wallet className="w-5 h-5" />,
  offline_mode: <WifiOff className="w-5 h-5" />,
  alerts: <Bell className="w-5 h-5" />,
  referrals: <Users className="w-5 h-5" />,
  commission_payment: <CircleDollarSign className="w-5 h-5" />,
};

const planColors: Record<string, string> = {
  starter: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  premium: "bg-violet-500/10 text-violet-600 border-violet-500/20",
};

interface DraggableFeatureCardProps {
  feature: FeatureFlag;
  dependentsCount: number;
  dependenciesNames: (string | undefined)[];
  isToggling: boolean;
  onToggle: () => void;
  onToggleBeta?: () => void;
  isBetaToggling?: boolean;
}

export function DraggableFeatureCard({
  feature,
  dependentsCount,
  dependenciesNames,
  isToggling,
  onToggle,
  onToggleBeta,
  isBetaToggling,
}: DraggableFeatureCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: feature.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <BentoCard 
        className={`transition-all duration-300 ${
          !feature.is_globally_enabled ? "opacity-50 grayscale" : ""
        } ${isToggling ? "animate-pulse" : ""} ${isDragging ? "shadow-2xl ring-2 ring-primary" : ""}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {/* Drag Handle */}
              <div 
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                feature.is_globally_enabled 
                  ? "bg-primary/10 text-primary" 
                  : "bg-muted text-muted-foreground"
              }`}>
                {featureIcons[feature.feature_key] || <ToggleLeft className="w-5 h-5" />}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Beta Toggle */}
              {onToggleBeta && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleBeta();
                  }}
                  disabled={isBetaToggling}
                  className={`p-1.5 rounded-lg transition-colors ${
                    feature.is_beta 
                      ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600" 
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  } ${isBetaToggling ? "opacity-50 cursor-not-allowed" : ""}`}
                  title={feature.is_beta ? "Retirer le mode Bêta" : "Marquer comme Bêta"}
                >
                  <FlaskConical className="w-4 h-4" />
                </button>
              )}
              <Switch
                checked={feature.is_globally_enabled}
                onCheckedChange={onToggle}
                disabled={isToggling}
              />
            </div>
          </div>

          {/* Title & Description */}
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{feature.name}</h3>
            {feature.is_beta && (
              <Badge variant="beta" className="text-[10px] px-1.5 py-0">
                Bêta
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex-1 line-clamp-2">
            {feature.description}
          </p>

          {/* Dependencies */}
          {dependenciesNames && dependenciesNames.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Link className="w-3 h-3 shrink-0" />
              <span className="truncate">Dépend de: {dependenciesNames.filter(Boolean).join(", ")}</span>
            </div>
          )}

          {/* Dependents Warning */}
          {dependentsCount > 0 && feature.is_globally_enabled && (
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-600">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              <span>
                {dependentsCount} feature{dependentsCount > 1 ? "s" : ""} dépendante{dependentsCount > 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Badges */}
          <div className="mt-3 flex flex-wrap gap-2">
            {feature.min_plan_required && (
              <Badge 
                variant="outline" 
                className={planColors[feature.min_plan_required] || ""}
              >
                Min: {feature.min_plan_required}
              </Badge>
            )}
            {!feature.min_plan_required && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                Gratuit
              </Badge>
            )}
            {feature.enabled_for_users && feature.enabled_for_users.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{feature.enabled_for_users.length} users
              </Badge>
            )}
            {feature.disabled_countries && feature.disabled_countries.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                -{feature.disabled_countries.length} pays
              </Badge>
            )}
          </div>
        </div>
      </BentoCard>
    </div>
  );
}
