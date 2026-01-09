import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatCard } from "@/components/admin/StatCard";
import { useAdminStats, useAdminLogs } from "@/hooks/use-admin-stats";
import { 
  Users, 
  TrendingUp, 
  Globe, 
  QrCode, 
  ToggleLeft, 
  MessageSquare,
  Activity,
  CreditCard
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: logs, isLoading: logsLoading } = useAdminLogs();
  const navigate = useNavigate();

  const formatCFA = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " F";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Vue d'ensemble de DÉKON</p>
        </div>

        {/* Main Stats - Bento Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </>
          ) : (
            <>
              <StatCard
                title="Utilisateurs"
                value={stats?.totalUsers || 0}
                subtitle={`+${stats?.todayUsers || 0} aujourd'hui`}
                icon={<Users className="w-5 h-5" />}
                trend={stats?.todayUsers && stats.todayUsers > 0 ? "up" : "neutral"}
                trendValue={stats?.todayUsers ? `+${stats.todayUsers}` : "0"}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate("/admin/users")}
              />
              <StatCard
                title="Revenus (ventes)"
                value={formatCFA(stats?.totalRevenue || 0)}
                subtitle={`+${formatCFA(stats?.todayRevenue || 0)} auj.`}
                icon={<TrendingUp className="w-5 h-5" />}
                trend={stats?.todayRevenue && stats.todayRevenue > 0 ? "up" : "neutral"}
              />
              <StatCard
                title="Pays actifs"
                value={`${stats?.activeCountries || 0}/${stats?.totalCountries || 0}`}
                icon={<Globe className="w-5 h-5" />}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate("/admin/geography")}
              />
              <StatCard
                title="Tickets ouverts"
                value={stats?.openTickets || 0}
                icon={<MessageSquare className="w-5 h-5" />}
                trend={stats?.openTickets && stats.openTickets > 5 ? "down" : "neutral"}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate("/admin/support")}
              />
            </>
          )}
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {statsLoading ? (
            <>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </>
          ) : (
            <>
              <Card 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate("/admin/codes")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <QrCode className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.usedCodes || 0}/{stats?.totalCodes || 0}</p>
                      <p className="text-sm text-muted-foreground">Codes utilisés</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate("/admin/subscriptions")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.activePlans || 0}</p>
                      <p className="text-sm text-muted-foreground">Plans actifs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => navigate("/admin/features")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ToggleLeft className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats?.totalSales || 0}</p>
                      <p className="text-sm text-muted-foreground">Transactions totales</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : logs && logs.length > 0 ? (
              <div className="space-y-3">
                {logs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {log.action}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {log.target_type && `${log.target_type}`}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Aucune activité récente
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
