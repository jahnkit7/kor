import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useBetaFeedback } from "@/hooks/use-beta-feedback";
import { Star, Send, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

interface BetaFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureKey: string;
  featureName?: string;
}

export function BetaFeedbackDialog({
  open,
  onOpenChange,
  featureKey,
  featureName,
}: BetaFeedbackDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const { submitFeedback, isSubmitting } = useBetaFeedback();

  const handleSubmit = async () => {
    if (rating === 0) return;

    const success = await submitFeedback({
      featureKey,
      rating,
      comment: comment.trim() || undefined,
    });

    if (success) {
      // Reset and close
      setRating(0);
      setComment("");
      onOpenChange(false);
    }
  };

  const displayRating = hoveredRating || rating;

  const getRatingLabel = (r: number) => {
    switch (r) {
      case 1: return "Très décevant";
      case 2: return "Décevant";
      case 3: return "Correct";
      case 4: return "Bien";
      case 5: return "Excellent!";
      default: return "Notez cette fonctionnalité";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-white" />
            </div>
            Feedback Bêta
          </DialogTitle>
          <DialogDescription>
            Aidez-nous à améliorer {featureName || "cette fonctionnalité"} avec votre avis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "w-8 h-8 transition-colors",
                      star <= displayRating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm font-medium text-muted-foreground">
              {getRatingLabel(displayRating)}
            </p>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Commentaire (optionnel)
            </label>
            <Textarea
              placeholder="Partagez votre expérience, suggestions, ou problèmes rencontrés..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? "Envoi..." : "Envoyer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
