import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  UserCheck, 
  Clock, 
  TrendingUp, 
  Gift,
  Search,
  RefreshCw,
  ArrowRight,
  Calendar,
  Percent
} from "lucide-react";
import { useAdminReferrals, useAdminReferralStats } from "@/hooks/use-referrals";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Get referrer and referred user details
function useReferralDetails() {
  return useQuery({
    queryKey: ["admin-referral-details"],
    queryFn: async () => {
      // Get all profiles to map user IDs to names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, shop_name, owner_name, referral_code");
      
      return profiles?.reduce((acc, p) => {
        acc[p.user_id] = {
          name: p.shop_name || p.owner_name || "Inconnu",
          code: p.referral_code,
        };
        return acc;
      }, {} as Record<string, { name: string; code: string | null }>) || {};
    },
  });
}

function AdminReferralsContent() {
  const { data: referrals, isLoading, refetch } = useAdminReferrals();
  const { data: stats } = useAdminReferralStats();
  const { data: userDetails } = useReferralDetails();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredReferrals = referrals?.filter((ref) => {
    const referrerName = userDetails?.[ref.referrer_id]?.name?.toLowerCase() || "";
    const referredName = ref.referred_id ? userDetails?.[ref.referred_id]?.name?.toLowerCase() : "";
    const matchesSearch = 
      referrerName.includes(searchQuery.toLowerCase()) ||
      referredName?.includes(searchQuery.toLowerCase()) ||
      ref.referral_code.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || ref.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case "converted":
        return <Badge className="bg-green-500"><UserCheck className="w-3 h-3 mr-1" />Converti</Badge>;
      case "rewarded":
        return <Badge className="bg-purple-500"><Gift className="w-3 h-3 mr-1" />Récompensé</Badge>;
      case "expired":
        return <Badge variant="destructive">Expiré</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Parrainages</h1>
          <p className="text-muted-foreground">
            Gérez le programme de parrainage (distinct des commissions plateforme)
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Percent className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-600">Programme de Parrainage</h3>
              <p className="text-sm text-muted-foreground">
                Les utilisateurs parrainés reçoivent <strong>10% de réduction</strong> sur leur premier abonnement payant.
                Ce système est différent des commissions plateforme (2% sur les ventes).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total parrainages</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.converted || 0}</p>
                <p className="text-xs text-muted-foreground">Convertis</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.conversionRate || 0}%</p>
                <p className="text-xs text-muted-foreground">Taux conversion</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.thisMonth || 0}</p>
                <p className="text-xs text-muted-foreground">Ce mois</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {["all", "pending", "converted", "rewarded"].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {status === "all" ? "Tous" : 
                   status === "pending" ? "En attente" :
                   status === "converted" ? "Convertis" : "Récompensés"}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referrals List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des parrainages</CardTitle>
          <CardDescription>
            {filteredReferrals?.length || 0} parrainage(s) trouvé(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReferrals?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun parrainage trouvé
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReferrals?.map((ref) => (
                <div
                  key={ref.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Referrer */}
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {userDetails?.[ref.referrer_id]?.name || "Inconnu"}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        Code: {ref.referral_code}
                      </p>
                    </div>

                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

                    {/* Referred */}
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {ref.referred_id 
                          ? userDetails?.[ref.referred_id]?.name || "Utilisateur"
                          : "En attente d'inscription"
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(ref.created_at), "d MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Reward info */}
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">
                        -{ref.reward_value}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ref.reward_type === "discount" ? "Réduction" : ref.reward_type}
                      </p>
                    </div>

                    {getStatusBadge(ref.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminReferrals() {
  return (
    <AdminLayout>
      <AdminReferralsContent />
    </AdminLayout>
  );
}
