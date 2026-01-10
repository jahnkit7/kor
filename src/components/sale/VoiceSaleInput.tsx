import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Mic, Square, Loader2, Check, X, Edit2, User, Wallet, CreditCard, AlertTriangle, UserPlus, Users, History, RotateCcw, Pencil, Trash2, Search, FileText, ChevronDown, WifiOff, Keyboard } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useFeatureTracking } from "@/hooks/use-feature-tracking";
import { useTranscriptionLearning } from "@/hooks/use-transcription-learning";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { parseSalesLocally, setKnownStockItems, setLearnedCorrections } from "@/lib/local-sale-parser";

// Voice history storage key
const VOICE_HISTORY_KEY = "voice_sale_history";

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
  products: Array<{ name: string; quantity: number; unit_price: number; stock_item_id?: string | null }>;
  note: string | null;
  // Resolved client info (set after disambiguation)
  resolved_client_id?: string | null;
  resolved_client_name?: string | null;
}

interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  model?: string | null;
}

interface VoiceSaleInputProps {
  clients: Client[];
  stockItems?: StockItem[];
  onComplete: (sale: {
    type: "cash" | "credit";
    amount: number;
    paid?: number;
    note?: string;
    client_id?: string;
    items?: Array<{ stock_item_id?: string | null; product_name: string; quantity: number; unit_price: number }>;
  }) => Promise<void>;
  onCancel: () => void;
  onCreateClient?: (name: string) => Promise<Client | null>;
  onFinish?: () => void;
}

const isSpeechRecognitionSupported = () => {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
};

