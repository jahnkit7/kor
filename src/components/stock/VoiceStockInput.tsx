import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Loader2, Trash2, Edit2, Check, X, Sparkles, Keyboard, RefreshCw, AlertTriangle, ToggleRight, ToggleLeft, Save, Wifi, WifiOff, Zap, ChevronLeft, Copy, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { supabase } from "@/integrations/supabase/client";
import { parseTranscriptLocally, canParseLocally, type ParsedStockItem } from "@/lib/local-stock-parser";
import type { NewStockItem } from "@/hooks/use-stock";
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

interface VoiceStockItem extends NewStockItem {
  tempId: string;
  isEditing?: boolean;
  confidence?: "high" | "medium" | "low";
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
  const { isOnline } = useNetworkStatus();

  const [step, setStep] = useState<"record" | "analyzing" | "saving" | "validate" | "manual" | "transcript-view">("record");
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
  const [autoSaveMode, setAutoSaveMode] = useState(true);
  const [useLocalParser, setUseLocalParser] = useState(false);
  const [savingTranscript, setSavingTranscript] = useState(false);
  const [previousStep, setPreviousStep] = useState<typeof step>("record");

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 2;

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

  // Truncate transcript for preview
  const getTruncatedTranscript = (text: string, maxLength = 180) => {
    if (text.length <= maxLength) return { text, isTruncated: false };
    return { text: text.slice(0, maxLength) + "…", isTruncated: true };
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      toast({ title: "Copié", description: "Transcription copiée" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de copier", variant: "destructive" });
    }
  };

  const openTranscriptView = () => {
    setPreviousStep(step);
    setStep("transcript-view");
  };

  const closeTranscriptView = () => {
    setStep(previousStep);
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

      recognition.onstart = () => {
        console.log("Speech recognition started");
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
            setErrorMessage("Accès au microphone refusé. Autorisez l'accès dans les paramètres.");
            toast({ title: "Microphone bloqué", variant: "destructive" });
            break;
          case "no-speech":
            break;
          case "audio-capture":
            setErrorMessage("Microphone non disponible.");
            toast({ title: "Microphone introuvable", variant: "destructive" });
            break;
          case "network":
            setErrorMessage("Erreur réseau pour la reconnaissance vocale.");
            break;
          case "aborted":
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
        console.log("Speech recognition ended");
        stopTimer();
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setTranscript("");
      
    } catch (error) {
      console.error("Error starting recording:", error);
      setErrorMessage("Impossible de démarrer l'enregistrement.");
      toast({ title: "Erreur", description: "Impossible d'accéder au microphone", variant: "destructive" });
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
      setErrorMessage("Aucun texte détecté. Parlez plus fort ou utilisez le mode texte.");
      toast({ title: "Aucune dictée", description: "Réessayez ou utilisez le mode texte", variant: "destructive" });
      return;
    }

    if (trimmedTranscript.length < 5) {
      setErrorMessage("Dictée trop courte. Décrivez vos produits avec plus de détails.");
      toast({ title: "Dictée trop courte", variant: "destructive" });
      return;
    }

    setErrorMessage(null);
  }, [transcript, toast, stopTimer]);

  // Save transcript to database (failsafe)
  const saveTranscriptToDatabase = useCallback(async (text: string): Promise<string | null> => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        console.warn("No session for saving transcript");
        return null;
      }

