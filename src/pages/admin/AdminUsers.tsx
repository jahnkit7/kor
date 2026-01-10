import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminUsers } from "@/hooks/use-admin-stats";
import { useSubscriptionPlans } from "@/hooks/use-subscription-plans";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, User, Phone, MapPin, Calendar, MoreVertical, Loader2, CreditCard } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminUsers() {
  const { data: users, isLoading, refetch } = useAdminUsers();
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // Activation dialog state
  const [activatingUser, setActivatingUser] = useState<any>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [customDays, setCustomDays] = useState<string>("");
  const [isActivating, setIsActivating] = useState(false);

  const filteredUsers = users?.filter(
    (user) =>
      user.shop_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.phone?.includes(search) ||
      user.owner_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenActivationDialog = (user: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActivatingUser(user);
    setSelectedPlanId("");
    setCustomDays("");
  };

  const handleSuspendUser = async (user: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (!confirm(`Voulez-vous vraiment suspendre le compte de ${user.shop_name || user.owner_name || "cet utilisateur"} ?`)) {
      return;
    }

    try {
      // Désactiver l'abonnement
      const { error } = await supabase
        .from("subscriptions")
        .update({ is_active: false })
        .eq("user_id", user.user_id);

      if (error) throw error;

      toast.success("Compte suspendu avec succès");
      setSelectedUser(null);
      refetch();
    } catch (error) {
      console.error("Error suspending user:", error);
      toast.error("Erreur lors de la suspension");
    }
  };

  const handleActivateSubscription = async () => {
    if (!activatingUser || !selectedPlanId) {
      toast.error("Veuillez sélectionner un plan");
      return;
    }

    setIsActivating(true);

    try {
      const plan = plans.find((p) => p.id === selectedPlanId);
      if (!plan) {
        toast.error("Plan non trouvé");
        return;
      }

      // Use custom days if provided, otherwise use plan duration
      const daysToAdd = customDays ? parseInt(customDays) : plan.duration_days;
      
      if (isNaN(daysToAdd) || daysToAdd <= 0) {
        toast.error("Durée invalide");
        return;
      }

      const startDate = new Date().toISOString();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysToAdd);

      const { error } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: activatingUser.user_id,
          plan: plan.name.toLowerCase(),
          is_active: true,
          trial_started_at: startDate,
          trial_ends_at: endDate.toISOString(),
        }, {
          onConflict: "user_id",
        });

      if (error) throw error;

      toast.success(`Abonnement ${plan.name} activé pour ${daysToAdd} jours !`);
      setActivatingUser(null);
      setSelectedUser(null);
      refetch();
    } catch (error) {
      console.error("Error activating subscription:", error);
      toast.error("Erreur lors de l'activation");
    } finally {
      setIsActivating(false);
    }
  };

  const getSelectedPlanDuration = () => {
    if (!selectedPlanId) return null;
    const plan = plans.find((p) => p.id === selectedPlanId);
    return plan?.duration_days;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>
            <p className="text-muted-foreground">
              {users?.length || 0} utilisateurs inscrits
            </p>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Boutique</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead className="hidden lg:table-cell">Ville</TableHead>
                      <TableHead className="hidden lg:table-cell">Inscription</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map((user) => (
                      <TableRow 
                        key={user.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedUser(user)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{user.shop_name || "Sans nom"}</p>
                              <p className="text-sm text-muted-foreground">
                                {user.owner_name || "-"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            {user.phone || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            {(user as any).city || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {user.created_at
                              ? formatDistanceToNow(new Date(user.created_at), {
                                  addSuffix: true,
                                  locale: fr,
                                })
                              : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(user.subscriptions as any)?.[0]?.is_active ? (
                            <Badge className="bg-success/10 text-success hover:bg-success/20">
                              Actif
                            </Badge>
                          ) : (user.subscriptions as any)?.[0] ? (
                            <Badge variant="outline" className="text-warning border-warning">
                              Expiré
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Aucun</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(user);
                              }}>
                                Voir détails
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => handleOpenActivationDialog(user, e)}>
                                <CreditCard className="w-4 h-4 mr-2" />
                                Activer abonnement
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={(e) => handleSuspendUser(user, e)}
                              >
                                Suspendre
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Detail Sheet */}
        <Sheet open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Détails utilisateur</SheetTitle>
            </SheetHeader>
            {selectedUser && (
              <div className="mt-6 space-y-6">
                {/* Profile Info */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">
                      {selectedUser.shop_name || "Sans nom"}
                    </h3>
                    <p className="text-muted-foreground">
                      {selectedUser.owner_name || "-"}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <p className="text-sm text-muted-foreground">Téléphone</p>
                      <p className="font-medium">{selectedUser.phone || "-"}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <p className="text-sm text-muted-foreground">Ville</p>
                      <p className="font-medium">{selectedUser.city || "-"}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <p className="text-sm text-muted-foreground">Spécialité</p>
                      <p className="font-medium">{selectedUser.specialty || "-"}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <p className="text-sm text-muted-foreground">Inscription</p>
                      <p className="font-medium">
                        {selectedUser.created_at
                          ? new Date(selectedUser.created_at).toLocaleDateString("fr-FR")
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Subscription Info */}
                  <div className="p-4 rounded-lg border border-border">
                    <h4 className="font-semibold mb-3">Abonnement</h4>
                    {selectedUser.subscriptions?.[0] ? (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Plan</span>
                          <span className="font-medium capitalize">
                            {selectedUser.subscriptions[0].plan || "Essai gratuit"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Statut</span>
                          <Badge className={selectedUser.subscriptions[0].is_active 
                            ? "bg-success/10 text-success" 
                            : "bg-warning/10 text-warning"
                          }>
                            {selectedUser.subscriptions[0].is_active ? "Actif" : "Expiré"}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Début</span>
                          <span>
                            {selectedUser.subscriptions[0].trial_started_at
                              ? new Date(selectedUser.subscriptions[0].trial_started_at).toLocaleDateString("fr-FR")
                              : "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fin période</span>
                          <span>
                            {selectedUser.subscriptions[0].trial_ends_at
                              ? new Date(selectedUser.subscriptions[0].trial_ends_at).toLocaleDateString("fr-FR")
                              : "-"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Pas d'abonnement</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button 
                      className="w-full"
                      onClick={() => handleOpenActivationDialog(selectedUser)}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Activer/Renouveler abonnement
                    </Button>
                    <Button variant="outline" className="w-full">
                      Reset PIN
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={() => handleSuspendUser(selectedUser)}
                    >
                      Suspendre le compte
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Activation Dialog */}
        <Dialog open={!!activatingUser} onOpenChange={() => setActivatingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Activer un abonnement</DialogTitle>
              <DialogDescription>
                Activer manuellement un abonnement pour{" "}
                <span className="font-semibold">
                  {activatingUser?.shop_name || activatingUser?.owner_name || "cet utilisateur"}
                </span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Plan Selection */}
              <div className="space-y-2">
                <Label>Plan d'abonnement</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {plan.duration_days} jours
                        {plan.price > 0 && ` (${plan.price.toLocaleString()} CFA)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Duration Override */}
              <div className="space-y-2">
                <Label>
                  Durée personnalisée (optionnel)
                  {getSelectedPlanDuration() && (
                    <span className="text-muted-foreground font-normal ml-2">
                      Par défaut: {getSelectedPlanDuration()} jours
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  placeholder="Nombre de jours"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  min={1}
                />
                <p className="text-xs text-muted-foreground">
                  Laisser vide pour utiliser la durée du plan sélectionné
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setActivatingUser(null)}>
                Annuler
              </Button>
              <Button 
                onClick={handleActivateSubscription} 
                disabled={isActivating || !selectedPlanId || plansLoading}
              >
                {isActivating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Activation...
                  </>
                ) : (
                  "Activer l'abonnement"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
