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
  Commission
} from "@/hooks/use-admin-commissions";
import { useAdminCountries } from "@/hooks/use-admin-stats";
import { 
  Percent, 
  Plus, 
  Calculator, 
  TrendingUp,
  Activity,
  ToggleLeft,
  Trash2,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "sonner";

export default function AdminCommissions() {
  const { data: commissions, isLoading: commissionsLoading } = useAdminCommissions();
  const { data: stats, isLoading: statsLoading } = useCommissionStats();
  const { data: countries } = useAdminCountries();
  const createCommission = useCreateCommission();
  const toggleCommission = useToggleCommission();
  const deleteCommission = useDeleteCommission();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [simulationAmount, setSimulationAmount] = useState("");
  const [simulationType, setSimulationType] = useState("cash");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "percentage" as "percentage" | "fixed",
    value: "",
    applies_to: "all_sales" as "all_sales" | "cash_only" | "credit_only",
    country_id: "",
  });

  const formatCFA = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " F";
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
                    value={formData.country_id}
                    onValueChange={(v) => setFormData({ ...formData, country_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les pays (global)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les pays</SelectItem>
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
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10">
              <span className="text-sm text-muted-foreground">=</span>
              <span className="text-xl font-bold text-primary">
                {formatCFA(simulatedCommission)}
              </span>
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
      </div>
    </AdminLayout>
  );
}
