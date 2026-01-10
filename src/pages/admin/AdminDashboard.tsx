import { AdminLayout } from "@/components/admin/AdminLayout";
import { BentoCard, BentoCardHeader, BentoCardValue } from "@/components/admin/BentoCard";
import { BentoGrid } from "@/components/admin/BentoGrid";
import { useAdminStats } from "@/hooks/use-admin-stats";
import { useActivityLogs } from "@/hooks/use-activity-logs";
import { useCommissionStats } from "@/hooks/use-admin-commissions";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { 
  Users, 
  TrendingUp, 
  Globe, 
  QrCode, 
  MessageSquare,
  Activity,
  CreditCard,
  Percent,
  ArrowUpRight,
  ShoppingCart,
  UserPlus,
  Receipt
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const getActivityIcon = (actionType: string) => {
  switch (actionType) {
    case "new_sale":
      return <ShoppingCart className="w-4 h-4" />;
    case "user_signup":
      return <UserPlus className="w-4 h-4" />;
    case "new_client":
      return <Users className="w-4 h-4" />;
    case "subscription_change":
      return <CreditCard className="w-4 h-4" />;
    case "new_payment":
      return <Receipt className="w-4 h-4" />;
    default:
      return <Activity className="w-4 h-4" />;
  }
};

const getActivityLabel = (actionType: string) => {
  switch (actionType) {
    case "new_sale":
      return "Nouvelle vente";
    case "user_signup":
      return "Inscription";
    case "new_client":
      return "Nouveau client";
    case "subscription_change":
      return "Abonnement";
    case "new_payment":
      return "Paiement";
    default:
      return actionType;
  }
};

const getActivityDetail = (actionType: string, data: Record<string, unknown>) => {
  switch (actionType) {
    case "new_sale":
      return `${data.amount?.toLocaleString() || 0} CFA (${data.type || "cash"})`;
    case "user_signup":
      return data.shop_name as string || "Nouvelle boutique";
    case "new_client":
      return data.name as string || "Client";
    case "subscription_change":
      return `Plan: ${data.plan || "free_trial"}`;
    case "new_payment":
      return `${data.amount?.toLocaleString() || 0} CFA via ${data.method || ""}`;
    default:
      return "";
  }
};

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: activityLogs, isLoading: logsLoading } = useActivityLogs(10);
  const { data: commissionStats } = useCommissionStats();
  const navigate = useNavigate();

  const formatCFA = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
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
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-medium">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Système opérationnel
            </div>
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
          <>
          {/* Ligne 1: Revenus (40%) - Utilisateurs (30%) - Commissions (30%) */}
          <div className="grid grid-cols-1 md:grid-cols-10 gap-4">
            {/* Revenue - Large Card (40% = 4/10) */}
            <BentoCard size="2x1" gradient glow className="md:col-span-4">
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

            {/* Users (30% = 3/10) */}
            <BentoCard onClick={() => navigate("/admin/users")} className="md:col-span-3">
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

            {/* Commissions (30% = 3/10) */}
            <BentoCard onClick={() => navigate("/admin/commissions")} className="md:col-span-3">
              <BentoCardHeader
                icon={<Percent className="w-5 h-5" />}
                title="Commissions"
              />
              <BentoCardValue
                value={formatCFA(commissionStats?.totalAmount || 0)}
                label={`+${formatCFA(commissionStats?.todayAmount || 0)} auj.`}
                trend={commissionStats?.todayAmount && commissionStats.todayAmount > 0 ? "up" : "neutral"}
              />
            </BentoCard>
          </div>

          {/* Ligne 2: Géographie - Abonnements - Codes Prépayés - Tickets (25% chacun) */}
          <BentoGrid columns={4}>
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
                value={stats?.activeSubscriptions || 0}
                label={`${stats?.activePlans || 0} plans disponibles`}
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
          </BentoGrid>
          </>
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
            ) : activityLogs && activityLogs.length > 0 ? (
              <div className="space-y-2">
                {activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {getActivityIcon(log.action_type)}
                      </div>
                      <div>
                        <Badge variant="outline" className="text-xs font-medium">
                          {getActivityLabel(log.action_type)}
                        </Badge>
                        <span className="text-sm text-muted-foreground ml-2">
                          {getActivityDetail(log.action_type, log.action_data)}
                        </span>
                      </div>
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
