// AdminLayout is now provided by AdminProtectedLayout
import { useEffect, useState } from "react";
import { BentoCard, BentoCardHeader, BentoCardValue } from "@/components/admin/BentoCard";
import { BentoGrid } from "@/components/admin/BentoGrid";
import { useAdminStats } from "@/hooks/use-admin-stats";
import { useActivityLogs } from "@/hooks/use-activity-logs";
import { useCommissionStats } from "@/hooks/use-admin-commissions";
import { useAdminLayout } from "@/hooks/use-admin-layout";
import { DraggableBentoCard } from "@/components/admin/DraggableBentoCard";
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
  Receipt,
  RefreshCw,
  Settings2,
  RotateCcw
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton, CardSkeleton } from "@/components/ui/loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

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
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading, dataUpdatedAt: statsUpdatedAt } = useAdminStats();
  const { data: activityLogs, isLoading: logsLoading, dataUpdatedAt: logsUpdatedAt } = useActivityLogs(10);
  const { data: commissionStats } = useCommissionStats();
  const { layout, updateDashboardCards, resetLayout } = useAdminLayout();
  const navigate = useNavigate();
  
  // Track last update time
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Update last update timestamp when data changes
  useEffect(() => {
    const latestUpdate = Math.max(statsUpdatedAt || 0, logsUpdatedAt || 0);
    if (latestUpdate > 0) {
      setLastUpdate(new Date(latestUpdate));
    }
  }, [statsUpdatedAt, logsUpdatedAt]);
  
  // Supabase Realtime subscription for admin dashboard
  useEffect(() => {
    const channel = supabase
      .channel('admin-realtime-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
          queryClient.invalidateQueries({ queryKey: ["admin-users"] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_logs' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  
  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-commission-stats"] }),
    ]);
    setLastUpdate(new Date());
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const formatCFA = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (over && active.id !== over.id) {
      const oldIndex = layout.dashboardCards.indexOf(active.id as string);
      const newIndex = layout.dashboardCards.indexOf(over.id as string);
      updateDashboardCards(arrayMove(layout.dashboardCards, oldIndex, newIndex));
      toast.success("Position sauvegardée");
    }
  };

  // Card definitions
  const cardDefinitions: Record<string, React.ReactNode> = {
    revenue: (
      <BentoCard size="2x1" gradient glow className="h-full">
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
    ),
    users: (
      <BentoCard onClick={() => navigate("/admin/users")} className="h-full">
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
    ),
    commissions: (
      <BentoCard onClick={() => navigate("/admin/commissions")} className="h-full">
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
    ),
    geography: (
      <BentoCard onClick={() => navigate("/admin/geography")} className="h-full">
        <BentoCardHeader
          icon={<Globe className="w-5 h-5" />}
          title="Géographie"
        />
        <BentoCardValue
          value={`${stats?.activeCountries || 0}/${stats?.totalCountries || 0}`}
          label="pays actifs"
        />
      </BentoCard>
    ),
    subscriptions: (
      <BentoCard onClick={() => navigate("/admin/subscriptions")} className="h-full">
        <BentoCardHeader
          icon={<CreditCard className="w-5 h-5" />}
          title="Abonnements"
        />
        <BentoCardValue
          value={stats?.activeSubscriptions || 0}
          label={`${stats?.activePlans || 0} plans disponibles`}
        />
      </BentoCard>
    ),
    codes: (
      <BentoCard onClick={() => navigate("/admin/codes")} className="h-full">
        <BentoCardHeader
          icon={<QrCode className="w-5 h-5" />}
          title="Codes Prépayés"
        />
        <BentoCardValue
          value={`${stats?.usedCodes || 0}/${stats?.totalCodes || 0}`}
          label="codes utilisés"
        />
      </BentoCard>
    ),
    tickets: (
      <BentoCard onClick={() => navigate("/admin/support")} className="h-full">
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
    ),
    activity: (
      <BentoCard size="2x2" className="col-span-full h-full">
        <BentoCardHeader
          icon={<Activity className="w-5 h-5" />}
          title="Activité récente"
          subtitle="Dernières actions dans le système"
        />
        <div className="mt-4">
          {logsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <CardSkeleton key={i} className="h-12 rounded-xl" />
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs font-medium">
                        {getActivityLabel(log.action_type)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {getActivityDetail(log.action_type, log.action_data)}
                      </span>
                      {log.user_name && (
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                          {log.user_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
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
    ),
  };

  // Get grid class based on card ID
  const getCardGridClass = (cardId: string) => {
    switch (cardId) {
      case "revenue":
        return "md:col-span-4";
      case "users":
      case "commissions":
        return "md:col-span-3";
      case "activity":
        return "col-span-full";
      default:
        return "";
    }
  };

  // Sorted cards based on layout
  const sortedTopCards = layout.dashboardCards
    .filter((id) => ["revenue", "users", "commissions"].includes(id))
    .filter((id) => cardDefinitions[id]);
  
  const sortedMiddleCards = layout.dashboardCards
    .filter((id) => ["geography", "subscriptions", "codes", "tickets"].includes(id))
    .filter((id) => cardDefinitions[id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Vue d'ensemble de KÒR</p>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {/* Last update indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span>Mis à jour {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: fr })}</span>
          </div>
          
          {/* Edit Mode Toggle */}
          <Button
            variant={isDragMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsDragMode(!isDragMode)}
            className={cn("gap-2", isDragMode && "bg-amber-500 hover:bg-amber-600")}
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">{isDragMode ? "Terminer" : "Éditer"}</span>
          </Button>
          
          {isDragMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetLayout}
              className="gap-2 text-muted-foreground"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          )}
          
          {/* Manual refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>
          
          <NotificationBell />
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-medium">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Système opérationnel
          </div>
        </div>
      </div>
      
      {/* Drag Mode Indicator */}
      {isDragMode && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
          <Settings2 className="w-4 h-4" />
          <span className="text-sm font-medium">
            Mode édition actif - Glissez les cartes pour les réorganiser
          </span>
        </div>
      )}

      {/* Main Bento Grid */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <CardSkeleton key={i} className="h-40 rounded-3xl" />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Ligne 1: Revenus (40%) - Utilisateurs (30%) - Commissions (30%) */}
          <SortableContext items={sortedTopCards} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-10 gap-4">
              {sortedTopCards.map((cardId) => (
                <DraggableBentoCard
                  key={cardId}
                  id={cardId}
                  className={getCardGridClass(cardId)}
                  isDragMode={isDragMode}
                >
                  {cardDefinitions[cardId]}
                </DraggableBentoCard>
              ))}
            </div>
          </SortableContext>

          {/* Ligne 2: Géographie - Abonnements - Codes Prépayés - Tickets (25% chacun) */}
          <SortableContext items={sortedMiddleCards} strategy={rectSortingStrategy}>
            <BentoGrid columns={4}>
              {sortedMiddleCards.map((cardId) => (
                <DraggableBentoCard
                  key={cardId}
                  id={cardId}
                  isDragMode={isDragMode}
                >
                  {cardDefinitions[cardId]}
                </DraggableBentoCard>
              ))}
            </BentoGrid>
          </SortableContext>
        </DndContext>
      )}

      {/* Recent Activity - Always at bottom */}
      {cardDefinitions.activity}
    </div>
  );
}
