import { useState } from "react";
// AdminLayout is now provided by AdminProtectedLayout
import { 
  useRoadmapItems, 
  useCreateRoadmapItem, 
  useUpdateRoadmapItem, 
  useDeleteRoadmapItem,
  RoadmapStatus,
  RoadmapPriority,
  RoadmapCategory,
  RoadmapItem
} from "@/hooks/use-roadmap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  MoreVertical, 
  Trash2, 
  Edit, 
  Bug, 
  Sparkles, 
  Shield, 
  Zap,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Layers
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const statusConfig: Record<RoadmapStatus, { label: string; icon: React.ReactNode; color: string }> = {
  backlog: { label: "Backlog", icon: <Layers className="w-4 h-4" />, color: "bg-muted text-muted-foreground" },
  in_progress: { label: "En cours", icon: <Clock className="w-4 h-4" />, color: "bg-blue-500/10 text-blue-500" },
  testing: { label: "En test", icon: <AlertTriangle className="w-4 h-4" />, color: "bg-warning/10 text-warning" },
  completed: { label: "Terminé", icon: <CheckCircle className="w-4 h-4" />, color: "bg-success/10 text-success" },
  cancelled: { label: "Annulé", icon: <XCircle className="w-4 h-4" />, color: "bg-destructive/10 text-destructive" },
};

const priorityConfig: Record<RoadmapPriority, { label: string; color: string }> = {
  low: { label: "Basse", color: "bg-muted text-muted-foreground" },
  medium: { label: "Moyenne", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  high: { label: "Haute", color: "bg-warning/10 text-warning border-warning/20" },
  urgent: { label: "Urgente", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const categoryConfig: Record<RoadmapCategory, { label: string; icon: React.ReactNode }> = {
  feature: { label: "Fonctionnalité", icon: <Sparkles className="w-3 h-3" /> },
  bug: { label: "Bug", icon: <Bug className="w-3 h-3" /> },
  improvement: { label: "Amélioration", icon: <Zap className="w-3 h-3" /> },
  security: { label: "Sécurité", icon: <Shield className="w-3 h-3" /> },
  performance: { label: "Performance", icon: <Zap className="w-3 h-3" /> },
};

const statuses: RoadmapStatus[] = ["backlog", "in_progress", "testing", "completed"];

export default function AdminRoadmap() {
  const { data: items, isLoading } = useRoadmapItems();
  const createItem = useCreateRoadmapItem();
  const updateItem = useUpdateRoadmapItem();
  const deleteItem = useDeleteRoadmapItem();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as RoadmapPriority,
    category: "feature" as RoadmapCategory,
    status: "backlog" as RoadmapStatus,
    target_version: "",
    estimated_effort: "",
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      category: "feature",
      status: "backlog",
      target_version: "",
      estimated_effort: "",
    });
    setEditingItem(null);
  };

  const handleOpenDialog = (item?: RoadmapItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        description: item.description || "",
        priority: item.priority,
        category: item.category,
        status: item.status,
        target_version: item.target_version || "",
        estimated_effort: item.estimated_effort || "",
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;

    if (editingItem) {
      await updateItem.mutateAsync({
        id: editingItem.id,
        ...formData,
        description: formData.description || null,
        target_version: formData.target_version || null,
        estimated_effort: formData.estimated_effort || null,
      });
    } else {
      await createItem.mutateAsync({
        ...formData,
        description: formData.description || null,
        target_version: formData.target_version || null,
        estimated_effort: formData.estimated_effort || null,
        created_by: null,
        assigned_to: null,
      });
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleMoveToNextStatus = async (item: RoadmapItem) => {
    const currentIndex = statuses.indexOf(item.status);
    if (currentIndex < statuses.length - 1) {
      await updateItem.mutateAsync({
        id: item.id,
        status: statuses[currentIndex + 1],
      });
    }
  };

  const getItemsByStatus = (status: RoadmapStatus) => {
    return items?.filter((item) => item.status === status) || [];
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Roadmap</h1>
            <p className="text-muted-foreground">Suivi des fonctionnalités et améliorations</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Modifier" : "Ajouter"} un item</DialogTitle>
                <DialogDescription>
                  {editingItem ? "Modifier les détails de cet item" : "Ajouter une nouvelle entrée à la roadmap"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Titre *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Titre de la fonctionnalité"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description détaillée..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(v) => setFormData({ ...formData, category: v as RoadmapCategory })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              {config.icon}
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priorité</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(v) => setFormData({ ...formData, priority: v as RoadmapPriority })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v as RoadmapStatus })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              {config.icon}
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Version cible</Label>
                    <Input
                      value={formData.target_version}
                      onChange={(e) => setFormData({ ...formData, target_version: e.target.value })}
                      placeholder="ex: v2.0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Effort estimé</Label>
                  <Input
                    value={formData.estimated_effort}
                    onChange={(e) => setFormData({ ...formData, estimated_effort: e.target.value })}
                    placeholder="ex: 2-3 jours"
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleSubmit}
                  disabled={!formData.title.trim() || createItem.isPending || updateItem.isPending}
                >
                  {editingItem ? "Mettre à jour" : "Ajouter"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statuses.map((status) => {
            const count = getItemsByStatus(status).length;
            const config = statusConfig[status];
            return (
              <Card key={status} className="bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    {config.icon}
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  <p className="text-2xl font-bold">{count}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {statuses.map((status) => {
              const statusItems = getItemsByStatus(status);
              const config = statusConfig[status];
              return (
                <div key={status} className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <div className={`p-1.5 rounded-lg ${config.color}`}>
                      {config.icon}
                    </div>
                    <h3 className="font-semibold">{config.label}</h3>
                    <Badge variant="secondary" className="ml-auto">
                      {statusItems.length}
                    </Badge>
                  </div>
                  <div className="space-y-2 min-h-[200px] p-2 rounded-xl bg-secondary/20">
                    {statusItems.map((item) => (
                      <Card key={item.id} className="bg-card hover:shadow-md transition-shadow">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {categoryConfig[item.category].icon}
                              <span>{categoryConfig[item.category].label}</span>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDialog(item)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                {status !== "completed" && (
                                  <DropdownMenuItem onClick={() => handleMoveToNextStatus(item)}>
                                    <ArrowRight className="w-4 h-4 mr-2" />
                                    Avancer
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => deleteItem.mutate(item.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={priorityConfig[item.priority].color}>
                              {priorityConfig[item.priority].label}
                            </Badge>
                            {item.target_version && (
                              <Badge variant="secondary" className="text-xs">
                                {item.target_version}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: fr })}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                    {statusItems.length === 0 && (
                      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                        Aucun item
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
  );
}
