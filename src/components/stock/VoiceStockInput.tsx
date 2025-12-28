import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Loader2, Trash2, Edit2, Check, X, Sparkles, Keyboard, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { NewStockItem } from "@/hooks/use-stock";

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface VoiceStockItem extends NewStockItem {
  tempId: string;
  isEditing?: boolean;
}

interface VoiceStockInputProps {
  onComplete: (items: NewStockItem[]) => Promise<void>;
  onCancel: () => void;
}

// Check if browser supports speech recognition
const isSpeechRecognitionSupported = () => {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
};

export function VoiceStockInput({ onComplete, onCancel }: VoiceStockInputProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"record" | "analyzing" | "validate" | "manual">("record");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [manualText, setManualText] = useState("");
  const [items, setItems] = useState<VoiceStockItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 3;

  // Check browser support on mount
  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  // Start recording timer
  const startTimer = useCallback(() => {
    setRecordingDuration(0);
    timerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  // Stop recording timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      setErrorMessage(null);
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setIsSupported(false);
        setErrorMessage("Reconnaissance vocale non supportée. Utilisez le mode texte.");
        return;
      }

      // Request microphone permission first
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (permError) {
        console.error("Microphone permission error:", permError);
        setErrorMessage("Accès au microphone refusé. Autorisez l'accès ou utilisez le mode texte.");
        toast({
          title: "Microphone bloqué",
          description: "Autorisez l'accès ou utilisez le mode texte",
          variant: "destructive",
        });
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "fr-FR";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;

      let finalTranscript = "";
      let lastResultTime = Date.now();

      recognition.onstart = () => {
        console.log("Speech recognition started");
        setIsRecording(true);
        startTimer();
      };

      recognition.onresult = (event) => {
        lastResultTime = Date.now();
        let interimTranscript = "";
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            // Use best alternative
            finalTranscript += result[0].transcript + " ";
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        setTranscript(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        
        switch (event.error) {
          case "not-allowed":
          case "permission-denied":
            setErrorMessage("Accès au microphone refusé. Autorisez l'accès dans les paramètres de votre navigateur.");
            toast({
              title: "Microphone bloqué",
              description: "Autorisez l'accès au microphone",
              variant: "destructive",
            });
            break;
          case "no-speech":
            // Don't show error during recording - only when stopped
            if (!finalTranscript.trim() && !isRecording) {
              setErrorMessage("Aucune parole détectée. Parlez plus fort et clairement.");
            }
            break;
          case "audio-capture":
            setErrorMessage("Microphone non disponible. Vérifiez qu'il est connecté.");
            toast({
              title: "Microphone introuvable",
              description: "Vérifiez votre microphone",
              variant: "destructive",
            });
            break;
          case "network":
            setErrorMessage("Erreur réseau. Vérifiez votre connexion internet.");
            break;
          case "aborted":
            // User cancelled - no error needed
            break;
          default:
            if (event.error !== "aborted") {
              setErrorMessage(`Erreur: ${event.error}. Réessayez ou utilisez le mode texte.`);
            }
        }
        
        stopTimer();
        setIsRecording(false);
      };

      recognition.onend = () => {
        console.log("Speech recognition ended");
        stopTimer();
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setTranscript("");
      
    } catch (error) {
      console.error("Error starting recording:", error);
      setErrorMessage("Impossible de démarrer l'enregistrement. Essayez le mode texte.");
      toast({
        title: "Erreur",
        description: "Impossible d'accéder au microphone",
        variant: "destructive",
      });
    }
  }, [toast, startTimer, stopTimer, isRecording]);

  const stopRecording = useCallback(async () => {
    stopTimer();
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);

    const trimmedTranscript = transcript.trim();
    
    if (!trimmedTranscript) {
      setErrorMessage("Aucun texte détecté. Parlez plus fort ou utilisez le mode texte.");
      toast({
        title: "Aucune dictée",
        description: "Réessayez ou utilisez le mode texte",
        variant: "destructive",
      });
      return;
    }

    if (trimmedTranscript.length < 5) {
      setErrorMessage("Dictée trop courte. Décrivez vos produits avec plus de détails.");
      toast({
        title: "Dictée trop courte",
        description: "Décrivez vos produits plus en détail",
        variant: "destructive",
      });
      return;
    }

    await analyzeTranscript(trimmedTranscript);
  }, [transcript, toast, stopTimer]);

  const analyzeTranscript = useCallback(async (text: string, isRetry = false) => {
    setStep("analyzing");
    setErrorMessage(null);

    try {
      console.log("Analyzing transcript:", text);
      
      const { data, error } = await supabase.functions.invoke("analyze-stock-voice", {
        body: { transcript: text },
      });

      console.log("AI response:", data, error);

      if (error) {
        // Try to extract more details from the error
        const errorDetails = error.message || "Erreur lors de l'analyse";
        console.error("Edge function error:", errorDetails, error);
        
        // Check if it's a network error
        if (errorDetails.includes("FunctionsFetchError") || errorDetails.includes("non-2xx")) {
          throw new Error("Erreur de connexion au serveur. Vérifiez votre connexion internet.");
        }
        throw new Error(errorDetails);
      }

      if (!data) {
        throw new Error("Aucune réponse reçue du serveur");
      }

      if (data?.error) {
        // Handle specific errors
        if (data.error.includes("Trop de requêtes")) {
          throw new Error("Trop de requêtes. Attendez quelques secondes et réessayez.");
        }
        if (data.error.includes("Crédits")) {
          throw new Error("Crédits IA épuisés. Utilisez le mode manuel.");
        }
        if (data.error.includes("LOVABLE_API_KEY")) {
          throw new Error("Configuration serveur manquante. Contactez le support.");
        }
        throw new Error(data.error);
      }

      const voiceItems: VoiceStockItem[] = (data?.items || []).map((item: NewStockItem, idx: number) => ({
        ...item,
        tempId: `voice-${Date.now()}-${idx}`,
        source: "voice" as const,
      }));

      setItems(voiceItems);
      setSuggestions(data?.suggestions || []);
      setRetryCount(0);

      if (voiceItems.length === 0) {
        setErrorMessage("Aucun produit détecté. Exemple: '50 savons à 500 francs'");
        toast({
          title: "Aucun produit détecté",
          description: "Reformulez votre dictée",
          variant: "destructive",
        });
        setStep("record");
      } else {
        setStep("validate");
        toast({
          title: "Analyse terminée",
          description: `${voiceItems.length} produit${voiceItems.length > 1 ? "s" : ""} détecté${voiceItems.length > 1 ? "s" : ""}`,
        });
      }
    } catch (error) {
      console.error("Error analyzing voice:", error);
      const errorMsg = error instanceof Error ? error.message : "Erreur inconnue";
      
      // Retry logic for network errors
      if (!isRetry && retryCount < maxRetries && (
        errorMsg.includes("réseau") || 
        errorMsg.includes("network") || 
        errorMsg.includes("connexion") ||
        errorMsg.includes("non-2xx")
      )) {
        setRetryCount(prev => prev + 1);
        toast({
          title: "Nouvelle tentative...",
          description: `Tentative ${retryCount + 1}/${maxRetries}`,
        });
        setTimeout(() => analyzeTranscript(text, true), 2000);
        return;
      }
      
      setErrorMessage(`Erreur d'analyse: ${errorMsg}`);
      toast({
        title: "Erreur d'analyse",
        description: errorMsg,
        variant: "destructive",
      });
      setStep("record");
    }
  }, [toast, retryCount]);

  const handleManualSubmit = async () => {
    const text = manualText.trim();
    if (!text) {
      setErrorMessage("Entrez une description de votre stock");
      return;
    }
    if (text.length < 5) {
      setErrorMessage("Description trop courte");
      return;
    }
    setTranscript(text);
    await analyzeTranscript(text);
  };

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
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le stock",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " CFA";
  };

  const switchToManual = () => {
    setStep("manual");
    setErrorMessage(null);
    setManualText(transcript);
  };

  const switchToVoice = () => {
    setStep("record");
    setErrorMessage(null);
  };

  // Manual text input step
  if (step === "manual") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Mode texte</h3>
          <p className="text-sm text-muted-foreground">
            Décrivez votre stock par écrit
          </p>
        </div>

        {errorMessage && (
          <Card className="p-3 bg-destructive/10 border-destructive/20">
            <p className="text-sm text-destructive">{errorMessage}</p>
          </Card>
        )}

        <div className="space-y-3">
          <Textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Exemple: J'ai 50 savons Lux à 500 francs, 10 paquets de riz à 15000, 3 cartons de Fanta..."
            className="min-h-[120px] text-base"
          />
          <p className="text-xs text-muted-foreground">
            💡 Mentionnez le nom, la quantité et le prix de chaque produit
          </p>
        </div>

        <div className="flex gap-3">
          {isSupported && (
            <Button variant="outline" onClick={switchToVoice} className="flex-1 gap-2">
              <Mic className="h-4 w-4" />
              Mode vocal
            </Button>
          )}
          <Button 
            onClick={handleManualSubmit} 
            disabled={!manualText.trim()}
            className="flex-1 gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Analyser
          </Button>
        </div>

        <Button variant="ghost" onClick={onCancel} className="w-full">
          Annuler
        </Button>
      </div>
    );
  }

  // Recording step
  if (step === "record") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Dictez votre stock</h3>
          <p className="text-sm text-muted-foreground">
            Parlez naturellement : "J'ai 50 savons Lux à 500 francs..."
          </p>
        </div>

        {/* Browser not supported warning */}
        {!isSupported && (
          <Card className="p-4 bg-warning/10 border-warning/20">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
              <div>
                <p className="font-medium text-warning">Navigateur non supporté</p>
                <p className="text-sm text-muted-foreground mt-1">
                  La reconnaissance vocale n'est pas disponible. Utilisez Chrome, Edge ou Safari, ou passez au mode texte.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Error message */}
        {errorMessage && (
          <Card className="p-3 bg-destructive/10 border-destructive/20">
            <p className="text-sm text-destructive">{errorMessage}</p>
          </Card>
        )}

        {/* Recording button */}
        {isSupported && (
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
            <div className="text-center">
              <span className="text-sm text-muted-foreground">
                {isRecording ? "Appuyez pour arrêter" : "Appuyez pour dicter"}
              </span>
              {isRecording && (
                <p className="text-lg font-mono text-primary mt-1">
                  {formatDuration(recordingDuration)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Live transcript */}
        {transcript && (
          <Card className="p-4 bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Transcription :</p>
            <p className="text-sm italic">"{transcript}"</p>
          </Card>
        )}

        {/* Fallback to manual mode */}
        <Button 
          variant="secondary" 
          onClick={switchToManual} 
          className="w-full gap-2"
        >
          <Keyboard className="h-4 w-4" />
          Passer au mode texte
        </Button>

        {/* Tips */}
        {!isRecording && !transcript && isSupported && (
          <Card className="p-4 bg-accent/5 border-accent/20">
            <p className="text-xs font-medium text-accent-foreground mb-2">💡 Conseils :</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Parlez clairement et distinctement</li>
              <li>• Mentionnez le nom, la quantité et le prix</li>
              <li>• Exemple: "20 bouteilles d'huile à 1500 francs"</li>
            </ul>
          </Card>
        )}

        <Button variant="ghost" onClick={onCancel} className="w-full">
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
        <p className="text-sm text-muted-foreground italic text-center px-4">"{transcript}"</p>
        {retryCount > 0 && (
          <p className="text-xs text-muted-foreground">
            Tentative {retryCount}/{maxRetries}
          </p>
        )}
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

      {/* Retry button */}
      {transcript && (
        <Button 
          variant="outline" 
          onClick={() => analyzeTranscript(transcript)} 
          className="w-full gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Ré-analyser la dictée
        </Button>
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
          Ajouter au stock
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
            <p className="font-medium truncate">{item.name}</p>
            {item.model && (
              <Badge variant="outline" className="text-xs shrink-0">
                {item.model}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-muted-foreground">
              Qté: {item.quantity}
            </span>
            <span className="text-sm font-medium text-primary">
              {formatMoney(item.unit_price)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total: {formatMoney(item.quantity * item.unit_price)}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            className="h-8 w-8"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}