import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Mic, Trash2, Edit2, Zap, Check, X, Loader2, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { useVoiceEntries, type VoiceEntry } from "@/hooks/use-voice-entries";
import { parseTranscriptLocally, type ParsedStockItem } from "@/lib/local-stock-parser";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { NewStockItem } from "@/hooks/use-stock";

interface VoiceEntriesHistoryProps {
  onAddItems: (items: NewStockItem[]) => Promise<void>;
}

export function VoiceEntriesHistory({ onAddItems }: VoiceEntriesHistoryProps) {
  const { entries, loading, deleteEntry, updateEntry, refetch } = useVoiceEntries();
  const { toast } = useToast();
  
  const [selectedEntry, setSelectedEntry] = useState<VoiceEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState("");
  const [parsedItems, setParsedItems] = useState<ParsedStockItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "d MMM à HH:mm", { locale: fr });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "parsed":
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Traité</Badge>;
      case "error":
        return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Erreur</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> En attente</Badge>;
    }
  };

  const handleOpenEntry = (entry: VoiceEntry) => {
    setSelectedEntry(entry);
    setEditedTranscript(entry.raw_transcript);
    setParsedItems([]);
    setIsEditing(false);
  };

  const handleCloseDialog = () => {
    setSelectedEntry(null);
    setEditedTranscript("");
    setParsedItems([]);
    setIsEditing(false);
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    try {
      const result = parseTranscriptLocally(editedTranscript);
      setParsedItems(result.items);
      
      if (result.items.length === 0) {
        toast({
          title: "Aucun produit détecté",
          description: "Modifiez la transcription et réessayez",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Analyse terminée",
          description: `${result.items.length} produit(s) détecté(s)`,
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedEntry) return;
    
    const success = await updateEntry(selectedEntry.id, {
      raw_transcript: editedTranscript,
    });
    
    if (success) {
      setIsEditing(false);
      toast({ title: "Transcription mise à jour" });
    }
  };

  const handleAddToStock = async () => {
    if (parsedItems.length === 0 || !selectedEntry) return;
    
    setIsSaving(true);
    try {
      const stockItems: NewStockItem[] = parsedItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        model: item.model,
        source: "voice" as const,
      }));
      
      await onAddItems(stockItems);
      
      // Mark entry as parsed
      await updateEntry(selectedEntry.id, {
        status: "parsed",
        parsed_items: parsedItems as unknown as import("@/integrations/supabase/types").Json,
      });
      
      toast({
        title: "Stock ajouté",
        description: `${stockItems.length} produit(s) ajouté(s) au stock`,
      });
      
      handleCloseDialog();
      refetch();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteEntry(deleteConfirmId);
    setDeleteConfirmId(null);
    if (selectedEntry?.id === deleteConfirmId) {
      handleCloseDialog();
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " CFA";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <Mic className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Aucune dictée enregistrée</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {entries.map((entry) => (
          <Card
            key={entry.id}
            className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleOpenEntry(entry)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm line-clamp-2">{entry.raw_transcript}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(entry.created_at)}
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                {getStatusBadge(entry.status)}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(entry.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Entry Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => handleCloseDialog()}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Dictée vocale
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Transcript */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Transcription</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="h-7 gap-1"
                >
                  {isEditing ? (
                    <>
                      <X className="h-3 w-3" /> Annuler
                    </>
                  ) : (
                    <>
                      <Edit2 className="h-3 w-3" /> Modifier
                    </>
                  )}
                </Button>
              </div>
              
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editedTranscript}
                    onChange={(e) => setEditedTranscript(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button size="sm" onClick={handleSaveEdit} className="gap-1">
                    <Check className="h-3 w-3" /> Enregistrer
                  </Button>
                </div>
              ) : (
                <Card className="p-3 bg-muted/30">
                  <p className="text-sm italic">"{selectedEntry?.raw_transcript}"</p>
                </Card>
              )}
            </div>

            {/* Analyze Button */}
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full gap-2"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Ré-analyser
            </Button>

            {/* Parsed Items */}
            {parsedItems.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Produits détectés ({parsedItems.length})
                </label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {parsedItems.map((item, idx) => (
                    <Card key={idx} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Qté: {item.quantity} • Prix: {formatMoney(item.unit_price)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            item.confidence === "high"
                              ? "default"
                              : item.confidence === "medium"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {item.confidence === "high"
                            ? "Fiable"
                            : item.confidence === "medium"
                            ? "Moyen"
                            : "À vérifier"}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>

                <Button
                  onClick={handleAddToStock}
                  disabled={isSaving}
                  className="w-full gap-2"
                  variant="default"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Ajouter au stock
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteConfirmId(selectedEntry?.id || null)}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" /> Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette dictée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La dictée sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
