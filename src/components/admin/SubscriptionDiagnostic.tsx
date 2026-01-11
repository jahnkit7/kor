import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Wrench, RefreshCw } from "lucide-react";

interface SubscriptionPlan {
  name: string;
  max_clients: number | null;
  max_sales_per_day: number | null;
}

interface InconsistentSubscription {
  id: string;
  user_id: string;
  plan: string;
  max_clients: number | null;
  max_sales_per_day: number | null;
  expected_max_clients: number | null;
  expected_max_sales_per_day: number | null;
  shop_name: string | null;
  phone: string | null;
}

export function SubscriptionDiagnostic() {
  const queryClient = useQueryClient();
  const [fixing, setFixing] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Fetch subscription plans for reference
  const { data: plans } = useQuery({
    queryKey: ["admin-diagnostic-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("name, max_clients, max_sales_per_day");

      if (error) throw error;
      
      const map: Record<string, SubscriptionPlan> = {};
      data?.forEach((p) => {
        map[p.name.toLowerCase()] = p;
      });
      return map;
    },
  });

  // Fetch all subscriptions with profiles
  const { data: subscriptions, isLoading, refetch } = useQuery({
    queryKey: ["admin-diagnostic-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          id,
          user_id,
          plan,
          max_clients,
          max_sales_per_day,
          profiles!subscriptions_user_id_fkey (shop_name, phone)
        `)
        .order("plan");

      if (error) throw error;
      return data;
    },
    enabled: !!plans,
  });

  // Find inconsistent subscriptions
  const inconsistentSubscriptions: InconsistentSubscription[] = [];
  
  if (plans && subscriptions) {
    subscriptions.forEach((sub) => {
      const planRef = plans[sub.plan.toLowerCase()];
      if (!planRef) return; // Skip if plan not found
      
      const clientsMismatch = sub.max_clients !== planRef.max_clients;
      const salesMismatch = sub.max_sales_per_day !== planRef.max_sales_per_day;
      
      if (clientsMismatch || salesMismatch) {
        inconsistentSubscriptions.push({
          id: sub.id,
          user_id: sub.user_id,
          plan: sub.plan,
          max_clients: sub.max_clients,
          max_sales_per_day: sub.max_sales_per_day,
          expected_max_clients: planRef.max_clients,
          expected_max_sales_per_day: planRef.max_sales_per_day,
          shop_name: (sub.profiles as any)?.shop_name || null,
          phone: (sub.profiles as any)?.phone || null,
        });
      }
    });
  }

  const handleFixAll = async () => {
    if (!plans) return;
    
    setFixing(true);
    try {
      let fixed = 0;
      
      for (const sub of inconsistentSubscriptions) {
        const planRef = plans[sub.plan.toLowerCase()];
        if (!planRef) continue;
        
        const { error } = await supabase
          .from("subscriptions")
          .update({
            max_clients: planRef.max_clients,
            max_sales_per_day: planRef.max_sales_per_day,
          })
          .eq("id", sub.id);
        
        if (!error) fixed++;
      }
      
      toast.success(`${fixed} abonnement(s) corrigé(s)`);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-history"] });
    } catch (error) {
      toast.error("Erreur lors de la correction");
    } finally {
      setFixing(false);
      setConfirmDialogOpen(false);
    }
  };

  const handleFixOne = async (sub: InconsistentSubscription) => {
    if (!plans) return;
    
    const planRef = plans[sub.plan.toLowerCase()];
    if (!planRef) return;
    
    try {
      const { error } = await supabase
        .from("subscriptions")
        .update({
          max_clients: planRef.max_clients,
          max_sales_per_day: planRef.max_sales_per_day,
        })
        .eq("id", sub.id);
      
      if (error) throw error;
      
      toast.success("Abonnement corrigé");
      await refetch();
    } catch (error) {
      toast.error("Erreur lors de la correction");
    }
  };

  const formatLimit = (value: number | null) => {
    return value === null ? "∞" : value.toString();
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className={inconsistentSubscriptions.length > 0 ? "border-amber-500/50" : "border-green-500/50"}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {inconsistentSubscriptions.length > 0 ? (
              <>
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {inconsistentSubscriptions.length} abonnement(s) incohérent(s)
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Les limites ne correspondent pas aux valeurs définies dans les plans
                  </p>
                </div>
                <Button onClick={() => setConfirmDialogOpen(true)} disabled={fixing}>
                  {fixing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wrench className="w-4 h-4 mr-2" />
                  )}
                  Corriger tout
                </Button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">Tous les abonnements sont cohérents</h3>
                  <p className="text-muted-foreground text-sm">
                    Les limites correspondent aux valeurs définies dans les plans
                  </p>
                </div>
                <Button variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Vérifier à nouveau
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inconsistent Subscriptions Table */}
      {inconsistentSubscriptions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Détails des incohérences</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
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
                      <TableHead>Clients actuel</TableHead>
                      <TableHead>Clients attendu</TableHead>
                      <TableHead>Ventes actuel</TableHead>
                      <TableHead>Ventes attendu</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inconsistentSubscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sub.shop_name || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">{sub.phone || "-"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {sub.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="font-mono">
                            {formatLimit(sub.max_clients)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-500/10 text-green-600 font-mono">
                            {formatLimit(sub.expected_max_clients)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="font-mono">
                            {formatLimit(sub.max_sales_per_day)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-500/10 text-green-600 font-mono">
                            {formatLimit(sub.expected_max_sales_per_day)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFixOne(sub)}
                          >
                            <Wrench className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Corriger tous les abonnements ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va mettre à jour {inconsistentSubscriptions.length} abonnement(s) 
              pour aligner leurs limites avec les valeurs définies dans leurs plans respectifs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleFixAll}>
              {fixing ? "Correction en cours..." : "Corriger tout"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