      const { data, error } = await supabase
        .from("stock_voice_entries")
        .insert({
          user_id: session.session.user.id,
          raw_transcript: text,
          status: "pending_parse",
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error saving transcript:", error);
        return null;
      }

      return data?.id || null;
    } catch (err) {
      console.error("Failed to save transcript:", err);
      return null;
    }
  }, []);

  // Parse with local parser
  const parseWithLocalParser = useCallback((text: string) => {
    const result = parseTranscriptLocally(text);
    
    const voiceItems: VoiceStockItem[] = result.items.map((item, idx) => ({
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      model: item.model,
      source: "voice" as const,
      tempId: `local-${Date.now()}-${idx}`,
      confidence: item.confidence,
    }));

    return { items: voiceItems, suggestions: result.suggestions };
  }, []);

  // Analyze transcript (AI or local)
  const analyzeTranscript = useCallback(
    async (text: string, forceLocal = false, isRetry = false) => {
      setStep("analyzing");
      setErrorMessage(null);

      // If offline or forceLocal, use local parser
      if (!isOnline || forceLocal || useLocalParser) {
        try {
          const { items: voiceItems, suggestions: localSuggestions } = parseWithLocalParser(text);
          
          setItems(voiceItems);
          setSuggestions(localSuggestions);
          setRetryCount(0);

          if (voiceItems.length === 0) {
            setErrorMessage("Aucun produit détecté. Exemple: '50 sachets de sucre à 1200 CFA'");
            toast({ title: "Aucun produit détecté", description: "Reformulez votre dictée", variant: "destructive" });
            setStep("record");
            return;
          }

          // Always go to validate for local parsing (less reliable)
          setStep("validate");
          toast({
            title: "Analyse locale terminée",
            description: `${voiceItems.length} produit(s) détecté(s). Vérifiez les résultats.`,
          });
          return;
        } catch (err) {
          console.error("Local parse error:", err);
          setErrorMessage("Erreur d'analyse locale. Vérifiez votre saisie.");
          setStep("record");
          return;
        }
      }

      // AI analysis (online)
      try {
        // 1) Check/refresh session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          throw new Error("Erreur de session. Reconnectez-vous.");
        }
        
        if (!sessionData?.session) {
          throw new Error("Vous n'êtes pas connecté. Reconnectez-vous pour continuer.");
        }

        const expiresAt = sessionData.session.expires_at;
        if (expiresAt && expiresAt * 1000 - Date.now() < 60_000) {
          console.log("Session expiring soon, refreshing...");
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.error("Refresh error:", refreshError);
            throw new Error("Session expirée. Reconnectez-vous.");
          }
          if (!refreshed?.session) {
            throw new Error("Session expirée. Reconnectez-vous.");
          }
        }

        console.log("Calling analyze-stock-voice with transcript:", text.substring(0, 50) + "...");

        // 2) Call edge function
        const { data, error } = await supabase.functions.invoke("analyze-stock-voice", {
          body: { transcript: text },
        });

        console.log("AI response:", { data, error });

        if (error) {
          const anyErr = error as any;
          const status: number | undefined = anyErr?.context?.status;
          const errorMsg = error.message || "Erreur serveur";
          
          console.error("Edge function error:", { status, errorMsg, error });

          // Map specific errors
          if (status === 401) {
            throw new Error("Authentification requise. Reconnectez-vous.");
          }
          if (status === 403) {
            throw new Error("Accès refusé. Reconnectez-vous.");
          }
          if (status === 429) {
            throw new Error("Trop de requêtes. Patientez quelques secondes.");
          }
          if (status === 402) {
            throw new Error("Crédits IA épuisés. Utilisez l'analyse locale.");
          }
          if (status === 500) {
            throw new Error("Erreur serveur. Réessayez ou utilisez l'analyse locale.");
          }
          if (errorMsg.includes("FunctionsFetchError") || errorMsg.includes("Failed to send")) {
            throw new Error("Connexion au serveur impossible. Vérifiez votre connexion.");
          }

          throw new Error(errorMsg);
        }

        if (!data) {
          throw new Error("Aucune réponse du serveur");
        }

        if (data?.error) {
          // Map backend error messages
          const backendError = data.error as string;
          if (backendError.includes("Authentification") || backendError.includes("non authentifié")) {
            throw new Error("Authentification requise. Reconnectez-vous.");
          }
          if (backendError.includes("Trop de requêtes")) {
            throw new Error("Trop de requêtes. Patientez quelques secondes.");
          }
          if (backendError.includes("Crédits")) {
            throw new Error("Crédits IA épuisés. Utilisez l'analyse locale.");
          }
          if (backendError.includes("LOVABLE_API_KEY")) {
            throw new Error("Configuration serveur incomplète. Contactez le support.");
          }
          throw new Error(backendError);
        }

        const voiceItems: VoiceStockItem[] = (data?.items || []).map((item: NewStockItem, idx: number) => ({
          ...item,
          tempId: `voice-${Date.now()}-${idx}`,
          source: "voice" as const,
          confidence: "high" as const,
        }));

        setItems(voiceItems);
        setSuggestions(data?.suggestions || []);
        setRetryCount(0);

        if (voiceItems.length === 0) {
          setErrorMessage("Aucun produit détecté. Reformulez: '50 savons à 500 francs'");
          toast({ title: "Aucun produit détecté", description: "Reformulez votre dictée", variant: "destructive" });
          setStep("record");
          return;
        }

        // Auto-save or validate
        if (autoSaveMode) {
          setStep("saving");
          setIsSubmitting(true);
          try {
            const stockItems: NewStockItem[] = voiceItems.map(({ tempId, isEditing, confidence, ...it }) => it);
            await onComplete(stockItems);
            toast({
              title: "Stock ajouté",
              description: `${stockItems.length} produit(s) enregistré(s).`,
            });
          } finally {
            setIsSubmitting(false);
          }
        } else {
          setStep("validate");
          toast({
            title: "Analyse terminée",
            description: `${voiceItems.length} produit(s) à valider.`,
          });
        }
      } catch (error) {
        console.error("Error analyzing voice:", error);
        const errorMsg = error instanceof Error ? error.message : "Erreur inconnue";

        // Retry for network errors only
        if (!isRetry && retryCount < maxRetries && 
            (errorMsg.includes("connexion") || errorMsg.includes("serveur") || errorMsg.includes("Connexion"))) {
          setRetryCount((prev) => prev + 1);
          toast({ title: "Nouvelle tentative...", description: `Tentative ${retryCount + 1}/${maxRetries}` });
          setTimeout(() => analyzeTranscript(text, false, true), 2000);
          return;
        }

        setErrorMessage(errorMsg);
        toast({ title: "Erreur d'analyse", description: errorMsg, variant: "destructive" });
        setStep("record");
      }
    },
    [toast, retryCount, isOnline, onComplete, autoSaveMode, useLocalParser, parseWithLocalParser]
  );

  // Direct save (failsafe button)
  const handleDirectSave = useCallback(async () => {
    const text = transcript.trim();
    if (!text) return;

    setSavingTranscript(true);
    setErrorMessage(null);

    try {
      // 1) Parse locally
      const { items: voiceItems, suggestions: localSuggestions } = parseWithLocalParser(text);
      
      // 2) Save transcript to DB as backup
      if (isOnline) {
        await saveTranscriptToDatabase(text);
      }

      if (voiceItems.length === 0) {
        setErrorMessage("Aucun produit détecté. Modifiez la transcription et réessayez.");
        toast({ title: "Aucun produit détecté", variant: "destructive" });
        return;
      }

      setItems(voiceItems);
      setSuggestions(localSuggestions);
      setStep("validate");
      toast({
        title: "Analyse rapide terminée",
        description: `${voiceItems.length} produit(s) détecté(s). Vérifiez et corrigez si besoin.`,
      });
    } catch (err) {
      console.error("Direct save error:", err);
      setErrorMessage("Erreur lors de l'enregistrement.");
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setSavingTranscript(false);
    }
  }, [transcript, parseWithLocalParser, saveTranscriptToDatabase, isOnline, toast]);

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
      const stockItems: NewStockItem[] = items.map(({ tempId, isEditing, confidence, ...item }) => item);
      await onComplete(stockItems);
      toast({ title: "Stock ajouté", description: `${stockItems.length} produit(s) enregistré(s).` });
    } catch (error) {
      console.error("Error completing stock:", error);
      toast({ title: "Erreur", description: "Impossible d'ajouter le stock", variant: "destructive" });
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

  // ============================================
  // FULLSCREEN MODAL WRAPPER
  // ============================================
  const FullscreenModal = ({ 
    children, 
    title, 
    onBack,
    footer
  }: { 
    children: React.ReactNode; 
    title: string;
    onBack?: () => void;
    footer?: React.ReactNode;
  }) => (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Fixed Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b bg-background">
        {onBack ? (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        ) : (
          <div className="w-10" />
        )}
        <h2 className="text-lg font-semibold">{title}</h2>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {children}
      </div>
      
      {/* Sticky Footer */}
      {footer && (
        <div className="flex-shrink-0 px-4 py-4 border-t bg-background space-y-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
          {footer}
        </div>
      )}
    </div>
  );

  // ============================================
  // ANIMATED MICROPHONE BUTTON
  // ============================================
  const AnimatedMicButton = () => (
    <div className="relative flex items-center justify-center">
      {/* Ripple animations when recording */}
      {isRecording && (
        <>
          <span className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" style={{ animationDuration: '1.5s' }} />
          <span className="absolute inset-[-8px] rounded-full border-2 border-destructive/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
          <span className="absolute inset-[-16px] rounded-full border border-destructive/20 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.6s' }} />
        </>
      )}
      
      {/* Gradient ring */}
      <div className={cn(
        "relative p-1 rounded-full transition-all duration-300",
        isRecording 
          ? "bg-gradient-to-r from-destructive via-red-400 to-destructive" 
          : "bg-gradient-to-r from-primary via-accent to-primary"
      )}>
        <Button
          size="lg"
          variant={isRecording ? "destructive" : "default"}
          className={cn(
            "h-24 w-24 rounded-full shadow-xl transition-all duration-200",
            isRecording && "scale-95"
          )}
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? (
            <Square className="h-10 w-10 fill-current" />
          ) : (
            <Mic className="h-10 w-10" />
          )}
        </Button>
      </div>
    </div>
  );

  // ============================================
  // TRANSCRIPT PREVIEW COMPONENT
  // ============================================
  const TranscriptPreview = () => {
    const { text, isTruncated } = getTruncatedTranscript(transcript);
    
    if (!transcript) return null;
    
    return (
      <Card 
        className="p-4 bg-muted/50 cursor-pointer active:bg-muted/70 transition-colors"
        onClick={openTranscriptView}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Transcription :</p>
            <p className="text-sm italic line-clamp-3">"{text}"</p>
          </div>
          {isTruncated && (
            <Button variant="ghost" size="sm" className="shrink-0 text-primary">
              <Eye className="h-4 w-4 mr-1" />
              Voir tout
            </Button>
          )}
        </div>
      </Card>
    );
  };

  // ============================================
  // FULLSCREEN TRANSCRIPT VIEW
  // ============================================
  if (step === "transcript-view") {
    return (
      <FullscreenModal 
        title="Transcription complète" 
        onBack={closeTranscriptView}
        footer={
          <Button variant="outline" onClick={copyToClipboard} className="w-full gap-2">
            <Copy className="h-4 w-4" />
            Copier la transcription
          </Button>
        }
      >
        <Card className="p-4 bg-muted/30">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
        </Card>
      </FullscreenModal>
    );
  }

  // ============================================
  // MANUAL TEXT INPUT STEP
  // ============================================
  if (step === "manual") {
    return (
      <FullscreenModal 
        title="Mode texte"
        onBack={switchToVoice}
        footer={
          <>
            <Button 
              onClick={handleManualSubmit} 
              disabled={!manualText.trim()}
              className="w-full gap-2"
              size="lg"
            >
              {isOnline ? <Sparkles className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
              {isOnline ? "Analyser (IA)" : "Analyser (local)"}
            </Button>
            {isSupported && (
              <Button variant="outline" onClick={switchToVoice} className="w-full gap-2">
                <Mic className="h-4 w-4" />
                Mode vocal
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Décrivez votre stock par écrit
          </p>

          {errorMessage && (
            <Card className="p-3 bg-destructive/10 border-destructive/20">
              <p className="text-sm text-destructive">{errorMessage}</p>
            </Card>
          )}

          <Textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Exemple: J'ai 50 savons Lux à 500 francs, 10 paquets de riz à 15000..."
            className="min-h-[150px] text-base"
          />
          <p className="text-xs text-muted-foreground">
            💡 Mentionnez le nom, la quantité et le prix de chaque produit
          </p>
        </div>
      </FullscreenModal>
    );
  }

  // ============================================
  // RECORDING STEP
  // ============================================
  if (step === "record") {
    return (
      <FullscreenModal 
        title="Dictez votre stock"
        footer={
          !!transcript.trim() && !isRecording ? (
            <>
              <Button
                onClick={handleDirectSave}
                disabled={savingTranscript}
                className="w-full gap-2"
                size="lg"
              >
                {savingTranscript ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Valider & enregistrer
              </Button>
              <Button
                variant="outline"
                onClick={() => analyzeTranscript(transcript.trim())}
                disabled={!isOnline}
                className="w-full gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {isOnline ? "Réanalyser (IA)" : "IA indisponible"}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={switchToManual} className="w-full gap-2">
              <Keyboard className="h-4 w-4" />
              Passer au mode texte
            </Button>
          )
        }
      >
        <div className="space-y-6">
          {/* Toggle mode auto/validation */}
          <div className="flex items-center justify-between px-3 py-2 border rounded-lg bg-muted/30">
            <Label htmlFor="auto-save-toggle" className="text-sm flex items-center gap-2 cursor-pointer">
              {autoSaveMode ? (
                <ToggleRight className="h-4 w-4 text-primary" />
              ) : (
                <ToggleLeft className="h-4 w-4 text-muted-foreground" />
              )}
              {autoSaveMode ? "Enregistrement auto" : "Valider avant"}
            </Label>
            <Switch
              id="auto-save-toggle"
              checked={autoSaveMode}
              onCheckedChange={setAutoSaveMode}
            />
          </div>

          {/* Online/Offline status */}
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
            isOnline ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            <span>{isOnline ? "En ligne - Analyse IA disponible" : "Hors-ligne - Analyse locale"}</span>
          </div>

          {/* Browser not supported warning */}
          {!isSupported && (
            <Card className="p-4 bg-warning/10 border-warning/20">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                <div>
                  <p className="font-medium text-warning">Navigateur non supporté</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Utilisez Chrome, Edge ou Safari, ou passez au mode texte.
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

          {/* Animated Microphone Button */}
          {isSupported && (
            <div className="flex flex-col items-center gap-4 py-4">
              <AnimatedMicButton />
              <div className="text-center">
                <span className={cn(
                  "text-sm font-medium",
                  isRecording ? "text-destructive" : "text-muted-foreground"
                )}>
                  {isRecording ? "Écoute en cours…" : "Appuyez pour dicter"}
                </span>
                {isRecording && (
                  <p className="text-2xl font-mono text-destructive mt-2 tabular-nums">
                    {formatDuration(recordingDuration)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Transcript Preview (collapsed) */}
          <TranscriptPreview />

          {/* Tips */}
          {!isRecording && !transcript && isSupported && (
            <Card className="p-4 bg-accent/5 border-accent/20">
              <p className="text-xs font-medium text-accent-foreground mb-2">💡 Comment dicter :</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Dites "suivant" pour séparer les produits</li>
                <li>• Exemple: "10 bidons d'huile à 6000, suivant, 5 casiers"</li>
                <li>• Dites "stop" ou "c'est tout" pour terminer</li>
              </ul>
            </Card>
          )}
        </div>
      </FullscreenModal>
    );
  }

  // ============================================
  // ANALYZING STEP
  // ============================================
  if (step === "analyzing") {
    return (
      <FullscreenModal title="Analyse en cours">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Analyse en cours...</p>
          <TranscriptPreview />
          {retryCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Tentative {retryCount}/{maxRetries}
            </p>
          )}
        </div>
      </FullscreenModal>
    );
  }

  // ============================================
  // SAVING STEP
  // ============================================
  if (step === "saving") {
    return (
      <FullscreenModal title="Enregistrement">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Enregistrement dans le stock...</p>
          <TranscriptPreview />
        </div>
      </FullscreenModal>
    );
  }

  // ============================================
  // VALIDATION STEP
  // ============================================
  if (step === "validate") {
    return (
      <FullscreenModal 
        title="Vérifier le stock"
        onBack={() => setStep("record")}
        footer={
          <>
            <Button
              onClick={handleComplete}
              disabled={items.length === 0 || isSubmitting}
              className="w-full gap-2"
              size="lg"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Valider & enregistrer
            </Button>
            <Button
              variant="outline"
              onClick={() => analyzeTranscript(transcript)}
              disabled={!isOnline || !transcript}
              className="w-full gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {isOnline ? "Réanalyser (IA)" : "IA indisponible"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {items.length} produit{items.length > 1 ? "s" : ""}
            </Badge>
          </div>

          {suggestions.length > 0 && (
            <Card className="p-3 bg-accent/10 border-accent/20">
              <p className="text-sm text-accent-foreground">💡 {suggestions[0]}</p>
            </Card>
          )}

          {/* Transcript Preview */}
          <TranscriptPreview />

          {/* Items list */}
          <div className="space-y-3">
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
        </div>
      </FullscreenModal>
    );
  }

  // ============================================
  // FINAL SCREEN (after auto-save)
  // ============================================
  return (
    <FullscreenModal 
      title="Stock ajouté"
      footer={
        <>
          <Button onClick={() => setStep("record")} className="w-full gap-2">
            <RefreshCw className="h-4 w-4" />
            Nouvelle dictée
          </Button>
          <Button variant="outline" onClick={onCancel} className="w-full">
            Fermer
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-8">
        <div className="text-center space-y-2">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <p className="text-muted-foreground">
            Les produits ont été enregistrés.
          </p>
        </div>

        {suggestions.length > 0 && (
          <Card className="p-3 bg-accent/10 border-accent/20">
            <p className="text-sm text-accent-foreground">💡 {suggestions[0]}</p>
          </Card>
        )}
      </div>
    </FullscreenModal>
  );
}

// ============================================
// INDIVIDUAL ITEM CARD COMPONENT
// ============================================
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

  const confidenceBadge = item.confidence && item.confidence !== "high" && (
    <Badge variant={item.confidence === "low" ? "destructive" : "secondary"} className="text-xs">
      {item.confidence === "low" ? "À vérifier" : "Partiel"}
    </Badge>
  );

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
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">{item.name}</p>
            {item.model && (
              <Badge variant="outline" className="text-xs shrink-0">
                {item.model}
              </Badge>
            )}
            {confidenceBadge}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-muted-foreground">
              Qté: {item.quantity}
            </span>
            <span className="text-sm font-medium text-primary">
              {formatMoney(item.unit_price)}
            </span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
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
