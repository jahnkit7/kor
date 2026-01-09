import { AdminLayout } from "@/components/admin/AdminLayout";
import { BentoCard, BentoCardHeader, BentoCardValue } from "@/components/admin/BentoCard";
import { BentoGrid } from "@/components/admin/BentoGrid";
import { useAdminStats, useAdminLogs } from "@/hooks/use-admin-stats";
import { useCommissionStats } from "@/hooks/use-admin-commissions";
import { 
  Users, 
  TrendingUp, 
  Globe, 
  QrCode, 
  MessageSquare,
  Activity,
  CreditCard,
  Percent,
  ArrowUpRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: logs, isLoading: logsLoading } = useAdminLogs();
  const { data: commissionStats } = useCommissionStats();
  const navigate = useNavigate();

  const formatCFA = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " F";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Vue d'ensemble de DÉKON</p>
          </div>
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-medium">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Système opérationnel
          </div>
        </div>

        {/* Main Bento Grid */}
        {statsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-3xl" />
            ))}
          </div>
        ) : (
          <BentoGrid columns={4}>
            {/* Revenue - Large Card */}
            <BentoCard size="2x1" gradient glow>
              <div className="h-full flex flex-col justify-between">
                <BentoCardHeader
                  icon={<TrendingUp className="w-5 h-5" />}
                  title="Revenus Totaux"
                  subtitle="Cumul des ventes"
                  action={
                    <div className="flex items-center gap-1 text-xs text-success">
                      <ArrowUpRight className="w-3 h-3" />
                      +{formatCFA(stats?.todayRevenue || 0)} auj.
                    </div>
                  }
                />
                <BentoCardValue
                  value={formatCFA(stats?.totalRevenue || 0)}
                  size="xl"
                  trend={stats?.todayRevenue && stats.todayRevenue > 0 ? "up" : "neutral"}
                />
              </div>
            </BentoCard>

            {/* Users */}
            <BentoCard onClick={() => navigate("/admin/users")}>
              <BentoCardHeader
                icon={<Users className="w-5 h-5" />}
                title="Utilisateurs"
              />
              <BentoCardValue
                value={stats?.totalUsers || 0}
                label={`+${stats?.todayUsers || 0} aujourd'hui`}
                trend={stats?.todayUsers && stats.todayUsers > 0 ? "up" : "neutral"}
                trendValue={`+${stats?.todayUsers || 0}`}
              />
            </BentoCard>

            {/* Tickets */}
            <BentoCard onClick={() => navigate("/admin/support")}>
              <BentoCardHeader
                icon={<MessageSquare className="w-5 h-5" />}
                title="Tickets"
              />
              <BentoCardValue
                value={stats?.openTickets || 0}
                label="tickets ouverts"
                trend={stats?.openTickets && stats.openTickets > 5 ? "down" : "neutral"}
              />
            </BentoCard>

            {/* Countries */}
            <BentoCard onClick={() => navigate("/admin/geography")}>
              <BentoCardHeader
                icon={<Globe className="w-5 h-5" />}
                title="Géographie"
              />
              <BentoCardValue
                value={`${stats?.activeCountries || 0}/${stats?.totalCountries || 0}`}
                label="pays actifs"
              />
            </BentoCard>

            {/* Subscriptions */}
            <BentoCard onClick={() => navigate("/admin/subscriptions")}>
              <BentoCardHeader
                icon={<CreditCard className="w-5 h-5" />}
                title="Abonnements"
              />
              <BentoCardValue
                value={stats?.activePlans || 0}
                label="plans actifs"
              />
            </BentoCard>

            {/* Codes */}
            <BentoCard onClick={() => navigate("/admin/codes")}>
              <BentoCardHeader
                icon={<QrCode className="w-5 h-5" />}
                title="Codes Prépayés"
              />
              <BentoCardValue
                value={`${stats?.usedCodes || 0}/${stats?.totalCodes || 0}`}
                label="codes utilisés"
              />
            </BentoCard>

            {/* Commissions - New */}
            <BentoCard size="2x1" onClick={() => navigate("/admin/commissions")}>
              <div className="h-full flex flex-col justify-between">
                <BentoCardHeader
                  icon={<Percent className="w-5 h-5" />}
                  title="Commissions"
                  subtitle="Performance du mois"
                />
                <div className="flex items-end justify-between">
                  <BentoCardValue
                    value={formatCFA(commissionStats?.totalAmount || 0)}
                    label="total cumulé"
                    size="lg"
                  />
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {formatCFA(commissionStats?.todayAmount || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">aujourd'hui</p>
                  </div>
                </div>
              </div>
            </BentoCard>
          </BentoGrid>
        )}

        {/* Recent Activity */}
        <BentoCard size="2x2" className="col-span-full">
          <BentoCardHeader
            icon={<Activity className="w-5 h-5" />}
            title="Activité récente"
            subtitle="Dernières actions dans le système"
          />
          <div className="mt-4">
            {logsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : logs && logs.length > 0 ? (
              <div className="space-y-2">
                {logs.slice(0, 8).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs font-medium">
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
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mb-4 opacity-30" />
                <p>Aucune activité récente</p>
              </div>
            )}
          </div>
        </BentoCard>
      </div>
    </AdminLayout>
  );
}
