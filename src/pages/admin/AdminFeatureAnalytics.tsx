import { AdminLayout } from "@/components/admin/AdminLayout";
import { BentoGrid } from "@/components/admin/BentoGrid";
import { BentoCard } from "@/components/admin/BentoCard";
import { useFeatureAnalytics } from "@/hooks/use-feature-analytics";
import { useAdminFeatureFlags } from "@/hooks/use-admin-stats";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Activity,
  Trophy,
  Clock,
  Package,
  ShoppingCart,
  CreditCard,
  Globe,
  Mic,
  Brain,
  UserCog
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

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
};

const chartColors = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

export default function AdminFeatureAnalytics() {
  const { data: analytics, isLoading } = useFeatureAnalytics();
  const { data: features } = useAdminFeatureFlags();

  const getFeatureName = (key: string) => {
    const feature = features?.find((f) => f.feature_key === key);
    return feature?.name || key;
  };

  const maxUsage = analytics?.featureStats?.[0]?.total_uses || 1;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <BentoGrid columns={4}>
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </BentoGrid>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Analytics des Fonctionnalités
          </h1>
          <p className="text-muted-foreground">
            Statistiques d'utilisation des features par les utilisateurs
          </p>
        </div>

        {/* Summary Cards */}
        <BentoGrid columns={4}>
          <BentoCard>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics?.totalUsage || 0}</p>
                <p className="text-sm text-muted-foreground">Total interactions</p>
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics?.totalUniqueUsers || 0}</p>
                <p className="text-sm text-muted-foreground">Utilisateurs actifs</p>
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {analytics?.featureStats?.length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Features utilisées</p>
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {analytics?.featureStats?.[0]
                    ? getFeatureName(analytics.featureStats[0].feature_key)
                    : "-"}
                </p>
                <p className="text-sm text-muted-foreground">Feature #1</p>
              </div>
            </div>
          </BentoCard>
        </BentoGrid>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Usage Chart */}
          <BentoCard className="col-span-1">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Utilisation quotidienne (30 jours)
            </h3>
            {analytics?.dailyUsage && analytics.dailyUsage.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.dailyUsage}>
                    <defs>
                      <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => format(parseISO(date), "dd/MM")}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip 
                      labelFormatter={(date) => format(parseISO(date as string), "dd MMMM yyyy", { locale: fr })}
                      formatter={(value) => [value, "Utilisations"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorUsage)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Pas encore de données
              </div>
            )}
          </BentoCard>

          {/* Feature Usage Bar Chart */}
          <BentoCard className="col-span-1">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Popularité des features
            </h3>
            {analytics?.featureStats && analytics.featureStats.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.featureStats.slice(0, 6)} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis 
                      type="category" 
                      dataKey="feature_key" 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(key) => getFeatureName(key)}
                      width={80}
                    />
                    <Tooltip 
                      formatter={(value) => [value, "Utilisations"]}
                      labelFormatter={(key) => getFeatureName(key as string)}
                    />
                    <Bar dataKey="total_uses" radius={[0, 4, 4, 0]}>
                      {analytics.featureStats.slice(0, 6).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                Pas encore de données
              </div>
            )}
          </BentoCard>
        </div>

        {/* Feature Details & Top Users */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feature Details */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Détails par fonctionnalité
            </h3>
            {analytics?.featureStats?.map((stat, index) => (
              <BentoCard key={stat.feature_key} className="!p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {featureIcons[stat.feature_key] || <Activity className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium truncate">
                        {getFeatureName(stat.feature_key)}
                      </span>
                      <Badge variant="secondary" className="ml-2">
                        #{index + 1}
                      </Badge>
                    </div>
                    <Progress 
                      value={(stat.total_uses / maxUsage) * 100} 
                      className="h-2"
                    />
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>{stat.total_uses} utilisations • {stat.unique_users} users</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(parseISO(stat.last_used), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </BentoCard>
            ))}
            {(!analytics?.featureStats || analytics.featureStats.length === 0) && (
              <BentoCard className="!p-8 text-center text-muted-foreground">
                Aucune donnée d'utilisation disponible
              </BentoCard>
            )}
          </div>

          {/* Top Users */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Top utilisateurs
            </h3>
            {analytics?.topUsers?.map((user, index) => (
              <BentoCard key={user.user_id} className="!p-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? "bg-amber-500/20 text-amber-600" :
                    index === 1 ? "bg-slate-400/20 text-slate-600" :
                    index === 2 ? "bg-amber-700/20 text-amber-700" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {user.shop_name || "Utilisateur"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.usage_count} interactions
                    </p>
                  </div>
                </div>
              </BentoCard>
            ))}
            {(!analytics?.topUsers || analytics.topUsers.length === 0) && (
              <BentoCard className="!p-6 text-center text-muted-foreground text-sm">
                Pas encore d'utilisateurs
              </BentoCard>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
