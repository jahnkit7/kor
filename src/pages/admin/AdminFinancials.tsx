import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  useFinancialStats, 
  useDailyRevenue, 
  useMonthlyRevenue, 
  usePromoCodeAnalytics,
  useConversionStats,
  usePlanDistribution
} from "@/hooks/use-financial-stats";
import { useAdminReferralStats } from "@/hooks/use-referrals";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Percent, 
  CreditCard,
  Gift,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#10b981", "#f59e0b"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value) + " FCFA";
}

function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  trendValue 
}: { 
  title: string; 
  value: string; 
  description?: string; 
  icon: typeof DollarSign;
  trend?: "up" | "down";
  trendValue?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trendValue) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {trend && (
              trend === "up" ? (
                <ArrowUpRight className="h-3 w-3 text-green-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500" />
              )
            )}
            {trendValue && <span className={trend === "up" ? "text-green-500" : "text-red-500"}>{trendValue}</span>}
            {description && <span>{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminFinancials() {
  const { data: financialStats, isLoading: statsLoading } = useFinancialStats();
  const { data: dailyRevenue } = useDailyRevenue(30);
  const { data: monthlyRevenue } = useMonthlyRevenue(12);
  const { data: promoAnalytics } = usePromoCodeAnalytics();
  const { data: conversionStats } = useConversionStats();
  const { data: planDistribution } = usePlanDistribution();
  const { data: referralStats } = useAdminReferralStats();

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tableau de Bord Financier</h1>
        <p className="text-muted-foreground">Vue d'ensemble des revenus, conversions et analyses</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Revenu Total"
          value={formatCurrency(financialStats?.totalRevenue || 0)}
          description="Tous les temps"
          icon={DollarSign}
        />
        <StatCard
          title="Revenu ce mois"
          value={formatCurrency(financialStats?.thisMonthRevenue || 0)}
          description={`${financialStats?.thisMonthTransactions || 0} transactions`}
          icon={TrendingUp}
          trend="up"
        />
        <StatCard
          title="Taux de conversion"
          value={`${conversionStats?.conversionRate || 0}%`}
          description={`${conversionStats?.paidUsers || 0} utilisateurs payants`}
          icon={Users}
        />
        <StatCard
          title="Réductions accordées"
          value={formatCurrency(financialStats?.totalDiscount || 0)}
          description="Via codes promo"
          icon={Percent}
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenus</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
          <TabsTrigger value="promo">Codes Promo</TabsTrigger>
          <TabsTrigger value="referrals">Parrainages</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Daily Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenus Quotidiens</CardTitle>
                <CardDescription>30 derniers jours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyRevenue || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        className="text-xs" 
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(value) => `${value / 1000}k`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), "Revenu"]}
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary) / 0.2)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenus Mensuels</CardTitle>
                <CardDescription>12 derniers mois</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyRevenue || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="month" 
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis 
                        className="text-xs"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(value) => `${value / 1000}k`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), "Revenu"]}
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Statistiques des Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{financialStats?.totalTransactions || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{formatCurrency(financialStats?.avgTransactionValue || 0)}</p>
                  <p className="text-sm text-muted-foreground">Valeur Moyenne</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">{financialStats?.thisMonthTransactions || 0}</p>
                  <p className="text-sm text-muted-foreground">Ce mois-ci</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversions" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>Entonnoir de Conversion</CardTitle>
                <CardDescription>Inscriptions vers abonnements payants</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                      <span className="font-medium">Inscriptions totales</span>
                      <span className="text-2xl font-bold">{conversionStats?.totalSignups || 0}</span>
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 h-4 w-0.5 bg-border" />
                  </div>
                  <div className="relative">
                    <div className="flex items-center justify-between p-4 bg-yellow-500/10 rounded-lg">
                      <span className="font-medium">En essai gratuit</span>
                      <span className="text-2xl font-bold">{conversionStats?.trialUsers || 0}</span>
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 h-4 w-0.5 bg-border" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg">
                      <span className="font-medium">Abonnés payants</span>
                      <span className="text-2xl font-bold">{conversionStats?.paidUsers || 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plan Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribution des Plans</CardTitle>
                <CardDescription>Répartition des abonnements actifs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planDistribution || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {(planDistribution || []).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="promo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance des Codes Promo</CardTitle>
              <CardDescription>Utilisation et impact sur les revenus</CardDescription>
            </CardHeader>
            <CardContent>
              {promoAnalytics && promoAnalytics.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">{promoAnalytics.length}</p>
                      <p className="text-sm text-muted-foreground">Codes utilisés</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">
                        {promoAnalytics.reduce((sum, p) => sum + p.usageCount, 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Utilisations totales</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">
                        {formatCurrency(promoAnalytics.reduce((sum, p) => sum + p.totalDiscount, 0))}
                      </p>
                      <p className="text-sm text-muted-foreground">Réductions totales</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2">Code</th>
                          <th className="text-right py-3 px-2">Utilisations</th>
                          <th className="text-right py-3 px-2">Réductions</th>
                          <th className="text-right py-3 px-2">Revenus Générés</th>
                        </tr>
                      </thead>
                      <tbody>
                        {promoAnalytics.map((promo) => (
                          <tr key={promo.code} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-2 font-mono font-medium">{promo.code}</td>
                            <td className="py-3 px-2 text-right">{promo.usageCount}</td>
                            <td className="py-3 px-2 text-right text-red-500">
                              -{formatCurrency(promo.totalDiscount)}
                            </td>
                            <td className="py-3 px-2 text-right text-green-500">
                              {formatCurrency(promo.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Percent className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun code promo utilisé pour le moment</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Parrainages"
              value={String(referralStats?.total || 0)}
              description="Invitations créées"
              icon={Gift}
            />
            <StatCard
              title="Ce mois-ci"
              value={String(referralStats?.thisMonth || 0)}
              icon={TrendingUp}
              trend="up"
            />
            <StatCard
              title="Taux de conversion"
              value={`${referralStats?.conversionRate || 0}%`}
              description={`${referralStats?.converted || 0} convertis`}
              icon={Users}
            />
            <StatCard
              title="En attente"
              value={String(referralStats?.pending || 0)}
              description="Non convertis"
              icon={Gift}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Analyse des Parrainages</CardTitle>
              <CardDescription>Impact sur l'acquisition d'utilisateurs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                  <Gift className="h-10 w-10 mb-4 text-primary" />
                  <p className="text-3xl font-bold mb-1">{referralStats?.converted || 0}</p>
                  <p className="text-sm text-muted-foreground">Parrainages Convertis</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Nouveaux utilisateurs acquis via parrainage
                  </p>
                </div>
                <div className="p-6 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg">
                  <Percent className="h-10 w-10 mb-4 text-green-500" />
                  <p className="text-3xl font-bold mb-1">{referralStats?.totalRewardsGiven || 0}%</p>
                  <p className="text-sm text-muted-foreground">Récompenses Données</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Total des réductions accordées aux parrains
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </AdminLayout>
  );
}
