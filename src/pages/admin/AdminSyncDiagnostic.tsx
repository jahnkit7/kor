import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  RefreshCw, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Database,
  CloudOff,
  User,
  Activity
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface UserSyncStatus {
  user_id: string;
  shop_name: string;
  owner_name: string | null;
  phone: string | null;
  total_sales: number;
  total_clients: number;
  total_debts: number;
  last_sale_at: string | null;
  plan: string;
  is_active: boolean;
}

interface SyncLog {
  id: string;
  user_id: string;
  action_type: string;
  action_data: {
    error?: string;
    details?: string;
    sync_type?: string;
    items_count?: number;
    [key: string]: unknown;
  } | null;
  created_at: string;
  shop_name?: string;
}

export default function AdminSyncDiagnostic() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Fetch all users with their data counts
  const { data: userStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["admin-sync-user-stats"],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, shop_name, owner_name, phone");

      if (profilesError) throw profilesError;

      // Get subscriptions
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("user_id, plan, is_active");

      // Get sales counts
      const { data: salesData } = await supabase
        .from("sales")
        .select("user_id, created_at");

      // Get clients counts
      const { data: clientsData } = await supabase
        .from("clients")
        .select("user_id");

      // Get debts counts
      const { data: debtsData } = await supabase
        .from("debts")
        .select("user_id");

      // Aggregate data per user
      const userMap = new Map<string, UserSyncStatus>();

      for (const profile of profiles || []) {
        const sub = subs?.find(s => s.user_id === profile.user_id);
        const userSales = salesData?.filter(s => s.user_id === profile.user_id) || [];
        const userClients = clientsData?.filter(c => c.user_id === profile.user_id) || [];
        const userDebts = debtsData?.filter(d => d.user_id === profile.user_id) || [];
        
        const lastSale = userSales.length > 0 
          ? userSales.sort((a, b) => b.created_at.localeCompare(a.created_at))[0].created_at 
          : null;

        userMap.set(profile.user_id, {
          user_id: profile.user_id,
          shop_name: profile.shop_name || "Sans nom",
          owner_name: profile.owner_name,
          phone: profile.phone,
          total_sales: userSales.length,
          total_clients: userClients.length,
          total_debts: userDebts.length,
          last_sale_at: lastSale,
          plan: sub?.plan || "free_trial",
          is_active: sub?.is_active ?? false,
        });
      }

      return Array.from(userMap.values());
    },
    staleTime: 30 * 1000,
  });

  // Fetch activity logs related to sync errors
  const { data: syncLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ["admin-sync-logs", selectedUserId],
    queryFn: async () => {
      let query = supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (selectedUserId) {
        query = query.eq("user_id", selectedUserId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with profile info
      const userIds = [...new Set((data || []).map(l => l.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, shop_name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.shop_name]) || []);

      return (data || []).map(log => ({
        ...log,
        shop_name: profileMap.get(log.user_id || "") || "Inconnu",
        action_data: log.action_data as SyncLog["action_data"],
      })) as SyncLog[];
    },
    staleTime: 10 * 1000,
  });

  const filteredUsers = userStats?.filter(user => {
    const search = searchQuery.toLowerCase();
    return (
      user.shop_name.toLowerCase().includes(search) ||
      user.owner_name?.toLowerCase().includes(search) ||
      user.phone?.includes(search) ||
      user.user_id.includes(search)
    );
  }) || [];

  const handleRefresh = () => {
    refetchStats();
    refetchLogs();
    toast.success("Données actualisées");
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId === selectedUserId ? null : userId);
  };

  const getActionBadge = (actionType: string) => {
    if (actionType.includes("error") || actionType.includes("fail")) {
      return <Badge variant="destructive">{actionType}</Badge>;
    }
    if (actionType.includes("sync") || actionType.includes("success")) {
      return <Badge className="bg-green-500">{actionType}</Badge>;
    }
    return <Badge variant="secondary">{actionType}</Badge>;
  };

  // Stats summary
  const totalUsers = userStats?.length || 0;
  const activeUsers = userStats?.filter(u => u.is_active).length || 0;
  const usersWithSales = userStats?.filter(u => u.total_sales > 0).length || 0;
  const recentActivity = userStats?.filter(u => {
    if (!u.last_sale_at) return false;
    const lastSale = new Date(u.last_sale_at);
    const now = new Date();
    return now.getTime() - lastSale.getTime() < 24 * 60 * 60 * 1000;
  }).length || 0;

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Diagnostic Sync</h1>
        <p className="text-muted-foreground">Surveillance de la synchronisation des données</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-xs text-muted-foreground">Utilisateurs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeUsers}</p>
                <p className="text-xs text-muted-foreground">Abonnés actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{usersWithSales}</p>
                <p className="text-xs text-muted-foreground">Avec ventes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recentActivity}</p>
                <p className="text-xs text-muted-foreground">Actifs 24h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par boutique, nom, téléphone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Utilisateurs ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {statsLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Chargement...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Aucun utilisateur trouvé
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.user_id}
                      onClick={() => handleSelectUser(user.user_id)}
                      className={`w-full p-4 text-left hover:bg-secondary/50 transition-colors ${
                        selectedUserId === user.user_id ? "bg-primary/10" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{user.shop_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.owner_name || "Sans propriétaire"}
                          </p>
                        </div>
                        <Badge variant={user.is_active ? "default" : "secondary"}>
                          {user.plan}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>{user.total_sales} ventes</span>
                        <span>{user.total_clients} clients</span>
                        <span>{user.total_debts} dettes</span>
                      </div>
                      {user.last_sale_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Dernière vente: {formatDistanceToNow(new Date(user.last_sale_at), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Activity Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Logs d'activité
              {selectedUserId && (
                <Badge variant="outline" className="ml-2">
                  Filtré
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {logsLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Chargement...
                </div>
              ) : (syncLogs?.length || 0) === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CloudOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun log récent</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {syncLogs?.map((log) => (
                    <div key={log.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        {getActionBadge(log.action_type)}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{log.shop_name}</p>
                      {log.action_data && (
                        <div className="mt-2 text-xs bg-secondary/50 rounded p-2 font-mono overflow-x-auto">
                          {log.action_data.error && (
                            <p className="text-destructive flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {log.action_data.error}
                            </p>
                          )}
                          {!log.action_data.error && (
                            <pre>{JSON.stringify(log.action_data, null, 2)}</pre>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
