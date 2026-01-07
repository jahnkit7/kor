import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, Loader2, Check, X, Edit2, User, Wallet, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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

interface Client {
  id: string;
  name: string;
  phone?: string;
}

interface ParsedSale {
  type: "cash" | "credit";
  amount: number;
  paid: number;
  remaining: number;
  client_id: string | null;
  client_name: string | null;
  products: Array<{ name: string; quantity: number; unit_price: number }>;
  note: string | null;
}

interface VoiceSaleInputProps {
  clients: Client[];
  onComplete: (sale: {
    type: "cash" | "credit";
    amount: number;
    note?: string;
    client_id?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

const isSpeechRecognitionSupported = () => {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
};

export function VoiceSaleInput({ clients, onComplete, onCancel }: VoiceSaleInputProps) {
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();

  const [step, setStep] = useState<"record" | "analyzing" | "validate" | "saving">("record");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedSale, setParsedSale] = useState<ParsedSale | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported());
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const startTimer = useCallback(() => {
    setRecordingDuration(0);
    timerRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  }, []);

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

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount);
  };

  const startRecording = useCallback(async () => {
    try {
      setErrorMessage(null);
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setIsSupported(false);
        setErrorMessage("Reconnaissance vocale non supportée sur ce navigateur.");
        return;
      }

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (permError) {
        console.error("Microphone permission error:", permError);
        setErrorMessage("Accès au microphone refusé.");
        toast({
          title: "Microphone bloqué",
          description: "Autorisez l'accès au microphone",
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

      recognition.onstart = () => {
        setIsRecording(true);
        startTimer();
      };

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
        
        switch (event.error) {
          case "not-allowed":
          case "permission-denied":
            setErrorMessage("Accès au microphone refusé.");
            break;
          case "no-speech":
            break;
          case "audio-capture":
            setErrorMessage("Microphone non disponible.");
            break;
          case "network":
            setErrorMessage("Erreur réseau.");
            break;
          default:
            if (event.error !== "aborted") {
              setErrorMessage(`Erreur: ${event.error}`);
            }
        }
        
        stopTimer();
        setIsRecording(false);
      };

      recognition.onend = () => {
        stopTimer();
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setTranscript("");
      
    } catch (error) {
      console.error("Error starting recording:", error);
      setErrorMessage("Impossible de démarrer l'enregistrement.");
    }
  }, [toast, startTimer, stopTimer]);

  const stopRecording = useCallback(async () => {
    stopTimer();

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);

    const trimmedTranscript = transcript.trim();

    if (!trimmedTranscript) {
      setErrorMessage("Aucun texte détecté. Parlez plus fort.");
      return;
    }

    if (trimmedTranscript.length < 5) {
      setErrorMessage("Dictée trop courte.");
      return;
    }

    setErrorMessage(null);
    analyzeTranscript(trimmedTranscript);
  }, [transcript, stopTimer]);

  const analyzeTranscript = useCallback(async (text: string) => {
    if (!isOnline) {
      setErrorMessage("Connexion internet requise pour l'analyse vocale des ventes.");
      return;
    }

    setStep("analyzing");
    setErrorMessage(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData?.session) {
        throw new Error("Vous n'êtes pas connecté.");
      }

      const clientsForAI = clients.map(c => ({ id: c.id, name: c.name }));

      const { data, error } = await supabase.functions.invoke("analyze-sale-voice", {
        body: { transcript: text, clients: clientsForAI },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Erreur serveur");
      }

      if (!data || data.error) {
        throw new Error(data?.error || "Aucune réponse du serveur");
      }

      if (!data.sale) {
        setErrorMessage("Aucune vente détectée. Exemple: 'J'ai vendu 5 chargeurs à 1500 à Kofi'");
        setStep("record");
        return;
      }

      setParsedSale(data.sale);
      setSuggestions(data.suggestions || []);
      setStep("validate");
      toast({
        title: "Vente analysée",
        description: `${data.sale.type === "cash" ? "Vente cash" : "Vente crédit"} de ${formatMoney(data.sale.amount)} CFA`,
      });

    } catch (error) {
      console.error("Error analyzing voice:", error);
      const errorMsg = error instanceof Error ? error.message : "Erreur inconnue";
      setErrorMessage(errorMsg);
      setStep("record");
      toast({ title: "Erreur d'analyse", description: errorMsg, variant: "destructive" });
    }
  }, [clients, isOnline, toast]);

  const handleConfirm = async () => {
    if (!parsedSale) return;

    setStep("saving");
    setIsSubmitting(true);

    try {
      await onComplete({
        type: parsedSale.type,
        amount: parsedSale.amount,
        note: parsedSale.note || undefined,
        client_id: parsedSale.client_id || undefined,
      });
    } catch (error) {
      console.error("Error saving sale:", error);
      toast({ title: "Erreur", description: "Impossible d'enregistrer la vente", variant: "destructive" });
      setStep("validate");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Record step
  if (step === "record") {
    return (
      <div className="space-y-6 p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Dicter une vente</h2>
          <p className="text-muted-foreground text-sm">
            Décrivez votre vente naturellement
          </p>
        </div>

        {/* Microphone button */}
        <div className="flex justify-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!isSupported}
            className={cn(
              "w-32 h-32 rounded-full flex items-center justify-center transition-all",
              isRecording
                ? "bg-debt animate-pulse shadow-lg shadow-debt/30"
                : "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30",
              !isSupported && "opacity-50 cursor-not-allowed"
            )}
          >
            {isRecording ? (
              <Square className="w-12 h-12 text-primary-foreground" />
            ) : (
              <Mic className="w-12 h-12 text-primary-foreground" />
            )}
          </button>
        </div>

        {/* Recording info */}
        {isRecording && (
          <div className="text-center space-y-2 animate-fade-in">
            <p className="text-2xl font-mono text-debt">{formatDuration(recordingDuration)}</p>
            <p className="text-sm text-muted-foreground">Parlez maintenant...</p>
          </div>
        )}

        {/* Transcript preview */}
        {transcript && (
          <Card className="p-4 bg-secondary/50">
            <p className="text-sm text-muted-foreground mb-1">Transcription:</p>
            <p className="text-foreground">{transcript}</p>
          </Card>
        )}

        {/* Error message */}
        {errorMessage && (
          <Card className="p-4 bg-destructive/10 border-destructive/20">
            <p className="text-sm text-destructive">{errorMessage}</p>
          </Card>
        )}

        {/* Examples */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Exemples:</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>• "J'ai vendu 5 chargeurs à 1500, Kofi a payé cash"</p>
            <p>• "Mamadou a pris 3 écrans à 5000, il a payé 10000"</p>
            <p>• "Crédit de 25000 pour Fatou, elle a payé 5000"</p>
          </div>
        </div>

        {/* Cancel button */}
        <Button variant="ghost" onClick={onCancel} className="w-full">
          Annuler
        </Button>
      </div>
    );
  }

  // Analyzing step
  if (step === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-lg font-medium">Analyse en cours...</p>
        <p className="text-sm text-muted-foreground text-center">
          L'IA analyse votre dictée pour extraire les détails de la vente
        </p>
      </div>
    );
  }

  // Validate step
  if (step === "validate" && parsedSale) {
    const clientName = parsedSale.client_id 
      ? clients.find(c => c.id === parsedSale.client_id)?.name 
      : parsedSale.client_name;

    return (
      <div className="space-y-4 p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-1">Confirmer la vente</h2>
          <p className="text-sm text-muted-foreground">Vérifiez les informations</p>
        </div>

        {/* Sale type badge */}
        <div className="flex justify-center">
          <Badge 
            variant={parsedSale.type === "cash" ? "default" : "secondary"}
            className={cn(
              "text-lg px-4 py-2",
              parsedSale.type === "cash" ? "bg-cash text-primary-foreground" : "bg-credit text-primary-foreground"
            )}
          >
            {parsedSale.type === "cash" ? (
              <><Wallet className="w-5 h-5 mr-2" /> Vente Cash</>
            ) : (
              <><CreditCard className="w-5 h-5 mr-2" /> Vente Crédit</>
            )}
          </Badge>
        </div>

        {/* Amount */}
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Montant total</p>
          <p className="text-money-lg text-foreground">
            {formatMoney(parsedSale.amount)} <span className="text-sm">CFA</span>
          </p>
          
          {parsedSale.type === "credit" && parsedSale.remaining > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payé:</span>
                <span className="text-success">{formatMoney(parsedSale.paid)} CFA</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Reste:</span>
                <span className="text-debt">{formatMoney(parsedSale.remaining)} CFA</span>
              </div>
            </div>
          )}
        </Card>

        {/* Client */}
        {clientName && (
          <Card className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Client</p>
              <p className="font-semibold">{clientName}</p>
            </div>
          </Card>
        )}

        {/* Products */}
        {parsedSale.products && parsedSale.products.length > 0 && (
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-2">Produits</p>
            <div className="space-y-2">
              {parsedSale.products.map((product, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{product.quantity}x {product.name}</span>
                  <span className="text-muted-foreground">{formatMoney(product.unit_price)} CFA</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Note */}
        {parsedSale.note && (
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Note</p>
            <p className="text-sm">{parsedSale.note}</p>
          </Card>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-1">
            {suggestions.map((suggestion, idx) => (
              <p key={idx} className="text-xs text-credit">⚠️ {suggestion}</p>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="outline" onClick={() => setStep("record")} disabled={isSubmitting}>
            <Edit2 className="w-4 h-4 mr-2" />
            Modifier
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isSubmitting}
            className={parsedSale.type === "cash" ? "bg-cash hover:bg-cash/90" : "bg-credit hover:bg-credit/90"}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Confirmer
          </Button>
        </div>

        <Button variant="ghost" onClick={onCancel} className="w-full" disabled={isSubmitting}>
          Annuler
        </Button>
      </div>
    );
  }

  // Saving step
  if (step === "saving") {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-12 h-12 text-success animate-spin" />
        <p className="text-lg font-medium">Enregistrement...</p>
      </div>
    );
  }

  return null;
}
