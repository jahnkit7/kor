import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Loader2, Check, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSubscriptionUpgrade } from "@/hooks/use-subscription-upgrade";
import { toast } from "sonner";

interface ActivateCodeDialogProps {
  onSuccess?: () => void;
  variant?: "default" | "compact";
}

export function ActivateCodeDialog({ onSuccess, variant = "default" }: ActivateCodeDialogProps) {
  const { user } = useAuth();
  const { applyPlanToSubscription } = useSubscriptionUpgrade();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [planName, setPlanName] = useState("");

  const handleActivate = async () => {
    if (!code.trim()) {
      toast.error("Veuillez entrer un code");
      return;
    }

    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    setLoading(true);
    try {
      // 1. Find the code - now RLS allows reading available codes
      const { data: codeData, error: codeError } = await supabase
        .from("recharge_codes")
        .select("*, subscription_plans:plan_id(*)")
        .eq("code", code.trim().toUpperCase())
        .eq("is_used", false)
        .maybeSingle();

      if (codeError) throw codeError;

      if (!codeData) {
        toast.error("Code invalide");
        setLoading(false);
        return;
      }

      // Check if code is active
      if ((codeData as any).is_active === false) {
        toast.error("Ce code a été désactivé");
        setLoading(false);
        return;
      }

      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        toast.error("Ce code a expiré");
        setLoading(false);
        return;
      }

      const plan = codeData.subscription_plans as any;
      const durationDays = plan?.duration_days || 30;

      // 2. Mark code as used
      const { error: updateCodeError } = await supabase
        .from("recharge_codes")
        .update({
          is_used: true,
          used_by: user.id,
          used_at: new Date().toISOString(),
        })
        .eq("id", codeData.id);

      if (updateCodeError) throw updateCodeError;

      // 3. Bug 1 FIX: Use centralized applyPlanToSubscription with ALL limits
      const planData = {
        id: plan?.id || "premium",
        name: plan?.name || "Premium",
        duration_days: durationDays,
        max_clients: plan?.max_clients || null,
        max_sales_per_day: plan?.max_sales_per_day || null,
      };

      const applySuccess = await applyPlanToSubscription(user.id, planData, {
        extendFromCurrent: true,
        markTrialUsed: true,
      });

      if (!applySuccess) {
        throw new Error("Failed to apply plan");
      }

      setPlanName(plan?.name || "Premium");
      setSuccess(true);
      toast.success(`Plan ${plan?.name || "Premium"} activé pour ${durationDays} jours !`);
      onSuccess?.();

      // Reset after 2 seconds
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setCode("");
      }, 2000);

    } catch (error) {
      console.error("Error activating code:", error);
      toast.error("Erreur lors de l'activation du code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "compact" ? (
          <button className="text-xs font-medium text-primary hover:underline">
            Activer un code
          </button>
        ) : (
          <button className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Activer un code prépayé</p>
              <p className="text-sm text-muted-foreground">Recharger votre abonnement</p>
            </div>
            <CreditCard className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Activer un code prépayé
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Code activé !</h3>
              <p className="text-muted-foreground">
                Plan {planName} activé avec succès
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code de recharge</Label>
              <Input
                id="code"
                placeholder="Ex: ABCD1234EFGH"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="text-center text-lg tracking-widest font-mono"
                maxLength={16}
              />
              <p className="text-xs text-muted-foreground">
                Entrez le code à 12 caractères figurant sur votre carte prépayée
              </p>
            </div>

            <Button
              onClick={handleActivate}
              disabled={loading || !code.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Vérification...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Activer le code
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
