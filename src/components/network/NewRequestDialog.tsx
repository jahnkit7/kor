import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Mic, 
  MicOff, 
  Send, 
  Package,
  Loader2,
  Sparkles
} from "lucide-react";
import { useProductRequests, UNITS } from "@/hooks/use-product-requests";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewRequestDialog({ open, onOpenChange }: NewRequestDialogProps) {
  const { createRequest } = useProductRequests();
  const [saving, setSaving] = useState(false);
  
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("pièces");
  const [maxPrice, setMaxPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [rawTranscript, setRawTranscript] = useState("");

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Impossible d'accéder au micro");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Convert to base64
      const buffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(buffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      // First, transcribe the audio using the existing voice function
      const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke(
        "analyze-stock-voice",
        {
          body: { audio: base64Audio },
        }
      );

      if (transcribeError) throw transcribeError;

      const transcript = transcribeData?.transcript || transcribeData?.text;
      if (!transcript) {
        throw new Error("Aucune transcription reçue");
      }

      setRawTranscript(transcript);
      toast.success("Transcription reçue !");

      // Now analyze the transcript for product request
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-request-voice",
        {
          body: { transcript },
        }
      );

      if (analysisError) throw analysisError;

      // Pre-fill the form
      if (analysisData.product_name) {
        setProductName(analysisData.product_name);
      }
      if (analysisData.quantity) {
        setQuantity(analysisData.quantity.toString());
      }
      if (analysisData.unit) {
        const matchedUnit = UNITS.find(u => 
          u.value === analysisData.unit || 
          u.label.toLowerCase() === analysisData.unit?.toLowerCase()
        );
        if (matchedUnit) {
          setUnit(matchedUnit.value);
        }
      }
      if (analysisData.max_price) {
        setMaxPrice(analysisData.max_price.toString());
      }
      if (analysisData.notes) {
        setNotes(analysisData.notes);
      }

      toast.success("Formulaire pré-rempli !");
    } catch (error) {
      console.error("Error processing audio:", error);
      toast.error("Erreur lors du traitement audio");
    } finally {
      setIsProcessing(false);
    }
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
      // Reset form
      setProductName("");
      setQuantity("");
      setUnit("pièces");
      setMaxPrice("");
      setNotes("");
      setRawTranscript("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md mx-4 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            Nouvelle demande
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Voice Recording Button */}
          <div className="flex justify-center">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg",
                isRecording 
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : isProcessing
                    ? "bg-secondary text-muted-foreground"
                    : "bg-gradient-to-br from-primary to-accent text-primary-foreground hover:scale-105"
              )}
            >
              {isProcessing ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : isRecording ? (
                <MicOff className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>
          </div>
          
          <p className="text-center text-xs text-muted-foreground">
            {isRecording 
              ? "Parlez maintenant... Appuyez pour arrêter" 
              : isProcessing 
                ? "Analyse en cours..."
                : "Dictez votre demande ou remplissez le formulaire"}
          </p>

          {/* Transcript display */}
          {rawTranscript && (
            <div className="p-3 bg-primary/5 rounded-xl border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Transcription
              </p>
              <p className="text-sm text-foreground">{rawTranscript}</p>
            </div>
          )}

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

          {/* Quantity & Unit */}
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
              <div className="flex flex-wrap gap-1">
                {UNITS.slice(0, 3).map((u) => (
                  <button
                    key={u.value}
                    onClick={() => setUnit(u.value)}
                    className={cn(
                      "px-2 py-1.5 rounded-lg text-xs font-medium transition-colors",
                      unit === u.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
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
              className="rounded-xl resize-none"
              rows={2}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={saving || !productName.trim()}
            className="w-full h-12 rounded-xl font-semibold"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Send className="w-5 h-5 mr-2" />
            )}
            Publier la demande
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
