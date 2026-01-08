import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Mic, 
  MicOff, 
  Send, 
  Package,
  Loader2,
  Sparkles,
  X,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { useProductRequests, UNITS } from "@/hooks/use-product-requests";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Types for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
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

interface NewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Check for Web Speech API support
const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
};

export function NewRequestDialog({ open, onOpenChange }: NewRequestDialogProps) {
  const { createRequest } = useProductRequests();
  const [saving, setSaving] = useState(false);
  
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("pièces");
  const [maxPrice, setMaxPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [rawTranscript, setRawTranscript] = useState("");

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(true);
  
  const recognitionRef = useRef<any>(null);

  // Check voice support on mount
  useEffect(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setVoiceSupported(false);
    }
  }, []);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      toast.error("Dictée vocale non supportée sur ce navigateur");
      return;
    }

    setVoiceError(null);
    setInterimTranscript("");

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalText) {
        setRawTranscript(prev => (prev ? prev + " " : "") + finalText.trim());
      }
      setInterimTranscript(interimText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      
      if (event.error === "not-allowed") {
        setVoiceError("Accès au micro refusé. Autorisez le micro dans les paramètres.");
        toast.error("Accès au micro refusé");
      } else if (event.error === "network") {
        setVoiceError("Erreur réseau. Vérifiez votre connexion.");
        toast.error("Erreur réseau");
      } else if (event.error === "no-speech") {
        // Silent error - just stop
      } else {
        setVoiceError("Erreur de reconnaissance vocale");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (error) {
      console.error("Failed to start recognition:", error);
      setVoiceError("Impossible de démarrer la dictée");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const analyzeTranscript = async () => {
    if (!rawTranscript.trim()) {
      toast.error("Aucun texte à analyser");
      return;
    }

    setIsProcessing(true);
    setVoiceError(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "analyze-request-voice",
        { body: { transcript: rawTranscript } }
      );

      if (error) throw error;

      // Pre-fill the form
      if (data.product_name) setProductName(data.product_name);
      if (data.quantity) setQuantity(data.quantity.toString());
      if (data.unit) {
        const matchedUnit = UNITS.find(u => 
          u.value === data.unit || 
          u.label.toLowerCase() === data.unit?.toLowerCase()
        );
        if (matchedUnit) setUnit(matchedUnit.value);
      }
      if (data.max_price) setMaxPrice(data.max_price.toString());
      if (data.notes) setNotes(data.notes);

      toast.success("Formulaire pré-rempli !");
    } catch (error) {
      console.error("Error analyzing transcript:", error);
      setVoiceError("Erreur lors de l'analyse. Réessayez.");
      toast.error("Erreur d'analyse");
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-analyze when stopping with content
  const handleStopAndAnalyze = async () => {
    stopListening();
    // Wait a bit for final results
    setTimeout(() => {
      if (rawTranscript.trim()) {
        analyzeTranscript();
      }
    }, 300);
  };

  const handleSubmit = async () => {
    if (!productName.trim()) return;
    
    setSaving(true);
    const result = await createRequest({
      product_name: productName.trim(),
      raw_transcript: rawTranscript || undefined,
      quantity: quantity ? parseInt(quantity) : undefined,
      unit: unit || undefined,
      max_price: maxPrice ? parseInt(maxPrice) : undefined,
      notes: notes.trim() || undefined,
    });
    setSaving(false);

    if (result) {
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setProductName("");
    setQuantity("");
    setUnit("pièces");
    setMaxPrice("");
    setNotes("");
    setRawTranscript("");
    setInterimTranscript("");
    setVoiceError(null);
  };

  const handleClose = (value: boolean) => {
    if (!value) {
      stopListening();
      resetForm();
    }
    onOpenChange(value);
  };

  const displayTranscript = rawTranscript + (interimTranscript ? ` ${interimTranscript}` : "");

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent 
        side="bottom" 
        className="h-[95vh] rounded-t-3xl flex flex-col p-0"
      >
        {/* Fixed Header */}
        <SheetHeader className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-3 text-lg font-bold">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              Nouvelle demande
            </SheetTitle>
            <button
              onClick={() => handleClose(false)}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </SheetHeader>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-4 space-y-5">
            {/* Voice Section */}
            <div className="text-center space-y-4">
              {/* Microphone Button */}
              {voiceSupported ? (
                <div className="relative inline-block">
                  {/* Ripple effect when listening */}
                  {isListening && (
                    <>
                      <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                      <span className="absolute inset-[-8px] rounded-full bg-primary/10 animate-pulse" />
                    </>
                  )}
                  <button
                    onClick={isListening ? handleStopAndAnalyze : startListening}
                    disabled={isProcessing}
                    className={cn(
                      "relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg",
                      isListening 
                        ? "bg-destructive text-destructive-foreground scale-110"
                        : isProcessing
                          ? "bg-secondary text-muted-foreground"
                          : "bg-gradient-to-br from-primary to-accent text-primary-foreground hover:scale-105 active:scale-95"
                    )}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : isListening ? (
                      <MicOff className="w-8 h-8" />
                    ) : (
                      <Mic className="w-8 h-8" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-destructive/10 rounded-xl border border-destructive/20">
                  <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                  <p className="text-sm text-destructive font-medium">
                    Dictée vocale non supportée
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Utilisez Chrome sur Android ou remplissez le formulaire.
                  </p>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                {isListening 
                  ? "🔴 Parlez maintenant... Appuyez pour arrêter" 
                  : isProcessing 
                    ? "Analyse en cours..."
                    : voiceSupported 
                      ? "Appuyez et dictez votre demande"
                      : "Remplissez le formulaire ci-dessous"}
              </p>

              {/* Error display */}
              {voiceError && (
                <div className="flex items-center justify-center gap-2 p-3 bg-destructive/10 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-destructive">{voiceError}</span>
                  <button
                    onClick={startListening}
                    className="ml-2 p-1.5 rounded-lg bg-destructive/20 hover:bg-destructive/30"
                  >
                    <RefreshCw className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              )}
            </div>

            {/* Transcript display */}
            {displayTranscript && (
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Transcription
                  </p>
                  {rawTranscript && !isProcessing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={analyzeTranscript}
                      className="h-7 text-xs"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Ré-analyser
                    </Button>
                  )}
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {rawTranscript}
                  {interimTranscript && (
                    <span className="text-muted-foreground italic"> {interimTranscript}</span>
                  )}
                </p>
              </div>
            )}

            {/* Form */}
            <div className="space-y-4">
              {/* Product Name */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Produit recherché *</Label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Ex: Huile végétale 5L"
                  className="h-12 rounded-xl"
                />
              </div>

              {/* Quantity & Unit - side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Quantité</Label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="10"
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Unité</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {UNITS.slice(0, 4).map((u) => (
                      <button
                        key={u.value}
                        type="button"
                        onClick={() => setUnit(u.value)}
                        className={cn(
                          "px-2.5 py-2 rounded-lg text-xs font-medium transition-colors",
                          unit === u.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-foreground hover:bg-secondary/80"
                        )}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Max Price */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Budget max (CFA)</Label>
                <Input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Ex: 50000"
                  className="h-12 rounded-xl"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Notes (optionnel)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Détails supplémentaires..."
                  className="rounded-xl resize-none min-h-[80px]"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-5 border-t border-border bg-background pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          <Button
            onClick={handleSubmit}
            disabled={saving || !productName.trim()}
            className="w-full h-12 rounded-xl font-semibold text-base"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Send className="w-5 h-5 mr-2" />
            )}
            Publier la demande
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