export function VoiceSaleInput({ clients, stockItems, onComplete, onCancel, onCreateClient, onFinish }: VoiceSaleInputProps) {
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();
  const { trackFeature } = useFeatureTracking();
  const { saveCorrection, applyCorrections, corrections } = useTranscriptionLearning();

  // Track voice input usage
  useEffect(() => {
    trackFeature("sales", { action: "voice_input" });
  }, [trackFeature]);

  const [step, setStep] = useState<"record" | "analyzing" | "validate" | "saving" | "text-input">("record");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [manualText, setManualText] = useState("");
  const [parsedSales, setParsedSales] = useState<ParsedSale[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [useLocalParser, setUseLocalParser] = useState(false);
  
  // Disambiguation state
  const [disambiguationSaleIndex, setDisambiguationSaleIndex] = useState<number | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string>(""); // "id" or "create" or "anonymous"
  
  // Edit sale state (full edit: amount, type, client, paid, products, note)
  const [editSaleIndex, setEditSaleIndex] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState<"cash" | "credit">("cash");
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [editPaid, setEditPaid] = useState("");
  const [editCreateNewClient, setEditCreateNewClient] = useState(false);
  const [editNewClientName, setEditNewClientName] = useState("");
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [editProducts, setEditProducts] = useState<Array<{ name: string; quantity: number; unit_price: number }>>([]);
  const [editNote, setEditNote] = useState("");
  
  // Voice search for client
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);
  const voiceSearchRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  
  // Delete confirmation state
  const [deleteSaleIndex, setDeleteSaleIndex] = useState<number | null>(null);
  
  // History state
  const [showHistory, setShowHistory] = useState(false);
  const [voiceHistory, setVoiceHistory] = useState<Array<{ transcript: string; date: string }>>([]);
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Voice search functions
  const startVoiceSearch = useCallback(async () => {
    if (!isSpeechRecognitionSupported()) {
      toast({ title: "Reconnaissance vocale non supportée", variant: "destructive" });
      return;
    }
    
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast({ title: "Accès au microphone refusé", variant: "destructive" });
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onstart = () => {
      setIsVoiceSearching(true);
    };
    
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setClientSearchQuery(transcript.trim());
    };
    
    recognition.onerror = () => {
      setIsVoiceSearching(false);
    };
    
    recognition.onend = () => {
      setIsVoiceSearching(false);
    };
    
    voiceSearchRecognitionRef.current = recognition;
    recognition.start();
  }, [toast]);
  
  const stopVoiceSearch = useCallback(() => {
    if (voiceSearchRecognitionRef.current) {
      voiceSearchRecognitionRef.current.stop();
      voiceSearchRecognitionRef.current = null;
    }
    setIsVoiceSearching(false);
  }, []);

  // Load voice history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(VOICE_HISTORY_KEY);
      if (stored) {
        setVoiceHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error loading voice history:", e);
    }
  }, []);

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

  const analyzeTranscript = useCallback(async (text: string, saveToHistory = true) => {
    // If offline or local parser enabled, use local parsing
    if (!isOnline || useLocalParser) {
      setStep("analyzing");
      
      try {
        // Inject stock items and learned corrections into the parser
        if (stockItems) {
          setKnownStockItems(stockItems.map(s => s.name));
        }
        if (corrections.length > 0) {
          setLearnedCorrections(corrections.map(c => ({
            original: c.original_text,
            corrected: c.corrected_text,
            type: c.correction_type as "client_name" | "product_name" | "general",
          })));
        }
        
        const result = parseSalesLocally(text);
        
        if (result.sales.length === 0) {
          setErrorMessage("Aucune vente détectée. Essayez: 'J'ai vendu 5 chargeurs à 1500 à Kofi'");
          setStep("record");
          return;
        }
        
        // Convert local parsed sales to the expected format
        const processedSales: ParsedSale[] = result.sales.map(sale => ({
          type: sale.type,
          amount: sale.amount,
          paid: sale.paid,
          remaining: sale.remaining,
          client_match: {
            status: sale.client_name ? "not_found" : "found",
            client_id: null,
            client_name: sale.client_name,
            candidates: [],
          },
          products: sale.products,
          note: sale.note,
          resolved_client_id: undefined,
          resolved_client_name: sale.client_name,
        }));
        
        setParsedSales(processedSales);
        setSuggestions(result.suggestions);
        setStep("validate");
        
        toast({
          title: `${result.sales.length} vente(s) détectée(s) (local)`,
          description: "Analyse hors-ligne - vérifiez les détails",
        });
        return;
      } catch (error) {
        console.error("Local parse error:", error);
        setErrorMessage("Erreur d'analyse locale");
        setStep("record");
        return;
      }
    }

    setStep("analyzing");
    setErrorMessage(null);
    setLastTranscript(text);
    setCanRetry(false);

    // Save to history
    if (saveToHistory) {
      try {
        const newEntry = { transcript: text, date: new Date().toISOString() };
        const updated = [newEntry, ...voiceHistory.filter(h => h.transcript !== text)].slice(0, 10);
        setVoiceHistory(updated);
        localStorage.setItem(VOICE_HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Error saving to history:", e);
      }
    }

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

      // Include stock items for product matching
      const stockForAI = stockItems?.map(s => ({ 
        id: s.id, 
        name: s.name, 
        quantity: s.quantity, 
        unit_price: s.unit_price,
        model: s.model 
      })) || [];

      const { data, error } = await supabase.functions.invoke("analyze-sale-voice", {
        body: { transcript: text, clients: clientsForAI, stockItems: stockForAI },
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
  }, [clients, isOnline, toast, voiceHistory, stockItems, corrections, useLocalParser]);

  const getSaleStatus = (sale: ParsedSale): "ready" | "needs_action" => {
    if (sale.client_match.status === "found") return "ready";
    if (sale.resolved_client_id !== undefined) return "ready"; // User already resolved
    return "needs_action";
  };

  // Check if any product in a sale has insufficient stock
  const getStockWarnings = (sale: ParsedSale): Array<{ productName: string; stockAfter: number; currentStock: number }> => {
    if (!stockItems) return [];
    
    const warnings: Array<{ productName: string; stockAfter: number; currentStock: number }> = [];
    
    sale.products?.forEach(product => {
      if (product.stock_item_id) {
        const stockItem = stockItems.find(s => s.id === product.stock_item_id);
        if (stockItem && stockItem.quantity < product.quantity) {
          warnings.push({
            productName: product.name,
            currentStock: stockItem.quantity,
            stockAfter: stockItem.quantity - product.quantity,
          });
        }
      }
    });
    
    return warnings;
  };

  // Check if there are any stock warnings across all sales
  const hasAnyStockWarnings = useMemo(() => {
    return parsedSales.some(sale => getStockWarnings(sale).length > 0);
  }, [parsedSales, stockItems]);

  const allSalesReady = () => {
    return parsedSales.every(sale => getSaleStatus(sale) === "ready");
  };

  const openDisambiguation = (index: number) => {
    setDisambiguationSaleIndex(index);
    setSelectedCandidate("");
  };

  const openEditSale = (index: number) => {
    const sale = parsedSales[index];
    setEditSaleIndex(index);
    setEditAmount(String(sale.amount));
    setEditType(sale.type);
    setEditClientId(sale.resolved_client_id || sale.client_match.client_id || null);
    setEditPaid(String(sale.paid));
    setClientSearchQuery("");
    setEditProducts(sale.products ? [...sale.products] : []);
    setEditNote(sale.note || "");
    
    // Pre-fill for new client creation if client was not found
    if (sale.client_match.status === "not_found" && sale.client_match.client_name && !sale.resolved_client_id) {
      setEditCreateNewClient(true);
      setEditNewClientName(sale.client_match.client_name);
    } else {
      setEditCreateNewClient(false);
      setEditNewClientName("");
    }
  };
  
  // Filtered clients for search
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients;
    const query = clientSearchQuery.toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.phone?.toLowerCase().includes(query)
    );
  }, [clients, clientSearchQuery]);

  // Calculate totals for summary - MUST be before any early returns
  const totals = useMemo(() => {
    let totalCash = 0;
    let totalCredit = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    
    parsedSales.forEach(sale => {
      if (sale.type === "cash") {
        totalCash += sale.amount;
        totalPaid += sale.amount;
      } else {
        totalCredit += sale.amount;
        totalPaid += sale.paid;
        totalRemaining += sale.remaining;
      }
    });
    
    return {
      total: totalCash + totalCredit,
      cash: totalCash,
      credit: totalCredit,
      paid: totalPaid,
      remaining: totalRemaining
    };
  }, [parsedSales]);

  const handleEditSaleConfirm = async () => {
    if (editSaleIndex === null) return;
    
    const newAmount = parseInt(editAmount) || 0;
    const newPaid = parseInt(editPaid) || 0;
    
    if (newAmount <= 0) {
      toast({ title: "Montant invalide", variant: "destructive" });
      return;
    }

    if (editType === "credit" && newPaid > newAmount) {
      toast({ title: "Le montant payé ne peut pas dépasser le total", variant: "destructive" });
      return;
    }

    // Validate new client name if creating
    if (editCreateNewClient && !editNewClientName.trim()) {
      toast({ title: "Nom du client requis", variant: "destructive" });
      return;
    }

    const updatedSales = [...parsedSales];
    const sale = updatedSales[editSaleIndex];
    
    // Save client name correction for learning
    const originalClientName = sale.client_match.client_name;
    
    // Recalculate paid/remaining based on new type
    const paid = editType === "cash" ? newAmount : Math.min(newPaid, newAmount);
    const remaining = editType === "credit" ? Math.max(0, newAmount - paid) : 0;
    
    let finalClientId: string | null = editClientId;
    let finalClientName: string | null = null;
    
    // Create new client if switch is enabled
    if (editCreateNewClient && editNewClientName.trim() && onCreateClient) {
      const newClient = await onCreateClient(editNewClientName.trim());
      if (newClient) {
        finalClientId = newClient.id;
        finalClientName = newClient.name;
        toast({ title: `Client "${newClient.name}" créé` });
        
        // Save correction if original name was different (learning)
        if (originalClientName && originalClientName.toLowerCase() !== newClient.name.toLowerCase()) {
          await saveCorrection(originalClientName, newClient.name, "client_name");
        }
      }
    } else if (editClientId) {
      finalClientName = clients.find(c => c.id === editClientId)?.name || null;
      
      // Save correction if user selected a different client (learning)
      if (originalClientName && finalClientName && originalClientName.toLowerCase() !== finalClientName.toLowerCase()) {
        await saveCorrection(originalClientName, finalClientName, "client_name");
      }
    }
    
    updatedSales[editSaleIndex] = {
      ...sale,
      type: editType,
      amount: newAmount,
      paid: paid,
      remaining: remaining,
      resolved_client_id: finalClientId,
      resolved_client_name: finalClientName,
      products: editProducts,
      note: editNote || null,
      client_match: {
        ...sale.client_match,
        status: finalClientId ? "found" : "not_found",
        client_id: finalClientId,
      }
    };

    setParsedSales(updatedSales);
    setEditSaleIndex(null);
    setEditAmount("");
    setEditPaid("");
    setEditCreateNewClient(false);
    setEditNewClientName("");
    setClientSearchQuery("");
    setEditProducts([]);
    setEditNote("");
    toast({ title: "Vente modifiée" });
  };

  const confirmDeleteSale = (index: number) => {
    setDeleteSaleIndex(index);
  };
  
  const handleDeleteConfirm = () => {
    if (deleteSaleIndex === null) return;
    
    const updatedSales = parsedSales.filter((_, i) => i !== deleteSaleIndex);
    setParsedSales(updatedSales);
    setDeleteSaleIndex(null);
    
    if (updatedSales.length === 0) {
      setStep("record");
      toast({ title: "Toutes les ventes ont été supprimées" });
    } else {
      toast({ title: "Vente supprimée" });
    }
  };

  const replayFromHistory = (transcript: string) => {
    setShowHistory(false);
    analyzeTranscript(transcript, false);
  };

  const clearHistory = () => {
    setVoiceHistory([]);
    localStorage.removeItem(VOICE_HISTORY_KEY);
    toast({ title: "Historique effacé" });
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
    setStep("saving");
    setIsSubmitting(true);

    try {
      // First, auto-create clients for all sales that need it
      const updatedSales = [...parsedSales];
      
      for (let i = 0; i < updatedSales.length; i++) {
        const sale = updatedSales[i];
        
        // Robust check: auto-create client if:
        // - Has a client name detected
        // - No resolved_client_id yet
        // - No existing client_id from AI match
        // - Status is NOT ambiguous (ambiguous = user must choose)
        const needsClientCreation = 
          sale.client_match.client_name &&
          !sale.resolved_client_id &&
          !sale.client_match.client_id &&
          sale.client_match.status !== "ambiguous";
        
        if (needsClientCreation) {
          if (!onCreateClient) {
            toast({
              title: "Erreur",
              description: `Impossible de créer le client "${sale.client_match.client_name}". Reconnectez-vous.`,
              variant: "destructive"
            });
            setStep("validate");
            setIsSubmitting(false);
            return;
          }
          
          const newClient = await onCreateClient(sale.client_match.client_name);
          if (newClient) {
            updatedSales[i] = {
              ...sale,
              resolved_client_id: newClient.id,
              resolved_client_name: newClient.name,
              client_match: {
                ...sale.client_match,
                status: "found",
                client_id: newClient.id,
              }
            };
          } else {
            toast({
              title: "Erreur",
              description: `Impossible de créer le client "${sale.client_match.client_name}". Réessayez.`,
              variant: "destructive"
            });
            setStep("validate");
            setIsSubmitting(false);
            return;
          }
        }
      }
      
      // Now save all sales
      for (const sale of updatedSales) {
        // Prepare sale items for stock deduction
        const saleItems = sale.products?.map(product => ({
          stock_item_id: product.stock_item_id || null,
          product_name: product.name,
          quantity: product.quantity,
          unit_price: product.unit_price,
        })) || [];

        await onComplete({
          type: sale.type,
          amount: sale.amount,
          paid: sale.paid || 0,
          note: sale.note || undefined,
          client_id: sale.resolved_client_id || undefined,
          items: saleItems.length > 0 ? saleItems : undefined,
        });
      }
      
      toast({
        title: "Ventes enregistrées",
        description: `${updatedSales.length} vente${updatedSales.length > 1 ? 's' : ''} ajoutée${updatedSales.length > 1 ? 's' : ''}`
      });
      
      // Call onFinish to close and redirect
      if (onFinish) {
        onFinish();
      }
    } catch (error) {
      console.error("Error saving sales:", error);
      toast({ title: "Erreur", description: "Impossible d'enregistrer les ventes", variant: "destructive" });
      setStep("validate");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Text input mode for offline
  if (step === "text-input") {
    return (
      <div className="space-y-4 p-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <WifiOff className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-bold">Mode texte (hors-ligne)</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Décrivez vos ventes en texte, l'analyse sera faite localement
          </p>
        </div>

        <Textarea
          placeholder="Ex: J'ai vendu 5 chargeurs à 1500 à Kofi, il a payé cash. Ensuite Mamadou a pris 3 écrans à 5000, il a payé 10000 sur 15000."
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          className="min-h-[150px]"
        />

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setStep("record");
              setManualText("");
            }}
            className="flex-1"
          >
            Retour
          </Button>
          <Button
            onClick={() => {
              if (manualText.trim().length >= 10) {
                analyzeTranscript(manualText.trim());
              } else {
                toast({ title: "Texte trop court", variant: "destructive" });
              }
            }}
            disabled={manualText.trim().length < 10}
            className="flex-1"
          >
            Analyser
          </Button>
        </div>

        <Card className="p-3 bg-amber-500/10 border-amber-500/20">
          <p className="text-xs text-amber-600">
            💡 L'analyse locale fonctionne sans internet mais peut être moins précise. 
            Vérifiez bien les montants et clients détectés.
          </p>
        </Card>
      </div>
    );
  }

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

        {/* Offline warning with text mode button */}
        {!isOnline && (
          <Card className="p-4 bg-amber-500/10 border-amber-500/20">
            <div className="flex items-start gap-3">
              <WifiOff className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700">Mode hors-ligne</p>
                <p className="text-xs text-amber-600 mt-1">
                  La reconnaissance vocale nécessite internet. Utilisez le mode texte pour saisir vos ventes.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep("text-input")}
                  className="mt-2 gap-2"
                >
                  <Keyboard className="w-4 h-4" />
                  Mode texte
                </Button>
              </div>
            </div>
          </Card>
        )}

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

        {/* History button */}
        {voiceHistory.length > 0 && (
          <Button 
            variant="outline" 
            onClick={() => setShowHistory(true)} 
            className="w-full"
          >
            <History className="w-4 h-4 mr-2" />
            Historique ({voiceHistory.length})
          </Button>
        )}

        {/* Cancel button */}
        <Button variant="ghost" onClick={onCancel} className="w-full">
          Annuler
        </Button>

        {/* History Dialog */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Dictées récentes
              </DialogTitle>
            </DialogHeader>
            
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-2 pr-4">
                {voiceHistory.map((entry, idx) => (
                  <Card 
                    key={idx} 
                    className="p-3 hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => replayFromHistory(entry.transcript)}
                  >
                    <div className="flex items-start gap-3">
                      <RotateCcw className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{entry.transcript}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(entry.date).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={clearHistory} className="flex-1 text-destructive">
                Effacer tout
              </Button>
              <Button variant="outline" onClick={() => setShowHistory(false)} className="flex-1">
                Fermer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditSale(index);
                        }}
                        className="flex items-center gap-1 font-bold hover:text-primary transition-colors group"
                      >
                        {formatMoney(sale.amount)} CFA
                        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
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

                    {/* Stock warnings */}
                    {(() => {
                      const warnings = getStockWarnings(sale);
                      if (warnings.length === 0) return null;
                      return (
                        <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          {warnings.map((w, idx) => (
                            <p key={idx} className="text-xs text-amber-600 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>
                                <strong>{w.productName}</strong>: stock actuel {w.currentStock}, 
                                sera <strong className="text-destructive">{w.stockAfter}</strong> après vente
                              </span>
                            </p>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditSale(index);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDeleteSale(index);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {status === "needs_action" && (
                      <Button size="sm" variant="outline">
                        Résoudre
                      </Button>
                    )}
                  </div>
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

        {/* Summary */}
        <Card className="p-4 bg-secondary/30">
          <div className="space-y-2">
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatMoney(totals.total)} CFA</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-cash" />
                Cash
              </span>
              <span className="text-cash font-medium">{formatMoney(totals.cash)} CFA</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-credit" />
                Crédit
              </span>
              <span className="text-credit font-medium">{formatMoney(totals.credit)} CFA</span>
            </div>
            
            {totals.remaining > 0 && (
              <>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span>Encaissé maintenant</span>
                  <span className="font-medium text-success">{formatMoney(totals.paid)} CFA</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Restant à payer</span>
                  <span className="font-medium text-amber-600">{formatMoney(totals.remaining)} CFA</span>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Global stock warning */}
        {hasAnyStockWarnings && (
          <Card className="p-3 bg-amber-500/10 border-amber-500/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-600 text-sm">Stock insuffisant</p>
                <p className="text-xs text-amber-600/80">
                  Certains produits ont un stock inférieur à la quantité vendue. 
                  Le stock deviendra négatif après cette vente.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button variant="outline" onClick={() => setStep("record")} disabled={isSubmitting}>
            <Edit2 className="w-4 h-4 mr-2" />
            Modifier
          </Button>
          <Button 
            onClick={handleConfirmAll} 
            disabled={isSubmitting}
            className={hasAnyStockWarnings ? "bg-amber-500 hover:bg-amber-600" : "bg-success hover:bg-success/90"}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            {hasAnyStockWarnings ? "Confirmer quand même" : "Confirmer tout"}
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

        {/* Edit Sale Dialog */}
        <Dialog open={editSaleIndex !== null} onOpenChange={(open) => !open && setEditSaleIndex(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier la vente</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Type toggle */}
              <div className="space-y-2">
                <Label>Type de vente</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={editType === "cash" ? "default" : "outline"}
                    className={cn("flex-1", editType === "cash" && "bg-cash hover:bg-cash/90")}
                    onClick={() => setEditType("cash")}
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Cash
                  </Button>
                  <Button
                    type="button"
                    variant={editType === "credit" ? "default" : "outline"}
                    className={cn("flex-1", editType === "credit" && "bg-credit hover:bg-credit/90")}
                    onClick={() => setEditType("credit")}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Crédit
                  </Button>
                </div>
              </div>

              {/* Products */}
              {editProducts.length > 0 && (
                <div className="space-y-2">
                  <Label>Produits détectés</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {editProducts.map((product, idx) => (
                      <div key={idx} className="p-3 border rounded-lg bg-secondary/30 space-y-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Nom du produit</Label>
                          <Input
                            value={product.name}
                            onChange={(e) => {
                              const updated = [...editProducts];
                              updated[idx] = { ...updated[idx], name: e.target.value };
                              setEditProducts(updated);
                            }}
                            placeholder="Nom du produit"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Quantité</Label>
                            <Input
                              type="number"
                              value={product.quantity}
                              onChange={(e) => {
                                const updated = [...editProducts];
                                updated[idx] = { ...updated[idx], quantity: parseInt(e.target.value) || 0 };
                                setEditProducts(updated);
                              }}
                              min={1}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Prix unit.</Label>
                            <Input
                              type="number"
                              value={product.unit_price}
                              onChange={(e) => {
                                const updated = [...editProducts];
                                updated[idx] = { ...updated[idx], unit_price: parseInt(e.target.value) || 0 };
                                setEditProducts(updated);
                              }}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-right">
                          = {formatMoney(product.quantity * product.unit_price)} CFA
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Amounts - same line */}
              <div className={cn("grid gap-3", editType === "credit" ? "grid-cols-2" : "grid-cols-1")}>
                <div className="space-y-1">
                  <Label htmlFor="edit-amount" className="text-xs">Montant total</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    placeholder="15000"
                  />
                </div>
                {editType === "credit" && (
                  <div className="space-y-1">
                    <Label htmlFor="edit-paid" className="text-xs">Montant payé</Label>
                    <Input
                      id="edit-paid"
                      type="number"
                      value={editPaid}
                      onChange={(e) => setEditPaid(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
              {editType === "credit" && (
                <p className="text-xs text-muted-foreground -mt-2">
                  Restant : {formatMoney(Math.max(0, (parseInt(editAmount) || 0) - (parseInt(editPaid) || 0)))} CFA
                </p>
              )}

              {/* Note - collapsible */}
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-secondary/50 border">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Note</span>
                    {editNote && <Badge variant="secondary" className="text-xs px-1.5 py-0">1</Badge>}
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <Input
                    id="edit-note"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Note optionnelle..."
                  />
                </CollapsibleContent>
              </Collapsible>

              {/* Client selection - compact */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Client</Label>
                  {onCreateClient && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Nouveau</span>
                      <Switch
                        checked={editCreateNewClient}
                        onCheckedChange={(checked) => {
                          setEditCreateNewClient(checked);
                          if (checked) {
                            setEditClientId(null);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
                
                {/* New client name input */}
                {editCreateNewClient && (
                  <div className="space-y-2">
                    <Input
                      type="text"
                      value={editNewClientName}
                      onChange={(e) => setEditNewClientName(e.target.value)}
                      placeholder="Nom du nouveau client"
                      className="text-lg"
                    />
                  </div>
                )}
                
                {/* Client search and list - only if not creating new */}
                {!editCreateNewClient && (
                  <>
                    {/* Search bar with voice search */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="text"
                          value={clientSearchQuery}
                          onChange={(e) => setClientSearchQuery(e.target.value)}
                          placeholder="Rechercher un client..."
                          className="pl-10 pr-3"
                        />
                      </div>
                      <Button
                        type="button"
                        variant={isVoiceSearching ? "destructive" : "outline"}
                        size="icon"
                        onClick={isVoiceSearching ? stopVoiceSearch : startVoiceSearch}
                        className={cn(
                          "shrink-0",
                          isVoiceSearching && "animate-pulse"
                        )}
                      >
                        {isVoiceSearching ? (
                          <Square className="w-4 h-4" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    
                    {isVoiceSearching && (
                      <p className="text-xs text-primary animate-pulse text-center">
                        🎤 Dites le nom du client...
                      </p>
                    )}
                    
                    <ScrollArea className="h-32 border rounded-lg">
                      <div className="p-2 space-y-1">
                        <button
                          type="button"
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                            editClientId === null && !editCreateNewClient ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                          )}
                          onClick={() => setEditClientId(null)}
                        >
                          <span className="flex items-center gap-2">
                            <X className="w-4 h-4" />
                            Vente anonyme
                          </span>
                        </button>
                        {filteredClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                              editClientId === client.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                            )}
                            onClick={() => setEditClientId(client.id)}
                          >
                            <span className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              {client.name}
                              {client.phone && <span className="text-xs opacity-70">({client.phone})</span>}
                            </span>
                          </button>
                        ))}
                        {filteredClients.length === 0 && clientSearchQuery && (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Aucun client trouvé
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditSaleIndex(null)} className="flex-1">
                Annuler
              </Button>
              <Button onClick={handleEditSaleConfirm} className="flex-1">
                Valider
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteSaleIndex !== null} onOpenChange={(open) => !open && setDeleteSaleIndex(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette vente ?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteSaleIndex !== null && parsedSales[deleteSaleIndex] && (
                  <>
                    Êtes-vous sûr de vouloir supprimer cette vente de{" "}
                    <span className="font-semibold">
                      {formatMoney(parsedSales[deleteSaleIndex].amount)} CFA
                    </span>
                    {parsedSales[deleteSaleIndex].resolved_client_name && (
                      <> pour <span className="font-semibold">{parsedSales[deleteSaleIndex].resolved_client_name}</span></>
                    )}
                    {" "}?
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
