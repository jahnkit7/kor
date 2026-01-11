import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, isPast } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, CheckCircle, XCircle, Clock, Users } from "lucide-react";

interface SubscriptionWithProfile {
  id: string;
  user_id: string;
  plan: string;
  is_active: boolean;
  trial_started_at: string;
  trial_ends_at: string;
  trial_used_at: string | null;
  max_clients: number | null;
  max_sales_per_day: number | null;
  created_at: string;
  profile?: { shop_name: string; phone: string | null };
}

export function SubscriptionHistory() {
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ["admin-subscription-history"],
    queryFn: async () => {
      // Fetch subscriptions
      const { data: subs, error: subsError } = await supabase
        .from("subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (subsError) throw subsError;
      if (!subs || subs.length === 0) return [];

      // Fetch profiles for all user_ids
      const userIds = [...new Set(subs.map(s => s.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, shop_name, phone")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // Map profiles to subscriptions
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return subs.map(sub => ({
        ...sub,
        profile: profileMap.get(sub.user_id) || undefined,
      })) as SubscriptionWithProfile[];
    },
  });

  const getStatus = (sub: SubscriptionWithProfile) => {
    if (!sub.is_active) return "inactive";
    if (isPast(new Date(sub.trial_ends_at))) return "expired";
    return "active";
  };

  const filteredSubscriptions = subscriptions?.filter((sub) => {
    const matchesSearch = 
      sub.profile?.shop_name?.toLowerCase().includes(search.toLowerCase()) ||
      sub.profile?.phone?.includes(search) ||
      sub.plan.toLowerCase().includes(search.toLowerCase());
    
    const matchesPlan = filterPlan === "all" || sub.plan.toLowerCase() === filterPlan;
    
    const status = getStatus(sub);
    const matchesStatus = filterStatus === "all" || status === filterStatus;

    return matchesSearch && matchesPlan && matchesStatus;
  });

  const uniquePlans = [...new Set(subscriptions?.map((s) => s.plan.toLowerCase()) || [])];

  const totalActive = subscriptions?.filter((s) => getStatus(s) === "active").length || 0;
  const totalExpired = subscriptions?.filter((s) => getStatus(s) === "expired").length || 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{subscriptions?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total abonnements</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalActive}</p>
              <p className="text-xs text-muted-foreground">Actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalExpired}</p>
              <p className="text-xs text-muted-foreground">Expirés</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Historique des abonnements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par boutique, téléphone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterPlan} onValueChange={setFilterPlan}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les plans</SelectItem>
                {uniquePlans.map((plan) => (
                  <SelectItem key={plan} value={plan}>
                    {plan.charAt(0).toUpperCase() + plan.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="expired">Expirés</SelectItem>
                <SelectItem value="inactive">Inactifs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Boutique</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Début</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Limites</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions?.map((sub) => {
                    const status = getStatus(sub);
                    return (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sub.profile?.shop_name || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">{sub.profile?.phone || "-"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {sub.plan}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(sub.trial_started_at), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(sub.trial_ends_at), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            <div>{sub.max_clients ? `${sub.max_clients} clients` : "∞ clients"}</div>
                            <div>{sub.max_sales_per_day ? `${sub.max_sales_per_day} ventes/j` : "∞ ventes"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {status === "active" && (
                            <Badge className="bg-green-500/10 text-green-600">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Actif
                            </Badge>
                          )}
                          {status === "expired" && (
                            <Badge className="bg-destructive/10 text-destructive">
                              <Clock className="w-3 h-3 mr-1" />
                              Expiré
                            </Badge>
                          )}
                          {status === "inactive" && (
                            <Badge variant="secondary">
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactif
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredSubscriptions?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Aucun abonnement trouvé
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
