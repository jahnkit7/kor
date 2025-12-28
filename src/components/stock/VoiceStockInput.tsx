import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Mic, Square, Loader2, Trash2, Edit2, Check, X, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { NewStockItem } from "@/hooks/use-stock";

interface VoiceStockItem extends NewStockItem {
  tempId: string;
  isEditing?: boolean;
}

interface VoiceStockInputProps {
  onComplete: (items: NewStockItem[]) => Promise<void>;
  onCancel: () => void;
}

export function VoiceStockInput({ onComplete, onCancel }: VoiceStockInputProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"record" | "analyzing" | "validate">("record");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [items, setItems] = useState<VoiceStockItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const startRecording = useCallback(async () => {
    try {
      // Use Web Speech API for transcription (free, browser-based)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        toast({
          title: "Non supporté",
          description: "Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome ou Edge.",
          variant: "destructive",
        });
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "fr-FR";
      recognition.continuous = true;
      recognition.interimResults = true;

      let finalTranscript = "";

      recognition.onresult = (event) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + " ";
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        setTranscript(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== "aborted") {
          toast({
            title: "Erreur",
            description: "Erreur lors de l'enregistrement vocal",
            variant: "destructive",
          });
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      setTranscript("");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'accéder au microphone",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);

    if (!transcript.trim()) {
      toast({
        title: "Aucune dictée",
        description: "Aucun texte n'a été détecté. Réessayez.",
        variant: "destructive",
      });
      return;
    }

    // Analyze with AI
    setStep("analyzing");

    try {
      const { data, error } = await supabase.functions.invoke("analyze-stock-voice", {
        body: { transcript: transcript.trim() },
      });

      if (error) throw error;

      const voiceItems: VoiceStockItem[] = (data.items || []).map((item: NewStockItem, idx: number) => ({
        ...item,
        tempId: `voice-${Date.now()}-${idx}`,
        source: "voice" as const,
      }));

      setItems(voiceItems);
      setSuggestions(data.suggestions || []);
      setStep("validate");

      if (voiceItems.length === 0) {
        toast({
          title: "Aucun produit détecté",
          description: "Réessayez avec une dictée plus claire",
          variant: "destructive",
        });
        setStep("record");
      }
    } catch (error) {
      console.error("Error analyzing voice:", error);
      toast({
        title: "Erreur d'analyse",
        description: "Impossible d'analyser la dictée. Réessayez.",
        variant: "destructive",
      });
      setStep("record");
    }
  }, [transcript, toast]);

  const updateItem = (tempId: string, updates: Partial<VoiceStockItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, ...updates } : item))
    );
  };

  const deleteItem = (tempId: string) => {
    setItems((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const handleComplete = async () => {
    if (items.length === 0) return;

    setIsSubmitting(true);
    try {
      const stockItems: NewStockItem[] = items.map(({ tempId, isEditing, ...item }) => item);
      await onComplete(stockItems);
    } catch (error) {
      console.error("Error completing stock:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " CFA";
  };

  // Recording step
  if (step === "record") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Dictez votre stock</h3>
          <p className="text-sm text-muted-foreground">
            Parlez naturellement : "J'ai 50 savons Lux à 500 francs, 3 cartons de Fanta..."
          </p>
        </div>

        {/* Recording button */}
        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            variant={isRecording ? "destructive" : "default"}
            className={`h-24 w-24 rounded-full ${isRecording ? "animate-pulse" : ""}`}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? (
              <Square className="h-10 w-10" />
            ) : (
              <Mic className="h-10 w-10" />
            )}
          </Button>
          <span className="text-sm text-muted-foreground">
            {isRecording ? "Appuyez pour arrêter" : "Appuyez pour dicter"}
          </span>
        </div>

        {/* Live transcript */}
        {transcript && (
          <Card className="p-4 bg-muted/50">
            <p className="text-sm italic">"{transcript}"</p>
          </Card>
        )}

        <Button variant="outline" onClick={onCancel} className="w-full">
          Annuler
        </Button>
      </div>
    );
  }

  // Analyzing step
  if (step === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Analyse en cours...</p>
        <p className="text-sm text-muted-foreground italic">"{transcript}"</p>
      </div>
    );
  }

  // Validation step
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Valider le stock</h3>
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="h-3 w-3" />
          {items.length} produit{items.length > 1 ? "s" : ""}
        </Badge>
      </div>

      {suggestions.length > 0 && (
        <Card className="p-3 bg-accent/10 border-accent/20">
          <p className="text-sm text-accent-foreground">
            💡 {suggestions[0]}
          </p>
        </Card>
      )}

      {/* Items list */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {items.map((item) => (
          <VoiceStockItemCard
            key={item.tempId}
            item={item}
            onUpdate={(updates) => updateItem(item.tempId, updates)}
            onDelete={() => deleteItem(item.tempId)}
            formatMoney={formatMoney}
          />
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Aucun produit à valider</p>
          <Button variant="link" onClick={() => setStep("record")}>
            Recommencer la dictée
          </Button>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
        <Button
          onClick={handleComplete}
          disabled={items.length === 0 || isSubmitting}
          className="flex-1 gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Générer mon stock
        </Button>
      </div>
    </div>
  );
}

// Individual item card component
function VoiceStockItemCard({
  item,
  onUpdate,
  onDelete,
  formatMoney,
}: {
  item: VoiceStockItem;
  onUpdate: (updates: Partial<VoiceStockItem>) => void;
  onDelete: () => void;
  formatMoney: (amount: number) => string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    name: item.name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    model: item.model || "",
  });

  const handleSave = () => {
    onUpdate({
      name: editValues.name,
      quantity: Number(editValues.quantity) || 1,
      unit_price: Number(editValues.unit_price) || 0,
      model: editValues.model || null,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValues({
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      model: item.model || "",
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Card className="p-4 space-y-3">
        <Input
          value={editValues.name}
          onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
          placeholder="Nom du produit"
        />
        <div className="flex gap-2">
          <Input
            type="number"
            value={editValues.quantity}
            onChange={(e) => setEditValues({ ...editValues, quantity: Number(e.target.value) })}
            placeholder="Quantité"
            className="flex-1"
          />
          <Input
            type="number"
            value={editValues.unit_price}
            onChange={(e) => setEditValues({ ...editValues, unit_price: Number(e.target.value) })}
            placeholder="Prix"
            className="flex-1"
          />
        </div>
        <Input
          value={editValues.model}
          onChange={(e) => setEditValues({ ...editValues, model: e.target.value })}
          placeholder="Modèle (optionnel)"
        />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleCancel} className="flex-1">
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleSave} className="flex-1">
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground truncate">{item.name}</p>
            <Badge variant="outline" className="text-xs shrink-0">
              Voix
            </Badge>
          </div>
          <div className="flex items-baseline gap-4 mt-1">
            <span className="text-2xl font-bold money-display">{item.quantity}</span>
            <span className="text-lg font-semibold text-primary">
              {formatMoney(item.unit_price)}
            </span>
          </div>
          {item.model && (
            <p className="text-xs text-muted-foreground mt-1">Modèle: {item.model}</p>
          )}
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}
