import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
// AdminLayout is now provided by AdminProtectedLayout
import {
  Plus,
  Ticket,
  Percent,
  Calendar,
  Users,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePromoCodes,
  useCreatePromoCode,
  useUpdatePromoCode,
  useDeletePromoCode,
  PromoCode,
} from "@/hooks/use-promo-codes";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

function generateRandomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function AdminPromoCodes() {
  return <AdminPromoCodesContent />;
}

function AdminPromoCodesContent() {
  const { user } = useAuth();
  const { data: promoCodes, isLoading } = usePromoCodes();
  const createPromoCode = useCreatePromoCode();
  const updatePromoCode = useUpdatePromoCode();
  const deletePromoCode = useDeletePromoCode();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_value: 20,
    applies_to_duration: "first_month" as "first_month" | "all",
    max_uses: null as number | null,
    valid_until: "",
  });

  const handleCreate = async () => {
    if (!user?.id) return;
    if (!newCode.code.trim()) {
      toast.error("Veuillez entrer un code");
      return;
    }

    await createPromoCode.mutateAsync({
      code: newCode.code,
      discount_type: newCode.discount_type,
      discount_value: newCode.discount_value,
      applies_to_plan: null,
      applies_to_duration: newCode.applies_to_duration,
      max_uses: newCode.max_uses,
      valid_from: new Date().toISOString(),
      valid_until: newCode.valid_until || null,
      is_active: true,
      created_by: user.id,
    });

    setIsCreateOpen(false);
    setNewCode({
      code: "",
      discount_type: "percentage",
      discount_value: 20,
      applies_to_duration: "first_month",
      max_uses: null,
      valid_until: "",
    });
  };

  const handleToggleActive = async (promo: PromoCode) => {
    await updatePromoCode.mutateAsync({
      id: promo.id,
      is_active: !promo.is_active,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Supprimer ce code promo ?")) {
      await deletePromoCode.mutateAsync(id);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copié !");
  };

  const activeCodesCount = promoCodes?.filter((p) => p.is_active).length || 0;
  const totalUsage = promoCodes?.reduce((sum, p) => sum + p.used_count, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Codes Promo</h1>
          <p className="text-muted-foreground">
            Gérez les codes promotionnels pour les abonnements
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un code promo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <div className="flex gap-2">
                  <Input
                    value={newCode.code}
                    onChange={(e) =>
                      setNewCode({ ...newCode, code: e.target.value.toUpperCase() })
                    }
                    placeholder="BIENVENUE20"
                    className="uppercase"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setNewCode({ ...newCode, code: generateRandomCode() })
                    }
                  >
                    Générer
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type de réduction</Label>
                  <Select
                    value={newCode.discount_type}
                    onValueChange={(v) =>
                      setNewCode({
                        ...newCode,
                        discount_type: v as "percentage" | "fixed",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                      <SelectItem value="fixed">Montant fixe (CFA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    Valeur{" "}
                    {newCode.discount_type === "percentage" ? "(%)" : "(CFA)"}
                  </Label>
                  <Input
                    type="number"
                    value={newCode.discount_value}
                    onChange={(e) =>
                      setNewCode({
                        ...newCode,
                        discount_value: parseInt(e.target.value) || 0,
                      })
                    }
                    min={1}
                    max={newCode.discount_type === "percentage" ? 100 : undefined}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Application</Label>
                <Select
                  value={newCode.applies_to_duration}
                  onValueChange={(v) =>
                    setNewCode({
                      ...newCode,
                      applies_to_duration: v as "first_month" | "all",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first_month">Premier mois uniquement</SelectItem>
                    <SelectItem value="all">Toutes les périodes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Limite d'utilisation (optionnel)</Label>
                  <Input
                    type="number"
                    value={newCode.max_uses || ""}
                    onChange={(e) =>
                      setNewCode({
                        ...newCode,
                        max_uses: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    placeholder="Illimité"
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date d'expiration (optionnel)</Label>
                  <Input
                    type="date"
                    value={newCode.valid_until}
                    onChange={(e) =>
                      setNewCode({ ...newCode, valid_until: e.target.value })
                    }
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={createPromoCode.isPending}
              >
                {createPromoCode.isPending ? "Création..." : "Créer le code"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Ticket className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{promoCodes?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total codes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <ToggleRight className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCodesCount}</p>
                <p className="text-sm text-muted-foreground">Codes actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsage}</p>
                <p className="text-sm text-muted-foreground">Utilisations totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Codes List */}
      <Card>
        <CardHeader>
          <CardTitle>Tous les codes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !promoCodes || promoCodes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Ticket className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun code promo créé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {promoCodes.map((promo) => (
                <div
                  key={promo.id}
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    promo.is_active
                      ? "bg-secondary/50 border-border/50"
                      : "bg-muted/30 border-border/30 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => copyToClipboard(promo.code)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border font-mono font-bold text-lg hover:bg-secondary transition-colors"
                    >
                      {promo.code}
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={promo.is_active ? "default" : "secondary"}>
                          {promo.is_active ? "Actif" : "Inactif"}
                        </Badge>
                        <span className="flex items-center gap-1 text-sm">
                          <Percent className="w-3 h-3" />
                          {promo.discount_type === "percentage"
                            ? `${promo.discount_value}%`
                            : `${promo.discount_value} CFA`}
                        </span>
                        {promo.applies_to_duration === "first_month" && (
                          <span className="text-xs text-muted-foreground">
                            (1er mois)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {promo.used_count}
                          {promo.max_uses && `/${promo.max_uses}`} utilisations
                        </span>
                        {promo.valid_until && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Expire le{" "}
                            {format(new Date(promo.valid_until), "dd MMM yyyy", {
                              locale: fr,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(promo)}
                      title={promo.is_active ? "Désactiver" : "Activer"}
                    >
                      {promo.is_active ? (
                        <ToggleRight className="w-5 h-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(promo.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
