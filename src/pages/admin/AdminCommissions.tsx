import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { BentoCard, BentoCardHeader, BentoCardValue } from "@/components/admin/BentoCard";
import { BentoGrid } from "@/components/admin/BentoGrid";
import { 
  useAdminCommissions, 
  useCommissionStats, 
  useCreateCommission,
  useToggleCommission,
  useDeleteCommission,
  calculateCommission,
} from "@/hooks/use-admin-commissions";
import {
  useAdminCommissionBalances,
  useAdminPendingPayments,
  useVerifyCommissionPayment,
  useCollectCommission,
} from "@/hooks/use-commission-balance";
import { useAdminCountries, useAdminUsers } from "@/hooks/use-admin-stats";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { UserSyncStatus, SyncWarningBanner } from "@/components/admin/UserSyncStatus";
import { 
  Percent, 
  Plus, 
  Calculator, 
  TrendingUp,
  Activity,
  ToggleLeft,
  Trash2,
  Globe,
  Wallet,
  CheckCircle,
  XCircle,
  Clock,
  User,
  RefreshCw,
  AlertTriangle,
  Cloud
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function AdminCommissions() {
  const queryClient = useQueryClient();
  const { data: commissions, isLoading: commissionsLoading } = useAdminCommissions();
  const { data: stats, isLoading: statsLoading } = useCommissionStats();
  const { data: countries } = useAdminCountries();
  const { data: users } = useAdminUsers();
  const { data: balances, isLoading: balancesLoading } = useAdminCommissionBalances();
  const { data: pendingPayments, isLoading: paymentsLoading } = useAdminPendingPayments();
  
  const createCommission = useCreateCommission();
  const toggleCommission = useToggleCommission();
  const deleteCommission = useDeleteCommission();
  const verifyPayment = useVerifyCommissionPayment();
  const collectCommission = useCollectCommission();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [collectDialogOpen, setCollectDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMethod, setCollectMethod] = useState("cash");
  const [simulationAmount, setSimulationAmount] = useState("");
  const [simulationType, setSimulationType] = useState("cash");
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "percentage" as "percentage" | "fixed",
    value: "",
    applies_to: "all_sales" as "all_sales" | "cash_only" | "credit_only",
    country_id: "",
  });

  const formatCFA = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
  };

  const getUserName = (userId: string) => {
    const user = users?.find(u => u.user_id === userId);
    return user?.shop_name || user?.owner_name || "Utilisateur inconnu";
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.value) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    try {
      await createCommission.mutateAsync({
        name: formData.name,
        type: formData.type,
        value: parseFloat(formData.value),
        applies_to: formData.applies_to,
        country_id: formData.country_id || null,
        is_active: true,
      });
      toast.success("Commission créée");
      setIsDialogOpen(false);
      setFormData({
        name: "",
        type: "percentage",
        value: "",
        applies_to: "all_sales",
        country_id: "",
      });
    } catch (error) {
      toast.error("Erreur lors de la création");
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await toggleCommission.mutateAsync({ id, is_active: !current });
      toast.success(current ? "Commission désactivée" : "Commission activée");
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCommission.mutateAsync(id);
      toast.success("Commission supprimée");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleVerifyPayment = async (paymentId: string, status: "verified" | "rejected") => {
    try {
      await verifyPayment.mutateAsync({ paymentId, status });
      toast.success(status === "verified" ? "Paiement vérifié" : "Paiement rejeté");
    } catch (error) {
      toast.error("Erreur");
    }
  };

  const handleCollectCommission = async () => {
    if (!selectedUserId || !collectAmount) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    try {
      await collectCommission.mutateAsync({
        userId: selectedUserId,
        amount: parseFloat(collectAmount),
        paymentMethod: collectMethod,
      });
      toast.success("Commission collectée");
      setCollectDialogOpen(false);
      setSelectedUserId("");
      setCollectAmount("");
    } catch (error) {
      toast.error("Erreur lors de la collecte");
    }
  };

  // Recalculate all commissions
  const handleRecalculateAll = async () => {
    setIsRecalculating(true);
    try {
      const { data, error } = await supabase.rpc('recalculate_all_commissions');
      
      if (error) {
        console.error("Recalculate error:", error);
        toast.error("Erreur lors du recalcul");
        return;
      }

      const result = data as { success: boolean; users_processed: number; sales_processed: number; total_commissions: number };
      
      toast.success("Commissions recalculées", {
        description: `${result.users_processed} utilisateur(s), ${result.sales_processed} vente(s), ${formatCFA(result.total_commissions)} total`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['admin-commission-balances'] });
      queryClient.invalidateQueries({ queryKey: ['commission-stats'] });
    } catch (error) {
      console.error("Recalculate error:", error);
      toast.error("Erreur lors du recalcul des commissions");
    } finally {
      setIsRecalculating(false);
    }
  };

  // Calculate simulation
  const simulatedCommission = simulationAmount && commissions
    ? calculateCommission(
        parseFloat(simulationAmount),
        simulationType,
        commissions.filter(c => c.is_active)
      )
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Commissions</h1>
            <p className="text-muted-foreground">Gestion des règles de commission sur les ventes</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nouvelle règle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une règle de commission</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Nom de la commission</Label>
                  <Input
                    placeholder="Ex: Commission plateforme"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) => setFormData({ ...formData, type: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                        <SelectItem value="fixed">Montant fixe (F)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valeur</Label>
                    <Input
                      type="number"
                      placeholder={formData.type === "percentage" ? "Ex: 2.5" : "Ex: 100"}
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>S'applique à</Label>
                  <Select
                    value={formData.applies_to}
                    onValueChange={(v) => setFormData({ ...formData, applies_to: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_sales">Toutes les ventes</SelectItem>
                      <SelectItem value="cash_only">Ventes cash uniquement</SelectItem>
                      <SelectItem value="credit_only">Ventes à crédit uniquement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Pays (optionnel)</Label>
                  <Select
                    value={formData.country_id || "all"}
                    onValueChange={(v) => setFormData({ ...formData, country_id: v === "all" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les pays (global)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les pays</SelectItem>
                      {countries?.map((country) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleCreate} 
                  className="w-full"
                  disabled={createCommission.isPending}
                >
                  {createCommission.isPending ? "Création..." : "Créer la commission"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="rules" className="space-y-6">
          <TabsList>
            <TabsTrigger value="rules">Règles</TabsTrigger>
            <TabsTrigger value="collection">
              Collecte
              {pendingPayments && pendingPayments.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingPayments.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-6">
            {/* Stats Bento Grid */}
            <BentoGrid columns={4}>
              {statsLoading ? (
                <>
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-36 rounded-3xl" />
                  ))}
                </>
              ) : (
                <>
                  <BentoCard gradient>
                    <BentoCardHeader
                      icon={<TrendingUp className="w-5 h-5" />}
                      title="Total Commissions"
                      subtitle="Cumulé"
                    />
                    <BentoCardValue 
                      value={formatCFA(stats?.totalAmount || 0)} 
                      size="md"
                    />
                  </BentoCard>

                  <BentoCard>
                    <BentoCardHeader
                      icon={<Activity className="w-5 h-5" />}
                      title="Aujourd'hui"
                      subtitle="Commissions du jour"
                    />
                    <BentoCardValue 
                      value={formatCFA(stats?.todayAmount || 0)} 
                      size="md"
                      trend={stats?.todayAmount && stats.todayAmount > 0 ? "up" : "neutral"}
                    />
                  </BentoCard>

                  <BentoCard>
                    <BentoCardHeader
                      icon={<Percent className="w-5 h-5" />}
                      title="Règles Actives"
                    />
                    <BentoCardValue 
                      value={stats?.activeRules || 0} 
                      label="règles configurées"
                      size="md"
                    />
                  </BentoCard>

                  <BentoCard>
                    <BentoCardHeader
                      icon={<ToggleLeft className="w-5 h-5" />}
                      title="Transactions"
                    />
                    <BentoCardValue 
                      value={stats?.totalCommissions || 0} 
                      label="ventes traitées"
                      size="md"
                    />
                  </BentoCard>
                </>
              )}
            </BentoGrid>

            {/* Simulator */}
            <BentoCard size="2x1" className="col-span-full">
              <BentoCardHeader
                icon={<Calculator className="w-5 h-5" />}
                title="Simulateur de Commission"
                subtitle="Calculez la commission pour un montant de vente"
              />
              <div className="flex flex-wrap items-end gap-4 mt-4">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground">Montant de la vente</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 50000"
                    value={simulationAmount}
                    onChange={(e) => setSimulationAmount(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="w-40">
                  <Label className="text-xs text-muted-foreground">Type de vente</Label>
                  <Select value={simulationType} onValueChange={setSimulationType}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="credit">Crédit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl bg-primary/10">
                  <span className="text-xl font-bold text-primary">
                    {formatCFA(simulatedCommission)}
                  </span>
                  {(!commissions || commissions.filter(c => c.is_active).length === 0) && (
                    <span className="text-xs text-muted-foreground">Aucune règle active</span>
                  )}
                </div>
              </div>
            </BentoCard>

            {/* Commission Rules List */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Règles de commission</h2>
              {commissionsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-2xl" />
                  ))}
                </div>
              ) : commissions && commissions.length > 0 ? (
                <div className="space-y-3">
                  {commissions.map((commission) => (
                    <div
                      key={commission.id}
                      className="flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${commission.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          <Percent className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{commission.name}</span>
                            {!commission.is_active && (
                              <Badge variant="secondary" className="text-xs">Inactif</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {commission.type === "percentage" 
                                ? `${commission.value}%` 
                                : formatCFA(commission.value)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {commission.applies_to === "all_sales" && "Toutes ventes"}
                              {commission.applies_to === "cash_only" && "Cash uniquement"}
                              {commission.applies_to === "credit_only" && "Crédit uniquement"}
                            </span>
                            {commission.country && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Globe className="w-3 h-3" />
                                {commission.country.code}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={commission.is_active}
                          onCheckedChange={() => handleToggle(commission.id, commission.is_active)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(commission.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Percent className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Aucune règle de commission configurée</p>
                  <p className="text-sm">Créez votre première règle pour commencer</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Collection Tab */}
          <TabsContent value="collection" className="space-y-6">
            {/* Collection Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Collecte des commissions</h2>
              <div className="flex items-center gap-2">
                {/* Recalculate All Button */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <RefreshCw className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                      Recalculer tout
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Recalculer toutes les commissions ?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action va recalculer les commissions de <strong>tous les utilisateurs</strong> basées sur leurs ventes existantes et les règles de commission actuelles.
                        <br /><br />
                        Cela peut être utile si :
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Des ventes ont été créées hors-ligne et synchronisées après coup</li>
                          <li>Les règles de commission ont été modifiées</li>
                          <li>Il y a des incohérences dans les soldes de commission</li>
                        </ul>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleRecalculateAll}
                        disabled={isRecalculating}
                        className="gap-2"
                      >
                        {isRecalculating ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Recalcul en cours...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            Recalculer
                          </>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Collect Manually Button */}
                <Dialog open={collectDialogOpen} onOpenChange={setCollectDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Wallet className="w-4 h-4" />
                      Collecter manuellement
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Collecter une commission</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Utilisateur</Label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un utilisateur" />
                        </SelectTrigger>
                        <SelectContent>
                          {balances?.map((balance) => (
                            <SelectItem key={balance.user_id} value={balance.user_id}>
                              {getUserName(balance.user_id)} - {formatCFA(balance.balance)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Montant collecté</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={collectAmount}
                        onChange={(e) => setCollectAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Mode de paiement</Label>
                      <Select value={collectMethod} onValueChange={setCollectMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Espèces</SelectItem>
                          <SelectItem value="flooz">Flooz</SelectItem>
                          <SelectItem value="tmoney">T-Money</SelectItem>
                          <SelectItem value="momo">MTN MoMo</SelectItem>
                          <SelectItem value="wave">Wave</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleCollectCommission}
                      className="w-full"
                      disabled={collectCommission.isPending}
                    >
                      {collectCommission.isPending ? "Collecte..." : "Confirmer la collecte"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
            </div>

            {/* Pending Payments */}
            {pendingPayments && pendingPayments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-warning" />
                    Paiements en attente de vérification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-warning" />
                        </div>
                        <div>
                          <p className="font-medium">{getUserName(payment.user_id)}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCFA(payment.amount)} • {payment.payment_method}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(payment.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          onClick={() => handleVerifyPayment(payment.id, "rejected")}
                          disabled={verifyPayment.isPending}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-success hover:bg-success/90"
                          onClick={() => handleVerifyPayment(payment.id, "verified")}
                          disabled={verifyPayment.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Vérifier
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Balances List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Soldes de commissions
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 ml-2">
                          <Cloud className="w-4 h-4 text-primary" />
                          <span className="text-xs text-muted-foreground font-normal">Cloud</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ces données proviennent du cloud (Supabase)</p>
                        <p className="text-xs text-muted-foreground">Les ventes locales non synchronisées ne sont pas incluses</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {balancesLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 rounded-xl" />
                    ))}
                  </div>
                ) : balances && balances.length > 0 ? (
                  <div className="space-y-3">
                    {balances.map((balance) => (
                      <div
                        key={balance.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{getUserName(balance.user_id)}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <UserSyncStatus 
                                cloudSales={0} 
                                cloudAmount={balance.total_earned || 0}
                                hasPendingSync={false}
                                pendingCount={0}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Commissions gagnées: {formatCFA(balance.total_earned || 0)} • Payé: {formatCFA(balance.total_paid || 0)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{formatCFA(balance.balance || 0)}</p>
                          <p className="text-xs text-muted-foreground">à collecter</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Aucun solde de commission en attente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
