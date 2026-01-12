import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Plus, Search, Pencil, Trash2, UtensilsCrossed, Download, Check } from "lucide-react";
import { useMenuItems, MENU_CATEGORIES, type MenuCategory, type MenuItem } from "@/hooks/use-menu-items";
import { useStock } from "@/hooks/use-stock";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export function MenuManagement() {
  const { menuItems, menuItemsByCategory, loading, addMenuItem, updateMenuItem, deleteMenuItem, refetch } = useMenuItems();
  const { items: stockItems } = useStock();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isImportSheetOpen, setIsImportSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<MenuItem | null>(null);
  const [selectedForImport, setSelectedForImport] = useState<Set<string>>(new Set());
  const [importCategory, setImportCategory] = useState<MenuCategory | "">("");
  const [isImporting, setIsImporting] = useState(false);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState<MenuCategory | "">("");
  const [formModel, setFormModel] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Filter stock items that are NOT already menu items
  const importableStockItems = stockItems.filter(
    item => !item.is_menu_item && item.unit_price > 0
  );

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " CFA";
  };

  // Filter items by search and category
  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const resetForm = () => {
    setFormName("");
    setFormPrice("");
    setFormCategory("");
    setFormModel("");
  };

  const openAddSheet = () => {
    resetForm();
    setEditingItem(null);
    setIsAddSheetOpen(true);
  };

  const openEditSheet = (item: MenuItem) => {
    setFormName(item.name);
    setFormPrice(String(item.price));
    setFormCategory(item.category || "");
    setFormModel(item.model || "");
    setEditingItem(item);
    setIsAddSheetOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Entrez un nom pour l'article");
      return;
    }
    if (!formPrice || parseInt(formPrice) <= 0) {
      toast.error("Entrez un prix valide");
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        // Update existing item
        await updateMenuItem(editingItem.id, {
          name: formName.trim(),
          price: parseInt(formPrice),
          category: formCategory as MenuCategory || null,
          model: formModel.trim() || null,
        });
        toast.success("Article modifié");
      } else {
        // Add new item
        await addMenuItem({
          name: formName.trim(),
          price: parseInt(formPrice),
          category: formCategory as MenuCategory || undefined,
          model: formModel.trim() || undefined,
        });
        toast.success("Article ajouté au menu");
      }
      setIsAddSheetOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      console.error("Error saving menu item:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmItem) return;
    
    try {
      await deleteMenuItem(deleteConfirmItem.id);
      toast.success("Article supprimé");
      setDeleteConfirmItem(null);
      refetch();
    } catch (error) {
      console.error("Error deleting menu item:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = MENU_CATEGORIES.find(c => c.value === category);
    return cat?.icon || "📦";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-amber-500" />
            Menu
          </h2>
          <p className="text-sm text-muted-foreground">
            {menuItems.length} article{menuItems.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {importableStockItems.length > 0 && (
            <Button 
              onClick={() => setIsImportSheetOpen(true)} 
              variant="outline" 
              size="sm" 
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Importer
            </Button>
          )}
          <Button onClick={openAddSheet} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un article..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          variant={activeCategory === "all" ? "default" : "outline"}
          size="sm"
          className="shrink-0"
          onClick={() => setActiveCategory("all")}
        >
          Tous
        </Button>
        {MENU_CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant={activeCategory === cat.value ? "default" : "outline"}
            size="sm"
            className="shrink-0 gap-1"
            onClick={() => setActiveCategory(cat.value)}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Items List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Chargement...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <UtensilsCrossed className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <p className="font-medium">Aucun article</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery 
                ? "Aucun résultat pour cette recherche" 
                : "Créez votre premier article de menu"}
            </p>
          </div>
          {!searchQuery && (
            <Button onClick={openAddSheet} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un article
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <Card 
              key={item.id} 
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openEditSheet(item)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">{getCategoryIcon(item.category || "")}</span>
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{item.name}</h3>
                    {item.model && (
                      <p className="text-sm text-muted-foreground truncate">{item.model}</p>
                    )}
                    {item.category && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {MENU_CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="text-lg font-bold text-primary">
                    {formatMoney(item.price)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Sheet */}
      <Sheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle>
              {editingItem ? "Modifier l'article" : "Nouvel article"}
            </SheetTitle>
          </SheetHeader>
          
          <div className="py-6 space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nom de l'article *</Label>
              <Input
                id="name"
                placeholder="Ex: Jus de Corossol"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">Prix (CFA) *</Label>
              <Input
                id="price"
                type="number"
                placeholder="1500"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select value={formCategory} onValueChange={(v) => setFormCategory(v as MenuCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {MENU_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        {cat.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description/Model */}
            <div className="space-y-2">
              <Label htmlFor="model">Description (optionnel)</Label>
              <Input
                id="model"
                placeholder="Ex: Grand format 50cl"
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              {editingItem && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsAddSheetOpen(false);
                    setDeleteConfirmItem(editingItem);
                  }}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 gap-2"
              >
                {isSaving ? "Enregistrement..." : editingItem ? "Modifier" : "Ajouter"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmItem} onOpenChange={(open) => !open && setDeleteConfirmItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'article "{deleteConfirmItem?.name}" sera définitivement supprimé du menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import from Stock Sheet */}
      <Sheet open={isImportSheetOpen} onOpenChange={setIsImportSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Importer depuis le stock
            </SheetTitle>
          </SheetHeader>
          
          <div className="py-4 space-y-4 h-[calc(100%-8rem)] overflow-auto">
            {/* Category for imported items */}
            <div className="space-y-2">
              <Label>Catégorie pour les articles importés</Label>
              <Select value={importCategory} onValueChange={(v) => setImportCategory(v as MenuCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {MENU_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        {cat.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stock items list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Produits du stock ({importableStockItems.length})</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectedForImport.size === importableStockItems.length) {
                      setSelectedForImport(new Set());
                    } else {
                      setSelectedForImport(new Set(importableStockItems.map(i => i.id)));
                    }
                  }}
                >
                  {selectedForImport.size === importableStockItems.length ? "Tout désélectionner" : "Tout sélectionner"}
                </Button>
              </div>
              
              <div className="space-y-2 max-h-[40vh] overflow-auto">
                {importableStockItems.map((item) => (
                  <Card 
                    key={item.id}
                    className={`p-3 cursor-pointer transition-all ${
                      selectedForImport.has(item.id) 
                        ? "ring-2 ring-primary bg-primary/5" 
                        : ""
                    }`}
                    onClick={() => {
                      setSelectedForImport(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(item.id)) {
                          newSet.delete(item.id);
                        } else {
                          newSet.add(item.id);
                        }
                        return newSet;
                      });
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={selectedForImport.has(item.id)}
                        onCheckedChange={() => {}}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        {item.model && (
                          <p className="text-sm text-muted-foreground truncate">{item.model}</p>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-primary shrink-0">
                        {formatMoney(item.unit_price)}
                      </p>
                    </div>
                  </Card>
                ))}
                
                {importableStockItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun produit à importer
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Import button */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
            <Button
              onClick={async () => {
                if (selectedForImport.size === 0) {
                  toast.error("Sélectionnez au moins un produit");
                  return;
                }
                
                setIsImporting(true);
                try {
                  let successCount = 0;
                  for (const itemId of selectedForImport) {
                    const stockItem = importableStockItems.find(i => i.id === itemId);
                    if (stockItem) {
                      await addMenuItem({
                        name: stockItem.name,
                        price: stockItem.unit_price,
                        category: importCategory as MenuCategory || undefined,
                        model: stockItem.model || undefined,
                      });
                      successCount++;
                    }
                  }
                  toast.success(`${successCount} article${successCount > 1 ? "s" : ""} importé${successCount > 1 ? "s" : ""}`);
                  setSelectedForImport(new Set());
                  setImportCategory("");
                  setIsImportSheetOpen(false);
                  refetch();
                } catch (error) {
                  console.error("Import error:", error);
                  toast.error("Erreur lors de l'import");
                } finally {
                  setIsImporting(false);
                }
              }}
              disabled={selectedForImport.size === 0 || isImporting}
              className="w-full h-12 gap-2"
            >
              {isImporting ? (
                "Import en cours..."
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  Importer {selectedForImport.size > 0 ? `(${selectedForImport.size})` : ""}
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
