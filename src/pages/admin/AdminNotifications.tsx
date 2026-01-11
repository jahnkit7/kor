import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
// AdminLayout is now provided by AdminProtectedLayout
import { BentoGrid } from "@/components/admin/BentoGrid";
import { BentoCard } from "@/components/admin/BentoCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bell,
  BellRing,
  CheckCircle,
  AlertTriangle,
  Package,
  TrendingUp,
  Info,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Filter,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, subDays, startOfDay, isAfter } from "date-fns";
import { fr } from "date-fns/locale";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  action_url: string | null;
  created_at: string;
  profiles?: {
    shop_name: string;
    owner_name: string | null;
  };
}

type PeriodFilter = "today" | "week" | "month" | "all";
type StatusFilter = "all" | "read" | "unread";

const typeIcons: Record<string, React.ElementType> = {
  stock_alert: Package,
  debt_alert: TrendingUp,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertTriangle,
  info: Info,
};

const typeColors: Record<string, string> = {
  stock_alert: "bg-amber-500",
  debt_alert: "bg-red-500",
  success: "bg-green-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  info: "bg-blue-500",
};

const chartColors = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(220, 70%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(340, 75%, 55%)",
  "hsl(45, 93%, 47%)",
];

export default function AdminNotifications() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("week");

  // Fetch all notifications with user profiles
  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      // Get notifications
      const { data: notifs, error: notifsError } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (notifsError) throw notifsError;

      // Get unique user IDs
      const userIds = [...new Set(notifs.map((n) => n.user_id))];

      // Get profiles for those users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, shop_name, owner_name")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // Create a map of user_id -> profile
      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, { shop_name: p.shop_name, owner_name: p.owner_name }])
      );

      // Join notifications with profiles
      const result: Notification[] = notifs.map((n) => ({
        ...n,
        profiles: profileMap.get(n.user_id) || undefined,
      }));

      return result;
    },
    staleTime: 30000, // 30 seconds
  });

  // Get period start date
  const getPeriodStart = (period: PeriodFilter): Date | null => {
    switch (period) {
      case "today":
        return startOfDay(new Date());
      case "week":
        return subDays(new Date(), 7);
      case "month":
        return subDays(new Date(), 30);
      default:
        return null;
    }
  };

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];

    const periodStart = getPeriodStart(periodFilter);

    return notifications.filter((n) => {
      // Period filter
      if (periodStart && !isAfter(new Date(n.created_at), periodStart)) {
        return false;
      }

      // Type filter
      if (typeFilter !== "all" && n.type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === "read" && !n.read) return false;
      if (statusFilter === "unread" && n.read) return false;

      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const matchesSearch =
          n.title.toLowerCase().includes(search) ||
          n.message.toLowerCase().includes(search) ||
          n.profiles?.shop_name?.toLowerCase().includes(search) ||
          n.profiles?.owner_name?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [notifications, periodFilter, typeFilter, statusFilter, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!filteredNotifications) return { total: 0, unread: 0, read: 0, readRate: 0 };

    const total = filteredNotifications.length;
    const unread = filteredNotifications.filter((n) => !n.read).length;
    const read = total - unread;
    const readRate = total > 0 ? Math.round((read / total) * 100) : 0;

    return { total, unread, read, readRate };
  }, [filteredNotifications]);

  // Get unique notification types
  const notificationTypes = useMemo(() => {
    if (!notifications) return [];
    const types = new Set(notifications.map((n) => n.type));
    return Array.from(types);
  }, [notifications]);

  // Daily usage chart data (last 30 days)
  const dailyChartData = useMemo(() => {
    if (!notifications) return [];

    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      return {
        date: format(date, "dd/MM"),
        fullDate: startOfDay(date).getTime(),
        count: 0,
      };
    });

    notifications.forEach((n) => {
      const notifDate = startOfDay(new Date(n.created_at)).getTime();
      const dayData = last30Days.find((d) => d.fullDate === notifDate);
      if (dayData) {
        dayData.count++;
      }
    });

    return last30Days;
  }, [notifications]);

  // Type distribution for pie chart
  const typeDistribution = useMemo(() => {
    if (!filteredNotifications) return [];

    const typeCounts: Record<string, number> = {};
    filteredNotifications.forEach((n) => {
      typeCounts[n.type] = (typeCounts[n.type] || 0) + 1;
    });

    return Object.entries(typeCounts)
      .map(([type, count], index) => ({
        name: type.replace("_", " "),
        value: count,
        color: chartColors[index % chartColors.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredNotifications]);

  const getTypeIcon = (type: string) => {
    const Icon = typeIcons[type] || Bell;
    return <Icon className="w-4 h-4" />;
  };

  const getTypeBadgeColor = (type: string) => {
    return typeColors[type] || "bg-gray-500";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              Suivi temps réel des alertes système
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <BentoGrid columns={4}>
          <BentoCard>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <BellRing className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Non lues</p>
                <p className="text-2xl font-bold">{stats.unread}</p>
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taux de lecture</p>
                <p className="text-2xl font-bold">{stats.readRate}%</p>
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Filter className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Types actifs</p>
                <p className="text-2xl font-bold">{notificationTypes.length}</p>
              </div>
            </div>
          </BentoCard>
        </BentoGrid>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Notifications par jour (30j)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChartData}>
                    <defs>
                      <linearGradient id="colorNotif" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorNotif)"
                      name="Notifications"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Par type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {typeDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {typeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Aucune donnée
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Period Filter */}
              <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="week">7 jours</SelectItem>
                  <SelectItem value="month">30 jours</SelectItem>
                  <SelectItem value="all">Tout</SelectItem>
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous types</SelectItem>
                  {notificationTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="unread">Non lues</SelectItem>
                  <SelectItem value="read">Lues</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Liste des notifications ({filteredNotifications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Statut</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotifications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Aucune notification trouvée
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredNotifications.map((notification) => (
                      <TableRow key={notification.id}>
                        <TableCell>
                          {notification.read ? (
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-amber-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {notification.profiles?.shop_name || "Inconnu"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {notification.profiles?.owner_name || "-"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[300px]">
                            <p className="font-medium text-sm truncate">{notification.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {notification.message}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`gap-1 ${getTypeBadgeColor(notification.type)} text-white`}
                          >
                            {getTypeIcon(notification.type)}
                            {notification.type.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(notification.created_at), "dd MMM HH:mm", { locale: fr })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
  );
}
