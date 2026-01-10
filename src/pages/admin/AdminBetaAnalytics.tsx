import { AdminLayout } from "@/components/admin/AdminLayout";
import { BentoGrid } from "@/components/admin/BentoGrid";
import { BentoCard } from "@/components/admin/BentoCard";
import { useFeatureAnalytics } from "@/hooks/use-feature-analytics";
import { useAdminFeatureFlags } from "@/hooks/use-admin-stats";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FlaskConical, 
  Users, 
  TrendingUp, 
  Activity,
  Clock,
  UserCheck,
  BarChart3,
  Sparkles,
  AlertTriangle
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

const chartColors = [
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#f97316", // orange
];

export default function AdminBetaAnalytics() {
  const { data: analytics, isLoading } = useFeatureAnalytics();
  const { data: features } = useAdminFeatureFlags();

  const betaFeatures = features?.filter(f => f.is_beta) || [];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <BentoGrid columns={4}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </BentoGrid>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </AdminLayout>
    );
  }

  const maxBetaUsage = analytics?.betaFeatureStats?.[0]?.total_uses || 1;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Analytics Bêta
            </h1>
            <p className="text-muted-foreground">
              Suivi de l'utilisation des fonctionnalités en phase Bêta
            </p>
          </div>
        </div>

        {/* Info Banner */}
        {analytics?.totalBetaFeatures === 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <div>
                <p className="font-medium text-foreground">Aucune fonctionnalité Bêta active</p>
                <p className="text-sm text-muted-foreground">
                  Marquez des fonctionnalités comme Bêta dans la page Fonctionnalités pour voir les analytics.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <BentoGrid columns={4}>
          <BentoCard>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                <FlaskConical className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics?.totalBetaFeatures || 0}</p>
                <p className="text-sm text-muted-foreground">Features Bêta</p>
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Activity className="w-6 h-6 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics?.totalBetaUsage || 0}</p>
                <p className="text-sm text-muted-foreground">Interactions Bêta</p>
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics?.totalBetaUniqueUsers || 0}</p>
                <p className="text-sm text-muted-foreground">Beta Testeurs</p>
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-pink-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {analytics?.betaFeatureStats?.[0]?.daily_average?.toFixed(1) || "0"}
                </p>
                <p className="text-sm text-muted-foreground">Moy. quotidienne top</p>
              </div>
            </div>
          </BentoCard>
        </BentoGrid>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Beta Daily Usage Chart */}
          <BentoCard className="col-span-1">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-500" />
              Utilisation Bêta quotidienne (30 jours)
            </h3>
            {analytics?.betaDailyUsage && analytics.betaDailyUsage.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.betaDailyUsage}>
                    <defs>
                      <linearGradient id="colorBeta" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
                      stroke="#f59e0b"
                      fillOpacity={1}
                      fill="url(#colorBeta)"
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

          {/* Beta Feature Popularity Bar Chart */}
          <BentoCard className="col-span-1">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Popularité des features Bêta
            </h3>
            {analytics?.betaFeatureStats && analytics.betaFeatureStats.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.betaFeatureStats.slice(0, 5)} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis 
                      type="category" 
                      dataKey="feature_name" 
                      tick={{ fontSize: 10 }}
                      width={100}
                    />
                    <Tooltip 
                      formatter={(value) => [value, "Utilisations"]}
                    />
                    <Bar dataKey="total_uses" radius={[0, 4, 4, 0]}>
                      {analytics.betaFeatureStats.slice(0, 5).map((_, index) => (
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

        {/* Beta Features Details */}
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-amber-500" />
            Détails par fonctionnalité Bêta
          </h3>
          
          {analytics?.betaFeatureStats && analytics.betaFeatureStats.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {analytics.betaFeatureStats.map((stat, index) => (
                <Card key={stat.feature_key} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{stat.feature_name}</CardTitle>
                        <Badge variant="beta" className="text-xs">Bêta</Badge>
                      </div>
                      <Badge variant="secondary">#{index + 1}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-foreground">{stat.total_uses}</p>
                        <p className="text-xs text-muted-foreground">Utilisations</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{stat.unique_users}</p>
                        <p className="text-xs text-muted-foreground">Testeurs</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{stat.daily_average}</p>
                        <p className="text-xs text-muted-foreground">Moy/jour</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Adoption relative</span>
                        <span>{Math.round((stat.total_uses / maxBetaUsage) * 100)}%</span>
                      </div>
                      <Progress 
                        value={(stat.total_uses / maxBetaUsage) * 100} 
                        className="h-2"
                      />
                    </div>

                    {/* Last Used */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Dernière utilisation: {formatDistanceToNow(parseISO(stat.last_used), { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </div>

                    {/* Top Users */}
                    {stat.user_list.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Top testeurs
                        </p>
                        <div className="space-y-1">
                          {stat.user_list.slice(0, 3).map((user, userIndex) => (
                            <div 
                              key={user.user_id} 
                              className="flex items-center justify-between text-xs bg-secondary/50 rounded px-2 py-1"
                            >
                              <span className="truncate">
                                {userIndex + 1}. {user.shop_name || "Utilisateur"}
                              </span>
                              <span className="font-medium">{user.usage_count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <BentoCard className="text-center py-12">
              <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Aucune donnée d'utilisation pour les fonctionnalités Bêta
              </p>
              <p className="text-sm text-muted-foreground/70 mt-2">
                Les données apparaîtront quand les utilisateurs commenceront à tester les features Bêta
              </p>
            </BentoCard>
          )}
        </div>

        {/* Current Beta Features List */}
        {betaFeatures.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" />
              Features actuellement en Bêta ({betaFeatures.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {betaFeatures.map((feature) => (
                <Badge 
                  key={feature.id} 
                  variant="beta" 
                  className="text-sm py-1.5 px-3"
                >
                  {feature.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
