import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Mic, Square, Loader2, Check, X, Edit2, User, Wallet, CreditCard, AlertTriangle, UserPlus, Users } from "lucide-react";
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

interface ClientMatch {
  status: "found" | "not_found" | "ambiguous";
  client_id: string | null;
  client_name: string | null;
  candidates: Array<{ id: string; name: string; phone?: string | null }>;
}

interface ParsedSale {
  type: "cash" | "credit";
  amount: number;
  paid: number;
  remaining: number;
  client_match: ClientMatch;
  products: Array<{ name: string; quantity: number; unit_price: number }>;
  note: string | null;
  // Resolved client info (set after disambiguation)
  resolved_client_id?: string | null;
  resolved_client_name?: string | null;
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
  onCreateClient?: (name: string) => Promise<Client | null>;
}

const isSpeechRecognitionSupported = () => {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
};

export function VoiceSaleInput({ clients, onComplete, onCancel, onCreateClient }: VoiceSaleInputProps) {
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();

  const [step, setStep] = useState<"record" | "analyzing" | "validate" | "saving">("record");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedSales, setParsedSales] = useState<ParsedSale[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  
  // Disambiguation state
  const [disambiguationSaleIndex, setDisambiguationSaleIndex] = useState<number | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string>(""); // "id" or "create" or "anonymous"
  
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
      setLastTranscript(text);
      setCanRetry(true);
      return;
    }

    setStep("analyzing");
    setErrorMessage(null);
    setLastTranscript(text);
    setCanRetry(false);

    try {
      console.log("VoiceSaleInput: Starting analysis for transcript:", text.substring(0, 50));
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData?.session) {
        console.error("VoiceSaleInput: Session error:", sessionError);
        throw new Error("Vous n'êtes pas connecté.");
      }

      console.log("VoiceSaleInput: Session valid, calling edge function...");

      // Include phone for disambiguation
      const clientsForAI = clients.map(c => ({ id: c.id, name: c.name, phone: c.phone }));

      const { data, error } = await supabase.functions.invoke("analyze-sale-voice", {
        body: { transcript: text, clients: clientsForAI },
      });

      console.log("VoiceSaleInput: Edge function response:", { hasData: !!data, error: error?.message });

      if (error) {
        console.error("Edge function error details:", {
          message: error.message,
          name: error.name,
          context: error.context
        });
        
        if (error.message?.includes("Failed to send") || error.message?.includes("fetch")) {
          throw new Error("Erreur de connexion. Vérifiez votre réseau et réessayez.");
        }
        if (error.message?.includes("timeout") || error.message?.includes("Timeout")) {
          throw new Error("Délai d'attente dépassé. Réessayez.");
        }
        throw new Error(error.message || "Erreur serveur");
      }

      if (!data || data.error) {
        throw new Error(data?.error || "Aucune réponse du serveur");
      }

      const sales = data.sales || [];
      
      if (sales.length === 0) {
        setErrorMessage("Aucune vente détectée. Exemple: 'J'ai vendu 5 chargeurs à 1500 à Kofi'");
        setStep("record");
        setCanRetry(true);
        return;
      }

      // Initialize resolved client info for "found" clients
      const processedSales = sales.map((sale: ParsedSale) => ({
        ...sale,
        resolved_client_id: sale.client_match.status === "found" ? sale.client_match.client_id : null,
        resolved_client_name: sale.client_match.status === "found" 
          ? clients.find(c => c.id === sale.client_match.client_id)?.name || sale.client_match.client_name
          : sale.client_match.client_name
      }));

      setParsedSales(processedSales);
      setSuggestions(data.suggestions || []);
      setStep("validate");
      setCanRetry(false);
      
      toast({
        title: `${sales.length} vente${sales.length > 1 ? 's' : ''} détectée${sales.length > 1 ? 's' : ''}`,
        description: sales.length > 1 ? "Vérifiez chaque vente avant de confirmer" : undefined,
      });

    } catch (error) {
      console.error("Error analyzing voice:", error);
      const errorMsg = error instanceof Error ? error.message : "Erreur inconnue";
      setErrorMessage(errorMsg);
      setStep("record");
      setCanRetry(true);
      toast({ title: "Erreur d'analyse", description: errorMsg, variant: "destructive" });
    }
  }, [clients, isOnline, toast]);

  const getSaleStatus = (sale: ParsedSale): "ready" | "needs_action" => {
    if (sale.client_match.status === "found") return "ready";
    if (sale.resolved_client_id !== undefined) return "ready"; // User already resolved
    return "needs_action";
  };

  const allSalesReady = () => {
    return parsedSales.every(sale => getSaleStatus(sale) === "ready");
  };

  const openDisambiguation = (index: number) => {
    setDisambiguationSaleIndex(index);
    setSelectedCandidate("");
  };

  const handleDisambiguationConfirm = async () => {
    if (disambiguationSaleIndex === null || !selectedCandidate) return;

    const sale = parsedSales[disambiguationSaleIndex];
    const updatedSales = [...parsedSales];

    if (selectedCandidate === "anonymous") {
      // Mark as anonymous sale
      updatedSales[disambiguationSaleIndex] = {
        ...sale,
        resolved_client_id: null,
        resolved_client_name: null
      };
    } else if (selectedCandidate === "create") {
      // Create new client
      if (onCreateClient && sale.client_match.client_name) {
        const newClient = await onCreateClient(sale.client_match.client_name);
        if (newClient) {
          updatedSales[disambiguationSaleIndex] = {
            ...sale,
            resolved_client_id: newClient.id,
            resolved_client_name: newClient.name
          };
        }
      }
    } else {
      // Selected an existing client
      const selectedClient = sale.client_match.candidates.find(c => c.id === selectedCandidate) 
        || clients.find(c => c.id === selectedCandidate);
      updatedSales[disambiguationSaleIndex] = {
        ...sale,
        resolved_client_id: selectedCandidate,
        resolved_client_name: selectedClient?.name || sale.client_match.client_name
      };
    }

    setParsedSales(updatedSales);
    setDisambiguationSaleIndex(null);
    setSelectedCandidate("");
  };

  const handleConfirmAll = async () => {
    if (!allSalesReady()) {
      toast({
        title: "Ventes incomplètes",
        description: "Résolvez tous les clients avant de confirmer",
        variant: "destructive"
      });
      return;
    }

    setStep("saving");
    setIsSubmitting(true);

    try {
      for (const sale of parsedSales) {
        await onComplete({
          type: sale.type,
          amount: sale.amount,
          note: sale.note || undefined,
          client_id: sale.resolved_client_id || undefined,
        });
      }
      
      toast({
        title: "Ventes enregistrées",
        description: `${parsedSales.length} vente${parsedSales.length > 1 ? 's' : ''} ajoutée${parsedSales.length > 1 ? 's' : ''}`
      });
    } catch (error) {
      console.error("Error saving sales:", error);
      toast({ title: "Erreur", description: "Impossible d'enregistrer les ventes", variant: "destructive" });
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
          <h2 className="text-xl font-bold mb-2">Dicter une ou plusieurs ventes</h2>
          <p className="text-muted-foreground text-sm">
            Décrivez vos ventes naturellement
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

        {/* Error message with retry */}
        {errorMessage && (
          <Card className="p-4 bg-destructive/10 border-destructive/20 space-y-3">
            <p className="text-sm text-destructive">{errorMessage}</p>
            {canRetry && lastTranscript && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => analyzeTranscript(lastTranscript)}
                className="w-full"
              >
                Réessayer l'analyse
              </Button>
            )}
          </Card>
        )}

        {/* Examples */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Exemples:</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>• "J'ai vendu 5 chargeurs à 1500, Kofi a payé cash"</p>
            <p>• "Mamadou a pris 3 écrans à 5000, il a payé 10000, et Fatou a pris 2 batteries"</p>
            <p>• "Crédit de 25000 pour Awa, elle a payé 5000"</p>
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
          L'IA analyse votre dictée pour extraire les détails des ventes
        </p>
      </div>
    );
  }

  // Validate step - Multi-sale view
  if (step === "validate" && parsedSales.length > 0) {
    const currentSale = disambiguationSaleIndex !== null ? parsedSales[disambiguationSaleIndex] : null;

    return (
      <div className="space-y-4 p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-1">
            {parsedSales.length} vente{parsedSales.length > 1 ? 's' : ''} détectée{parsedSales.length > 1 ? 's' : ''}
          </h2>
          <p className="text-sm text-muted-foreground">Vérifiez et confirmez</p>
        </div>

        {/* Sales list */}
        <div className="space-y-3">
          {parsedSales.map((sale, index) => {
            const status = getSaleStatus(sale);
            const clientName = sale.resolved_client_name 
              || (sale.client_match.status === "found" ? clients.find(c => c.id === sale.client_match.client_id)?.name : null)
              || sale.client_match.client_name;

            return (
              <Card 
                key={index} 
                className={cn(
                  "p-4 cursor-pointer transition-all",
                  status === "needs_action" && "border-amber-500 bg-amber-500/5"
                )}
                onClick={() => status === "needs_action" && openDisambiguation(index)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Sale type and amount */}
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant="outline"
                        className={cn(
                          "text-xs",
                          sale.type === "cash" ? "border-cash text-cash" : "border-credit text-credit"
                        )}
                      >
                        {sale.type === "cash" ? <Wallet className="w-3 h-3 mr-1" /> : <CreditCard className="w-3 h-3 mr-1" />}
                        {sale.type === "cash" ? "Cash" : "Crédit"}
                      </Badge>
                      <span className="font-bold">{formatMoney(sale.amount)} CFA</span>
                    </div>

                    {/* Client info */}
                    <div className="flex items-center gap-2 text-sm">
                      {status === "ready" ? (
                        <>
                          <Check className="w-4 h-4 text-success" />
                          <span className="text-muted-foreground">
                            {clientName || "Vente anonyme"}
                          </span>
                        </>
                      ) : sale.client_match.status === "ambiguous" ? (
                        <>
                          <Users className="w-4 h-4 text-amber-500" />
                          <span className="text-amber-600">
                            {sale.client_match.candidates.length} "{sale.client_match.client_name}" trouvés
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          <span className="text-amber-600">
                            "{sale.client_match.client_name}" non trouvé
                          </span>
                        </>
                      )}
                    </div>

                    {/* Products preview */}
                    {sale.products && sale.products.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {sale.products.map(p => `${p.quantity}x ${p.name}`).join(", ")}
                      </p>
                    )}
                  </div>

                  {status === "needs_action" && (
                    <Button size="sm" variant="outline" className="shrink-0">
                      Résoudre
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-1">
            {suggestions.map((suggestion, idx) => (
              <p key={idx} className="text-xs text-credit">💡 {suggestion}</p>
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
            onClick={handleConfirmAll} 
            disabled={isSubmitting || !allSalesReady()}
            className="bg-success hover:bg-success/90"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Confirmer tout
          </Button>
        </div>

        <Button variant="ghost" onClick={onCancel} className="w-full" disabled={isSubmitting}>
          Annuler
        </Button>

        {/* Disambiguation Dialog */}
        <Dialog open={disambiguationSaleIndex !== null} onOpenChange={(open) => !open && setDisambiguationSaleIndex(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {currentSale?.client_match.status === "ambiguous" 
                  ? `Quel "${currentSale.client_match.client_name}" ?`
                  : `Client "${currentSale?.client_match.client_name}" non trouvé`
                }
              </DialogTitle>
            </DialogHeader>

            <RadioGroup value={selectedCandidate} onValueChange={setSelectedCandidate} className="space-y-3">
              {/* Candidates for ambiguous */}
              {currentSale?.client_match.status === "ambiguous" && currentSale.client_match.candidates.map((candidate) => (
                <div key={candidate.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-secondary/50">
                  <RadioGroupItem value={candidate.id} id={candidate.id} />
                  <Label htmlFor={candidate.id} className="flex-1 cursor-pointer">
                    <span className="font-medium">{candidate.name}</span>
                    {candidate.phone && (
                      <span className="text-sm text-muted-foreground ml-2">({candidate.phone})</span>
                    )}
                  </Label>
                </div>
              ))}

              {/* Create new client option */}
              {onCreateClient && currentSale?.client_match.client_name && (
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-secondary/50 border-dashed">
                  <RadioGroupItem value="create" id="create" />
                  <Label htmlFor="create" className="flex-1 cursor-pointer flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-success" />
                    <span>Créer "{currentSale.client_match.client_name}" comme nouveau client</span>
                  </Label>
                </div>
              )}

              {/* Anonymous option */}
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-secondary/50">
                <RadioGroupItem value="anonymous" id="anonymous" />
                <Label htmlFor="anonymous" className="flex-1 cursor-pointer flex items-center gap-2">
                  <X className="w-4 h-4 text-muted-foreground" />
                  <span>Vente anonyme (pas de client)</span>
                </Label>
              </div>
            </RadioGroup>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDisambiguationSaleIndex(null)} className="flex-1">
                Annuler
              </Button>
              <Button onClick={handleDisambiguationConfirm} disabled={!selectedCandidate} className="flex-1">
                Valider
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Saving step
  if (step === "saving") {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-12 h-12 text-success animate-spin" />
        <p className="text-lg font-medium">Enregistrement...</p>
        <p className="text-sm text-muted-foreground">
          {parsedSales.length} vente{parsedSales.length > 1 ? 's' : ''} en cours d'enregistrement
        </p>
      </div>
    );
  }

  return null;
}
