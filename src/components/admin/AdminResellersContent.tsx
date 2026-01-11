import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, MoreHorizontal, Trash2, Power, PowerOff, Users, TrendingUp, Package } from "lucide-react";

interface Reseller {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  commission_rate: number;
  is_active: boolean;
  total_codes_sold: number;
  total_earnings: number;
  created_at: string;
}

export function AdminResellersContent() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resellerToDelete, setResellerToDelete] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [commissionRate, setCommissionRate] = useState("10");

  const { data: resellers, isLoading } = useQuery({
    queryKey: ["admin-resellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resellers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Reseller[];
    },
  });

  const { data: codesStats } = useQuery({
    queryKey: ["admin-reseller-codes-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recharge_codes")
        .select("reseller_id, is_used")
        .not("reseller_id", "is", null);

      if (error) throw error;
      
      const stats: Record<string, { assigned: number; sold: number }> = {};
      data?.forEach((code) => {
        if (!stats[code.reseller_id!]) {
          stats[code.reseller_id!] = { assigned: 0, sold: 0 };
        }
        stats[code.reseller_id!].assigned++;
        if (code.is_used) {
          stats[code.reseller_id!].sold++;
        }
      });
      return stats;
    },
  });

  const handleCreateReseller = async () => {
    if (!name.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from("resellers").insert({
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        city: city.trim() || null,
        commission_rate: parseFloat(commissionRate) || 10,
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["admin-resellers"] });
      toast.success("Revendeur créé");
      setCreateOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (resellerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("resellers")
        .update({ is_active: !currentStatus })
        .eq("id", resellerId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["admin-resellers"] });
      toast.success(currentStatus ? "Revendeur désactivé" : "Revendeur activé");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDeleteReseller = async () => {
    if (!resellerToDelete) return;
    
    try {
      const { error } = await supabase
        .from("resellers")
        .delete()
        .eq("id", resellerToDelete);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["admin-resellers"] });
      toast.success("Revendeur supprimé");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeleteDialogOpen(false);
      setResellerToDelete(null);
    }
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setCity("");
    setCommissionRate("10");
  };

  const totalResellers = resellers?.length || 0;
  const activeResellers = resellers?.filter(r => r.is_active).length || 0;
  const totalCodesSold = resellers?.reduce((sum, r) => sum + (r.total_codes_sold || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Gestion des revendeurs</h2>
          <p className="text-muted-foreground text-sm">
            Gérez les revendeurs de codes prépayés
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau revendeur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un revendeur</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nom du revendeur"
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+228 90 XX XX XX"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Ville</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Lomé"
                />
              </div>
              <div className="space-y-2">
                <Label>Commission (%)</Label>
                <Input
                  type="number"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  placeholder="10"
                  min="0"
                  max="100"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreateReseller}
                disabled={creating || !name.trim()}
              >
                {creating ? "Création..." : "Créer le revendeur"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalResellers}</p>
              <p className="text-xs text-muted-foreground">Revendeurs ({activeResellers} actifs)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCodesSold}</p>
              <p className="text-xs text-muted-foreground">Codes vendus</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {resellers?.reduce((sum, r) => sum + (r.total_earnings || 0), 0).toLocaleString()} F
              </p>
              <p className="text-xs text-muted-foreground">Commissions totales</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resellers Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Liste des revendeurs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Codes attribués</TableHead>
                    <TableHead>Codes vendus</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resellers?.map((reseller) => {
                    const stats = codesStats?.[reseller.id] || { assigned: 0, sold: 0 };
                    return (
                      <TableRow key={reseller.id} className={!reseller.is_active ? "opacity-50" : ""}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{reseller.name}</p>
                            {reseller.phone && (
                              <p className="text-xs text-muted-foreground">{reseller.phone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{reseller.city || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{stats.assigned}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-500/10 text-green-600">{stats.sold}</Badge>
                        </TableCell>
                        <TableCell>{reseller.commission_rate}%</TableCell>
                        <TableCell>
                          {reseller.is_active ? (
                            <Badge className="bg-green-500/10 text-green-600">Actif</Badge>
                          ) : (
                            <Badge variant="secondary">Inactif</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(reseller.id, reseller.is_active)}
                              >
                                {reseller.is_active ? (
                                  <>
                                    <PowerOff className="w-4 h-4 mr-2" />
                                    Désactiver
                                  </>
                                ) : (
                                  <>
                                    <Power className="w-4 h-4 mr-2" />
                                    Activer
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setResellerToDelete(reseller.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {resellers?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucun revendeur pour le moment
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce revendeur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les codes attribués à ce revendeur seront désassociés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReseller}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
