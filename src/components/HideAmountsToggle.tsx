import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSecurity } from "@/hooks/use-security";
import { toast } from "sonner";

export function HideAmountsToggle() {
  const { hideAmounts, updateSettings, loading } = useSecurity();

  const handleToggle = async () => {
    try {
      await updateSettings({ hideAmounts: !hideAmounts });
      toast.success(hideAmounts ? "Montants visibles" : "Montants cachés");
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  if (loading) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className="text-muted-foreground hover:text-foreground"
    >
      {hideAmounts ? (
        <EyeOff className="w-5 h-5" />
      ) : (
        <Eye className="w-5 h-5" />
      )}
    </Button>
  );
}

// Helper hook to format money with hiding support
export function useHiddenAmount() {
  const { hideAmounts } = useSecurity();
  
  const formatMoney = (amount: number) => {
    if (hideAmounts) {
      return "•••••";
    }
    return new Intl.NumberFormat("fr-FR").format(amount);
  };

  return { formatMoney, hideAmounts };
}
