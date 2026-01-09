import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminCodes, useAdminPlans } from "@/hooks/use-admin-stats";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Copy, QrCode, Check, Clock, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function AdminCodes() {
  const { data: codes, isLoading } = useAdminCodes();
  const { data: plans } = useAdminPlans();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [codeCount, setCodeCount] = useState(10);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [batchName, setBatchName] = useState("");
  const [filter, setFilter] = useState<"all" | "used" | "available">("all");

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "DEKON-";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code += "-";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleGenerateCodes = async () => {
    if (!selectedPlan || !user) {
      toast.error("Sélectionnez un plan");
      return;
    }

    setGenerating(true);
    try {
      const newCodes = [];
      for (let i = 0; i < codeCount; i++) {
        newCodes.push({
          code: generateCode(),
          plan_id: selectedPlan,
          created_by: user.id,
          batch_name: batchName || null,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        });
      }

      const { error } = await supabase.from("recharge_codes").insert(newCodes);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["admin-codes"] });
      toast.success(`${codeCount} codes générés avec succès`);
      setGenerateOpen(false);
      setCodeCount(10);
      setSelectedPlan("");
      setBatchName("");
    } catch (error) {
      toast.error("Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copié");
  };

  const filteredCodes = codes?.filter((code) => {
    if (filter === "used") return code.is_used;
    if (filter === "available") return !code.is_used;
    return true;
  });

  const usedCount = codes?.filter((c) => c.is_used).length || 0;
  const availableCount = codes?.filter((c) => !c.is_used).length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Codes Prépayés</h1>
            <p className="text-muted-foreground">
              Générez et gérez les codes d'activation
            </p>
          </div>
          <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Générer des codes
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Générer des codes</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Plan d'abonnement</Label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans?.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - {plan.price} F
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nombre de codes</Label>
                  <Select
                    value={codeCount.toString()}
                    onValueChange={(v) => setCodeCount(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 codes</SelectItem>
                      <SelectItem value="25">25 codes</SelectItem>
                      <SelectItem value="50">50 codes</SelectItem>
                      <SelectItem value="100">100 codes</SelectItem>
                      <SelectItem value="500">500 codes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nom du batch (optionnel)</Label>
                  <Input
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="Ex: Campagne Dakar Janvier"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleGenerateCodes}
                  disabled={generating || !selectedPlan}
                >
                  {generating ? "Génération..." : `Générer ${codeCount} codes`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card
            className={`cursor-pointer transition-colors ${
              filter === "all" ? "border-primary" : ""
            }`}
            onClick={() => setFilter("all")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{codes?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-colors ${
              filter === "available" ? "border-primary" : ""
            }`}
            onClick={() => setFilter("available")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{availableCount}</p>
                <p className="text-xs text-muted-foreground">Disponibles</p>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-colors ${
              filter === "used" ? "border-primary" : ""
            }`}
            onClick={() => setFilter("used")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{usedCount}</p>
                <p className="text-xs text-muted-foreground">Utilisés</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Codes Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Liste des codes</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
            </div>
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
                      <TableHead>Code</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="hidden lg:table-cell">Batch</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="hidden lg:table-cell">Date</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCodes?.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell>
                          <span className="font-mono font-medium">{code.code}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {(code.subscription_plans as any)?.name || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {code.batch_name || "-"}
                        </TableCell>
                        <TableCell>
                          {code.is_used ? (
                            <Badge className="bg-success/10 text-success">Utilisé</Badge>
                          ) : (
                            <Badge variant="secondary">Disponible</Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(code.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyCode(code.code)}
                          >
                            <Copy className="w-4 h-4" />
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
      </div>
    </AdminLayout>
  );
}
